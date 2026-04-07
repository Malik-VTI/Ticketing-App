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

	"notification-service/internal/handlers"
	"notification-service/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	workDir, _ := os.Getwd()
	envPath := filepath.Join(workDir, "..", "..", ".env")
	if _, err := os.Stat(envPath); err == nil {
		if err := godotenv.Load(envPath); err != nil {
			log.Printf("Warning: Failed to load .env: %v", err)
		}
	} else {
		_ = godotenv.Load()
	}

	port := os.Getenv("NOTIFICATION_SERVICE_PORT")
	if port == "" {
		port = "8087"
	}
	host := os.Getenv("NOTIFICATION_SERVICE_HOST")
	if host == "" {
		host = "0.0.0.0"
	}

	emailSvc := service.NewEmailService()
	handler := handlers.NewNotificationHandler(emailSvc)

	router := gin.Default()

	// CORS
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	router.GET("/health", handler.Health)

	// Internal route — no auth required (service-to-service)
	notifications := router.Group("/notifications")
	{
		notifications.POST("/send", handler.Send)
	}

	serverAddr := fmt.Sprintf("%s:%s", host, port)
	srv := &http.Server{Addr: serverAddr, Handler: router}

	go func() {
		log.Printf("Notification service starting on %s", serverAddr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down notification service...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("Notification service exited")
}
