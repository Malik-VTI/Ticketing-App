package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Booking represents a booking entity
type Booking struct {
	ID               uuid.UUID  `json:"id" db:"id"`
	UserID           uuid.UUID  `json:"user_id" db:"user_id"`
	BookingReference string     `json:"booking_reference" db:"booking_reference"`
	BookingType      string     `json:"booking_type" db:"booking_type"` // flight, train, hotel
	TotalAmount      float64    `json:"total_amount" db:"total_amount"`
	Currency         string     `json:"currency" db:"currency"`
	Status           string     `json:"status" db:"status"` // pending, confirmed, cancelled, expired
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt        *time.Time `json:"updated_at" db:"updated_at"`
}

// BookingItem represents a booking item entity
type BookingItem struct {
	ID        uuid.UUID  `json:"id" db:"id"`
	BookingID uuid.UUID  `json:"booking_id" db:"booking_id"`
	ItemType  string     `json:"item_type" db:"item_type"`     // flight, train, hotel
	ItemRefID uuid.UUID  `json:"item_ref_id" db:"item_ref_id"` // references flight_schedule.id / train_schedule.id / room_rate.id
	Price     float64    `json:"price" db:"price"`
	Quantity  int        `json:"quantity" db:"quantity"`
	Metadata  string     `json:"metadata" db:"metadata"` // JSON string for seat numbers, room numbers, etc.
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt *time.Time `json:"updated_at" db:"updated_at"`
}

// BookingMetadata contains additional information about the booking
type BookingMetadata struct {
	SeatNumbers    []string `json:"seat_numbers,omitempty"`
	RoomNumbers    []string `json:"room_numbers,omitempty"`
	PassengerNames []string `json:"passenger_names,omitempty"`
	CheckInDate    string   `json:"check_in_date,omitempty"`
	CheckOutDate   string   `json:"check_out_date,omitempty"`
}

// CreateBookingRequest represents the request to create a booking
type CreateBookingRequest struct {
	BookingType string                     `json:"booking_type" binding:"required,oneof=flight train hotel"`
	Items       []CreateBookingItemRequest `json:"items" binding:"required,min=1"`
}

// CreateBookingItemRequest represents a booking item in the create request
type CreateBookingItemRequest struct {
	ItemType  string           `json:"item_type" binding:"required,oneof=flight train hotel"`
	ItemRefID uuid.UUID        `json:"item_ref_id" binding:"required"`
	Price     float64          `json:"price" binding:"required,min=0"`
	Quantity  int              `json:"quantity" binding:"required,min=1"`
	Metadata  *BookingMetadata `json:"metadata,omitempty"`
}

// BookingDTO represents the booking response DTO
type BookingDTO struct {
	ID               uuid.UUID        `json:"id"`
	UserID           uuid.UUID        `json:"user_id"`
	BookingReference string           `json:"booking_reference"`
	BookingType      string           `json:"booking_type"`
	TotalAmount      float64          `json:"total_amount"`
	Currency         string           `json:"currency"`
	Status           string           `json:"status"`
	Items            []BookingItemDTO `json:"items"`
	CreatedAt        time.Time        `json:"created_at"`
	UpdatedAt        *time.Time       `json:"updated_at"`
}

// BookingItemDTO represents the booking item response DTO
type BookingItemDTO struct {
	ID        uuid.UUID        `json:"id"`
	BookingID uuid.UUID        `json:"booking_id"`
	ItemType  string           `json:"item_type"`
	ItemRefID uuid.UUID        `json:"item_ref_id"`
	Price     float64          `json:"price"`
	Quantity  int              `json:"quantity"`
	Metadata  *BookingMetadata `json:"metadata,omitempty"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt *time.Time       `json:"updated_at"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

// ToJSON converts BookingMetadata to JSON string
func (m *BookingMetadata) ToJSON() (string, error) {
	if m == nil {
		return "", nil
	}
	data, err := json.Marshal(m)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// FromJSON parses JSON string to BookingMetadata
func (m *BookingMetadata) FromJSON(data string) error {
	if data == "" {
		return nil
	}
	return json.Unmarshal([]byte(data), m)
}
