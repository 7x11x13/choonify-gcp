package util

import (
	"fmt"
	"regexp"
	"slices"
	"strings"
	"unicode/utf8"

	"choonify.com/api/types"
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
		return "Title cannot be empty"
	}
	if (!allowTemplates && titleLength > 100) || titleLength > 10000 {
		return "Title is too long"
	}
	if strings.ContainsAny(item.Metadata.Title, "<>") {
		return "Title cannot contain < or >"
	}
	// desc - <= 5000 utf-8 bytes
	descLength := len(item.Metadata.Description)
	if (!allowTemplates && descLength > 5000) || strLen(item.Metadata.Description) > 10000 {
		return "Description is too long"
	}
	// tags - <= 500 encoded chars
	count := -1
	for _, tag := range item.Metadata.Tags {
		count += utf8.RuneCountInString(tag)
		count += 2 * strings.Count(tag, " ")
		count += 1 // for comma
	}
	if count > 500 {
		return "Tags too long"
	}
	// categoryid
	if !slices.Contains(types.CategoryIds, item.Metadata.CategoryId) {
		return "Invalid categoryId"
	}

	// visibility - public, unlisted, or private
	if !slices.Contains(visibilities, item.Metadata.Visibility) {
		return "Invalid visibility"
	}

	// filter type
	if !types.IsFilterType(string(item.Settings.FilterType)) {
		return "Invalid filter type"
	}
	if subscription == 0 && item.Settings.FilterType != types.FilterTypeSolidBlack {
		return "Not premium user"
	}

	// watermark
	if subscription == 0 && !item.Settings.Watermark {
		return "Not premium user"
	}
	// background color
	if !colorRegex.MatchString(item.Settings.BackgroundColor) {
		return "Invalid background color"
	}
	return ""
}

func ValidateBatchRequest(request *types.UploadBatchRequest, userId string, user *types.UserInfo) string {
	validChannelId := slices.ContainsFunc(user.Channels, func(channel types.YTChannelInfo) bool {
		return channel.ChannelId == request.ChannelId
	})

	if !validChannelId {
		return "Invalid channel ID"
	}

	for i, item := range request.Videos {
		msg := ValidateRequest(item, user.Subscription, false)
		if msg != "" {
			return fmt.Sprintf("Item %d: %s", i+1, msg)
		}

		// check that user has access to audio and image specified
		prefix := fmt.Sprintf("private/%s/", userId)
		if !strings.HasPrefix(item.AudioKey, prefix) {
			return "User has insufficient access"
		}
		prefix2 := fmt.Sprintf("default/%s/", userId)
		prefix3 := "public/"
		if !strings.HasPrefix(item.ImageKey, prefix) && !strings.HasPrefix(item.ImageKey, prefix2) && !strings.HasPrefix(item.ImageKey, prefix3) {
			return "User has insufficient access"
		}
	}
	return ""
}
