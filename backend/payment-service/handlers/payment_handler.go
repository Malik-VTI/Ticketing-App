package handlers

import (
	"net/http"

	"payment-service/models"
	"payment-service/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type PaymentHandler struct {
	paymentService service.PaymentService
}

func NewPaymentHandler(svc service.PaymentService) *PaymentHandler {
	return &PaymentHandler{paymentService: svc}
}

func getAuthenticatedUserID(c *gin.Context) (uuid.UUID, bool) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil, false
	}
	s, ok := userIDStr.(string)
	if !ok {
		return uuid.Nil, false
	}
	parsed, err := uuid.Parse(s)
	if err != nil {
		return uuid.Nil, false
	}
	return parsed, true
}

// CreatePayment handles POST /payments
// @Summary Create a payment
// @Description Creates a payment for a booking on behalf of the authenticated user.
// @Tags payments
// @Accept json
// @Produce json
// @Param request body models.CreatePaymentRequest true "Payment to create"
// @Success 201 {object} models.PaymentDTO
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /payments [post]
func (h *PaymentHandler) CreatePayment(c *gin.Context) {
	userID, ok := getAuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User ID not found"})
		return
	}

	var req models.CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "validation_error", Message: err.Error()})
		return
	}

	payment, err := h.paymentService.CreatePayment(userID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "internal_error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, payment)
}

// GetPayment handles GET /payments/:id
// @Summary Get a payment by ID
// @Description Returns a single payment by its ID.
// @Tags payments
// @Produce json
// @Param id path string true "Payment ID (UUID)"
// @Success 200 {object} models.PaymentDTO
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /payments/{id} [get]
func (h *PaymentHandler) GetPayment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid_id", Message: "Invalid payment ID"})
		return
	}

	payment, err := h.paymentService.GetPaymentByID(id)
	if err != nil {
		if err.Error() == "payment not found" {
			c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Payment not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "internal_error", Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, payment)
}

// RefundPayment handles POST /payments/:id/refund
// @Summary Refund a payment
// @Description Refunds a succeeded payment owned by the authenticated user.
// @Tags payments
// @Produce json
// @Param id path string true "Payment ID (UUID)"
// @Success 200 {object} models.PaymentDTO
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /payments/{id}/refund [post]
func (h *PaymentHandler) RefundPayment(c *gin.Context) {
	userID, ok := getAuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized", Message: "User ID not found"})
		return
	}

	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid_id", Message: "Invalid payment ID"})
		return
	}

	payment, err := h.paymentService.RefundPayment(id, userID)
	if err != nil {
		switch err.Error() {
		case "payment not found":
			c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "not_found", Message: "Payment not found"})
		case "forbidden: payment does not belong to this user":
			c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "forbidden", Message: err.Error()})
		case "only succeeded payments can be refunded":
			c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid_status", Message: err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "internal_error", Message: err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, payment)
}

// Health handles GET /health
// @Summary Liveness health check
// @Description Shallow liveness probe. Does not depend on the database.
// @Tags health
// @Produce json
// @Success 200 {object} map[string]string
// @Router /health [get]
func (h *PaymentHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "payment-service"})
}


