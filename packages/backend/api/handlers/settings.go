package handlers

import (
	"net/http"
	"slices"

	"choonify.com/backend/api/extensions"
	"choonify.com/backend/api/util"
	"choonify.com/backend/types"
	"cloud.google.com/go/firestore"
	"github.com/gin-gonic/gin"
)

func UpdateUserSettingsHandler(ctx *gin.Context) {
	var body types.UserSettings
	err := ctx.BindJSON(&body)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, "Bad request")
		return
	}

	userId := util.GetUserId(ctx)
	user, err := util.GetUser(ctx, userId)
	if err != nil {
		return
	}

	msg := util.ValidateRequest(body.Defaults, user.Subscription, true)
	if msg != "" {
		ctx.JSON(http.StatusBadRequest, msg)
		return
	}

	validChannelId := slices.ContainsFunc(user.Channels, func(channel types.YTChannelInfo) bool {
		return channel.ChannelId == body.DefaultChannelId
	})

	if !validChannelId {
		ctx.JSON(http.StatusBadRequest, "Default channel not found")
		return
	}

	_, err = extensions.Firestore.Collection("users").Doc(userId).Update(
		ctx, []firestore.Update{
			{
				Path:  "settings",
				Value: body,
			},
		},
	)
	if err != nil {
		ctx.Error(err)
		ctx.JSON(http.StatusInternalServerError, nil)
		return
	}
	ctx.JSON(http.StatusOK, nil)
}
