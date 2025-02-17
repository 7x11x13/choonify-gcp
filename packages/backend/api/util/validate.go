package util

import (
	"fmt"
	"regexp"
	"slices"
	"strings"
	"unicode/utf8"

	"choonify.com/backend/types"
)

var visibilities = []string{"private", "unlisted", "public"}

var colorRegex = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

func strLen(s string) int {
	return utf8.RuneCountInString(s)
}

func ValidateRequest(item types.UploadRequestData, subscription int, allowTemplates bool) string {
	// title - between 1-100 chars, not containing < or >
	titleLength := strLen(item.Metadata.Title)
	if titleLength < 1 {
		return "validate.empty.title"
	}
	if (!allowTemplates && titleLength > 100) || titleLength > 10000 {
		return "validate.title-too-long"
	}
	if strings.ContainsAny(item.Metadata.Title, "<>") {
		return "validate.invalid-title"
	}
	// desc - <= 5000 utf-8 bytes
	descLength := len(item.Metadata.Description)
	if (!allowTemplates && descLength > 5000) || strLen(item.Metadata.Description) > 10000 {
		return "validate.description-too-long"
	}
	// tags - <= 500 encoded chars
	count := -1
	for _, tag := range item.Metadata.Tags {
		count += utf8.RuneCountInString(tag)
		count += 2 * strings.Count(tag, " ")
		count += 1 // for comma
	}
	if count > 500 {
		return "validate.too-many-tags"
	}
	// categoryid
	if !slices.Contains(types.CategoryIds, item.Metadata.CategoryId) {
		return "validate.invalid-category"
	}

	// visibility - public, unlisted, or private
	if !slices.Contains(visibilities, item.Metadata.Visibility) {
		return "validate.invalid-visibility"
	}

	// filter type
	if !types.IsFilterType(string(item.Settings.FilterType)) {
		return "validate.invalid-filter"
	}
	if subscription == 0 && item.Settings.FilterType != types.FilterTypeSolidBlack {
		return "validate.not-premium"
	}

	// watermark
	if subscription == 0 && !item.Settings.Watermark {
		return "validate.not-premium"
	}
	// background color
	if item.Settings.FilterType == types.FilterTypeSolidColor && !colorRegex.MatchString(item.Settings.BackgroundColor) {
		return "validate.invalid-background-color"
	}
	return ""
}

func ValidateFilePath(fileKey string, userId string) bool {
	prefix := fmt.Sprintf("private/%s/", userId)
	prefix2 := fmt.Sprintf("default/%s/", userId)
	prefix3 := "public/"
	if !strings.HasPrefix(fileKey, prefix) && !strings.HasPrefix(fileKey, prefix2) && !strings.HasPrefix(fileKey, prefix3) {
		return false
	}
	return true
}

func ValidateBatchRequest(request *types.UploadBatchRequest, userId string, user *types.UserInfo) *ErrorBody {
	validChannelId := slices.ContainsFunc(user.Channels, func(channel types.YTChannelInfo) bool {
		return channel.ChannelId == request.ChannelId
	})

	if !validChannelId {
		return &ErrorBody{
			I18NKey: "validate.invalid-channel",
		}
	}

	for i, item := range request.Videos {
		msg := ValidateRequest(item, user.Subscription, false)
		if msg != "" {
			return &ErrorBody{
				I18NKey: "validate.item-error",
				Data: map[string]any{
					"i":      i + 1,
					"reason": fmt.Sprintf("$t(%s)", msg),
				},
			}
		}

		// check that user has access to audio and image specified
		if !ValidateFilePath(item.AudioKey, userId) || !ValidateFilePath(item.ImageKey, userId) {
			return &ErrorBody{
				I18NKey: "validate.user-insufficient-access",
			}
		}
	}
	return nil
}
