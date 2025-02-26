package util

import (
	"net/http"

	"choonify.com/backend/core/log"
	"choonify.com/backend/core/types"
	"cloud.google.com/go/logging"
	"github.com/gin-gonic/gin"
)

func realSendError(ctx *gin.Context, err error, severity logging.Severity, message string, context *map[string]string, errorBody *types.ErrorBody) {
	if err != nil {
		// ctx.Error(err)
		log.LogError(severity, message, err, context)
	}
	if errorBody == nil {
		ctx.JSON(http.StatusInternalServerError, nil)
	} else {
		ctx.JSON(errorBody.StatusCode, *errorBody)
	}
}

func SendError(ctx *gin.Context, err error, message string, context *map[string]string, errorBody *types.ErrorBody) {
	realSendError(ctx, err, logging.Error, message, context, errorBody)
}

func SendErrorNoLog(ctx *gin.Context, errorBody *types.ErrorBody) {
	SendError(ctx, nil, "", nil, errorBody)
}

func SendAlert(ctx *gin.Context, err error, message string, context *map[string]string, errorBody *types.ErrorBody) {
	realSendError(ctx, err, logging.Alert, message, context, errorBody)
}
