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
	"github.com/gin-gonic/gin"
)

type uploadRequestResponse struct {
	Uploading int `json:"uploading"`
}

func getVideoSizeBytes(ctx context.Context, video *types.UploadRequestData) (int64, error) {
	audioAttrs, err := extensions.Bucket.Object(video.AudioKey).Attrs(ctx)
	if err != nil {
		return 0, err
	}
	imgAttrs, err := extensions.Bucket.Object(video.ImageKey).Attrs(ctx)
	if err != nil {
		return 0, err
	}
	return audioAttrs.Size + imgAttrs.Size, nil
}

func getUploadCount(ctx context.Context, videos *[]types.UploadRequestData, uploadedBytesToday int64, uploadQuota int64) (int, error) {
	// return how many videos to upload to stay within bytes quota
	bytes := uploadedBytesToday
	for i, video := range *videos {
		if bytes > uploadQuota {
			return i, nil
		}
		videoBytes, err := getVideoSizeBytes(ctx, &video)
		if err != nil {
			return 0, err
		}
		bytes += videoBytes
	}
	return len(*videos), nil
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
	uploadCount, err := getUploadCount(ctx, &body.Videos, uploadedBytesToday, constants.UPLOAD_QUOTA_BYTES[user.Subscription])
	if err != nil {
		util.SendError(ctx, err, "Could not find video request size", &map[string]string{
			"body":   fmt.Sprintf("%+v", body),
			"userId": userId,
		}, nil)
		return
	}
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
		_, err = extensions.Tasks.CreateTask(ctx, &cloudtaskspb.CreateTaskRequest{
			Parent: os.Getenv("TASK_QUEUE_NAME"),
			Task: &cloudtaskspb.Task{
				MessageType: &cloudtaskspb.Task_HttpRequest{
					HttpRequest: &cloudtaskspb.HttpRequest{
						HttpMethod: cloudtaskspb.HttpMethod_POST,
						Url:        os.Getenv("RENDER_FUNCTION_URL"),
						Body:       raw,
						Headers: map[string]string{
							"Content-Type": "application/json",
						},
					},
				},
			},
		})
		if err != nil {
			util.SendError(ctx, err, "Could not create upload task", &map[string]string{
				"body":            fmt.Sprintf("%+v", body),
				"userId":          userId,
				"url":             os.Getenv("RENDER_FUNCTION_URL"),
				"TASK_QUEUE_NAME": os.Getenv("TASK_QUEUE_NAME"),
			}, nil)
			return
		}
	}
	ctx.JSON(http.StatusOK, uploadRequestResponse{
		Uploading: len(body.Videos),
	})
}
