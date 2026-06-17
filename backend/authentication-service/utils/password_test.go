package utils

import "testing"

// TestHashPasswordRoundTrip verifies that a password can be hashed and then
// successfully verified against its own hash.
func TestHashPasswordRoundTrip(t *testing.T) {
	password := "S3cur3P@ssw0rd!"

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword returned an unexpected error: %v", err)
	}
	if hash == "" {
		t.Fatal("HashPassword returned an empty hash")
	}
	if hash == password {
		t.Fatal("hash must not equal the plaintext password")
	}

	if !CheckPasswordHash(password, hash) {
		t.Error("CheckPasswordHash rejected the correct password")
	}
}

// TestCheckPasswordHashRejectsWrongPassword verifies that an incorrect password
// is rejected against a valid hash.
func TestCheckPasswordHashRejectsWrongPassword(t *testing.T) {
	hash, err := HashPassword("correct-horse-battery-staple")
	if err != nil {
		t.Fatalf("HashPassword returned an unexpected error: %v", err)
	}

	cases := []struct {
		name      string
		candidate string
	}{
		{"completely different", "wrong-password"},
		{"empty candidate", ""},
		{"case mismatch", "Correct-Horse-Battery-Staple"},
		{"trailing space", "correct-horse-battery-staple "},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if CheckPasswordHash(tc.candidate, hash) {
				t.Errorf("CheckPasswordHash accepted wrong password %q", tc.candidate)
			}
		})
	}
}

// TestHashPasswordUsesSalt verifies that hashing the same password twice yields
// two different hashes (bcrypt uses a random salt), yet both validate.
func TestHashPasswordUsesSalt(t *testing.T) {
	password := "same-input-password"

	hash1, err := HashPassword(password)
	if err != nil {
		t.Fatalf("first HashPassword returned an error: %v", err)
	}
	hash2, err := HashPassword(password)
	if err != nil {
		t.Fatalf("second HashPassword returned an error: %v", err)
	}

	if hash1 == hash2 {
		t.Error("two hashes of the same password must differ due to random salt")
	}

	// Both independent hashes must still validate the original password.
	if !CheckPasswordHash(password, hash1) {
		t.Error("first hash failed to validate the original password")
	}
	if !CheckPasswordHash(password, hash2) {
		t.Error("second hash failed to validate the original password")
	}
}

// TestCheckPasswordHashRejectsGarbageHash verifies that a malformed hash does
// not cause a panic and is simply rejected.
func TestCheckPasswordHashRejectsGarbageHash(t *testing.T) {
	if CheckPasswordHash("anything", "not-a-valid-bcrypt-hash") {
		t.Error("CheckPasswordHash accepted a malformed hash")
	}
}
