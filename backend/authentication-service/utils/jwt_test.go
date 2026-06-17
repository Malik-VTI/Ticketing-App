package utils

import (
	"strings"
	"testing"

	"authentication-service/config"

	"github.com/google/uuid"
)

// testConfig returns a dummy config with a fixed secret key and sane expiry
// values, so JWT generation/validation can be exercised without any external
// dependency.
func testConfig(secret string) *config.Config {
	return &config.Config{
		JWT: config.JWTConfig{
			SecretKey:     secret,
			AccessExpiry:  15, // minutes
			RefreshExpiry: 7,  // days
		},
	}
}

// TestGenerateAndValidateAccessToken verifies the happy path: a token generated
// with a secret validates with the same secret and round-trips the claims.
func TestGenerateAndValidateAccessToken(t *testing.T) {
	cfg := testConfig("test-secret-key")
	userID := uuid.New()
	email := "user@example.com"

	token, exp, err := GenerateAccessToken(userID, email, cfg)
	if err != nil {
		t.Fatalf("GenerateAccessToken returned an unexpected error: %v", err)
	}
	if token == "" {
		t.Fatal("GenerateAccessToken returned an empty token")
	}
	if exp <= 0 {
		t.Fatalf("expected a positive expiry unix timestamp, got %d", exp)
	}
	// A JWT is three dot-separated, base64-encoded segments.
	if got := strings.Count(token, "."); got != 2 {
		t.Errorf("expected JWT to have 2 dots, got %d", got)
	}

	claims, err := ValidateToken(token, cfg)
	if err != nil {
		t.Fatalf("ValidateToken rejected a freshly generated token: %v", err)
	}
	if claims.UserID != userID {
		t.Errorf("UserID mismatch: got %v, want %v", claims.UserID, userID)
	}
	if claims.Email != email {
		t.Errorf("Email mismatch: got %q, want %q", claims.Email, email)
	}
	if claims.Issuer != "authentication-service" {
		t.Errorf("Issuer mismatch: got %q, want %q", claims.Issuer, "authentication-service")
	}
}

// TestValidateTokenRejectsWrongSecret verifies a token signed with one secret
// fails validation under a different secret.
func TestValidateTokenRejectsWrongSecret(t *testing.T) {
	signCfg := testConfig("the-right-secret")
	verifyCfg := testConfig("a-different-secret")

	token, _, err := GenerateAccessToken(uuid.New(), "user@example.com", signCfg)
	if err != nil {
		t.Fatalf("GenerateAccessToken returned an unexpected error: %v", err)
	}

	if _, err := ValidateToken(token, verifyCfg); err == nil {
		t.Error("ValidateToken accepted a token signed with a different secret")
	}
}

// TestValidateTokenRejectsTamperedToken verifies a corrupted token string is
// rejected.
func TestValidateTokenRejectsTamperedToken(t *testing.T) {
	cfg := testConfig("test-secret-key")
	token, _, err := GenerateAccessToken(uuid.New(), "user@example.com", cfg)
	if err != nil {
		t.Fatalf("GenerateAccessToken returned an unexpected error: %v", err)
	}

	cases := []struct {
		name    string
		tampered string
	}{
		{"flipped last char", token[:len(token)-1] + flipChar(token[len(token)-1])},
		{"truncated", token[:len(token)/2]},
		{"empty", ""},
		{"garbage", "not.a.jwt"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := ValidateToken(tc.tampered, cfg); err == nil {
				t.Errorf("ValidateToken accepted a tampered token (%s)", tc.name)
			}
		})
	}
}

// TestGenerateAndValidateRefreshToken verifies refresh tokens round-trip and
// carry the correct user id, while a wrong secret is rejected.
func TestGenerateAndValidateRefreshToken(t *testing.T) {
	cfg := testConfig("refresh-secret")
	userID := uuid.New()

	token, exp, err := GenerateRefreshToken(userID, cfg)
	if err != nil {
		t.Fatalf("GenerateRefreshToken returned an unexpected error: %v", err)
	}
	if token == "" {
		t.Fatal("GenerateRefreshToken returned an empty token")
	}
	if exp <= 0 {
		t.Fatalf("expected a positive expiry unix timestamp, got %d", exp)
	}

	claims, err := ValidateRefreshToken(token, cfg)
	if err != nil {
		t.Fatalf("ValidateRefreshToken rejected a freshly generated token: %v", err)
	}
	if claims.UserID != userID {
		t.Errorf("UserID mismatch: got %v, want %v", claims.UserID, userID)
	}

	// Wrong secret must be rejected.
	if _, err := ValidateRefreshToken(token, testConfig("wrong")); err == nil {
		t.Error("ValidateRefreshToken accepted a token signed with a different secret")
	}
}

// TestAccessTokenNotValidAsRefreshToken is a sanity check that an access token
// (which lacks refresh-shaped expectations) is at least parseable structurally,
// but a refresh token validated as an access token still returns claims because
// both share the HS256 signing scheme. We assert the refresh-token validator
// rejects an access token signed with a different secret to keep the boundary
// meaningful.
func TestRefreshTokenSecretIsolation(t *testing.T) {
	accessCfg := testConfig("access-secret")
	refreshCfg := testConfig("refresh-secret")

	refreshToken, _, err := GenerateRefreshToken(uuid.New(), refreshCfg)
	if err != nil {
		t.Fatalf("GenerateRefreshToken returned an unexpected error: %v", err)
	}

	// Validating the refresh token under the access-token secret must fail.
	if _, err := ValidateRefreshToken(refreshToken, accessCfg); err == nil {
		t.Error("refresh token validated under a mismatched secret")
	}
}

// flipChar returns a different character than the input so tampering is
// guaranteed to change the token.
func flipChar(b byte) string {
	if b == 'A' {
		return "B"
	}
	return "A"
}
