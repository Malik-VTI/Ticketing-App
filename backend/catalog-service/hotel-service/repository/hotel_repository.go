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
		VALUES (@p1, @p2, @p3, @p4, @p5, @p6, @p7)
	`

	_, err := r.db.Exec(query,
		sql.Named("p1", hotel.ID),
		sql.Named("p2", hotel.Name),
		sql.Named("p3", hotel.Address),
		sql.Named("p4", hotel.City),
		sql.Named("p5", hotel.Rating),
		sql.Named("p6", hotel.CreatedAt),
		sql.Named("p7", hotel.UpdatedAt),
	)

	return err
}

func (r *hotelRepository) FindByID(id uuid.UUID) (*models.Hotel, error) {
	query := `
		SELECT CONVERT(VARCHAR(36), id) as id, name, address, city, rating, created_at, updated_at
		FROM hotels
		WHERE id = @p1
	`

	hotel := &models.Hotel{}
	var idStr string
	var rating sql.NullFloat64
	var updatedAt sql.NullTime

	err := r.db.QueryRow(query, sql.Named("p1", id)).Scan(
		&idStr,
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

	hotel.ID, err = uuid.Parse(idStr)
	if err != nil {
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
	countQuery := `SELECT COUNT(*) FROM hotels WHERE city LIKE @p1`
	var total int
	err := r.db.QueryRow(countQuery, sql.Named("p1", "%"+city+"%")).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get hotels
	query := `
		SELECT CONVERT(VARCHAR(36), id) as id, name, address, city, rating, created_at, updated_at
		FROM hotels
		WHERE city LIKE @p1
		ORDER BY name
		OFFSET @p2 ROWS
		FETCH NEXT @p3 ROWS ONLY
	`

	rows, err := r.db.Query(query,
		sql.Named("p1", "%"+city+"%"),
		sql.Named("p2", page*size),
		sql.Named("p3", size),
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var hotels []*models.Hotel
	for rows.Next() {
		hotel := &models.Hotel{}
		var idStr string
		var rating sql.NullFloat64
		var updatedAt sql.NullTime

		if err := rows.Scan(
			&idStr,
			&hotel.Name,
			&hotel.Address,
			&hotel.City,
			&rating,
			&hotel.CreatedAt,
			&updatedAt,
		); err != nil {
			return nil, 0, err
		}

		hotel.ID, err = uuid.Parse(idStr)
		if err != nil {
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
		SELECT CONVERT(VARCHAR(36), id) as id, name, address, city, rating, created_at, updated_at
		FROM hotels
		ORDER BY name
		OFFSET @p1 ROWS
		FETCH NEXT @p2 ROWS ONLY
	`

	rows, err := r.db.Query(query,
		sql.Named("p1", page*size),
		sql.Named("p2", size),
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var hotels []*models.Hotel
	for rows.Next() {
		hotel := &models.Hotel{}
		var idStr string
		var rating sql.NullFloat64
		var updatedAt sql.NullTime

		if err := rows.Scan(
			&idStr,
			&hotel.Name,
			&hotel.Address,
			&hotel.City,
			&rating,
			&hotel.CreatedAt,
			&updatedAt,
		); err != nil {
			return nil, 0, err
		}

		hotel.ID, err = uuid.Parse(idStr)
		if err != nil {
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
		SET name = @p1, address = @p2, city = @p3, rating = @p4, updated_at = @p5
		WHERE id = @p6
	`

	_, err := r.db.Exec(query,
		sql.Named("p1", hotel.Name),
		sql.Named("p2", hotel.Address),
		sql.Named("p3", hotel.City),
		sql.Named("p4", hotel.Rating),
		sql.Named("p5", now),
		sql.Named("p6", hotel.ID),
	)

	if err != nil {
		return err
	}

	hotel.UpdatedAt = &now
	return nil
}

func (r *hotelRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM hotels WHERE id = @p1`
	_, err := r.db.Exec(query, sql.Named("p1", id))
	return err
}

