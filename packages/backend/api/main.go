package main

import (
	"fmt"
	"os"
	"strings"

	"choonify.com/backend/api/extensions"
	"choonify.com/backend/api/handlers"
	"choonify.com/backend/core/log"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func auth() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		if ctx.Request.Header.Get("X-Requested-With") != "XMLHttpRequest" {
			ctx.AbortWithStatus(401)
			return
		}
		header := ctx.Request.Header.Get("Authorization")
		if header == "" {
			ctx.AbortWithStatus(401)
			return
		}
		parts := strings.Split(header, " ")
		if len(parts) < 2 {
			ctx.AbortWithStatus(401)
			return
		}
		token, err := extensions.Auth.VerifyIDToken(ctx, parts[1])
		if token == nil || err != nil {
			ctx.AbortWithStatus(401)
			return
		}
		ctx.Set("token", token)
		ctx.Next()
	}
}

func setupRouter() *gin.Engine {
	// Disable Console Color
	// gin.DisableConsoleColor()
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowHeaders:     []string{"authorization", "x-requested-with", "content-type"},
		AllowCredentials: true,
	}))

	r.POST("/stripe-webhook", handlers.StripeWebhookHandler)

	api := r.Group("/api")
	api.Use(auth())
	{
		// routes
		api.POST("/delete", handlers.DeleteAccountHandler)
		api.POST("/oauth", handlers.AuthCallbackHandler)
		api.POST("/presign-url", handlers.PresignUploadHandler)
		api.POST("/settings", handlers.UpdateUserSettingsHandler)
		api.POST("/upload", handlers.UploadRequestHandler)
		api.POST("/remove-channel", handlers.RemoveChannelHandler)
		api.POST("/create-customer-portal-session", handlers.CreatePortalSessionHandler)
	}

	return r
}

func init() {
	log.InitLogging("api")
	extensions.InitGCP()
	extensions.InitStripe()
}

func main() {
	r := setupRouter()
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	r.Run(fmt.Sprintf(":%s", port))
}
