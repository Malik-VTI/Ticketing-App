package handlers

import (
	"log"
	"net/http"

	"notification-service/internal/models"
	"notification-service/internal/service"

	"github.com/gin-gonic/gin"
)

type NotificationHandler struct {
	emailService service.EmailService
}

func NewNotificationHandler(svc service.EmailService) *NotificationHandler {
	return &NotificationHandler{emailService: svc}
}

// POST /notifications/send
// This endpoint is called by other services (booking, payment).
// Errors are non-fatal from the caller perspective — if email fails, we log it
// but still return 200 to avoid blocking the calling service.
func (h *NotificationHandler) Send(c *gin.Context) {
	var req models.SendNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	// Fire-and-forget: send asynchronously so the response is fast
	go func() {
		if err := h.emailService.Send(&req); err != nil {
			log.Printf("[notification] Failed to send %s email to %s: %v", req.Type, req.Email, err)
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"message": "Notification queued",
		"type":    req.Type,
		"email":   req.Email,
	})
}

// GET /health
func (h *NotificationHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "notification-service"})
}
