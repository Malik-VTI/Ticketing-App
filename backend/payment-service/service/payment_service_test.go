package service

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"payment-service/models"

	"github.com/google/uuid"
)

// TestProcessPaymentByAmount verifies the simulated gateway result is driven by
// the payment amount: positive amounts succeed, zero/negative amounts fail.
func TestProcessPaymentByAmount(t *testing.T) {
	s := &paymentService{} // processPayment uses no repo/network dependencies

	cases := []struct {
		name       string
		amount     float64
		wantStatus models.PaymentStatus
	}{
		{"positive amount succeeds", 150000, models.StatusSucceeded},
		{"small positive amount succeeds", 0.01, models.StatusSucceeded},
		{"zero amount fails", 0, models.StatusFailed},
		{"negative amount fails", -100, models.StatusFailed},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			p := &models.Payment{
				ID:            uuid.New(),
				Amount:        tc.amount,
				Currency:      "IDR",
				PaymentMethod: models.MethodCreditCard,
			}

			status, providerResp := s.processPayment(p)

			if status != tc.wantStatus {
				t.Errorf("status: got %q, want %q", status, tc.wantStatus)
			}

			// Provider response must always be valid JSON.
			var parsed map[string]interface{}
			if err := json.Unmarshal([]byte(providerResp), &parsed); err != nil {
				t.Fatalf("provider response is not valid JSON: %v (%s)", err, providerResp)
			}

			gotStatusField, _ := parsed["status"].(string)
			if tc.wantStatus == models.StatusSucceeded {
				if gotStatusField != "succeeded" {
					t.Errorf("provider status field: got %q, want %q", gotStatusField, "succeeded")
				}
				if _, ok := parsed["transaction_id"].(string); !ok {
					t.Error("succeeded response missing transaction_id")
				}
			} else {
				if gotStatusField != "failed" {
					t.Errorf("provider status field: got %q, want %q", gotStatusField, "failed")
				}
				if reason, _ := parsed["reason"].(string); reason != "invalid_amount" {
					t.Errorf("failed response reason: got %q, want %q", reason, "invalid_amount")
				}
			}
		})
	}
}

// TestProcessPaymentEmbedsPaymentFields verifies that, on success, the simulated
// provider response echoes the payment method, amount and currency.
func TestProcessPaymentEmbedsPaymentFields(t *testing.T) {
	s := &paymentService{}
	p := &models.Payment{
		ID:            uuid.New(),
		Amount:        99999,
		Currency:      "USD",
		PaymentMethod: models.MethodEWallet,
	}

	status, providerResp := s.processPayment(p)
	if status != models.StatusSucceeded {
		t.Fatalf("expected succeeded status, got %q", status)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(providerResp), &parsed); err != nil {
		t.Fatalf("provider response is not valid JSON: %v", err)
	}

	if pm, _ := parsed["payment_method"].(string); pm != string(models.MethodEWallet) {
		t.Errorf("payment_method: got %q, want %q", pm, models.MethodEWallet)
	}
	if cur, _ := parsed["currency"].(string); cur != "USD" {
		t.Errorf("currency: got %q, want %q", cur, "USD")
	}
	// JSON numbers decode to float64.
	if amt, _ := parsed["amount"].(float64); amt != 99999 {
		t.Errorf("amount: got %v, want 99999", amt)
	}
}

// TestToDTOMapsFields verifies the entity-to-DTO conversion copies the public
// fields and does not leak the internal provider response.
func TestToDTOMapsFields(t *testing.T) {
	now := time.Now()
	p := &models.Payment{
		ID:               uuid.New(),
		BookingID:        uuid.New(),
		UserID:           uuid.New(),
		Amount:           250000,
		Currency:         "IDR",
		Status:           models.StatusSucceeded,
		PaymentMethod:    models.MethodBankTransfer,
		ProviderResponse: `{"secret":"should-not-leak"}`,
		CreatedAt:        now,
	}

	dto := toDTO(p)

	if dto.ID != p.ID {
		t.Errorf("ID mismatch: got %v, want %v", dto.ID, p.ID)
	}
	if dto.BookingID != p.BookingID {
		t.Errorf("BookingID mismatch: got %v, want %v", dto.BookingID, p.BookingID)
	}
	if dto.UserID != p.UserID {
		t.Errorf("UserID mismatch: got %v, want %v", dto.UserID, p.UserID)
	}
	if dto.Amount != 250000 {
		t.Errorf("Amount mismatch: got %v, want 250000", dto.Amount)
	}
	if dto.Currency != "IDR" {
		t.Errorf("Currency mismatch: got %q", dto.Currency)
	}
	if dto.Status != models.StatusSucceeded {
		t.Errorf("Status mismatch: got %q, want %q", dto.Status, models.StatusSucceeded)
	}
	if dto.PaymentMethod != models.MethodBankTransfer {
		t.Errorf("PaymentMethod mismatch: got %q, want %q", dto.PaymentMethod, models.MethodBankTransfer)
	}
	if !dto.CreatedAt.Equal(now) {
		t.Errorf("CreatedAt mismatch: got %v, want %v", dto.CreatedAt, now)
	}

	// The DTO must not expose the internal provider response. Marshalling the
	// DTO must not contain the secret payload.
	encoded, err := json.Marshal(dto)
	if err != nil {
		t.Fatalf("failed to marshal DTO: %v", err)
	}
	if strings.Contains(string(encoded), "should-not-leak") {
		t.Error("DTO JSON leaked the internal provider response")
	}
}
