package types

import (
	"time"

	"golang.org/x/oauth2"
)

// Channel info
type YTChannelInfo struct {
	ChannelId string `json:"channelId" firestore:"channelId"`
	Picture   string `json:"picture" firestore:"picture"`
	Name      string `json:"name" firestore:"name"`
}

// Channel creds & ownership info
type YTChannelCreds struct {
	UserId string       `json:"userId" firestore:"userId"`
	Token  oauth2.Token `json:"token" firestore:"token"`
}

type UserSettings struct {
	Defaults         UploadRequestData `json:"defaults" firestore:"defaults"`
	DefaultChannelId string            `json:"defaultChannelId" firestore:"defaultChannelId"`
}

// User info
type UserInfo struct {
	Subscription         int             `json:"subscription" firestore:"subscription"`
	UploadedToday        int             `json:"uploadedToday" firestore:"uploadedToday"`
	UploadedBytesToday   int64           `json:"uploadedBytesToday" firestore:"uploadedBytesToday"`
	LastUploaded         int64           `json:"lastUploaded" firestore:"lastUploaded"`
	UploadedAllTime      int             `json:"uploadedAllTime" firestore:"uploadedAllTime"`
	UploadedBytesAllTime int64           `json:"uploadedBytesAllTime" firestore:"uploadedBytesAllTime"`
	Channels             []YTChannelInfo `json:"channels" firestore:"channels"`
	Settings             UserSettings    `json:"settings" firestore:"settings"`
}

func (info *UserInfo) RealUploadedToday() (int, int64) {
	now := time.Now().UTC()
	y, m, d := now.Date()
	today := time.Date(y, m, d, 0, 0, 0, 0, time.UTC).Unix()
	if info.LastUploaded < today {
		return 0, 0
	} else {
		return info.UploadedToday, info.UploadedBytesToday
	}
}
