package handlers

import (
	"net/http"
	"os"
	"time"

	"choonify.com/backend/api/extensions"
	"cloud.google.com/go/cloudtasks/apiv2/cloudtaskspb"
	"github.com/gin-gonic/gin"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func DeleteAccountHandler(ctx *gin.Context) {
	// TODO
	// disable account login
	_, err := extensions.Tasks.CreateTask(ctx, &cloudtaskspb.CreateTaskRequest{
		Parent: os.Getenv("TASK_QUEUE_NAME"),
		Task: &cloudtaskspb.Task{
			MessageType: &cloudtaskspb.Task_HttpRequest{
				HttpRequest: &cloudtaskspb.HttpRequest{
					HttpMethod: cloudtaskspb.HttpMethod_POST,
					Url:        os.Getenv("DELETE_FUNCTION_URL"),
				},
			},
			ScheduleTime: &timestamppb.Timestamp{
				Seconds: time.Now().Add(24 * time.Hour).Unix(),
			},
		},
	})
	if err != nil {
		ctx.Error(err)
		ctx.JSON(http.StatusInternalServerError, nil)
		return
	}
	ctx.JSON(http.StatusOK, nil)
}
