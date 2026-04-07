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

	"payment-service/config"
	"payment-service/database"
	"payment-service/repository"
	"payment-service/routes"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env from project root
	workDir, _ := os.Getwd()
	envPath := filepath.Join(workDir, "..", "..", ".env")
	if _, err := os.Stat(envPath); err == nil {
		if err := godotenv.Load(envPath); err != nil {
			log.Printf("Warning: Failed to load .env: %v", err)
		} else {
			log.Printf("Loaded .env from %s", envPath)
		}
	} else {
		if err := godotenv.Load(); err != nil {
			log.Println("Warning: No .env file found. Using environment variables or defaults.")
		}
	}

	cfg := config.LoadConfig()

	if err := database.InitDB(cfg); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.CloseDB()

	paymentRepo := repository.NewPaymentRepository()
	router := routes.SetupRoutes(paymentRepo)

	serverAddr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	srv := &http.Server{
		Addr:    serverAddr,
		Handler: router,
	}

	go func() {
		log.Printf("Payment service starting on %s", serverAddr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down payment service...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("Payment service exited")
}
