package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"time"

	"choonify.com/backend/api/extensions"
	"choonify.com/backend/api/util"
	"cloud.google.com/go/cloudtasks/apiv2/cloudtaskspb"
	"firebase.google.com/go/v4/auth"
	"github.com/gin-gonic/gin"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type deleteRequestBody struct {
	UserId string `json:"userId"`
}

func DeleteAccountHandler(ctx *gin.Context) {
	// disable account login
	userId := ctx.MustGet("token").(*auth.Token).UID
	update := &auth.UserToUpdate{}
	update = update.Disabled(true)
	_, err := extensions.Auth.UpdateUser(ctx, userId, update)
	if err != nil {
		util.SendError(ctx, http.StatusInternalServerError, err, nil)
		return
	}
	raw, err := json.Marshal(deleteRequestBody{UserId: userId})
	if err != nil {
		util.SendError(ctx, http.StatusInternalServerError, err, nil)
		return
	}
	_, err = extensions.Tasks.CreateTask(ctx, &cloudtaskspb.CreateTaskRequest{
		Parent: os.Getenv("TASK_QUEUE_NAME"),
		Task: &cloudtaskspb.Task{
			MessageType: &cloudtaskspb.Task_HttpRequest{
				HttpRequest: &cloudtaskspb.HttpRequest{
					HttpMethod: cloudtaskspb.HttpMethod_POST,
					Url:        os.Getenv("DELETE_FUNCTION_URL"),
					Body:       raw,
					Headers: map[string]string{
						"Content-Type": "application/json",
					},
				},
			},
			ScheduleTime: &timestamppb.Timestamp{
				Seconds: time.Now().Add(24 * time.Hour).Unix(), // actual delete happens in 24 hours
			},
		},
	})
	if err != nil {
		util.SendError(ctx, http.StatusInternalServerError, err, nil)
		return
	}
	ctx.JSON(http.StatusOK, nil)
}
