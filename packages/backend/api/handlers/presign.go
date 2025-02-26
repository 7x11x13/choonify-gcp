package handlers

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"choonify.com/backend/api/extensions"
	"choonify.com/backend/api/util"
	"choonify.com/backend/core/types"
	"cloud.google.com/go/storage"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"google.golang.org/api/iterator"
)

func canUploadFile(subscription int, fileSize int64, totalBytes int64) *types.ErrorBody {
	var maxFileSize int64
	switch subscription {
	case 1:
		maxFileSize = 25 * 1024 * 1024 // 100 MB
	case 2:
		maxFileSize = 500 * 1024 * 1024 // 500 MB
	case 3:
		maxFileSize = 2 * 1024 * 1024 * 1024 // 2 GB
	default:
		maxFileSize = 10 * 1024 * 1024 // 10 MB
	}
	if totalBytes+fileSize > maxFileSize*10 {
		return &types.ErrorBody{
			StatusCode: http.StatusBadRequest,
			I18NKey:    "api.presign.out-of-storage",
		}
	}
	if fileSize <= maxFileSize {
		return nil
	}
	return &types.ErrorBody{
		StatusCode: http.StatusBadRequest,
		I18NKey:    "api.presign.file-too-big",
	}
}

type presignRequestBody struct {
	Size        int64  `json:"size"`
	Name        string `json:"name"`
	ContentType string `json:"contentType"`
}

type presignRequestResponse struct {
	URL  string `json:"url"`
	Path string `json:"path"`
}

func PresignUploadHandler(ctx *gin.Context) {
	var body presignRequestBody
	err := ctx.BindJSON(&body)
	if err != nil {
		util.SendErrorNoLog(ctx, &types.ErrorBody{
			StatusCode: http.StatusBadRequest,
			I18NKey:    "api.bad-request",
		})
		return
	}

	userId, user, err := util.GetUser(ctx)
	if err != nil {
		return
	}

	// check if user has storage to upload
	prefix := fmt.Sprintf("private/%s/", userId)
	it := extensions.Bucket.Objects(ctx, &storage.Query{
		Prefix: prefix,
	})
	var totalBytes int64 = 0
	for {
		attrs, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			util.SendError(ctx, err, "Iterator error", &map[string]string{
				"userId": userId,
			}, nil)
			return
		}
		totalBytes += attrs.Size
	}

	reason := canUploadFile(user.Subscription, body.Size, totalBytes)
	if reason != nil {
		util.SendErrorNoLog(ctx, reason)
		return
	}

	key := fmt.Sprintf("private/%s/%s-%s", userId, uuid.New().String(), body.Name)
	url, err := extensions.Bucket.SignedURL(key, &storage.SignedURLOptions{
		GoogleAccessID: os.Getenv("SERVICE_ACCOUNT_EMAIL"),
		Method:         "PUT",
		Expires:        time.Now().Add(time.Hour),
		ContentType:    body.ContentType,
		Headers: []string{
			fmt.Sprintf("content-length:%d", body.Size),
		},
	})
	if err != nil {
		util.SendError(ctx, err, "Could not get presigned URL", &map[string]string{
			"key":                   key,
			"SERVICE_ACCOUNT_EMAIL": os.Getenv("SERVICE_ACCOUNT_EMAIL"),
			"body":                  fmt.Sprintf("%+v", body),
		}, nil)
		return
	}
	res := presignRequestResponse{URL: url, Path: key}
	ctx.JSON(http.StatusOK, res)
}
