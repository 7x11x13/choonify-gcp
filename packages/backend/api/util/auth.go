package util

import (
	"net/http"

	"choonify.com/backend/api/extensions"
	"choonify.com/backend/types"
	"firebase.google.com/go/v4/auth"
	"github.com/gin-gonic/gin"
)

func GetUserId(ctx *gin.Context) string {
	return ctx.MustGet("token").(*auth.Token).UID
}

func GetUser(ctx *gin.Context, userId string) (*types.UserInfo, error) {
	userData, err := extensions.Firestore.Collection("users").Doc(userId).Get(ctx)
	if err != nil {
		ctx.Error(err)
		ctx.JSON(http.StatusInternalServerError, nil)
		return nil, err
	}
	var user types.UserInfo
	userData.DataTo(&user)
	return &user, nil
}
