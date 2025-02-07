package types

type BaseMessage struct {
	Type      string `json:"type"`
	ItemId    string `json:"itemId"`
	Timestamp int64  `json:"timestamp"`
}

type ErrorMessage struct {
	BaseMessage
	Message     string `json:"message"`
	ReloadUsers bool   `json:"reloadUsers"`
}

type RenderProgressMessage struct {
	BaseMessage
	Percent float32 `json:"percent"`
}

type RenderSuccessMessage struct {
	BaseMessage
	VideoUrl string  `json:"videoUrl"`
	Elapsed  float64 `json:"elapsed"`
}
