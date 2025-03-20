package util

import (
	"fmt"

	"choonify.com/backend/api/extensions"
	"choonify.com/backend/core/types"
	"firebase.google.com/go/v4/auth"
	"github.com/gin-gonic/gin"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func GetUser(ctx *gin.Context) (string, *types.UserInfo, error) {
	userId := ctx.MustGet("token").(*auth.Token).UID
	var user types.UserInfo
	userData, err := extensions.Firestore.Collection("users").Doc(userId).Get(ctx)
	if status.Code(err) == codes.NotFound {
		// insert default user data
		user = types.UserInfo{
			Subscription:         0,
			CustomerId:           "",
			UploadedToday:        0,
			UploadedBytesToday:   0,
			UploadedAllTime:      0,
			UploadedBytesAllTime: 0,
			LastUploaded:         0,
			Channels:             []types.YTChannelInfo{},
			Settings: types.UserSettings{
				Defaults: types.UploadRequestData{
					ImageKey: "public/default-image",
					Metadata: types.YTMetadata{
						Title:             "<% if(it.metadata.title && it.metadata.artist) { %>\n    <%_ ~ it.metadata.artist %> - <% ~ it.metadata.title %>\n<% } else { %>\n    <%_ ~ it.file.name %>\n<% } %>",
						Description:       "Uploaded with https://choonify.com",
						CategoryId:        "10",
						MadeForKids:       false,
						Visibility:        "public",
						NotifySubscribers: true,
						Tags:              []string{"choonify"},
					},
					Settings: types.RenderSettings{
						FilterType:      types.FilterTypeSolidBlack,
						Watermark:       true,
						BackgroundColor: "#000000",
					},
				},
				DefaultChannelId: "",
			},
		}
		_, err = extensions.Firestore.Collection("users").Doc(userId).Set(ctx, user)
		if err != nil {
			SendError(ctx, err, "Could not set user", &map[string]string{"userId": userId}, nil)
			return userId, nil, err
		}
	} else {
		if err != nil {
			SendError(ctx, err, "Could not get user", &map[string]string{"userId": userId}, nil)
			return userId, nil, err
		}
		err := userData.DataTo(&user)
		if err != nil {
			SendError(ctx, err, "Could not convert user data", &map[string]string{"userId": userId, "userData": fmt.Sprintf("%+v", userData.Data())}, nil)
			return userId, nil, err
		}
	}
	return userId, &user, nil
}
