package routes

import (
	"context"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	"booking-service/clients"
	"booking-service/database"
	_ "booking-service/docs"
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

	// CORS allowed origin is read once from the environment (default to local host).
	allowedOrigin := os.Getenv("CORS_ALLOWED_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "http://ticketing-app.local"
	}

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Initialize clients
	catalogClient := clients.NewCatalogClient()
	pricingClient := clients.NewPricingClient()

	// Initialize repositories that aren't passed in
	outboxRepo := repository.NewOutboxRepository()

	// Initialize services and handlers
	bookingService := service.NewBookingService(bookingRepo, bookingItemRepo, outboxRepo, catalogClient, pricingClient)
	bookingService.StartExpirationWorker()
	// Drain the notification outbox in the background (Transactional Outbox / ARCH-05)
	bookingService.StartOutboxWorker()
	bookingHandler := handlers.NewBookingHandler(bookingService)

	// Swagger UI (DOC-01)
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Health check (liveness — shallow, must not depend on the DB)
	router.GET("/health", bookingHandler.Health)

	// Readiness check — pings the database so the pod only receives traffic when the DB is reachable
	router.GET("/health/ready", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		if err := database.DB.PingContext(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable", "db": "down"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})

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

	// Internal route — requires internal api key (called by payment-service)
	internal := router.Group("/bookings")
	internal.Use(middleware.InternalAuthMiddleware())
	{
		internal.POST("/:id/confirm", bookingHandler.ConfirmBooking)
	}

	return router
}

