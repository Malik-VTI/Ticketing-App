package service

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"payment-service/models"
	"payment-service/repository"

	"github.com/google/uuid"
)

type PaymentService interface {
	CreatePayment(userID uuid.UUID, req *models.CreatePaymentRequest) (*models.PaymentDTO, error)
	GetPaymentByID(id uuid.UUID) (*models.PaymentDTO, error)
	RefundPayment(id uuid.UUID, userID uuid.UUID) (*models.PaymentDTO, error)
}

type paymentService struct {
	repo           repository.PaymentRepository
	bookingBaseURL string
}

func NewPaymentService(repo repository.PaymentRepository) PaymentService {
	bookingURL := os.Getenv("BOOKING_SERVICE_URL")
	if bookingURL == "" {
		bookingURL = "http://localhost:8081"
	}
	return &paymentService{
		repo:           repo,
		bookingBaseURL: bookingURL,
	}
}

// CreatePayment initiates a payment and simulates processing.
// In production, replace processPayment with a real gateway call (e.g. Midtrans).
func (s *paymentService) CreatePayment(userID uuid.UUID, req *models.CreatePaymentRequest) (*models.PaymentDTO, error) {
	currency := req.Currency
	if currency == "" {
		currency = "IDR"
	}

	payment := &models.Payment{
		ID:            uuid.New(),
		BookingID:     req.BookingID,
		UserID:        userID,
		Amount:        req.Amount,
		Currency:      currency,
		Status:           models.StatusInitiated,
		PaymentMethod:    req.PaymentMethod,
		ProviderResponse: "{}",
		CreatedAt:        time.Now(),
	}

	if err := s.repo.Create(payment); err != nil {
		return nil, fmt.Errorf("failed to persist payment: %w", err)
	}

	// Simulate payment gateway processing
	status, providerResponse := s.processPayment(payment)

	if err := s.repo.UpdateStatus(payment.ID, status, providerResponse); err != nil {
		log.Printf("Warning: failed to update payment status for %s: %v", payment.ID, err)
	}
	payment.Status = status

	// On success, notify booking service to confirm the booking
	if status == models.StatusSucceeded {
		go s.confirmBooking(payment.BookingID)
	}

	return toDTO(payment), nil
}

func (s *paymentService) GetPaymentByID(id uuid.UUID) (*models.PaymentDTO, error) {
	p, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	return toDTO(p), nil
}

func (s *paymentService) RefundPayment(id uuid.UUID, userID uuid.UUID) (*models.PaymentDTO, error) {
	p, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if p.UserID != userID {
		return nil, fmt.Errorf("forbidden: payment does not belong to this user")
	}
	if p.Status != models.StatusSucceeded {
		return nil, fmt.Errorf("only succeeded payments can be refunded")
	}

	providerResp := `{"refund":"simulated","status":"refunded"}`
	if err := s.repo.UpdateStatus(id, models.StatusRefunded, providerResp); err != nil {
		return nil, fmt.Errorf("failed to process refund: %w", err)
	}
	p.Status = models.StatusRefunded
	return toDTO(p), nil
}

// processPayment simulates a gateway call. Always succeeds for valid amounts > 0.
// Replace the body of this function with real Midtrans / Xendit SDK calls.
func (s *paymentService) processPayment(p *models.Payment) (models.PaymentStatus, string) {
	if p.Amount <= 0 {
		resp, _ := json.Marshal(map[string]string{
			"status":  "failed",
			"reason":  "invalid_amount",
			"message": "Payment amount must be greater than zero",
		})
		return models.StatusFailed, string(resp)
	}

	resp, _ := json.Marshal(map[string]interface{}{
		"status":         "succeeded",
		"transaction_id": uuid.New().String(),
		"payment_method": string(p.PaymentMethod),
		"amount":         p.Amount,
		"currency":       p.Currency,
		"processed_at":   time.Now().Format(time.RFC3339),
		"note":           "Simulated payment — replace with real gateway in production",
	})
	return models.StatusSucceeded, string(resp)
}

// confirmBooking calls the booking service to update booking status to confirmed.
// Runs asynchronously; errors are logged but not propagated.
func (s *paymentService) confirmBooking(bookingID uuid.UUID) {
	url := fmt.Sprintf("%s/bookings/%s/confirm", s.bookingBaseURL, bookingID.String())
	log.Printf("Attempting to confirm booking %s at URL: %s", bookingID, url)
	
	resp, err := http.Post(url, "application/json", nil)
	if err != nil {
		log.Printf("ERROR: failed to connect to booking service at %s: %v", url, err)
		return
	}
	defer resp.Body.Close()
	
	if resp.StatusCode >= 400 {
		log.Printf("ERROR: booking service returned status %d for booking %s at URL %s", resp.StatusCode, bookingID, url)
	} else {
		log.Printf("SUCCESS: Booking %s confirmed successfully via %s", bookingID, url)
	}
}

func toDTO(p *models.Payment) *models.PaymentDTO {
	return &models.PaymentDTO{
		ID:            p.ID,
		BookingID:     p.BookingID,
		UserID:        p.UserID,
		Amount:        p.Amount,
		Currency:      p.Currency,
		Status:        p.Status,
		PaymentMethod: p.PaymentMethod,
		CreatedAt:     p.CreatedAt,
	}
}
