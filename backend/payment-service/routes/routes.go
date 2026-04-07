package routes

import (
	"payment-service/handlers"
	"payment-service/middleware"
	"payment-service/repository"
	"payment-service/service"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(paymentRepo repository.PaymentRepository) *gin.Engine {
	router := gin.Default()

	// CORS
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
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

	// Health
	router.GET("/health", handler.Health)

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
