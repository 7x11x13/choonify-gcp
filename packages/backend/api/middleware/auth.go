package middleware

import (
	"net/http"
	"strings"

	"choonify.com/backend/api/extensions"
	"github.com/gin-gonic/gin"
)

func Auth() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		if ctx.Request.Header.Get("X-Requested-With") != "XMLHttpRequest" {
			ctx.AbortWithStatus(http.StatusUnauthorized)
			return
		}
		header := ctx.Request.Header.Get("Authorization")
		if header == "" {
			ctx.AbortWithStatus(http.StatusUnauthorized)
			return
		}
		parts := strings.Split(header, " ")
		if len(parts) < 2 {
			ctx.AbortWithStatus(http.StatusUnauthorized)
			return
		}
		token, err := extensions.Auth.VerifyIDToken(ctx, parts[1])
		if token == nil || err != nil {
			ctx.AbortWithStatus(http.StatusUnauthorized)
			return
		}
		ctx.Set("token", token)
		ctx.Next()
	}
}
