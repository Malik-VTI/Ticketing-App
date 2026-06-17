package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"authentication-service/config"
	"authentication-service/database"
	"authentication-service/repository"
	"authentication-service/routes"

	"github.com/joho/godotenv"
)

// @title Authentication Service API
// @version 1.0
// @description Authentication service handling user registration, login, JWT issuance/refresh and profile retrieval for the ticketing platform.
// @BasePath /
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {
	// Configure structured (JSON) logging as the default logger.
	logLevel := slog.LevelInfo
	switch strings.ToLower(os.Getenv("LOG_LEVEL")) {
	case "debug":
		logLevel = slog.LevelDebug
	case "warn":
		logLevel = slog.LevelWarn
	case "error":
		logLevel = slog.LevelError
	}
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel})))

	// Load .env file from project root
	// Try to find project root (go up from authentication-service to project root)
	workDir, _ := os.Getwd()
	envPath := filepath.Join(workDir, "..", "..", ".env")

	// If .env exists in project root, load it
	if _, err := os.Stat(envPath); err == nil {
		if err := godotenv.Load(envPath); err != nil {
			log.Printf("Warning: Failed to load .env from project root: %v", err)
		} else {
			log.Printf("Loaded .env from project root: %s", envPath)
		}
	} else {
		// Try loading from current directory as fallback
		if err := godotenv.Load(); err != nil {
			log.Printf("Warning: No .env file found. Using environment variables or defaults.")
		}
	}

	// Load configuration
	cfg := config.LoadConfig()

	// Initialize database
	if err := database.InitDB(cfg); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.CloseDB()

	// Initialize repository
	userRepo := repository.NewUserRepository()

	// Setup routes
	router := routes.SetupRoutes(cfg, userRepo)

	// Create HTTP server
	serverAddr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	srv := &http.Server{
		Addr:    serverAddr,
		Handler: router,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Authentication service starting on %s", serverAddr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
