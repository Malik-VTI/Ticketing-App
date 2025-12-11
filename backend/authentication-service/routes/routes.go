package routes

import (
	"github.com/gin-gonic/gin"
	"authentication-service/config"
	"authentication-service/handlers"
	"authentication-service/middleware"
	"authentication-service/repository"
)

func SetupRoutes(cfg *config.Config, userRepo repository.UserRepository) *gin.Engine {
	router := gin.Default()

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "authentication-service",
		})
	})

	// Auth handler
	authHandler := handlers.NewAuthHandler(userRepo, cfg)

	// Auth routes (public)
	auth := router.Group("/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.RefreshToken)
	}

	// Protected routes
	protected := router.Group("/auth")
	protected.Use(middleware.AuthMiddleware(cfg))
	{
		protected.GET("/profile", authHandler.GetProfile)
	}

	return router
}

