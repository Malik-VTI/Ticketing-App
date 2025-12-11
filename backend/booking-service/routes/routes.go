package routes

import (
	"github.com/gin-gonic/gin"
	"booking-service/handlers"
	"booking-service/middleware"
	"booking-service/repository"
	"booking-service/service"
)

func SetupRoutes(
	bookingRepo repository.BookingRepository,
	bookingItemRepo repository.BookingItemRepository,
) *gin.Engine {
	router := gin.Default()

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Initialize services and handlers
	bookingService := service.NewBookingService(bookingRepo, bookingItemRepo)
	bookingHandler := handlers.NewBookingHandler(bookingService)

	// Health check
	router.GET("/health", bookingHandler.Health)

	// Public routes (for testing - remove in production)
	public := router.Group("/bookings")
	{
		public.GET("/reference/:reference", bookingHandler.GetBookingByReference)
	}

	// Protected routes
	protected := router.Group("/bookings")
	protected.Use(middleware.AuthMiddleware())
	{
		protected.POST("", bookingHandler.CreateBooking)
		protected.GET("/:id", bookingHandler.GetBooking)
		protected.GET("/user/:userId", bookingHandler.GetUserBookings)
		protected.POST("/:id/cancel", bookingHandler.CancelBooking)
	}

	return router
}

