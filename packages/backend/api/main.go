package main

import (
	"fmt"
	"os"

	"choonify.com/backend/api/extensions"
	"choonify.com/backend/api/handlers"
	"choonify.com/backend/api/middleware"
	"choonify.com/backend/core/log"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

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
	api.Use(middleware.Auth())
	{
		// routes
		api.POST("/delete", handlers.DeleteAccountHandler)
		api.POST("/oauth", handlers.AuthCallbackHandler)
		api.POST("/presign-url", handlers.PresignUploadHandler)
		api.POST("/settings", handlers.UpdateUserSettingsHandler)
		api.POST("/remove-channel", handlers.RemoveChannelHandler)
		api.POST("/create-customer-portal-session", handlers.CreatePortalSessionHandler)
		api.POST("/upload", middleware.Ratelimit(false, "ratelimit_upload", 5000), handlers.UploadRequestHandler)
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
