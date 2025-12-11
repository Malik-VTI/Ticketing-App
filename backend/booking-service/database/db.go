package database

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/denisenkom/go-mssqldb"
	"booking-service/config"
)

var DB *sql.DB

func InitDB(cfg *config.Config) error {
	connectionString := fmt.Sprintf(
		"server=%s;user id=%s;password=%s;database=%s;port=%d;encrypt=disable;TrustServerCertificate=true",
		cfg.Database.Server,
		cfg.Database.UserID,
		cfg.Database.Password,
		cfg.Database.Database,
		cfg.Database.Port,
	)

	var err error
	DB, err = sql.Open("sqlserver", connectionString)
	if err != nil {
		return fmt.Errorf("failed to open database connection: %w", err)
	}

	if err := DB.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	// Set connection pool settings
	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)

	log.Println("Database connection established successfully")
	return nil
}

func CloseDB() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}

