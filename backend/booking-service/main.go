package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"booking-service/cache"
	"booking-service/config"
	"booking-service/database"
	"booking-service/repository"
	"booking-service/routes"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env file from project root
	workDir, _ := os.Getwd()
	envPath := filepath.Join(workDir, "..", "..", ".env")

	if _, err := os.Stat(envPath); err == nil {
		if err := godotenv.Load(envPath); err != nil {
			log.Printf("Warning: Failed to load .env from project root: %v", err)
		} else {
			log.Printf("Loaded .env from project root: %s", envPath)
		}
	} else {
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

	// Initialize Redis (optional — degrades gracefully if unavailable)
	cache.InitRedis()
	defer cache.CloseRedis()

	// Initialize repositories
	bookingRepo := repository.NewBookingRepository()
	bookingItemRepo := repository.NewBookingItemRepository()

	// Setup routes
	router := routes.SetupRoutes(bookingRepo, bookingItemRepo)

	// Create HTTP server
	serverAddr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	srv := &http.Server{
		Addr:    serverAddr,
		Handler: router,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Booking service starting on %s", serverAddr)
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
