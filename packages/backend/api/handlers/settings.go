package handlers

import (
	"context"
	"fmt"
	"net/http"
	"slices"
	"strings"

	"choonify.com/backend/api/extensions"
	"choonify.com/backend/api/util"
	"choonify.com/backend/types"
	"cloud.google.com/go/firestore"
	"cloud.google.com/go/storage"
	"github.com/gin-gonic/gin"
)

func moveFile(ctx context.Context, src *storage.ObjectHandle, dst *storage.ObjectHandle) error {
	if _, err := dst.CopierFrom(src).Run(ctx); err != nil {
		return err
	}
	if err := src.Delete(ctx); err != nil {
		return err
	}
	return nil
}

func UpdateUserSettingsHandler(ctx *gin.Context) {
	var body types.UserSettings
	err := ctx.BindJSON(&body)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, "Bad request")
		return
	}

	userId, user, err := util.GetUser(ctx)
	if err != nil {
		return
	}

	msg := util.ValidateRequest(body.Defaults, user.Subscription, true)
	if msg != "" {
		ctx.JSON(http.StatusBadRequest, msg)
		return
	}

	if body.DefaultChannelId != "" {
		validChannelId := slices.ContainsFunc(user.Channels, func(channel types.YTChannelInfo) bool {
			return channel.ChannelId == body.DefaultChannelId
		})

		if !validChannelId {
			ctx.JSON(http.StatusBadRequest, "Default channel not found")
			return
		}
	}

	if !util.ValidateFilePath(body.Defaults.ImageKey, userId) {
		ctx.JSON(http.StatusBadRequest, "Invalid image path")
		return
	}

	defaultKey := fmt.Sprintf("default/%s/default", userId)
	if strings.HasPrefix(body.Defaults.ImageKey, "private") {
		src := extensions.Bucket.Object(body.Defaults.ImageKey)
		dst := extensions.Bucket.Object(defaultKey)
		err = moveFile(ctx, src, dst)
		if err != nil {
			ctx.Error(err)
			ctx.JSON(http.StatusInternalServerError, nil)
			return
		}
		body.Defaults.ImageKey = defaultKey
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
