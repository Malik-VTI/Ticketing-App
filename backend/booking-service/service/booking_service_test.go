package service

import (
	"encoding/json"
	"regexp"
	"testing"
	"time"

	"booking-service/models"

	"github.com/google/uuid"
)

// TestGenerateBookingReferenceFormat verifies the reference shape: a "BK-"
// prefix followed by 8 uppercase alphanumeric characters.
func TestGenerateBookingReferenceFormat(t *testing.T) {
	re := regexp.MustCompile(`^BK-[A-Z0-9]{8}$`)

	for i := 0; i < 100; i++ {
		ref := generateBookingReference()
		if !re.MatchString(ref) {
			t.Fatalf("reference %q does not match expected pattern BK-XXXXXXXX", ref)
		}
	}
}

// TestGenerateBookingReferenceUniqueTightLoop generates many references in a tight
// loop (same clock tick) and asserts they are all distinct. This guards the fix for
// the prior bug where the RNG was reseeded from time.Now() on every call, collapsing
// same-tick calls to identical references and violating the UNIQUE booking_reference
// constraint under load.
func TestGenerateBookingReferenceUniqueTightLoop(t *testing.T) {
	const samples = 2000
	seen := make(map[string]struct{}, samples)
	for i := 0; i < samples; i++ {
		ref := generateBookingReference()
		if _, dup := seen[ref]; dup {
			t.Fatalf("duplicate booking reference %q within %d tight-loop calls (RNG not unique)", ref, samples)
		}
		seen[ref] = struct{}{}
	}
}

// TestBuildBookingNotificationPayload verifies the outbox payload is valid JSON
// with the expected fields populated from the booking.
func TestBuildBookingNotificationPayload(t *testing.T) {
	userID := uuid.New()
	bookingID := uuid.New()
	booking := &models.Booking{
		ID:               bookingID,
		UserID:           userID,
		BookingReference: "BK-ABCD1234",
	}

	raw, err := buildBookingNotificationPayload(booking)
	if err != nil {
		t.Fatalf("buildBookingNotificationPayload returned an unexpected error: %v", err)
	}

	var payload map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		t.Fatalf("payload is not valid JSON: %v", err)
	}

	assertField := func(key, want string) {
		t.Helper()
		got, ok := payload[key].(string)
		if !ok {
			t.Fatalf("field %q missing or not a string in payload: %v", key, payload)
		}
		if got != want {
			t.Errorf("field %q: got %q, want %q", key, got, want)
		}
	}

	assertField("type", "booking_confirmation")
	assertField("user_id", userID.String())
	assertField("reference", "BK-ABCD1234")
	assertField("booking_id", bookingID.String())

	// email is intentionally left blank (populated later by notification service).
	if email, ok := payload["email"].(string); !ok || email != "" {
		t.Errorf("expected empty email field, got %v", payload["email"])
	}
}

