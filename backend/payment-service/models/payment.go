package models

import (
	"time"

	"github.com/google/uuid"
)

// PaymentStatus represents possible states of a payment
type PaymentStatus string

const (
	StatusInitiated PaymentStatus = "initiated"
	StatusSucceeded PaymentStatus = "succeeded"
	StatusFailed    PaymentStatus = "failed"
	StatusRefunded  PaymentStatus = "refunded"
)

// PaymentMethod represents available payment methods
type PaymentMethod string

const (
	MethodBankTransfer PaymentMethod = "bank_transfer"
	MethodEWallet      PaymentMethod = "ewallet"
	MethodCreditCard   PaymentMethod = "credit_card"
)

// Payment is the DB entity
type Payment struct {
	ID               uuid.UUID     `json:"id"`
	BookingID        uuid.UUID     `json:"booking_id"`
	UserID           uuid.UUID     `json:"user_id"`
	Amount           float64       `json:"amount"`
	Currency         string        `json:"currency"`
	Status           PaymentStatus `json:"status"`
	PaymentMethod    PaymentMethod `json:"payment_method"`
	ProviderResponse string        `json:"provider_response,omitempty"` // JSON string
	CreatedAt        time.Time     `json:"created_at"`
}

// CreatePaymentRequest is what the frontend sends
type CreatePaymentRequest struct {
	BookingID     uuid.UUID     `json:"booking_id"      binding:"required"`
	Amount        float64       `json:"amount"          binding:"required,min=0"`
	Currency      string        `json:"currency"`
	PaymentMethod PaymentMethod `json:"payment_method"  binding:"required,oneof=bank_transfer ewallet credit_card"`
}

// PaymentDTO is what we send back
type PaymentDTO struct {
	ID            uuid.UUID     `json:"id"`
	BookingID     uuid.UUID     `json:"booking_id"`
	UserID        uuid.UUID     `json:"user_id"`
	Amount        float64       `json:"amount"`
	Currency      string        `json:"currency"`
	Status        PaymentStatus `json:"status"`
	PaymentMethod PaymentMethod `json:"payment_method"`
	CreatedAt     time.Time     `json:"created_at"`
}

// ErrorResponse is a standard error payload
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}
