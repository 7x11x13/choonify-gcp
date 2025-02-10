package handlers

import (
	"context"
	"net/http"
	"slices"

	"choonify.com/backend/api/extensions"
	"choonify.com/backend/api/util"
	"choonify.com/backend/types"
	"cloud.google.com/go/firestore"
	"github.com/gin-gonic/gin"
)

type removeChannelBody struct {
	ChannelId string `json:"channelId"`
}

func RemoveChannelHandler(ctx *gin.Context) {
	var body removeChannelBody
	err := ctx.BindJSON(&body)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, "Bad request")
		return
	}

	userId, user, err := util.GetUser(ctx)
	if err != nil {
		ctx.Error(err)
		ctx.JSON(http.StatusInternalServerError, nil)
		return
	}
	chanIdx := slices.IndexFunc(user.Channels, func(channel types.YTChannelInfo) bool {
		return channel.ChannelId == body.ChannelId
	})
	if chanIdx == -1 {
		ctx.Error(err)
		ctx.JSON(http.StatusBadRequest, "Channel already unlinked")
		return
	}
	userRef := extensions.Firestore.Collection("users").Doc(userId)
	channelRef := extensions.Firestore.Collection("yt_channel_credentials").Doc(body.ChannelId)
	err = extensions.Firestore.RunTransaction(ctx, func(c context.Context, tx *firestore.Transaction) error {
		newDefaulChannel := user.Settings.DefaultChannelId
		if newDefaulChannel == body.ChannelId {
			newDefaulChannel = ""
		}
		err := tx.Update(userRef, []firestore.Update{
			{
				Path:  "channels",
				Value: firestore.ArrayRemove(user.Channels[chanIdx]),
			},
			{
				Path:  "settings.defaultChannelId",
				Value: newDefaulChannel,
			},
		})
		if err != nil {
			return err
		}
		return tx.Delete(channelRef)
	})
	if err != nil {
		ctx.Error(err)
		ctx.JSON(http.StatusInternalServerError, "Failed to add channel")
		return
	}
	ctx.JSON(http.StatusOK, nil)
}
