package repository

import (
	"database/sql"
	"errors"
	"time"

	"authentication-service/database"
	"authentication-service/models"

	"github.com/google/uuid"
)

type UserRepository interface {
	Create(user *models.User) error
	FindByEmail(email string) (*models.User, error)
	FindByID(id uuid.UUID) (*models.User, error)
	Update(user *models.User) error
}

type userRepository struct {
	db *sql.DB
}

func NewUserRepository() UserRepository {
	return &userRepository{
		db: database.DB,
	}
}

func (r *userRepository) Create(user *models.User) error {
	query := `
		INSERT INTO users (id, email, password_hash, full_name, phone, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err := r.db.Exec(query,
		user.ID,
		user.Email,
		user.PasswordHash,
		user.FullName,
		user.Phone,
		user.CreatedAt,
		user.UpdatedAt,
	)

	if err != nil {
		return err
	}

	return nil
}

func (r *userRepository) FindByEmail(email string) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, full_name, phone, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	user := &models.User{}
	var updatedAt sql.NullTime

	err := r.db.QueryRow(query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FullName,
		&user.Phone,
		&user.CreatedAt,
		&updatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	if updatedAt.Valid {
		user.UpdatedAt = &updatedAt.Time
	}

	return user, nil
}

func (r *userRepository) FindByID(id uuid.UUID) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, full_name, phone, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	user := &models.User{}
	var updatedAt sql.NullTime

	err := r.db.QueryRow(query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FullName,
		&user.Phone,
		&user.CreatedAt,
		&updatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	if updatedAt.Valid {
		user.UpdatedAt = &updatedAt.Time
	}

	return user, nil
}

func (r *userRepository) Update(user *models.User) error {
	now := time.Now()
	query := `
		UPDATE users
		SET email = $1, password_hash = $2, full_name = $3, phone = $4, updated_at = $5
		WHERE id = $6
	`

	_, err := r.db.Exec(query,
		user.Email,
		user.PasswordHash,
		user.FullName,
		user.Phone,
		now,
		user.ID,
	)

	if err != nil {
		return err
	}

	user.UpdatedAt = &now
	return nil
}
