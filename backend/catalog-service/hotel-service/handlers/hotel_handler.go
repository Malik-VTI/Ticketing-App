package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"hotel-service/database"
	"hotel-service/models"
	"hotel-service/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type HotelHandler struct {
	hotelRepo    repository.HotelRepository
	roomTypeRepo repository.RoomTypeRepository
	roomRepo     repository.RoomRepository
	roomRateRepo repository.RoomRateRepository
}

func NewHotelHandler(
	hotelRepo repository.HotelRepository,
	roomTypeRepo repository.RoomTypeRepository,
	roomRepo repository.RoomRepository,
	roomRateRepo repository.RoomRateRepository,
) *HotelHandler {
	return &HotelHandler{
		hotelRepo:    hotelRepo,
		roomTypeRepo: roomTypeRepo,
		roomRepo:     roomRepo,
		roomRateRepo: roomRateRepo,
	}
}

// GetHotels handles GET /hotels
// @Summary List hotels (optionally filtered by city) with pagination
// @Tags hotels
// @Produce json
// @Param city query string false "Filter by city"
// @Param page query int false "Page number (0-based)"
// @Param size query int false "Page size (max 100)"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /hotels [get]
func (h *HotelHandler) GetHotels(c *gin.Context) {
	var searchReq models.HotelSearchRequest
	if err := c.ShouldBindQuery(&searchReq); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	page := searchReq.Page
	if page < 0 {
		page = 0
	}
	size := searchReq.Size
	if size <= 0 {
		size = 20
	}
	if size > 100 {
		size = 100
	}

	var hotels []*models.Hotel
	var total int
	var err error

	if searchReq.City != "" {
		hotels, total, err = h.hotelRepo.FindByCity(searchReq.City, page, size)
	} else {
		hotels, total, err = h.hotelRepo.FindAll(page, size)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to fetch hotels",
		})
		return
	}

	// Convert to DTOs
	hotelDTOs := make([]models.HotelDTO, len(hotels))
	for i, hotel := range hotels {
		hotelDTOs[i] = models.HotelDTO{
			ID:        hotel.ID,
			Name:      hotel.Name,
			Address:   hotel.Address,
			City:      hotel.City,
			Rating:    hotel.Rating,
			CreatedAt: hotel.CreatedAt,
			UpdatedAt: hotel.UpdatedAt,
		}
	}

	totalPages := (total + size - 1) / size
	if totalPages == 0 {
		totalPages = 1
	}

	c.JSON(http.StatusOK, gin.H{
		"content":       hotelDTOs,
		"totalPages":    totalPages,
		"totalElements": total,
		"number":        page,
		"size":          size,
	})
}

// GetHotelByID handles GET /hotels/:id
// @Summary Get a hotel by ID including its room types
// @Tags hotels
// @Produce json
// @Param id path string true "Hotel ID (UUID)"
// @Success 200 {object} models.HotelDTO
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /hotels/{id} [get]
func (h *HotelHandler) GetHotelByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_id",
			Message: "Invalid hotel ID",
		})
		return
	}

	hotel, err := h.hotelRepo.FindByID(id)
	if err != nil {
		if err.Error() == "hotel not found" {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "not_found",
				Message: "Hotel not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to fetch hotel",
		})
		return
	}

	// Get room types
	roomTypes, err := h.roomTypeRepo.FindByHotelID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to fetch room types",
		})
		return
	}

	// Convert to DTO
	hotelDTO := models.HotelDTO{
		ID:        hotel.ID,
		Name:      hotel.Name,
		Address:   hotel.Address,
		City:      hotel.City,
		Rating:    hotel.Rating,
		CreatedAt: hotel.CreatedAt,
		UpdatedAt: hotel.UpdatedAt,
	}

	roomTypeDTOs := make([]models.RoomTypeDTO, len(roomTypes))
	for i, rt := range roomTypes {
		roomTypeDTOs[i] = models.RoomTypeDTO{
			ID:        rt.ID,
			HotelID:   rt.HotelID,
			Name:      rt.Name,
			Capacity:  rt.Capacity,
			Amenities: rt.Amenities,
			CreatedAt: rt.CreatedAt,
			UpdatedAt: rt.UpdatedAt,
		}
	}
	hotelDTO.RoomTypes = roomTypeDTOs

	c.JSON(http.StatusOK, hotelDTO)
}

