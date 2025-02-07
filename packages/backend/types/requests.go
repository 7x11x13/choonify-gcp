package types

type YTMetadata struct {
	Title             string   `json:"title" firestore:"title"`
	Description       string   `json:"description" firestore:"description"`
	Tags              []string `json:"tags" firestore:"tags"`
	CategoryId        string   `json:"categoryId" firestore:"categoryId"`
	MadeForKids       bool     `json:"madeForKids" firestore:"madeForKids"`
	Visibility        string   `json:"visibility" firestore:"visibility"`
	NotifySubscribers bool     `json:"notifySubscribers" firestore:"notifySubscribers"`
}

type FilterType string

const (
	FilterTypeSolidBlack FilterType = "solidblack"
	FilterTypeSolidColor FilterType = "solidcolor"
	FilterTypeBlurred    FilterType = "blurred"
)

func IsFilterType(s string) bool {
	switch s {
	case string(FilterTypeBlurred), string(FilterTypeSolidBlack), string(FilterTypeSolidColor):
		return true
	default:
		return false
	}
}

type RenderSettings struct {
	FilterType      FilterType `json:"filterType" firestore:"filterType"`
	Watermark       bool       `json:"watermark" firestore:"watermark"`
	BackgroundColor string     `json:"backgroundColor" firestore:"backgroundColor"`
}

type UploadRequestData struct {
	Id                    string         `json:"id" firestore:"id"`
	OriginalAudioFileName string         `json:"originalAudioFileName" firestore:"originalAudioFileName"`
	AudioKey              string         `json:"audioFile" firestore:"audioFile"`
	AudioLength           float32        `json:"audioFileLength" firestore:"audioFileLength"`
	AudioFileSize         int64          `json:"audioFileSize" firestore:"audioFileSize"`
	ImageKey              string         `json:"imageFile" firestore:"imageFile"`
	Metadata              YTMetadata     `json:"metadata" firestore:"metadata"`
	Settings              RenderSettings `json:"settings" firestore:"settings"`
}

type UploadBatchRequest struct {
	ChannelId string              `json:"channelId"`
	UserId    string              `json:"userId"`
	Videos    []UploadRequestData `json:"videos"`
}
