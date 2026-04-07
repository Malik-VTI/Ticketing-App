package config

import (
	"os"
	"strconv"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	Redis    RedisConfig
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

type JWTConfig struct {
	SecretKey     string
	AccessExpiry  int // in minutes
	RefreshExpiry int // in days
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
	Enabled  bool
}

func LoadConfig() *Config {
	return &Config{
		Server: ServerConfig{
			Port: getEnv("AUTH_SERVICE_PORT", getEnv("SERVER_PORT", "8080")),
			Host: getEnv("AUTH_SERVICE_HOST", getEnv("SERVER_HOST", "0.0.0.0")),
		},
		Database: DatabaseConfig{
			Server:   getEnv("DB_SERVER", "10.100.33.184"),
			Database: getEnv("DB_DATABASE", "ticketing_app"),
			UserID:   getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "P@ssw0rd"),
			Port:     getEnvAsInt("DB_PORT", 5432),
		},
		JWT: JWTConfig{
			SecretKey:     getEnv("JWT_SECRET_KEY", "bGZiXRX7b3FPCzLWkfRLiUtrQ+lknCeKMtSF9+oJKNI="),
			AccessExpiry:  getEnvAsInt("JWT_ACCESS_EXPIRY", 15), // 15 minutes
			RefreshExpiry: getEnvAsInt("JWT_REFRESH_EXPIRY", 7), // 7 days
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnvAsInt("REDIS_DB", 0),
			Enabled:  getEnvAsBool("REDIS_ENABLED", false),
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

func getEnvAsBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

