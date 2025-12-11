package repository

import (
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"hotel-service/database"
	"hotel-service/models"
)

type RoomTypeRepository interface {
	Create(roomType *models.RoomType) error
	FindByID(id uuid.UUID) (*models.RoomType, error)
	FindByHotelID(hotelID uuid.UUID) ([]*models.RoomType, error)
	Update(roomType *models.RoomType) error
	Delete(id uuid.UUID) error
}

type RoomRepository interface {
	Create(room *models.Room) error
	FindByID(id uuid.UUID) (*models.Room, error)
	FindByRoomTypeID(roomTypeID uuid.UUID) ([]*models.Room, error)
	FindAvailableByRoomTypeID(roomTypeID uuid.UUID) ([]*models.Room, error)
	Update(room *models.Room) error
	Delete(id uuid.UUID) error
}

type RoomRateRepository interface {
	Create(rate *models.RoomRate) error
	FindByID(id uuid.UUID) (*models.RoomRate, error)
	FindByRoomTypeID(roomTypeID uuid.UUID) ([]*models.RoomRate, error)
	FindByRoomTypeIDAndDateRange(roomTypeID uuid.UUID, checkIn, checkOut time.Time) ([]*models.RoomRate, error)
	Update(rate *models.RoomRate) error
	Delete(id uuid.UUID) error
}

type roomTypeRepository struct {
	db *sql.DB
}

type roomRepository struct {
	db *sql.DB
}

type roomRateRepository struct {
	db *sql.DB
}

func NewRoomTypeRepository() RoomTypeRepository {
	return &roomTypeRepository{db: database.DB}
}

func NewRoomRepository() RoomRepository {
	return &roomRepository{db: database.DB}
}

func NewRoomRateRepository() RoomRateRepository {
	return &roomRateRepository{db: database.DB}
}

// RoomTypeRepository methods
func (r *roomTypeRepository) Create(roomType *models.RoomType) error {
	query := `
		INSERT INTO room_types (id, hotel_id, name, capacity, amenities, created_at, updated_at)
		VALUES (@p1, @p2, @p3, @p4, @p5, @p6, @p7)
	`

	_, err := r.db.Exec(query,
		sql.Named("p1", roomType.ID),
		sql.Named("p2", roomType.HotelID),
		sql.Named("p3", roomType.Name),
		sql.Named("p4", roomType.Capacity),
		sql.Named("p5", roomType.Amenities),
		sql.Named("p6", roomType.CreatedAt),
		sql.Named("p7", roomType.UpdatedAt),
	)

	return err
}

func (r *roomTypeRepository) FindByID(id uuid.UUID) (*models.RoomType, error) {
	query := `
		SELECT id, hotel_id, name, capacity, amenities, created_at, updated_at
		FROM room_types
		WHERE id = @p1
	`

	roomType := &models.RoomType{}
	var amenities sql.NullString
	var updatedAt sql.NullTime

	err := r.db.QueryRow(query, sql.Named("p1", id)).Scan(
		&roomType.ID,
		&roomType.HotelID,
		&roomType.Name,
		&roomType.Capacity,
		&amenities,
		&roomType.CreatedAt,
		&updatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("room type not found")
		}
		return nil, err
	}

	if amenities.Valid {
		roomType.Amenities = &amenities.String
	}
	if updatedAt.Valid {
		roomType.UpdatedAt = &updatedAt.Time
	}

	return roomType, nil
}

func (r *roomTypeRepository) FindByHotelID(hotelID uuid.UUID) ([]*models.RoomType, error) {
	query := `
		SELECT id, hotel_id, name, capacity, amenities, created_at, updated_at
		FROM room_types
		WHERE hotel_id = @p1
		ORDER BY name
	`

	rows, err := r.db.Query(query, sql.Named("p1", hotelID))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roomTypes []*models.RoomType
	for rows.Next() {
		rt := &models.RoomType{}
		var amenities sql.NullString
		var updatedAt sql.NullTime

		if err := rows.Scan(
			&rt.ID,
			&rt.HotelID,
			&rt.Name,
			&rt.Capacity,
			&amenities,
			&rt.CreatedAt,
			&updatedAt,
		); err != nil {
			return nil, err
		}

		if amenities.Valid {
			rt.Amenities = &amenities.String
		}
		if updatedAt.Valid {
			rt.UpdatedAt = &updatedAt.Time
		}

		roomTypes = append(roomTypes, rt)
	}

	return roomTypes, nil
}

