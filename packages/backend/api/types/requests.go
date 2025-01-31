package types

type YTMetadata struct {
	Title             string   `json:"title"`
	Description       string   `json:"description"`
	Tags              []string `json:"tags"`
	CategoryId        string   `json:"categoryId"`
	MadeForKids       bool     `json:"madeForKids"`
	Visibility        string   `json:"visibility"`
	NotifySubscribers bool     `json:"notifySubscribers"`
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
	FilterType      FilterType `json:"filterType"`
	Watermark       bool       `json:"watermark"`
	BackgroundColor string     `json:"backgroundColor"`
}

type UploadRequestData struct {
	Id                    string         `json:"id"`
	OriginalAudioFileName string         `json:"originalAudioFileName"`
	AudioKey              string         `json:"audioFile"`
	AudioLength           float32        `json:"audioFileLength"`
	AudioFileSize         int64          `json:"audioFileSize"`
	ImageKey              string         `json:"imageFile"`
	Metadata              YTMetadata     `json:"metadata"`
	Settings              RenderSettings `json:"settings"`
}

type UploadBatchRequest struct {
	ChannelId   string              `json:"channelId"`
	UserId      string              `json:"userId"`
	PrincipalId string              `json:"principalId"`
	Videos      []UploadRequestData `json:"videos"`
}
