package log

import (
	"context"
	"fmt"
	"os"

	"cloud.google.com/go/logging"
)

var Logger *logging.Logger

type LogEntryPayload struct {
	Message string            `json:"message"`
	Error   string            `json:"error"`
	Context map[string]string `json:"context"`
}

func LogError(severity logging.Severity, message string, err error, context *map[string]string) {
	var realContext map[string]string
	if context == nil {
		realContext = map[string]string{}
	} else {
		realContext = *context
	}
	Logger.Log(logging.Entry{
		Severity: severity,
		Payload: LogEntryPayload{
			Message: message,
			Error:   fmt.Sprintf("%s", err),
			Context: realContext,
		},
	})
}

func InitLogging(logName string) {
	var err error
	ctx := context.Background()
	client, err := logging.NewClient(ctx, os.Getenv("PROJECT_ID"))
	if err != nil {
		panic(err)
	}
	Logger = client.Logger(logName)
}