func (r *roomTypeRepository) Update(roomType *models.RoomType) error {
	now := time.Now()
	query := `
		UPDATE room_types
		SET name = @p1, capacity = @p2, amenities = @p3, updated_at = @p4
		WHERE id = @p5
	`

	_, err := r.db.Exec(query,
		sql.Named("p1", roomType.Name),
		sql.Named("p2", roomType.Capacity),
		sql.Named("p3", roomType.Amenities),
		sql.Named("p4", now),
		sql.Named("p5", roomType.ID),
	)

	if err != nil {
		return err
	}

	roomType.UpdatedAt = &now
	return nil
}

func (r *roomTypeRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM room_types WHERE id = @p1`
	_, err := r.db.Exec(query, sql.Named("p1", id))
	return err
}

// RoomRepository methods
func (r *roomRepository) Create(room *models.Room) error {
	query := `
		INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
		VALUES (@p1, @p2, @p3, @p4, @p5, @p6, @p7)
	`

	_, err := r.db.Exec(query,
		sql.Named("p1", room.ID),
		sql.Named("p2", room.RoomTypeID),
		sql.Named("p3", room.RoomNumber),
		sql.Named("p4", room.Floor),
		sql.Named("p5", room.Status),
		sql.Named("p6", room.CreatedAt),
		sql.Named("p7", room.UpdatedAt),
	)

	return err
}

func (r *roomRepository) FindByID(id uuid.UUID) (*models.Room, error) {
	query := `
		SELECT id, room_type_id, room_number, floor, status, created_at, updated_at
		FROM rooms
		WHERE id = @p1
	`

	room := &models.Room{}
	var floor sql.NullInt64
	var updatedAt sql.NullTime

	err := r.db.QueryRow(query, sql.Named("p1", id)).Scan(
		&room.ID,
		&room.RoomTypeID,
		&room.RoomNumber,
		&floor,
		&room.Status,
		&room.CreatedAt,
		&updatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("room not found")
		}
		return nil, err
	}

	if floor.Valid {
		floorInt := int(floor.Int64)
		room.Floor = &floorInt
	}
	if updatedAt.Valid {
		room.UpdatedAt = &updatedAt.Time
	}

	return room, nil
}

func (r *roomRepository) FindByRoomTypeID(roomTypeID uuid.UUID) ([]*models.Room, error) {
	query := `
		SELECT id, room_type_id, room_number, floor, status, created_at, updated_at
		FROM rooms
		WHERE room_type_id = @p1
		ORDER BY room_number
	`

	rows, err := r.db.Query(query, sql.Named("p1", roomTypeID))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rooms []*models.Room
	for rows.Next() {
		room := &models.Room{}
		var floor sql.NullInt64
		var updatedAt sql.NullTime

		if err := rows.Scan(
			&room.ID,
			&room.RoomTypeID,
			&room.RoomNumber,
			&floor,
			&room.Status,
			&room.CreatedAt,
			&updatedAt,
		); err != nil {
			return nil, err
		}

		if floor.Valid {
			floorInt := int(floor.Int64)
			room.Floor = &floorInt
		}
		if updatedAt.Valid {
			room.UpdatedAt = &updatedAt.Time
		}

		rooms = append(rooms, room)
	}

	return rooms, nil
}

func (r *roomRepository) FindAvailableByRoomTypeID(roomTypeID uuid.UUID) ([]*models.Room, error) {
	query := `
		SELECT id, room_type_id, room_number, floor, status, created_at, updated_at
		FROM rooms
		WHERE room_type_id = @p1 AND status = 'available'
		ORDER BY room_number
	`

	rows, err := r.db.Query(query, sql.Named("p1", roomTypeID))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rooms []*models.Room
	for rows.Next() {
		room := &models.Room{}
		var floor sql.NullInt64
		var updatedAt sql.NullTime

		if err := rows.Scan(
			&room.ID,
			&room.RoomTypeID,
			&room.RoomNumber,
			&floor,
			&room.Status,
			&room.CreatedAt,
			&updatedAt,
		); err != nil {
			return nil, err
		}

		if floor.Valid {
			floorInt := int(floor.Int64)
			room.Floor = &floorInt
		}
		if updatedAt.Valid {
			room.UpdatedAt = &updatedAt.Time
		}

		rooms = append(rooms, room)
	}

	return rooms, nil
}

func (r *roomRepository) Update(room *models.Room) error {
	now := time.Now()
	query := `
		UPDATE rooms
		SET room_number = @p1, floor = @p2, status = @p3, updated_at = @p4
		WHERE id = @p5
	`

	_, err := r.db.Exec(query,
		sql.Named("p1", room.RoomNumber),
		sql.Named("p2", room.Floor),
		sql.Named("p3", room.Status),
		sql.Named("p4", now),
		sql.Named("p5", room.ID),
	)

	if err != nil {
		return err
	}

	room.UpdatedAt = &now
	return nil
}

func (r *roomRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM rooms WHERE id = @p1`
	_, err := r.db.Exec(query, sql.Named("p1", id))
	return err
}

