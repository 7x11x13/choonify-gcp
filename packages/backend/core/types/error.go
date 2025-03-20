package types

type ErrorBody struct {
	StatusCode int            `json:"status" firestore:"status"`
	I18NKey    string         `json:"i18nKey" firestore:"i18nKey"`
	Data       map[string]any `json:"data" firestore:"data"`
}