// TestToBookingDTOMapsFieldsAndMetadata verifies that the entity-to-DTO mapping
// copies scalar fields and parses each item's JSON metadata back into a struct.
func TestToBookingDTOMapsFieldsAndMetadata(t *testing.T) {
	s := &bookingService{} // no DB dependencies needed for toBookingDTO

	now := time.Now()
	bookingID := uuid.New()
	userID := uuid.New()
	itemRefID := uuid.New()

	booking := &models.Booking{
		ID:               bookingID,
		UserID:           userID,
		BookingReference: "BK-REF12345",
		BookingType:      "train",
		TotalAmount:      330000,
		Currency:         "IDR",
		Status:           "pending",
		CreatedAt:        now,
	}

	meta := &models.BookingMetadata{SeatNumbers: []string{"1A", "1B"}}
	metaJSON, err := meta.ToJSON()
	if err != nil {
		t.Fatalf("failed to serialize metadata: %v", err)
	}

	items := []*models.BookingItem{
		{
			ID:        uuid.New(),
			BookingID: bookingID,
			ItemType:  "train",
			ItemRefID: itemRefID,
			Price:     150000,
			Quantity:  2,
			Metadata:  metaJSON,
			CreatedAt: now,
		},
	}

	dto := s.toBookingDTO(booking, items)

	if dto.ID != bookingID {
		t.Errorf("ID mismatch: got %v, want %v", dto.ID, bookingID)
	}
	if dto.UserID != userID {
		t.Errorf("UserID mismatch: got %v, want %v", dto.UserID, userID)
	}
	if dto.BookingReference != "BK-REF12345" {
		t.Errorf("BookingReference mismatch: got %q", dto.BookingReference)
	}
	if dto.TotalAmount != 330000 {
		t.Errorf("TotalAmount mismatch: got %v, want 330000", dto.TotalAmount)
	}
	if dto.Currency != "IDR" {
		t.Errorf("Currency mismatch: got %q", dto.Currency)
	}
	if dto.Status != "pending" {
		t.Errorf("Status mismatch: got %q", dto.Status)
	}

	if len(dto.Items) != 1 {
		t.Fatalf("expected 1 item DTO, got %d", len(dto.Items))
	}
	item := dto.Items[0]
	if item.ItemType != "train" {
		t.Errorf("item ItemType mismatch: got %q", item.ItemType)
	}
	if item.ItemRefID != itemRefID {
		t.Errorf("item ItemRefID mismatch: got %v, want %v", item.ItemRefID, itemRefID)
	}
	if item.Quantity != 2 {
		t.Errorf("item Quantity mismatch: got %d, want 2", item.Quantity)
	}
	if item.Metadata == nil {
		t.Fatal("expected parsed metadata, got nil")
	}
	if len(item.Metadata.SeatNumbers) != 2 ||
		item.Metadata.SeatNumbers[0] != "1A" ||
		item.Metadata.SeatNumbers[1] != "1B" {
		t.Errorf("metadata SeatNumbers mismatch: got %v", item.Metadata.SeatNumbers)
	}
}

// TestToBookingDTOEmptyItems verifies the DTO is built correctly when there are
// no items (and that a non-nil, empty slice is produced).
func TestToBookingDTOEmptyItems(t *testing.T) {
	s := &bookingService{}
	booking := &models.Booking{
		ID:     uuid.New(),
		UserID: uuid.New(),
		Status: "confirmed",
	}

	dto := s.toBookingDTO(booking, nil)

	if dto.Items == nil {
		t.Error("expected a non-nil (empty) items slice")
	}
	if len(dto.Items) != 0 {
		t.Errorf("expected 0 items, got %d", len(dto.Items))
	}
}

// TestBookingMetadataJSONRoundTrip verifies metadata survives a serialize /
// deserialize cycle unchanged.
func TestBookingMetadataJSONRoundTrip(t *testing.T) {
	original := &models.BookingMetadata{
		SeatNumbers:    []string{"12A", "12B"},
		RoomNumbers:    []string{"301"},
		PassengerNames: []string{"Alice", "Bob"},
		CheckInDate:    "2026-07-01",
		CheckOutDate:   "2026-07-03",
	}

	encoded, err := original.ToJSON()
	if err != nil {
		t.Fatalf("ToJSON error: %v", err)
	}

	decoded := &models.BookingMetadata{}
	if err := decoded.FromJSON(encoded); err != nil {
		t.Fatalf("FromJSON error: %v", err)
	}

	if len(decoded.SeatNumbers) != 2 || decoded.SeatNumbers[0] != "12A" {
		t.Errorf("SeatNumbers not preserved: %v", decoded.SeatNumbers)
	}
	if len(decoded.RoomNumbers) != 1 || decoded.RoomNumbers[0] != "301" {
		t.Errorf("RoomNumbers not preserved: %v", decoded.RoomNumbers)
	}
	if decoded.CheckInDate != "2026-07-01" || decoded.CheckOutDate != "2026-07-03" {
		t.Errorf("dates not preserved: in=%q out=%q", decoded.CheckInDate, decoded.CheckOutDate)
	}
}
