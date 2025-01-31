package types

import (
	"time"

	"golang.org/x/oauth2"
)

// Channel info
type YTChannelInfo struct {
	ChannelId string `json:"channelId"`
	Picture   string `json:"picture"`
	Name      string `json:"name"`
}

// Channel creds & ownership info
type YTChannelCreds struct {
	UserId string       `json:"userId"`
	Token  oauth2.Token `json:"token"`
}

type UserSettings struct {
	Defaults         UploadRequestData `json:"defaults"`
	DefaultChannelId string            `json:"defaultChannelId"`
}

// User info
type UserInfo struct {
	Subscription         int             `json:"subscription"`
	UploadedToday        int             `json:"uploadedToday"`
	UploadedBytesToday   int64           `json:"uploadedBytesToday"`
	LastUploaded         int64           `json:"lastUploaded"`
	UploadedAllTime      int             `json:"uploadedAllTime"`
	UploadedBytesAllTime int64           `json:"uploadedBytesAllTime"`
	Channels             []YTChannelInfo `json:"channels"`
	Settings             UserSettings    `json:"settings"`
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
