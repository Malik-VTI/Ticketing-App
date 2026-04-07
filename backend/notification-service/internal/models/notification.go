package models

import "github.com/google/uuid"

// NotificationType defines who triggers the notification
type NotificationType string

const (
	TypeBookingConfirmation  NotificationType = "booking_confirmation"
	TypePaymentConfirmation  NotificationType = "payment_confirmation"
	TypeBookingCancelled     NotificationType = "booking_cancelled"
)

// SendNotificationRequest is the payload to POST /notifications/send
type SendNotificationRequest struct {
	Type      NotificationType `json:"type"       binding:"required"`
	UserID    uuid.UUID        `json:"user_id"    binding:"required"`
	Email     string           `json:"email"      binding:"required,email"`
	Name      string           `json:"name"`
	BookingID *uuid.UUID       `json:"booking_id,omitempty"`
	Reference string           `json:"reference,omitempty"`
	Amount    *float64         `json:"amount,omitempty"`
	Currency  string           `json:"currency,omitempty"`
}

// ErrorResponse is a standard error payload
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}
