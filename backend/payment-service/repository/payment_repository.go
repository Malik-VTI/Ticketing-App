package repository

import (
	"database/sql"
	"fmt"

	"payment-service/database"
	"payment-service/models"

	"github.com/google/uuid"
)

type PaymentRepository interface {
	Create(payment *models.Payment) error
	FindByID(id uuid.UUID) (*models.Payment, error)
	FindByBookingID(bookingID uuid.UUID) ([]*models.Payment, error)
	UpdateStatus(id uuid.UUID, status models.PaymentStatus, providerResponse string) error
}

type paymentRepository struct{}

func NewPaymentRepository() PaymentRepository {
	return &paymentRepository{}
}

func (r *paymentRepository) Create(p *models.Payment) error {
	query := `
		INSERT INTO payments (id, booking_id, user_id, amount, currency, status, payment_method, provider_response, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := database.DB.Exec(query,
		p.ID, p.BookingID, p.UserID,
		p.Amount, p.Currency, string(p.Status),
		string(p.PaymentMethod), p.ProviderResponse, p.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to create payment: %w", err)
	}
	return nil
}

func (r *paymentRepository) FindByID(id uuid.UUID) (*models.Payment, error) {
	query := `
		SELECT id, booking_id, user_id, amount, currency, status, payment_method, provider_response, created_at
		FROM payments WHERE id = $1
	`
	var p models.Payment
	var providerResp sql.NullString

	err := database.DB.QueryRow(query, id).Scan(
		&p.ID, &p.BookingID, &p.UserID,
		&p.Amount, &p.Currency, &p.Status,
		&p.PaymentMethod, &providerResp, &p.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("payment not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find payment: %w", err)
	}
	if providerResp.Valid {
		p.ProviderResponse = providerResp.String
	}
	return &p, nil
}

func (r *paymentRepository) FindByBookingID(bookingID uuid.UUID) ([]*models.Payment, error) {
	query := `
		SELECT id, booking_id, user_id, amount, currency, status, payment_method, provider_response, created_at
		FROM payments WHERE booking_id = $1 ORDER BY created_at DESC
	`
	rows, err := database.DB.Query(query, bookingID)
	if err != nil {
		return nil, fmt.Errorf("failed to find payments: %w", err)
	}
	defer rows.Close()

	var payments []*models.Payment
	for rows.Next() {
		var p models.Payment
		var providerResp sql.NullString
		if err := rows.Scan(
			&p.ID, &p.BookingID, &p.UserID,
			&p.Amount, &p.Currency, &p.Status,
			&p.PaymentMethod, &providerResp, &p.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan payment: %w", err)
		}
		if providerResp.Valid {
			p.ProviderResponse = providerResp.String
		}
		payments = append(payments, &p)
	}
	return payments, nil
}

func (r *paymentRepository) UpdateStatus(id uuid.UUID, status models.PaymentStatus, providerResponse string) error {
	query := `UPDATE payments SET status = $1, provider_response = $2 WHERE id = $3`
	_, err := database.DB.Exec(query, string(status), providerResponse, id)
	if err != nil {
		return fmt.Errorf("failed to update payment status: %w", err)
	}
	return nil
}
