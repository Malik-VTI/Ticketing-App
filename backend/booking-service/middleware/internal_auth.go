package middleware

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func InternalAuthMiddleware() gin.HandlerFunc {
	expectedKey := os.Getenv("INTERNAL_API_KEY")
	if expectedKey == "" {
		log.Fatal("FATAL: INTERNAL_API_KEY environment variable is required")
	}
	return func(c *gin.Context) {
		apiKey := c.GetHeader("X-Internal-API-Key")
		if apiKey != expectedKey {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized internal request"})
			return
		}
		c.Next()
	}
}
