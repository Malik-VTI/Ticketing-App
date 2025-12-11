package routes

import (
	"github.com/gin-gonic/gin"
	"hotel-service/handlers"
	"hotel-service/repository"
)

func SetupRoutes(
	hotelRepo repository.HotelRepository,
	roomTypeRepo repository.RoomTypeRepository,
	roomRepo repository.RoomRepository,
	roomRateRepo repository.RoomRateRepository,
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

	// Handlers
	hotelHandler := handlers.NewHotelHandler(hotelRepo, roomTypeRepo, roomRepo, roomRateRepo)
	adminHandler := handlers.NewAdminHandler(hotelRepo, roomTypeRepo, roomRepo, roomRateRepo)

	// Health check
	router.GET("/health", hotelHandler.Health)

	// Public routes
	public := router.Group("/hotels")
	{
		public.GET("", hotelHandler.GetHotels)
		public.GET("/:id", hotelHandler.GetHotelByID)
		public.GET("/:id/rooms", hotelHandler.GetRooms)
		public.GET("/:id/rates", hotelHandler.GetRates)
	}

	// Admin routes
	admin := router.Group("/admin/hotels")
	{
		// Hotel CRUD
		admin.POST("", adminHandler.CreateHotel)
		admin.PUT("/:id", adminHandler.UpdateHotel)
		admin.DELETE("/:id", adminHandler.DeleteHotel)

		// RoomType CRUD
		admin.POST("/room-types", adminHandler.CreateRoomType)
		admin.PUT("/room-types/:id", adminHandler.UpdateRoomType)
		admin.DELETE("/room-types/:id", adminHandler.DeleteRoomType)

		// Room CRUD
		admin.POST("/rooms", adminHandler.CreateRoom)
		admin.PUT("/rooms/:id", adminHandler.UpdateRoom)
		admin.DELETE("/rooms/:id", adminHandler.DeleteRoom)

		// RoomRate CRUD
		admin.POST("/rates", adminHandler.CreateRoomRate)
		admin.PUT("/rates/:id", adminHandler.UpdateRoomRate)
		admin.DELETE("/rates/:id", adminHandler.DeleteRoomRate)
	}

	return router
}

