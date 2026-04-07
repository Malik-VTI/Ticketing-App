package config

import (
	"os"
	"strconv"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
}

type ServerConfig struct {
	Port string
	Host string
}

type DatabaseConfig struct {
	Server   string
	Database string
	UserID   string
	Password string
	Port     int
}

func LoadConfig() *Config {
	return &Config{
		Server: ServerConfig{
			Port: getEnv("HOTEL_SERVICE_PORT", getEnv("SERVER_PORT", "8085")),
			Host: getEnv("HOTEL_SERVICE_HOST", getEnv("SERVER_HOST", "0.0.0.0")),
		},
		Database: DatabaseConfig{
			Server:   getEnv("DB_SERVER", "10.100.33.184"),
			Database: getEnv("DB_DATABASE", "ticketing_app"),
			UserID:   getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "P@ssw0rd"),
			Port:     getEnvAsInt("DB_PORT", 5432),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
