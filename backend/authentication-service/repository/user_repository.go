package repository

import (
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"authentication-service/database"
	"authentication-service/models"
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
		VALUES (@p1, @p2, @p3, @p4, @p5, @p6, @p7)
	`

	_, err := r.db.Exec(query,
		sql.Named("p1", user.ID),
		sql.Named("p2", user.Email),
		sql.Named("p3", user.PasswordHash),
		sql.Named("p4", user.FullName),
		sql.Named("p5", user.Phone),
		sql.Named("p6", user.CreatedAt),
		sql.Named("p7", user.UpdatedAt),
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
		WHERE email = @p1
	`

	user := &models.User{}
	var updatedAt sql.NullTime

	err := r.db.QueryRow(query, sql.Named("p1", email)).Scan(
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
		WHERE id = @p1
	`

	user := &models.User{}
	var updatedAt sql.NullTime

	err := r.db.QueryRow(query, sql.Named("p1", id)).Scan(
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
		SET email = @p1, password_hash = @p2, full_name = @p3, phone = @p4, updated_at = @p5
		WHERE id = @p6
	`

	_, err := r.db.Exec(query,
		sql.Named("p1", user.Email),
		sql.Named("p2", user.PasswordHash),
		sql.Named("p3", user.FullName),
		sql.Named("p4", user.Phone),
		sql.Named("p5", now),
		sql.Named("p6", user.ID),
	)

	if err != nil {
		return err
	}

	user.UpdatedAt = &now
	return nil
}

