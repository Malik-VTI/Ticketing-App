package handlers

import (
	"context"
	"log/slog"
	"net/http"

	"notification-service/internal/models"
	"notification-service/internal/service"
	"notification-service/logging"

	"github.com/gin-gonic/gin"
)

type NotificationHandler struct {
	emailService service.EmailService
}

func NewNotificationHandler(svc service.EmailService) *NotificationHandler {
	return &NotificationHandler{emailService: svc}
}

// Send queues an email notification.
// This endpoint is called by other services (booking, payment).
// Errors are non-fatal from the caller perspective — if email fails, we log it
// but still return 200 to avoid blocking the calling service.
// @Summary Queue an email notification (service-to-service)
// @Tags notifications
// @Accept json
// @Produce json
// @Param request body models.SendNotificationRequest true "Notification payload"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} models.ErrorResponse
// @Router /notifications/send [post]
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
	reqLogger := logging.From(c)
	go func() {
		attrs := notificationAttrs(&req)
		if err := h.emailService.Send(&req); err != nil {
			logging.Event(context.Background(), reqLogger, slog.LevelError, logging.TypeBusiness,
				"notification.failed", "failed to send notification email",
				append(attrs, slog.String("error.message", err.Error()))...)
			return
		}
		logging.Event(context.Background(), reqLogger, slog.LevelInfo, logging.TypeBusiness,
			"notification.sent", "notification email sent", attrs...)
	}()

	c.JSON(http.StatusOK, gin.H{
		"message": "Notification queued",
		"type":    req.Type,
		"email":   req.Email,
	})
}

// notificationAttrs adalah field bisnis standar untuk event notifikasi (tanpa PII).
func notificationAttrs(req *models.SendNotificationRequest) []slog.Attr {
	attrs := []slog.Attr{
		slog.String("notification.type", string(req.Type)),
		slog.String("notification.channel", "email"),
		slog.String("user.id", req.UserID.String()),
	}
	if req.BookingID != nil {
		attrs = append(attrs, slog.String("booking.id", req.BookingID.String()))
	}
	if req.Reference != "" {
		attrs = append(attrs, slog.String("booking.reference", req.Reference))
	}
	if req.Amount != nil {
		attrs = append(attrs, slog.Float64("booking.amount", *req.Amount), slog.String("booking.currency", req.Currency))
	}
	return attrs
}

// Health reports service liveness.
// @Summary Liveness probe
// @Tags health
// @Produce json
// @Success 200 {object} map[string]string
// @Router /health [get]
func (h *NotificationHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "notification-service"})
}

// GET /health/ready
// notification-service has no database or external dependency required to serve
// traffic, so readiness simply reports that the process is up and serving.
func (h *NotificationHandler) Ready(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ready"})
}
