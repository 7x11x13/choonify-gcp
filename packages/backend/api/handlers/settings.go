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
		util.SendError(ctx, http.StatusBadRequest, nil, &util.ErrorBody{
			I18NKey: "api.bad-request",
		})
		return
	}

	userId, user, err := util.GetUser(ctx)
	if err != nil {
		return
	}

	msg := util.ValidateRequest(body.Defaults, user.Subscription, true)
	if msg != "" {
		util.SendError(ctx, http.StatusBadRequest, nil, &util.ErrorBody{
			I18NKey: msg,
		})
		return
	}

	if body.DefaultChannelId != "" {
		validChannelId := slices.ContainsFunc(user.Channels, func(channel types.YTChannelInfo) bool {
			return channel.ChannelId == body.DefaultChannelId
		})

		if !validChannelId {
			util.SendError(ctx, http.StatusBadRequest, nil, &util.ErrorBody{
				I18NKey: "validate.invalid-channel",
			})
			return
		}
	}

	if !util.ValidateFilePath(body.Defaults.ImageKey, userId) {
		util.SendError(ctx, http.StatusBadRequest, nil, &util.ErrorBody{
			I18NKey: "validate.invalid-image-path",
		})
		return
	}

	defaultKey := fmt.Sprintf("default/%s/default", userId)
	if strings.HasPrefix(body.Defaults.ImageKey, "private") {
		src := extensions.Bucket.Object(body.Defaults.ImageKey)
		dst := extensions.Bucket.Object(defaultKey)
		err = moveFile(ctx, src, dst)
		if err != nil {
			util.SendError(ctx, http.StatusInternalServerError, err, nil)
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
		util.SendError(ctx, http.StatusInternalServerError, err, nil)
		return
	}
	ctx.JSON(http.StatusOK, nil)
}
