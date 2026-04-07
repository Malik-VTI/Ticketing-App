package cache

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

var client *redis.Client
var enabled bool

// InitRedis initialises the Redis client if REDIS_ENABLED=true.
// If Redis is unavailable the service starts normally without locking.
func InitRedis() {
	enabled = os.Getenv("REDIS_ENABLED") == "true"
	if !enabled {
		log.Println("Redis disabled (REDIS_ENABLED != true). Seat locking will be skipped.")
		return
	}

	host := getEnv("REDIS_HOST", "localhost")
	port := getEnv("REDIS_PORT", "6379")
	password := getEnv("REDIS_PASSWORD", "")
	db := getEnvAsInt("REDIS_DB", 0)

	client = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", host, port),
		Password: password,
		DB:       db,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("Warning: Redis ping failed (%v). Seat locking will be skipped.", err)
		enabled = false
		client = nil
		return
	}

	log.Printf("Redis connected at %s:%s (db=%d)", host, port, db)
}

func CloseRedis() {
	if client != nil {
		_ = client.Close()
	}
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getEnvAsInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return def
}
