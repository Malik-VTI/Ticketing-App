package repository

import (
	"database/sql"
	"fmt"
	"time"

	"booking-service/database"
	"booking-service/models"

	"github.com/google/uuid"
)

type BookingRepository interface {
	Create(booking *models.Booking) error
	FindByID(id uuid.UUID) (*models.Booking, error)
	FindByReference(reference string) (*models.Booking, error)
	FindByUserID(userID uuid.UUID, limit, offset int) ([]*models.Booking, error)
	UpdateStatus(id uuid.UUID, status string) error
	Delete(id uuid.UUID) error
}

type bookingRepository struct{}

func NewBookingRepository() BookingRepository {
	return &bookingRepository{}
}

func (r *bookingRepository) Create(booking *models.Booking) error {
	query := `
		INSERT INTO bookings (id, user_id, booking_reference, booking_type, total_amount, currency, status, created_at)
		VALUES (@p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8)
	`
	
	_, err := database.DB.Exec(query,
		booking.ID,
		booking.UserID,
		booking.BookingReference,
		booking.BookingType,
		booking.TotalAmount,
		booking.Currency,
		booking.Status,
		booking.CreatedAt,
	)
	
	if err != nil {
		return fmt.Errorf("failed to create booking: %w", err)
	}
	
	return nil
}

func (r *bookingRepository) FindByID(id uuid.UUID) (*models.Booking, error) {
	query := `
		SELECT id, user_id, booking_reference, booking_type, total_amount, currency, status, created_at, updated_at
		FROM bookings
		WHERE id = @p1
	`
	
	var booking models.Booking
	var updatedAt sql.NullTime
	
	err := database.DB.QueryRow(query, id).Scan(
		&booking.ID,
		&booking.UserID,
		&booking.BookingReference,
		&booking.BookingType,
		&booking.TotalAmount,
		&booking.Currency,
		&booking.Status,
		&booking.CreatedAt,
		&updatedAt,
	)
	
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("booking not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find booking: %w", err)
	}
	
	if updatedAt.Valid {
		booking.UpdatedAt = &updatedAt.Time
	}
	
	return &booking, nil
}

func (r *bookingRepository) FindByReference(reference string) (*models.Booking, error) {
	query := `
		SELECT id, user_id, booking_reference, booking_type, total_amount, currency, status, created_at, updated_at
		FROM bookings
		WHERE booking_reference = @p1
	`
	
	var booking models.Booking
	var updatedAt sql.NullTime
	
	err := database.DB.QueryRow(query, reference).Scan(
		&booking.ID,
		&booking.UserID,
		&booking.BookingReference,
		&booking.BookingType,
		&booking.TotalAmount,
		&booking.Currency,
		&booking.Status,
		&booking.CreatedAt,
		&updatedAt,
	)
	
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("booking not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find booking: %w", err)
	}
	
	if updatedAt.Valid {
		booking.UpdatedAt = &updatedAt.Time
	}
	
	return &booking, nil
}

func (r *bookingRepository) FindByUserID(userID uuid.UUID, limit, offset int) ([]*models.Booking, error) {
	query := `
		SELECT id, user_id, booking_reference, booking_type, total_amount, currency, status, created_at, updated_at
		FROM bookings
		WHERE user_id = @p1
		ORDER BY created_at DESC
		OFFSET @p2 ROWS
		FETCH NEXT @p3 ROWS ONLY
	`
	
	rows, err := database.DB.Query(query, userID, offset, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to find bookings: %w", err)
	}
	defer rows.Close()
	
	var bookings []*models.Booking
	for rows.Next() {
		var booking models.Booking
		var updatedAt sql.NullTime
		
		err := rows.Scan(
			&booking.ID,
			&booking.UserID,
			&booking.BookingReference,
			&booking.BookingType,
			&booking.TotalAmount,
			&booking.Currency,
			&booking.Status,
			&booking.CreatedAt,
			&updatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan booking: %w", err)
		}
		
		if updatedAt.Valid {
			booking.UpdatedAt = &updatedAt.Time
		}
		
		bookings = append(bookings, &booking)
	}
	
	return bookings, nil
}

func (r *bookingRepository) UpdateStatus(id uuid.UUID, status string) error {
	query := `
		UPDATE bookings
		SET status = @p1, updated_at = @p2
		WHERE id = @p3
	`
	
	now := time.Now()
	_, err := database.DB.Exec(query, status, now, id)
	if err != nil {
		return fmt.Errorf("failed to update booking status: %w", err)
	}
	
	return nil
}

func (r *bookingRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM bookings WHERE id = @p1`
	
	_, err := database.DB.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete booking: %w", err)
	}
	
	return nil
}

