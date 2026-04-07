package repository

import (
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"hotel-service/database"
	"hotel-service/models"
)

type HotelRepository interface {
	Create(hotel *models.Hotel) error
	FindByID(id uuid.UUID) (*models.Hotel, error)
	FindByCity(city string, page, size int) ([]*models.Hotel, int, error)
	FindAll(page, size int) ([]*models.Hotel, int, error)
	Update(hotel *models.Hotel) error
	Delete(id uuid.UUID) error
}

type hotelRepository struct {
	db *sql.DB
}

func NewHotelRepository() HotelRepository {
	return &hotelRepository{
		db: database.DB,
	}
}

func (r *hotelRepository) Create(hotel *models.Hotel) error {
	query := `
		INSERT INTO hotels (id, name, address, city, rating, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err := r.db.Exec(query,
		hotel.ID,
		hotel.Name,
		hotel.Address,
		hotel.City,
		hotel.Rating,
		hotel.CreatedAt,
		hotel.UpdatedAt,
	)

	return err
}

func (r *hotelRepository) FindByID(id uuid.UUID) (*models.Hotel, error) {
	query := `
		SELECT id, name, address, city, rating, created_at, updated_at
		FROM hotels
		WHERE id = $1
	`

	hotel := &models.Hotel{}
	var rating sql.NullFloat64
	var updatedAt sql.NullTime

	err := r.db.QueryRow(query, id).Scan(
		&hotel.ID,
		&hotel.Name,
		&hotel.Address,
		&hotel.City,
		&rating,
		&hotel.CreatedAt,
		&updatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("hotel not found")
		}
		return nil, err
	}

	if rating.Valid {
		hotel.Rating = &rating.Float64
	}
	if updatedAt.Valid {
		hotel.UpdatedAt = &updatedAt.Time
	}

	return hotel, nil
}

func (r *hotelRepository) FindByCity(city string, page, size int) ([]*models.Hotel, int, error) {
	// Count total
	countQuery := `SELECT COUNT(*) FROM hotels WHERE city ILIKE $1`
	var total int
	err := r.db.QueryRow(countQuery, "%"+city+"%").Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get hotels
	query := `
		SELECT id, name, address, city, rating, created_at, updated_at
		FROM hotels
		WHERE city ILIKE $1
		ORDER BY name
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(query,
		"%"+city+"%",
		size,
		page*size,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var hotels []*models.Hotel
	for rows.Next() {
		hotel := &models.Hotel{}
		var rating sql.NullFloat64
		var updatedAt sql.NullTime

		if err := rows.Scan(
			&hotel.ID,
			&hotel.Name,
			&hotel.Address,
			&hotel.City,
			&rating,
			&hotel.CreatedAt,
			&updatedAt,
		); err != nil {
			return nil, 0, err
		}

		if rating.Valid {
			hotel.Rating = &rating.Float64
		}
		if updatedAt.Valid {
			hotel.UpdatedAt = &updatedAt.Time
		}

		hotels = append(hotels, hotel)
	}

	return hotels, total, nil
}

func (r *hotelRepository) FindAll(page, size int) ([]*models.Hotel, int, error) {
	// Count total
	countQuery := `SELECT COUNT(*) FROM hotels`
	var total int
	err := r.db.QueryRow(countQuery).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get hotels
	query := `
		SELECT id, name, address, city, rating, created_at, updated_at
		FROM hotels
		ORDER BY name
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.Query(query,
		size,
		page*size,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var hotels []*models.Hotel
	for rows.Next() {
		hotel := &models.Hotel{}
		var rating sql.NullFloat64
		var updatedAt sql.NullTime

		if err := rows.Scan(
			&hotel.ID,
			&hotel.Name,
			&hotel.Address,
			&hotel.City,
			&rating,
			&hotel.CreatedAt,
			&updatedAt,
		); err != nil {
			return nil, 0, err
		}

		if rating.Valid {
			hotel.Rating = &rating.Float64
		}
		if updatedAt.Valid {
			hotel.UpdatedAt = &updatedAt.Time
		}

		hotels = append(hotels, hotel)
	}

	return hotels, total, nil
}

func (r *hotelRepository) Update(hotel *models.Hotel) error {
	now := time.Now()
	query := `
		UPDATE hotels
		SET name = $1, address = $2, city = $3, rating = $4, updated_at = $5
		WHERE id = $6
	`

	_, err := r.db.Exec(query,
		hotel.Name,
		hotel.Address,
		hotel.City,
		hotel.Rating,
		now,
		hotel.ID,
	)

	if err != nil {
		return err
	}

	hotel.UpdatedAt = &now
	return nil
}

func (r *hotelRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM hotels WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

