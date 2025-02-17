package util

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type ErrorBody struct {
	I18NKey string         `json:"i18nKey"`
	Data    map[string]any `json:"data"`
}

func SendError(ctx *gin.Context, statusCode int, err error, errorBody *ErrorBody) {
	if err != nil {
		ctx.Error(err)
	}
	if errorBody == nil {
		ctx.JSON(http.StatusInternalServerError, nil)
	} else {
		ctx.JSON(http.StatusInternalServerError, *errorBody)
	}
}
