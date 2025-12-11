package handlers

import (
	"net/http"
	"time"

	"hotel-service/models"
	"hotel-service/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AdminHandler struct {
	hotelRepo      repository.HotelRepository
	roomTypeRepo   repository.RoomTypeRepository
	roomRepo       repository.RoomRepository
	roomRateRepo   repository.RoomRateRepository
}

func NewAdminHandler(
	hotelRepo repository.HotelRepository,
	roomTypeRepo repository.RoomTypeRepository,
	roomRepo repository.RoomRepository,
	roomRateRepo repository.RoomRateRepository,
) *AdminHandler {
	return &AdminHandler{
		hotelRepo:      hotelRepo,
		roomTypeRepo:   roomTypeRepo,
		roomRepo:       roomRepo,
		roomRateRepo:   roomRateRepo,
	}
}

// Hotel CRUD
func (h *AdminHandler) CreateHotel(c *gin.Context) {
	var req models.CreateHotelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	hotel := &models.Hotel{
		ID:        uuid.New(),
		Name:      req.Name,
		Address:   req.Address,
		City:      req.City,
		Rating:    req.Rating,
		CreatedAt: time.Now(),
	}

	if err := h.hotelRepo.Create(hotel); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to create hotel",
		})
		return
	}

	c.JSON(http.StatusCreated, hotel)
}

func (h *AdminHandler) UpdateHotel(c *gin.Context) {
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

	var req models.UpdateHotelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	if req.Name != nil {
		hotel.Name = *req.Name
	}
	if req.Address != nil {
		hotel.Address = *req.Address
	}
	if req.City != nil {
		hotel.City = *req.City
	}
	if req.Rating != nil {
		hotel.Rating = req.Rating
	}

	if err := h.hotelRepo.Update(hotel); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to update hotel",
		})
		return
	}

	c.JSON(http.StatusOK, hotel)
}

func (h *AdminHandler) DeleteHotel(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_id",
			Message: "Invalid hotel ID",
		})
		return
	}

	if err := h.hotelRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to delete hotel",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Hotel deleted successfully"})
}

// RoomType CRUD
func (h *AdminHandler) CreateRoomType(c *gin.Context) {
	var req models.CreateRoomTypeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	roomType := &models.RoomType{
		ID:        uuid.New(),
		HotelID:   req.HotelID,
		Name:      req.Name,
		Capacity:  req.Capacity,
		Amenities: req.Amenities,
		CreatedAt: time.Now(),
	}

	if err := h.roomTypeRepo.Create(roomType); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to create room type",
		})
		return
	}

	c.JSON(http.StatusCreated, roomType)
}

func (h *AdminHandler) UpdateRoomType(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_id",
			Message: "Invalid room type ID",
		})
		return
	}

	roomType, err := h.roomTypeRepo.FindByID(id)
	if err != nil {
		if err.Error() == "room type not found" {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "not_found",
				Message: "Room type not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to fetch room type",
		})
		return
	}

	var req models.UpdateRoomTypeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	if req.Name != nil {
		roomType.Name = *req.Name
	}
	if req.Capacity != nil {
		roomType.Capacity = *req.Capacity
	}
	if req.Amenities != nil {
		roomType.Amenities = req.Amenities
	}

	if err := h.roomTypeRepo.Update(roomType); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to update room type",
		})
		return
	}

	c.JSON(http.StatusOK, roomType)
}

func (h *AdminHandler) DeleteRoomType(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_id",
			Message: "Invalid room type ID",
		})
		return
	}

	if err := h.roomTypeRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to delete room type",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Room type deleted successfully"})
}

// Room CRUD
func (h *AdminHandler) CreateRoom(c *gin.Context) {
	var req models.CreateRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	room := &models.Room{
		ID:         uuid.New(),
		RoomTypeID: req.RoomTypeID,
		RoomNumber: req.RoomNumber,
		Floor:      req.Floor,
		Status:     req.Status,
		CreatedAt:  time.Now(),
	}

	if err := h.roomRepo.Create(room); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to create room",
		})
		return
	}

	c.JSON(http.StatusCreated, room)
}

func (h *AdminHandler) UpdateRoom(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_id",
			Message: "Invalid room ID",
		})
		return
	}

	room, err := h.roomRepo.FindByID(id)
	if err != nil {
		if err.Error() == "room not found" {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "not_found",
				Message: "Room not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to fetch room",
		})
		return
	}

	var req models.UpdateRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	if req.RoomNumber != nil {
		room.RoomNumber = *req.RoomNumber
	}
	if req.Floor != nil {
		room.Floor = req.Floor
	}
	if req.Status != nil {
		room.Status = *req.Status
	}

	if err := h.roomRepo.Update(room); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to update room",
		})
		return
	}

	c.JSON(http.StatusOK, room)
}

func (h *AdminHandler) DeleteRoom(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_id",
			Message: "Invalid room ID",
		})
		return
	}

	if err := h.roomRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to delete room",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Room deleted successfully"})
}

// RoomRate CRUD
func (h *AdminHandler) CreateRoomRate(c *gin.Context) {
	var req models.CreateRoomRateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_date",
			Message: "Invalid date format. Use YYYY-MM-DD",
		})
		return
	}

	rate := &models.RoomRate{
		ID:         uuid.New(),
		RoomTypeID: req.RoomTypeID,
		Date:       date,
		Price:      req.Price,
		Currency:   req.Currency,
		CreatedAt:  time.Now(),
	}

	if err := h.roomRateRepo.Create(rate); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to create room rate",
		})
		return
	}

	c.JSON(http.StatusCreated, rate)
}

func (h *AdminHandler) UpdateRoomRate(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_id",
			Message: "Invalid room rate ID",
		})
		return
	}

	rate, err := h.roomRateRepo.FindByID(id)
	if err != nil {
		if err.Error() == "room rate not found" {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "not_found",
				Message: "Room rate not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to fetch room rate",
		})
		return
	}

	var req models.UpdateRoomRateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	if req.Date != nil {
		date, err := time.Parse("2006-01-02", *req.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Error:   "invalid_date",
				Message: "Invalid date format. Use YYYY-MM-DD",
			})
			return
		}
		rate.Date = date
	}
	if req.Price != nil {
		rate.Price = *req.Price
	}
	if req.Currency != nil {
		rate.Currency = *req.Currency
	}

	if err := h.roomRateRepo.Update(rate); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to update room rate",
		})
		return
	}

	c.JSON(http.StatusOK, rate)
}

func (h *AdminHandler) DeleteRoomRate(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_id",
			Message: "Invalid room rate ID",
		})
		return
	}

	if err := h.roomRateRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to delete room rate",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Room rate deleted successfully"})
}

