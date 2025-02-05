package main

import (
	"fmt"
	"log"
	"os"
	"strings"

	"choonify.com/backend/api/extensions"
	"choonify.com/backend/api/handlers"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

var db = make(map[string]string)

func auth() gin.HandlerFunc {
	return func(ctx *gin.Context) {
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

	// cors
	r.Use(cors.New(cors.Config{
		AllowAllOrigins: true,
		AllowHeaders:    []string{"authorization", "x-requested-with", "content-type"},
	}))

	// auth
	r.Use(auth())

	// routes
	r.POST("/delete", handlers.DeleteAccountHandler)
	r.POST("/oauth", handlers.AuthCallbackHandler)
	r.POST("/presign-url", handlers.PresignUploadHandler)
	r.POST("/settings", handlers.UpdateUserSettingsHandler)
	r.POST("/upload", handlers.UploadRequestHandler)

	return r
}

func main() {
	extensions.InitFirebase()
	r := setupRouter()
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
		log.Printf("defaulting to port %s", port)
	}
	r.Run(fmt.Sprintf(":%s", port))
}
