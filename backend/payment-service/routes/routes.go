package routes

import (
	"context"
	"net/http"
	"os"
	"time"

	"payment-service/database"
	_ "payment-service/docs"
	"payment-service/handlers"
	"payment-service/middleware"
	"payment-service/repository"
	"payment-service/service"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func SetupRoutes(paymentRepo repository.PaymentRepository) *gin.Engine {
	router := gin.Default()

	allowedOrigin := os.Getenv("CORS_ALLOWED_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "http://ticketing-app.local"
	}

	// CORS
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	paymentSvc := service.NewPaymentService(paymentRepo)
	handler := handlers.NewPaymentHandler(paymentSvc)

	// Swagger UI (DOC-01)
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Health (liveness — shallow)
	router.GET("/health", handler.Health)

	// Readiness — pings the database
	router.GET("/health/ready", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		if err := database.DB.PingContext(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable", "db": "down"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})

	// Protected payment routes
	protected := router.Group("/payments")
	protected.Use(middleware.AuthMiddleware())
	{
		protected.POST("", handler.CreatePayment)
		protected.GET("/:id", handler.GetPayment)
		protected.POST("/:id/refund", handler.RefundPayment)
	}

	return router
}
