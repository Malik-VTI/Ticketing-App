package handlers

import (
	"net/http"
	"log"
	"time"

	"authentication-service/config"
	"authentication-service/models"
	"authentication-service/repository"
	"authentication-service/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AuthHandler struct {
	userRepo repository.UserRepository
	config   *config.Config
}

func NewAuthHandler(userRepo repository.UserRepository, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		userRepo: userRepo,
		config:   cfg,
	}
}

// Register handles user registration
// POST /auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	// Check if user already exists
	_, err := h.userRepo.FindByEmail(req.Email)
	if err == nil {
		c.JSON(http.StatusConflict, models.ErrorResponse{
			Error:   "user_exists",
			Message: "User with this email already exists",
		})
		return
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to hash password",
		})
		return
	}

	// Create user
	user := &models.User{
		ID:           uuid.New(),
		Email:        req.Email,
		PasswordHash: hashedPassword,
		FullName:     req.FullName,
		Phone:        req.Phone,
		CreatedAt:    time.Now(),
	}

	if err := h.userRepo.Create(user); err != nil {
		// Log underlying error so we can debug DB issues (e.g. constraint violations)
		log.Printf("register: failed to create user email=%s: %v", req.Email, err)

		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to create user",
		})
		return
	}

	// Generate tokens
	accessToken, expiresAt, err := utils.GenerateAccessToken(user.ID, user.Email, h.config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to generate access token",
		})
		return
	}

	refreshToken, _, err := utils.GenerateRefreshToken(user.ID, h.config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to generate refresh token",
		})
		return
	}

	// Calculate expires in seconds
	expiresIn := int(time.Until(time.Unix(expiresAt, 0)).Seconds())

	c.JSON(http.StatusCreated, models.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    expiresIn,
		Messages:     "Registration successful",
		User: models.UserInfo{
			ID:       user.ID,
			Email:    user.Email,
			FullName: user.FullName,
			Phone:    user.Phone,
		},
	})
}

// Login handles user authentication
// POST /auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	// Find user by email
	user, err := h.userRepo.FindByEmail(req.Email)
	if err != nil {
		if err.Error() == "user not found" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error:   "invalid_credentials",
				Message: "Invalid email or password",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to authenticate user",
		})
		return
	}

	// Verify password
	if !utils.CheckPasswordHash(req.Password, user.PasswordHash) {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "invalid_credentials",
			Message: "Invalid email or password",
		})
		return
	}

	// Generate tokens
	accessToken, expiresAt, err := utils.GenerateAccessToken(user.ID, user.Email, h.config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to generate access token",
		})
		return
	}

	refreshToken, _, err := utils.GenerateRefreshToken(user.ID, h.config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to generate refresh token",
		})
		return
	}

	// Calculate expires in seconds
	expiresIn := int(time.Until(time.Unix(expiresAt, 0)).Seconds())

	c.JSON(http.StatusOK, models.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    expiresIn,
		Messages:     "Login successful",
		User: models.UserInfo{
			ID:       user.ID,
			Email:    user.Email,
			FullName: user.FullName,
			Phone:    user.Phone,
		},
	})
}

// RefreshToken handles token refresh
// POST /auth/refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req models.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	// Validate refresh token
	claims, err := utils.ValidateRefreshToken(req.RefreshToken, h.config)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "invalid_token",
			Message: "Invalid or expired refresh token",
		})
		return
	}

	// Verify user still exists
	user, err := h.userRepo.FindByID(claims.UserID)
	if err != nil {
		if err.Error() == "user not found" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error:   "user_not_found",
				Message: "User associated with token no longer exists",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to verify user",
		})
		return
	}

	// Generate new tokens
	accessToken, expiresAt, err := utils.GenerateAccessToken(user.ID, user.Email, h.config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to generate access token",
		})
		return
	}

	refreshToken, _, err := utils.GenerateRefreshToken(user.ID, h.config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to generate refresh token",
		})
		return
	}

	// Calculate expires in seconds
	expiresIn := int(time.Until(time.Unix(expiresAt, 0)).Seconds())

	c.JSON(http.StatusOK, models.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    expiresIn,
		User: models.UserInfo{
			ID:       user.ID,
			Email:    user.Email,
			FullName: user.FullName,
			Phone:    user.Phone,
		},
	})
}

// GetProfile returns the current user's profile
// GET /auth/profile
func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User ID not found in context",
		})
		return
	}

	uuidUserID, ok := userID.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Invalid user ID format",
		})
		return
	}

	user, err := h.userRepo.FindByID(uuidUserID)
	if err != nil {
		if err.Error() == "user not found" {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "user_not_found",
				Message: "User not found",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to fetch user",
		})
		return
	}

	c.JSON(http.StatusOK, models.UserInfo{
		ID:       user.ID,
		Email:    user.Email,
		FullName: user.FullName,
		Phone:    user.Phone,
	})
}
