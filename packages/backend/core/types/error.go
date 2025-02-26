package types

type ErrorBody struct {
	StatusCode int            `json:"status"`
	I18NKey    string         `json:"i18nKey"`
	Data       map[string]any `json:"data"`
}