// GetRooms handles GET /hotels/:id/rooms
// @Summary Get available rooms for a hotel
// @Tags hotels
// @Produce json
// @Param id path string true "Hotel ID (UUID)"
// @Param checkin query string false "Check-in date (YYYY-MM-DD)"
// @Param checkout query string false "Check-out date (YYYY-MM-DD)"
// @Param guests query int false "Minimum room capacity"
// @Success 200 {array} models.AvailableRoomInfo
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /hotels/{id}/rooms [get]
func (h *HotelHandler) GetRooms(c *gin.Context) {
	hotelIDStr := c.Param("id")
	hotelID, err := uuid.Parse(hotelIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_id",
			Message: "Invalid hotel ID",
		})
		return
	}

	// Get room types for this hotel
	roomTypes, err := h.roomTypeRepo.FindByHotelID(hotelID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to fetch room types",
		})
		return
	}

	// Get available rooms for each room type
	checkInStr := c.Query("checkin")
	checkOutStr := c.Query("checkout")
	guestsStr := c.Query("guests")

	availableRooms := make([]models.AvailableRoomInfo, 0)

	for _, rt := range roomTypes {
		// Filter by capacity if guests specified
		if guestsStr != "" {
			guests, _ := strconv.Atoi(guestsStr)
			if rt.Capacity < guests {
				continue
			}
		}

		// Get all rooms for this room type
		allRooms, err := h.roomRepo.FindByRoomTypeID(rt.ID)
		if err != nil {
			continue
		}

		// Get available rooms
		availableRoomsList, err := h.roomRepo.FindAvailableByRoomTypeID(rt.ID, checkInStr, checkOutStr)
		if err != nil {
			continue
		}

		// Get rates if dates provided
		var minPrice float64
		currency := "IDR"
		if checkInStr != "" && checkOutStr != "" {
			checkIn, err1 := time.Parse("2006-01-02", checkInStr)
			checkOut, err2 := time.Parse("2006-01-02", checkOutStr)
			if err1 == nil && err2 == nil {
				rates, err := h.roomRateRepo.FindByRoomTypeIDAndDateRange(rt.ID, checkIn, checkOut)
				if err == nil && len(rates) > 0 {
					minPrice = rates[0].Price
					currency = rates[0].Currency
					for _, rate := range rates {
						if rate.Price < minPrice {
							minPrice = rate.Price
						}
					}
				}
			}
		} else {
			// Get all rates and find minimum
			rates, err := h.roomRateRepo.FindByRoomTypeID(rt.ID)
			if err == nil && len(rates) > 0 {
				minPrice = rates[0].Price
				currency = rates[0].Currency
				for _, rate := range rates {
					if rate.Price < minPrice {
						minPrice = rate.Price
					}
				}
			}
		}

		availableRooms = append(availableRooms, models.AvailableRoomInfo{
			RoomTypeID:     rt.ID,
			RoomTypeName:   rt.Name,
			Capacity:       rt.Capacity,
			AvailableCount: len(availableRoomsList),
			TotalCount:     len(allRooms),
			MinPrice:       minPrice,
			Currency:       currency,
		})
	}

	c.JSON(http.StatusOK, availableRooms)
}

// ReserveRooms handles POST /hotels/:id/reserve
// @Summary Reserve rooms of a given room type
// @Tags hotels
// @Accept json
// @Produce json
// @Param id path string true "Hotel ID (UUID)"
// @Param request body models.ReserveRoomsRequest true "Reservation payload"
// @Success 200 {object} models.ReserveRoomsResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 409 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /hotels/{id}/reserve [post]
func (h *HotelHandler) ReserveRooms(c *gin.Context) {
	var req models.ReserveRoomsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	// Begin transaction
	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to start transaction",
		})
		return
	}
	defer tx.Rollback()

	roomNumbers, err := h.roomRepo.ReserveRooms(tx, req.Quantity, req.RoomTypeID)
	if err != nil {
		c.JSON(http.StatusConflict, models.ErrorResponse{
			Error:   "reservation_failed",
			Message: err.Error(),
		})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to commit transaction",
		})
		return
	}

	c.JSON(http.StatusOK, models.ReserveRoomsResponse{
		RoomNumbers: roomNumbers,
	})
}

// ReleaseRooms handles POST /hotels/:id/release
// @Summary Release previously reserved rooms
// @Tags hotels
// @Accept json
// @Produce json
// @Param id path string true "Hotel ID (UUID)"
// @Param request body models.ReleaseRoomsRequest true "Release payload"
// @Success 200 {object} map[string]string
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /hotels/{id}/release [post]
func (h *HotelHandler) ReleaseRooms(c *gin.Context) {
	var req models.ReleaseRoomsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to start transaction",
		})
		return
	}
	defer tx.Rollback()

	if err := h.roomRepo.ReleaseRooms(tx, req.RoomNumbers, req.RoomTypeID); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "release_failed",
			Message: err.Error(),
		})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to commit transaction",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "released"})
}

// GetRates handles GET /hotels/:id/rates
// @Summary Get room rates for all room types of a hotel
// @Tags hotels
// @Produce json
// @Param id path string true "Hotel ID (UUID)"
// @Success 200 {array} models.RoomRateDTO
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /hotels/{id}/rates [get]
func (h *HotelHandler) GetRates(c *gin.Context) {
	hotelIDStr := c.Param("id")
	hotelID, err := uuid.Parse(hotelIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_id",
			Message: "Invalid hotel ID",
		})
		return
	}

	// Get room types for this hotel
	roomTypes, err := h.roomTypeRepo.FindByHotelID(hotelID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to fetch room types",
		})
		return
	}

	// Get rates for all room types
	var allRates []models.RoomRateDTO
	for _, rt := range roomTypes {
		rates, err := h.roomRateRepo.FindByRoomTypeID(rt.ID)
		if err != nil {
			continue
		}

		for _, rate := range rates {
			allRates = append(allRates, models.RoomRateDTO{
				ID:         rate.ID,
				RoomTypeID: rate.RoomTypeID,
				Date:       rate.Date.Format("2006-01-02"),
				Price:      rate.Price,
				Currency:   rate.Currency,
				CreatedAt:  rate.CreatedAt,
				UpdatedAt:  rate.UpdatedAt,
			})
		}
	}

	c.JSON(http.StatusOK, allRates)
}

// Health handles GET /health
func (h *HotelHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "hotel-service",
	})
}

// Ready handles GET /health/ready and verifies database connectivity
func (h *HotelHandler) Ready(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()
	if err := database.DB.PingContext(ctx); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ready"})
}
