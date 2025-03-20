package middleware

import (
	"net/http"
	"time"

	"choonify.com/backend/api/extensions"
	"choonify.com/backend/core/types"
	"firebase.google.com/go/v4/auth"
	"github.com/gin-gonic/gin"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type rateLimitData struct {
	Timestamp int64 `json:"timestamp" firestore:"timestamp"`
}

func Ratelimit(ipBased bool, collectionName string, delayMs int64) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		var identifier string

		if ipBased {
			identifier = ctx.ClientIP()
		} else {
			identifier = ctx.MustGet("token").(*auth.Token).UID
		}

		updateTimestamp := func() {
			extensions.Firestore.Collection(collectionName).Doc(identifier).Set(ctx, rateLimitData{
				Timestamp: time.Now().UnixMilli(),
			})
		}
		defer updateTimestamp()

		doc, err := extensions.Firestore.Collection(collectionName).Doc(identifier).Get(ctx)
		if err != nil && status.Code(err) == codes.NotFound {
			ctx.Next()
			return
		}
		if err != nil {
			ctx.AbortWithStatus(http.StatusInternalServerError)
			return
		}
		var data rateLimitData
		err = doc.DataTo(&data)
		if err != nil {
			ctx.AbortWithStatus(http.StatusInternalServerError)
			return
		}
		if data.Timestamp > time.Now().UnixMilli()-delayMs {
			ctx.AbortWithStatusJSON(http.StatusTooManyRequests, types.ErrorBody{
				StatusCode: http.StatusTooManyRequests,
				I18NKey:    "api.rate-limited",
			})
			return
		}

		ctx.Next()
	}
}
