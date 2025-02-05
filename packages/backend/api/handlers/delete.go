package handlers

import (
	"os"
	"time"

	"cloud.google.com/go/cloudtasks/apiv2/cloudtaskspb"
	"github.com/gin-gonic/gin"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func DeleteAccountHandler(ctx *gin.Context) {
	// TODO
	// schedule user for deletion in 24h (create delayed cloud task)
	// disable account login
	var d time.Duration = 24 * time.Hour
	ts := &timestamppb.Timestamp{
		Seconds: time.Now().Add(d).Unix(),
	}

	req := &cloudtaskspb.CreateTaskRequest{
		Parent: os.Getenv("TASK_QUEUE_NAME"),
		Task: &cloudtaskspb.Task{
			MessageType: &cloudtaskspb.Task_HttpRequest{
				HttpRequest: &cloudtaskspb.HttpRequest{
					HttpMethod: cloudtaskspb.HttpMethod_POST,
					Url:        os.Getenv("DELETE_FUNCTION_URL"),
				},
			},
			ScheduleTime: ts,
		},
	}

	// on deletion (cloud run function triggered by task queue):
	// delete cloud storage for user
	// remove user from firestore
	// remove channel creds from firestore
	// remove from idp/firebase auth
}
