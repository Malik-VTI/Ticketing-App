package middleware

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func InternalAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := c.GetHeader("X-Internal-API-Key")
		expectedKey := os.Getenv("INTERNAL_API_KEY")
		if expectedKey == "" {
			expectedKey = "default-internal-secret" // fallback for local dev
		}

		if apiKey != expectedKey {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized internal request"})
			return
		}
		c.Next()
	}
}
