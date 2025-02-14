package handlers

import (
	"cmp"
	"context"
	"fmt"
	"net/http"
	"os"
	"slices"

	"choonify.com/backend/api/extensions"
	"choonify.com/backend/api/util"
	"choonify.com/backend/types"
	"cloud.google.com/go/firestore"
	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/option"
	"google.golang.org/api/youtube/v3"
)

type oAuthBody struct {
	Code string `json:"code"`
}

func maxChannels(subscription int) int {
	if subscription == 0 {
		return 1
	}
	return 10
}

func AuthCallbackHandler(ctx *gin.Context) {

	var body oAuthBody
	err := ctx.BindJSON(&body)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, "Bad request")
		return
	}

	// get youtube client
	cfg := oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		Endpoint:     google.Endpoint,
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		Scopes:       []string{"https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"},
	}
	token, err := cfg.Exchange(ctx, body.Code)
	if err != nil {
		// log.Printf("failed to exchange code: %s", err)
		ctx.Error(err)
		ctx.JSON(http.StatusInternalServerError, nil)
		return
	}
	client := cfg.Client(ctx, token)
	service, err := youtube.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		// log.Printf("Failed to make youtube client: %v", err)
		ctx.Error(err)
		ctx.JSON(http.StatusInternalServerError, nil)
		return
	}
	call := service.Channels.List([]string{"snippet"})
	response, err := call.Mine(true).Do()
	if err != nil {
		ctx.Error(err)
		ctx.JSON(http.StatusInternalServerError, "Failed to get channels")
		return
	}
	userId, user, err := util.GetUser(ctx)
	if err != nil {
		ctx.Error(err)
		ctx.JSON(http.StatusInternalServerError, nil)
		return
	}
	maxChan := maxChannels(user.Subscription)
	if len(user.Channels) >= maxChan {
		ctx.JSON(http.StatusBadRequest, fmt.Sprintf("Too many channels linked! Max: %d", maxChan))
		return
	}
	chanEnd := min(maxChan-len(user.Channels), len(response.Items))
	err = extensions.Firestore.RunTransaction(ctx, func(c context.Context, tx *firestore.Transaction) error {
		anyAdded := false
		for _, channel := range response.Items[:chanEnd] {
			ref := extensions.Firestore.Collection("yt_channel_credentials").Doc(channel.Id)
			err = tx.Create(ref, types.YTChannelCreds{
				UserId: userId,
				Token:  *token,
			})
			if err != nil {
				ctx.Error(err)
			} else {
				anyAdded = true
				user.Channels = append(user.Channels, types.YTChannelInfo{
					ChannelId: channel.Id,
					Picture:   channel.Snippet.Thumbnails.Default.Url,
					Name:      channel.Snippet.Title,
				})
			}
		}
		if !anyAdded {
			return fmt.Errorf("channel already linked")
		}
		slices.SortFunc(user.Channels, func(a types.YTChannelInfo, b types.YTChannelInfo) int {
			return cmp.Compare(a.ChannelId, b.ChannelId)
		})
		user.Channels = slices.CompactFunc(user.Channels, func(a types.YTChannelInfo, b types.YTChannelInfo) bool {
			return a.ChannelId == b.ChannelId
		})
		if user.Settings.DefaultChannelId == "" && len(user.Channels) > 0 {
			user.Settings.DefaultChannelId = user.Channels[0].ChannelId
		}
		userRef := extensions.Firestore.Collection("users").Doc(userId)
		return tx.Update(userRef, []firestore.Update{
			{
				Path:  "channels",
				Value: user.Channels,
			},
			{
				Path:  "settings.defaultChannelId",
				Value: user.Settings.DefaultChannelId,
			},
		})
	})
	if err != nil {
		ctx.Error(err)
		ctx.JSON(http.StatusInternalServerError, "Channel already linked")
		return
	}
	ctx.JSON(http.StatusOK, nil)
}
