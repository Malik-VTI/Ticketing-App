package models

import (
	"time"

	"github.com/google/uuid"
)

// Hotel represents a hotel entity
type Hotel struct {
	ID        uuid.UUID  `json:"id" db:"id"`
	Name      string     `json:"name" db:"name"`
	Address   string     `json:"address" db:"address"`
	City      string     `json:"city" db:"city"`
	Rating    *float64   `json:"rating,omitempty" db:"rating"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt *time.Time `json:"updated_at,omitempty" db:"updated_at"`
}

// RoomType represents a room type entity
type RoomType struct {
	ID        uuid.UUID  `json:"id" db:"id"`
	HotelID   uuid.UUID  `json:"hotel_id" db:"hotel_id"`
	Name      string     `json:"name" db:"name"`
	Capacity  int        `json:"capacity" db:"capacity"`
	Amenities *string    `json:"amenities,omitempty" db:"amenities"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt *time.Time `json:"updated_at,omitempty" db:"updated_at"`
}

// Room represents a room entity
type Room struct {
	ID         uuid.UUID  `json:"id" db:"id"`
	RoomTypeID uuid.UUID  `json:"room_type_id" db:"room_type_id"`
	RoomNumber string     `json:"room_number" db:"room_number"`
	Floor      *int       `json:"floor,omitempty" db:"floor"`
	Status     string     `json:"status" db:"status"`
	CreatedAt  time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt  *time.Time `json:"updated_at,omitempty" db:"updated_at"`
}

// RoomRate represents a room rate entity
type RoomRate struct {
	ID         uuid.UUID  `json:"id" db:"id"`
	RoomTypeID uuid.UUID  `json:"room_type_id" db:"room_type_id"`
	Date       time.Time  `json:"date" db:"date"`
	Price      float64    `json:"price" db:"price"`
	Currency   string     `json:"currency" db:"currency"`
	CreatedAt  time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt  *time.Time `json:"updated_at,omitempty" db:"updated_at"`
}

// HotelDTO represents a hotel with room types
type HotelDTO struct {
	ID        uuid.UUID       `json:"id"`
	Name      string          `json:"name"`
	Address   string          `json:"address"`
	City      string          `json:"city"`
	Rating    *float64        `json:"rating,omitempty"`
	RoomTypes []RoomTypeDTO   `json:"room_types,omitempty"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt *time.Time      `json:"updated_at,omitempty"`
}

// RoomTypeDTO represents a room type with rooms and rates
type RoomTypeDTO struct {
	ID        uuid.UUID   `json:"id"`
	HotelID   uuid.UUID   `json:"hotel_id"`
	Name      string      `json:"name"`
	Capacity  int         `json:"capacity"`
	Amenities *string     `json:"amenities,omitempty"`
	Rooms     []RoomDTO   `json:"rooms,omitempty"`
	Rates     []RoomRateDTO `json:"rates,omitempty"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt *time.Time  `json:"updated_at,omitempty"`
}

// RoomDTO represents a room
type RoomDTO struct {
	ID         uuid.UUID `json:"id"`
	RoomTypeID uuid.UUID `json:"room_type_id"`
	RoomNumber string    `json:"room_number"`
	Floor      *int      `json:"floor,omitempty"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  *time.Time `json:"updated_at,omitempty"`
}

// RoomRateDTO represents a room rate
type RoomRateDTO struct {
	ID         uuid.UUID `json:"id"`
	RoomTypeID uuid.UUID `json:"room_type_id"`
	Date       string    `json:"date"`
	Price      float64   `json:"price"`
	Currency   string    `json:"currency"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  *time.Time `json:"updated_at,omitempty"`
}

// AvailableRoomInfo represents available room information
type AvailableRoomInfo struct {
	RoomTypeID   uuid.UUID `json:"room_type_id"`
	RoomTypeName string    `json:"room_type_name"`
	Capacity     int       `json:"capacity"`
	AvailableCount int     `json:"available_count"`
	TotalCount    int      `json:"total_count"`
	MinPrice      float64  `json:"min_price"`
	Currency      string   `json:"currency"`
}

// Request DTOs
type CreateHotelRequest struct {
	Name    string   `json:"name" binding:"required"`
	Address string   `json:"address"`
	City    string   `json:"city" binding:"required"`
	Rating  *float64 `json:"rating"`
}

type UpdateHotelRequest struct {
	Name    *string   `json:"name"`
	Address *string   `json:"address"`
	City    *string   `json:"city"`
	Rating  *float64  `json:"rating"`
}

type CreateRoomTypeRequest struct {
	HotelID   uuid.UUID `json:"hotel_id" binding:"required"`
	Name      string    `json:"name" binding:"required"`
	Capacity  int       `json:"capacity" binding:"required,min=1"`
	Amenities *string   `json:"amenities"`
}

type UpdateRoomTypeRequest struct {
	Name      *string `json:"name"`
	Capacity  *int    `json:"capacity"`
	Amenities *string `json:"amenities"`
}

type CreateRoomRequest struct {
	RoomTypeID uuid.UUID `json:"room_type_id" binding:"required"`
	RoomNumber string    `json:"room_number" binding:"required"`
	Floor      *int      `json:"floor"`
	Status     string    `json:"status" binding:"required,oneof=available occupied maintenance"`
}

type UpdateRoomRequest struct {
	RoomNumber *string `json:"room_number"`
	Floor      *int    `json:"floor"`
	Status     *string `json:"status"`
}

type CreateRoomRateRequest struct {
	RoomTypeID uuid.UUID `json:"room_type_id" binding:"required"`
	Date       string    `json:"date" binding:"required"`
	Price      float64   `json:"price" binding:"required,min=0"`
	Currency   string    `json:"currency" binding:"required"`
}

type UpdateRoomRateRequest struct {
	Date     *string  `json:"date"`
	Price    *float64 `json:"price"`
	Currency *string  `json:"currency"`
}

// Search request
type HotelSearchRequest struct {
	City      string `form:"city"`
	CheckIn   string `form:"checkin"`
	CheckOut  string `form:"checkout"`
	Guests    int    `form:"guests"`
	Page      int    `form:"page"`
	Size      int    `form:"size"`
	SortBy    string `form:"sortBy"`
	Direction string `form:"direction"`
}

// Error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

