package types

type BaseMessage struct {
	Type      string `json:"type" firestore:"type"`
	ItemId    string `json:"itemId" firestore:"itemId"`
	Timestamp int64  `json:"timestamp" firestore:"timestamp"`
}

type ErrorMessage struct {
	BaseMessage
	Message     string `json:"message" firestore:"message"`
	ReloadUsers bool   `json:"reloadUsers" firestore:"reloadUsers"`
}

type RenderProgressMessage struct {
	BaseMessage
	Percent float32 `json:"percent" firestore:"percent"`
}

type RenderSuccessMessage struct {
	BaseMessage
	VideoUrl string  `json:"videoUrl" firestore:"videoUrl"`
	Elapsed  float64 `json:"elapsed" firestore:"elapsed"`
}
