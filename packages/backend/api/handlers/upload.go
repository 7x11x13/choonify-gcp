package handlers

import (
	"encoding/json"
	"net/http"
	"os"

	"choonify.com/backend/api/extensions"
	"choonify.com/backend/api/util"
	"choonify.com/backend/types"
	"cloud.google.com/go/cloudtasks/apiv2/cloudtaskspb"
	"github.com/gin-gonic/gin"
)

func getUploadQuota(subscription int) int {
	return []int{10, 25, 1000, 1000}[subscription]
}

type uploadRequestResponse struct {
	Uploading int `json:"uploading"`
}

func UploadRequestHandler(ctx *gin.Context) {
	var body types.UploadBatchRequest
	err := ctx.BindJSON(&body)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, "Bad request")
		return
	}

	userId, user, err := util.GetUser(ctx)
	if err != nil {
		return
	}

	// TODO: verify channelid
	// TODO: change to bytes quota
	uploadedToday, _ := user.RealUploadedToday()
	uploadCount := min(max(0, getUploadQuota(user.Subscription)-uploadedToday), len(body.Videos))
	body.Videos = body.Videos[:uploadCount]

	msg := util.ValidateBatchRequest(&body, userId, user)
	if msg != "" {
		ctx.JSON(http.StatusBadRequest, msg)
		return
	}

	if len(body.Videos) > 0 {
		// send to render job
		body.UserId = userId
		raw, err := json.Marshal(body)
		if err != nil {
			ctx.Error(err)
			ctx.JSON(http.StatusInternalServerError, nil)
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
			ctx.Error(err)
			ctx.JSON(http.StatusInternalServerError, nil)
			return
		}
	}
	ctx.JSON(http.StatusOK, uploadRequestResponse{
		Uploading: len(body.Videos),
	})
}
