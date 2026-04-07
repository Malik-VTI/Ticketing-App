package handlers

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"

	bookingerrors "booking-service/errors"
	"booking-service/models"
	"booking-service/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type BookingHandler struct {
	bookingService service.BookingService
}

func NewBookingHandler(bookingService service.BookingService) *BookingHandler {
	return &BookingHandler{
		bookingService: bookingService,
	}
}

// getAuthenticatedUserID extracts and parses the user_id set by AuthMiddleware.
func getAuthenticatedUserID(c *gin.Context) (uuid.UUID, bool) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil, false
	}
	userID, ok := userIDStr.(string)
	if !ok {
		return uuid.Nil, false
	}
	parsed, err := uuid.Parse(userID)
	if err != nil {
		return uuid.Nil, false
	}
	return parsed, true
}

// CreateBooking handles POST /bookings
func (h *BookingHandler) CreateBooking(c *gin.Context) {
	authenticatedUserID, ok := getAuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User ID not found in context",
		})
		return
	}

	var req models.CreateBookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	booking, err := h.bookingService.CreateBooking(authenticatedUserID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, booking)
}

// GetBooking handles GET /bookings/:id
func (h *BookingHandler) GetBooking(c *gin.Context) {
	authenticatedUserID, ok := getAuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User ID not found in context",
		})
		return
	}

	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_id",
			Message: "Invalid booking ID",
		})
		return
	}

	booking, err := h.bookingService.GetBookingByID(id)
	if err != nil {
		if errors.Is(err, bookingerrors.ErrBookingNotFound) {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "not_found",
				Message: "Booking not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: err.Error(),
		})
		return
	}

	// Ownership check — users may only view their own bookings
	if booking.UserID != authenticatedUserID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "forbidden",
			Message: "You do not have permission to view this booking",
		})
		return
	}

	c.JSON(http.StatusOK, booking)
}

// GetBookingByReference handles GET /bookings/reference/:reference
func (h *BookingHandler) GetBookingByReference(c *gin.Context) {
	authenticatedUserID, ok := getAuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User ID not found in context",
		})
		return
	}

	reference := c.Param("reference")

	booking, err := h.bookingService.GetBookingByReference(reference)
	if err != nil {
		if errors.Is(err, bookingerrors.ErrBookingNotFound) {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "not_found",
				Message: "Booking not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: err.Error(),
		})
		return
	}

	// Ownership check
	if booking.UserID != authenticatedUserID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "forbidden",
			Message: "You do not have permission to view this booking",
		})
		return
	}

	c.JSON(http.StatusOK, booking)
}

// GetUserBookings handles GET /bookings/user/:userId
func (h *BookingHandler) GetUserBookings(c *gin.Context) {
	authenticatedUserID, ok := getAuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User ID not found in context",
		})
		return
	}

	userIDStr := c.Param("userId")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_user_id",
			Message: "Invalid user ID",
		})
		return
	}

	// Identity check — users may only list their own bookings
	if userID != authenticatedUserID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "forbidden",
			Message: "You do not have permission to view these bookings",
		})
		return
	}

	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	bookings, err := h.bookingService.GetUserBookings(userID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, bookings)
}

// CancelBooking handles POST /bookings/:id/cancel
func (h *BookingHandler) CancelBooking(c *gin.Context) {
	authenticatedUserID, ok := getAuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User ID not found in context",
		})
		return
	}

	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_id",
			Message: "Invalid booking ID",
		})
		return
	}

	// Fetch first to do ownership check
	booking, err := h.bookingService.GetBookingByID(id)
	if err != nil {
		if errors.Is(err, bookingerrors.ErrBookingNotFound) {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "not_found",
				Message: "Booking not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: err.Error(),
		})
		return
	}

	// Ownership check — users may only cancel their own bookings
	if booking.UserID != authenticatedUserID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "forbidden",
			Message: "You do not have permission to cancel this booking",
		})
		return
	}

	err = h.bookingService.CancelBooking(id)
	if err != nil {
		if errors.Is(err, bookingerrors.ErrAlreadyCancelled) {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Error:   "already_cancelled",
				Message: "Booking is already cancelled",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Booking cancelled successfully",
		"booking_id": id.String(),
	})
}

// ConfirmBooking handles POST /bookings/:id/confirm (internal, called by payment service)
func (h *BookingHandler) ConfirmBooking(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_id",
			Message: "Invalid booking ID",
		})
		return
	}

	// Only update if booking is pending
	booking, err := h.bookingService.GetBookingByID(id)
	if err != nil {
		if errors.Is(err, bookingerrors.ErrBookingNotFound) {
			c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Booking not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "internal_error", Message: err.Error()})
		return
	}
	if booking.Status != "pending" {
		log.Printf("ConfirmBooking rejected: Booking %s has status %s (expected 'pending')", id, booking.Status)
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_status",
			Message: fmt.Sprintf("Booking is not in pending state (currently %s)", booking.Status),
		})
		return
	}

	log.Printf("Confirming booking %s...", id)
	if err := h.bookingService.UpdateBookingStatus(id, "confirmed"); err != nil {
		log.Printf("ConfirmBooking failed for %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: err.Error(),
		})
		return
	}

	log.Printf("Booking %s confirmed successfully", id)
	c.JSON(http.StatusOK, gin.H{"message": "Booking confirmed", "booking_id": id.String()})
}

// Health handles GET /health
func (h *BookingHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "booking-service",
	})
}
