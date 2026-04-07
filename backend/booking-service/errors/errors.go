package errors

import "errors"

// Sentinel errors for the booking service
var (
	ErrBookingNotFound  = errors.New("booking not found")
	ErrAlreadyCancelled = errors.New("booking is already cancelled")
)
