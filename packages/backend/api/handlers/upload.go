package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"choonify.com/backend/api/extensions"
	"choonify.com/backend/api/util"
	"choonify.com/backend/core/constants"
	"choonify.com/backend/core/types"
	"cloud.google.com/go/cloudtasks/apiv2/cloudtaskspb"
	"cloud.google.com/go/firestore"
	"github.com/gin-gonic/gin"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/durationpb"
)

type uploadRequestResponse struct {
	Uploading int `json:"uploading"`
}

func validateVideoSizes(ctx context.Context, videos *[]types.UploadRequestData) error {
	// ensure upload request data contains correct image and audio size
	for i, video := range *videos {
		audioAttrs, err := extensions.Bucket.Object(video.AudioKey).Attrs(ctx)
		if err != nil {
			return err
		}
		imgAttrs, err := extensions.Bucket.Object(video.ImageKey).Attrs(ctx)
		if err != nil {
			return err
		}
		(*videos)[i].AudioFileSize = audioAttrs.Size
		(*videos)[i].ImageFileSize = imgAttrs.Size
	}
	return nil
}

func getUploadCount(videos *[]types.UploadRequestData, uploadedBytesToday int64, uploadQuota int64) int {
	// return how many videos to upload to stay within bytes quota
	bytes := uploadedBytesToday
	for i, video := range *videos {
		if bytes > uploadQuota {
			return i
		}
		videoBytes := video.AudioFileSize + video.ImageFileSize
		bytes += videoBytes
	}
	return len(*videos)
}

func getRenderFunctionUrl(videos *[]types.UploadRequestData) string {
	var maxBytes int64 = 0
	for _, video := range *videos {
		maxBytes = max(maxBytes, video.AudioFileSize+video.ImageFileSize)
	}
	if maxBytes <= constants.UPLOAD_QUOTA_BYTES[0] {
		return os.Getenv("RENDER_FUNCTION_LOW_URL")
	}
	return os.Getenv("RENDER_FUNCTION_HIGH_URL")
}

func UploadRequestHandler(ctx *gin.Context) {
	var body types.UploadBatchRequest
	err := ctx.BindJSON(&body)
	if err != nil {
		util.SendErrorNoLog(ctx, &types.ErrorBody{
			StatusCode: http.StatusBadRequest,
			I18NKey:    "api.bad-request",
		})
		return
	}

	userId, user, err := util.GetUser(ctx)
	if err != nil {
		return
	}

	_, uploadedBytesToday := user.RealUploadedToday()
	err = validateVideoSizes(ctx, &body.Videos)
	if err != nil {
		util.SendError(ctx, err, "Could not find video request size", &map[string]string{
			"body":   fmt.Sprintf("%+v", body),
			"userId": userId,
		}, nil)
		return
	}
	uploadCount := getUploadCount(&body.Videos, uploadedBytesToday, constants.UPLOAD_QUOTA_BYTES[user.Subscription])
	body.Videos = body.Videos[:uploadCount]

	msg := util.ValidateBatchRequest(&body, userId, user)
	if msg != nil {
		util.SendErrorNoLog(ctx, msg)
		return
	}

	if len(body.Videos) > 0 {
		// send to render job
		body.UserId = userId
		raw, err := json.Marshal(body)
		if err != nil {
			util.SendError(ctx, err, "Could not marshal render request", &map[string]string{
				"body":   fmt.Sprintf("%+v", body),
				"userId": userId,
			}, nil)
			return
		}

		docRef := extensions.Firestore.Collection("is_rendering").Doc(userId)
		err = extensions.Firestore.RunTransaction(ctx, func(c context.Context, tx *firestore.Transaction) error {
			_, err := tx.Get(docRef)
			if err != nil && status.Code(err) != codes.NotFound {
				util.SendError(ctx, err, "Could not check is_rendering", &map[string]string{
					"userId": userId,
				}, nil)
				return err
			}
			if err == nil {
				util.SendErrorNoLog(ctx, &types.ErrorBody{
					StatusCode: http.StatusBadRequest,
					I18NKey:    "api.upload.already-rendering",
				})
				return fmt.Errorf("already rendering")
			}
			err = tx.Set(docRef, map[string]string{})
			if err != nil {
				util.SendError(ctx, err, "Could not set is_rendering", &map[string]string{
					"userId": userId,
				}, nil)
				return err
			}
			renderUrl := getRenderFunctionUrl(&body.Videos)
			_, err = extensions.Tasks.CreateTask(ctx, &cloudtaskspb.CreateTaskRequest{
				Parent: os.Getenv("TASK_QUEUE_NAME"),
				Task: &cloudtaskspb.Task{
					MessageType: &cloudtaskspb.Task_HttpRequest{
						HttpRequest: &cloudtaskspb.HttpRequest{
							HttpMethod: cloudtaskspb.HttpMethod_POST,
							Url:        renderUrl,
							Body:       raw,
							Headers: map[string]string{
								"Content-Type": "application/json",
							},
						},
					},
					DispatchDeadline: &durationpb.Duration{Seconds: 30 * 60}, // 30 mins = max deadline for http tasks
				},
			})
			if err != nil {
				util.SendError(ctx, err, "Could not create upload task", &map[string]string{
					"body":            fmt.Sprintf("%+v", body),
					"userId":          userId,
					"url":             renderUrl,
					"TASK_QUEUE_NAME": os.Getenv("TASK_QUEUE_NAME"),
				}, nil)
			}
			return err
		})
		if err != nil {
			return
		}
	}
	ctx.JSON(http.StatusOK, uploadRequestResponse{
		Uploading: len(body.Videos),
	})
}