// RoomRateRepository methods
func (r *roomRateRepository) Create(rate *models.RoomRate) error {
	query := `
		INSERT INTO room_rates (id, room_type_id, date, price, currency, created_at, updated_at)
		VALUES (@p1, @p2, @p3, @p4, @p5, @p6, @p7)
	`

	_, err := r.db.Exec(query,
		sql.Named("p1", rate.ID),
		sql.Named("p2", rate.RoomTypeID),
		sql.Named("p3", rate.Date),
		sql.Named("p4", rate.Price),
		sql.Named("p5", rate.Currency),
		sql.Named("p6", rate.CreatedAt),
		sql.Named("p7", rate.UpdatedAt),
	)

	return err
}

func (r *roomRateRepository) FindByID(id uuid.UUID) (*models.RoomRate, error) {
	query := `
		SELECT id, room_type_id, date, price, currency, created_at, updated_at
		FROM room_rates
		WHERE id = @p1
	`

	rate := &models.RoomRate{}
	var updatedAt sql.NullTime

	err := r.db.QueryRow(query, sql.Named("p1", id)).Scan(
		&rate.ID,
		&rate.RoomTypeID,
		&rate.Date,
		&rate.Price,
		&rate.Currency,
		&rate.CreatedAt,
		&updatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("room rate not found")
		}
		return nil, err
	}

	if updatedAt.Valid {
		rate.UpdatedAt = &updatedAt.Time
	}

	return rate, nil
}

func (r *roomRateRepository) FindByRoomTypeID(roomTypeID uuid.UUID) ([]*models.RoomRate, error) {
	query := `
		SELECT id, room_type_id, date, price, currency, created_at, updated_at
		FROM room_rates
		WHERE room_type_id = @p1
		ORDER BY date
	`

	rows, err := r.db.Query(query, sql.Named("p1", roomTypeID))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rates []*models.RoomRate
	for rows.Next() {
		rate := &models.RoomRate{}
		var updatedAt sql.NullTime

		if err := rows.Scan(
			&rate.ID,
			&rate.RoomTypeID,
			&rate.Date,
			&rate.Price,
			&rate.Currency,
			&rate.CreatedAt,
			&updatedAt,
		); err != nil {
			return nil, err
		}

		if updatedAt.Valid {
			rate.UpdatedAt = &updatedAt.Time
		}

		rates = append(rates, rate)
	}

	return rates, nil
}

func (r *roomRateRepository) FindByRoomTypeIDAndDateRange(roomTypeID uuid.UUID, checkIn, checkOut time.Time) ([]*models.RoomRate, error) {
	query := `
		SELECT id, room_type_id, date, price, currency, created_at, updated_at
		FROM room_rates
		WHERE room_type_id = @p1 AND date >= @p2 AND date < @p3
		ORDER BY date
	`

	rows, err := r.db.Query(query,
		sql.Named("p1", roomTypeID),
		sql.Named("p2", checkIn),
		sql.Named("p3", checkOut),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rates []*models.RoomRate
	for rows.Next() {
		rate := &models.RoomRate{}
		var updatedAt sql.NullTime

		if err := rows.Scan(
			&rate.ID,
			&rate.RoomTypeID,
			&rate.Date,
			&rate.Price,
			&rate.Currency,
			&rate.CreatedAt,
			&updatedAt,
		); err != nil {
			return nil, err
		}

		if updatedAt.Valid {
			rate.UpdatedAt = &updatedAt.Time
		}

		rates = append(rates, rate)
	}

	return rates, nil
}

func (r *roomRateRepository) Update(rate *models.RoomRate) error {
	now := time.Now()
	query := `
		UPDATE room_rates
		SET date = @p1, price = @p2, currency = @p3, updated_at = @p4
		WHERE id = @p5
	`

	_, err := r.db.Exec(query,
		sql.Named("p1", rate.Date),
		sql.Named("p2", rate.Price),
		sql.Named("p3", rate.Currency),
		sql.Named("p4", now),
		sql.Named("p5", rate.ID),
	)

	if err != nil {
		return err
	}

	rate.UpdatedAt = &now
	return nil
}

func (r *roomRateRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM room_rates WHERE id = @p1`
	_, err := r.db.Exec(query, sql.Named("p1", id))
	return err
}

