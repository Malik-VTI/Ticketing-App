package repository

import (
	"database/sql"
	"fmt"

	"booking-service/database"
	"booking-service/models"

	"github.com/google/uuid"
)

type BookingItemRepository interface {
	Create(item *models.BookingItem) error
	CreateWithTx(tx *sql.Tx, item *models.BookingItem) error
	FindByBookingID(bookingID uuid.UUID) ([]*models.BookingItem, error)
	DeleteByBookingID(bookingID uuid.UUID) error
}

type bookingItemRepository struct{}

func NewBookingItemRepository() BookingItemRepository {
	return &bookingItemRepository{}
}

func (r *bookingItemRepository) Create(item *models.BookingItem) error {
	query := `
		INSERT INTO booking_items (id, booking_id, item_type, item_ref_id, price, quantity, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err := database.DB.Exec(query,
		item.ID,
		item.BookingID,
		item.ItemType,
		item.ItemRefID,
		item.Price,
		item.Quantity,
		item.Metadata,
		item.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create booking item: %w", err)
	}

	return nil
}

func (r *bookingItemRepository) CreateWithTx(tx *sql.Tx, item *models.BookingItem) error {
	query := `
		INSERT INTO booking_items (id, booking_id, item_type, item_ref_id, price, quantity, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err := tx.Exec(query,
		item.ID,
		item.BookingID,
		item.ItemType,
		item.ItemRefID,
		item.Price,
		item.Quantity,
		item.Metadata,
		item.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create booking item: %w", err)
	}

	return nil
}

func (r *bookingItemRepository) FindByBookingID(bookingID uuid.UUID) ([]*models.BookingItem, error) {
	query := `
		SELECT id, booking_id, item_type, item_ref_id, price, quantity, metadata, created_at, updated_at
		FROM booking_items
		WHERE booking_id = $1
		ORDER BY created_at ASC
	`

	rows, err := database.DB.Query(query, bookingID)
	if err != nil {
		return nil, fmt.Errorf("failed to find booking items: %w", err)
	}
	defer rows.Close()

	var items []*models.BookingItem
	for rows.Next() {
		var item models.BookingItem
		var updatedAt sql.NullTime

		err := rows.Scan(
			&item.ID,
			&item.BookingID,
			&item.ItemType,
			&item.ItemRefID,
			&item.Price,
			&item.Quantity,
			&item.Metadata,
			&item.CreatedAt,
			&updatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan booking item: %w", err)
		}

		if updatedAt.Valid {
			item.UpdatedAt = &updatedAt.Time
		}

		items = append(items, &item)
	}

	return items, nil
}

func (r *bookingItemRepository) DeleteByBookingID(bookingID uuid.UUID) error {
	query := `DELETE FROM booking_items WHERE booking_id = $1`

	_, err := database.DB.Exec(query, bookingID)
	if err != nil {
		return fmt.Errorf("failed to delete booking items: %w", err)
	}

	return nil
}
