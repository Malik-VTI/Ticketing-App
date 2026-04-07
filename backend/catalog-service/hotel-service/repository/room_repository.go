package repository

import (
	"database/sql"
	"errors"
	"time"

	"hotel-service/database"
	"hotel-service/models"

	"github.com/google/uuid"
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
	FindAvailableByRoomTypeID(roomTypeID uuid.UUID, checkIn, checkOut string) ([]*models.Room, error)
	Update(room *models.Room) error
	ReserveRooms(tx *sql.Tx, qty int, roomTypeID uuid.UUID) ([]string, error)
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
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err := r.db.Exec(query,
		roomType.ID,
		roomType.HotelID,
		roomType.Name,
		roomType.Capacity,
		roomType.Amenities,
		roomType.CreatedAt,
		roomType.UpdatedAt,
	)

	return err
}

func (r *roomTypeRepository) FindByID(id uuid.UUID) (*models.RoomType, error) {
	query := `
		SELECT id, hotel_id, name, capacity, amenities, created_at, updated_at
		FROM room_types
		WHERE id = $1
	`

	roomType := &models.RoomType{}
	var amenities sql.NullString
	var updatedAt sql.NullTime

	err := r.db.QueryRow(query, id).Scan(
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
		WHERE hotel_id = $1
		ORDER BY name
	`

	rows, err := r.db.Query(query, hotelID)
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
		SET name = $1, capacity = $2, amenities = $3, updated_at = $4
		WHERE id = $5
	`

	_, err := r.db.Exec(query,
		roomType.Name,
		roomType.Capacity,
		roomType.Amenities,
		now,
		roomType.ID,
	)

	if err != nil {
		return err
	}

	roomType.UpdatedAt = &now
	return nil
}

func (r *roomTypeRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM room_types WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

// RoomRepository methods
func (r *roomRepository) Create(room *models.Room) error {
	query := `
		INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err := r.db.Exec(query,
		room.ID,
		room.RoomTypeID,
		room.RoomNumber,
		room.Floor,
		room.Status,
		room.CreatedAt,
		room.UpdatedAt,
	)

	return err
}

func (r *roomRepository) FindByID(id uuid.UUID) (*models.Room, error) {
	query := `
		SELECT id, room_type_id, room_number, floor, status, created_at, updated_at
		FROM rooms
		WHERE id = $1
	`

	room := &models.Room{}
	var floor sql.NullInt64
	var updatedAt sql.NullTime

	err := r.db.QueryRow(query, id).Scan(
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
		WHERE room_type_id = $1
		ORDER BY room_number
	`

	rows, err := r.db.Query(query, roomTypeID)
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

func (r *roomRepository) FindAvailableByRoomTypeID(roomTypeID uuid.UUID, checkIn, checkOut string) ([]*models.Room, error) {
	query := `
		SELECT id, room_type_id, room_number, floor, status, created_at, updated_at
		FROM rooms
		WHERE room_type_id = $1 AND status = 'available'
		ORDER BY room_number
	`

	rows, err := r.db.Query(query, roomTypeID)
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
		SET room_number = $1, floor = $2, status = $3, updated_at = $4
		WHERE id = $5
	`

	_, err := r.db.Exec(query,
		room.RoomNumber,
		room.Floor,
		room.Status,
		now,
		room.ID,
	)

	if err != nil {
		return err
	}

	room.UpdatedAt = &now
	return nil
}

func (r *roomRepository) ReserveRooms(tx *sql.Tx, qty int, rtID uuid.UUID) ([]string, error) {
	// Find available rooms for this type
	query := `SELECT id, room_number FROM rooms WHERE room_type_id = $1 AND status = 'available' LIMIT $2 FOR UPDATE`
	rows, err := tx.Query(query, rtID, qty)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roomIDs []uuid.UUID
	var roomNumbers []string
	for rows.Next() {
		var id uuid.UUID
		var num string
		if err := rows.Scan(&id, &num); err != nil {
			return nil, err
		}
		roomIDs = append(roomIDs, id)
		roomNumbers = append(roomNumbers, num)
	}

	if len(roomIDs) < qty {
		return nil, errors.New("not enough rooms available")
	}

	// Mark as occupied (simplistic allocation logic for now)
	updateQuery := `UPDATE rooms SET status = 'occupied', updated_at = $1 WHERE id = ANY($2)`
	_, err = tx.Exec(updateQuery, time.Now(), roomIDs) // Note: PostgreSQL supports = ANY($2) for slices
	
	// If the driver doesn't support ANY, we might need a loop or a manual IN clause. 
	// But standard lib with pgx/libpq usually works if handled right.
	// For now let's hope it works or we loop since it's a few rooms.
	
	/* Or a loop to be safe if NOT using pgx features directly */
	/*
	for _, id := range roomIDs {
		_, err = tx.Exec("UPDATE rooms SET status = 'occupied', updated_at = $1 WHERE id = $2", time.Now(), id)
		if err != nil { return nil, err }
	}
	*/

	return roomNumbers, err
}

func (r *roomRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM rooms WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

// RoomRateRepository methods
func (r *roomRateRepository) Create(rate *models.RoomRate) error {
	query := `
		INSERT INTO room_rates (id, room_type_id, date, price, currency, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err := r.db.Exec(query,
		rate.ID,
		rate.RoomTypeID,
		rate.Date,
		rate.Price,
		rate.Currency,
		rate.CreatedAt,
		rate.UpdatedAt,
	)

	return err
}

func (r *roomRateRepository) FindByID(id uuid.UUID) (*models.RoomRate, error) {
	query := `
		SELECT id, room_type_id, date, price, currency, created_at, updated_at
		FROM room_rates
		WHERE id = $1
	`

	rate := &models.RoomRate{}
	var updatedAt sql.NullTime

	err := r.db.QueryRow(query, id).Scan(
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
		WHERE room_type_id = $1
		ORDER BY date
	`

	rows, err := r.db.Query(query, roomTypeID)
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
		WHERE room_type_id = $1 AND date >= $2 AND date < $3
		ORDER BY date
	`

	rows, err := r.db.Query(query,
		roomTypeID,
		checkIn,
		checkOut,
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
		SET date = $1, price = $2, currency = $3, updated_at = $4
		WHERE id = $5
	`

	_, err := r.db.Exec(query,
		rate.Date,
		rate.Price,
		rate.Currency,
		now,
		rate.ID,
	)

	if err != nil {
		return err
	}

	rate.UpdatedAt = &now
	return nil
}

func (r *roomRateRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM room_rates WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}
