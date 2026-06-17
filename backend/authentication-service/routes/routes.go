package routes

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"authentication-service/config"
	"authentication-service/database"
	"authentication-service/handlers"
	"authentication-service/middleware"
	"authentication-service/repository"
)

func SetupRoutes(cfg *config.Config, userRepo repository.UserRepository) *gin.Engine {
	router := gin.Default()

	// Health check endpoint (liveness)
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "authentication-service",
		})
	})

	// Readiness endpoint — verifies database connectivity
	router.GET("/health/ready", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		if err := database.DB.PingContext(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})

	// Auth handler
	authHandler := handlers.NewAuthHandler(userRepo, cfg)

	// Auth routes (public)
	auth := router.Group("/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/logout", authHandler.Logout)
	}

	// Protected routes
	protected := router.Group("/auth")
	protected.Use(middleware.AuthMiddleware(cfg))
	{
		protected.GET("/profile", authHandler.GetProfile)
	}

	return router
}

