package signin

import (
	"context"
	"time"

	"choonify.com/backend/functions/signin/types"
	firebase "firebase.google.com/go"
)

type AuthEvent struct {
	Email    string `json:"email"`
	Metadata struct {
		CreatedAt time.Time `json:"createdAt"`
	} `json:"metadata"`
	UID string `json:"uid"`
}

func OnSignIn(ctx context.Context, e AuthEvent) error {
	firebase, err := firebase.NewApp(ctx, nil)
	if err != nil {
		return err
	}
	firestore, err := firebase.Firestore(ctx)
	if err != nil {
		return err
	}
	_, err = firestore.Collection("users").Doc(e.UID).Set(
		ctx, types.UserInfo{ // TODO: dont update uploaded stats
			Subscription:         0,
			UploadedToday:        0,
			UploadedBytesToday:   0,
			UploadedAllTime:      0,
			UploadedBytesAllTime: 0,
			LastUploaded:         0,
			Channels:             []types.YTChannelInfo{},
			Settings: types.UserSettings{
				Defaults: types.UploadRequestData{
					ImageKey: "public/default-image", // TODO: set from env var
					Metadata: types.YTMetadata{
						Title:             "{{@if(it.metadata.title && it.metadata.artist)}}\n    {{_ it.metadata.artist}} - {{it.metadata.title}}\n{{ #else }}\n    {{_ it.file.name}}\n{{/if}}",
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
		},
	)
	return err
}
