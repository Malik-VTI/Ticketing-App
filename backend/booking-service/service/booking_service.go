package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"time"

	"booking-service/cache"
	"booking-service/clients"
	bookingerrors "booking-service/errors"
	"booking-service/models"
	"booking-service/repository"

	"github.com/google/uuid"
)

type BookingService interface {
	CreateBooking(userID uuid.UUID, req *models.CreateBookingRequest) (*models.BookingDTO, error)
	GetBookingByID(id uuid.UUID) (*models.BookingDTO, error)
	GetBookingByReference(reference string) (*models.BookingDTO, error)
	GetUserBookings(userID uuid.UUID, limit, offset int) ([]*models.BookingDTO, error)
	CancelBooking(id uuid.UUID) error
	UpdateBookingStatus(id uuid.UUID, status string) error
}

type bookingService struct {
	bookingRepo     repository.BookingRepository
	bookingItemRepo repository.BookingItemRepository
	catalogClient   clients.CatalogClient
	pricingClient   clients.PricingClient
}

func NewBookingService(
	bookingRepo repository.BookingRepository,
	bookingItemRepo repository.BookingItemRepository,
	catalogClient clients.CatalogClient,
	pricingClient clients.PricingClient,
) BookingService {
	return &bookingService{
		bookingRepo:     bookingRepo,
		bookingItemRepo: bookingItemRepo,
		catalogClient:   catalogClient,
		pricingClient:   pricingClient,
	}
}

// CreateBooking creates a booking and all its items atomically in a single DB transaction.
// Before starting the transaction it acquires a per-item Redis seat lock to prevent
// double-booking races. Locks are released after commit (or on any failure).
func (s *bookingService) CreateBooking(userID uuid.UUID, req *models.CreateBookingRequest) (*models.BookingDTO, error) {
	ctx := context.Background()

	// 1. Acquire seat locks for all requested items
	var lockedItems []struct{ itemType, itemRefID string }
	for _, item := range req.Items {
		acquired, err := cache.AcquireSeatLock(ctx, item.ItemType, item.ItemRefID.String())
		if err != nil {
			// Redis error — lock gracefully degraded, continue
			continue
		}
		if !acquired {
			// Release any locks we already acquired before returning
			for _, locked := range lockedItems {
				cache.ReleaseSeatLock(ctx, locked.itemType, locked.itemRefID)
			}
			return nil, fmt.Errorf("seat_lock_conflict: this %s is currently being booked by another user — please try again in a moment", item.ItemType)
		}
		lockedItems = append(lockedItems, struct{ itemType, itemRefID string }{item.ItemType, item.ItemRefID.String()})
	}

	// Ensure all acquired locks are released when we return
	defer func() {
		for _, locked := range lockedItems {
			cache.ReleaseSeatLock(ctx, locked.itemType, locked.itemRefID)
		}
	}()

	// 2. Pricing Validation & Inventory Reservation Pre-checks
	// We'll calculate the total and validate prices BEFORE starting the DB transaction
	bookingRef := generateBookingReference()
	var totalAmount float64
	for _, item := range req.Items {
		// Verify price with Pricing Service
		// In a real scenario, we might fetch the base price from the catalog first.
		// For now, we'll validate the submitted price looks "sane" via the pricing service.
		// (Simplified: assuming item.Price is the base price for calculation check)
		calc, err := s.pricingClient.CalculatePrice(item.Price, 0.1, 0, item.Quantity) // Example 10% tax
		if err != nil {
			return nil, fmt.Errorf("pricing_validation_failed: %w", err)
		}
		
		// If the calculated total doesn't match roughly what frontend thinks, we could error.
		// But usually we just take the backend's calculation.
		totalAmount += calc.TotalPrice
	}

	// 3. Create booking model
	booking := &models.Booking{
		ID:               uuid.New(),
		UserID:           userID,
		BookingReference: bookingRef,
		BookingType:      req.BookingType,
		TotalAmount:      totalAmount,
		Currency:         "IDR",
		Status:           "pending",
		CreatedAt:        time.Now(),
	}

	// 4. Begin DB transaction
	tx, err := s.bookingRepo.BeginTx()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p)
		}
	}()

	// 5. Insert booking row
	if err := s.bookingRepo.CreateWithTx(tx, booking); err != nil {
		_ = tx.Rollback()
		return nil, fmt.Errorf("failed to create booking: %w", err)
	}

	// 6. Insert all items & Reserve Inventory
	var items []*models.BookingItem
	for _, itemReq := range req.Items {
		// Perform Inventory Reservation
		
		// Extract reservation details from metadata
		var seatNumbers []string
		var checkIn, checkOut string
		if itemReq.Metadata != nil {
			seatNumbers = itemReq.Metadata.SeatNumbers
			checkIn = itemReq.Metadata.CheckInDate
			checkOut = itemReq.Metadata.CheckOutDate
		}

		switch itemReq.ItemType {
		case "train":
			if len(seatNumbers) == 0 {
				_ = tx.Rollback()
				return nil, fmt.Errorf("train_reservation_failed: seat_numbers required in metadata (one per passenger)")
			}
			if len(seatNumbers) != itemReq.Quantity {
				_ = tx.Rollback()
				return nil, fmt.Errorf("train_reservation_failed: need %d seat_numbers (quantity), got %d", itemReq.Quantity, len(seatNumbers))
			}
			if err := s.catalogClient.ReserveTrainSeats(itemReq.ItemRefID, seatNumbers); err != nil {
				_ = tx.Rollback()
				return nil, fmt.Errorf("train_reservation_failed: %w", err)
			}
		case "flight":
			if len(seatNumbers) == 0 {
				_ = tx.Rollback()
				return nil, fmt.Errorf("flight_reservation_failed: seat_numbers required in metadata (one per passenger)")
			}
			if len(seatNumbers) != itemReq.Quantity {
				_ = tx.Rollback()
				return nil, fmt.Errorf("flight_reservation_failed: need %d seat_numbers (quantity), got %d", itemReq.Quantity, len(seatNumbers))
			}
			if err := s.catalogClient.ReserveFlightSeats(itemReq.ItemRefID, seatNumbers); err != nil {
				_ = tx.Rollback()
				return nil, fmt.Errorf("flight_reservation_failed: %w", err)
			}
		case "hotel":
			if checkIn == "" { checkIn = time.Now().Format("2006-01-02") }
			if checkOut == "" { checkOut = time.Now().AddDate(0, 0, 1).Format("2006-01-02") }
			
			// Full Room Allocation logic
			rooms, err := s.catalogClient.ReserveHotelRooms(uuid.Nil, itemReq.ItemRefID, checkIn, checkOut, itemReq.Quantity)
			if err != nil {
				_ = tx.Rollback()
				return nil, fmt.Errorf("hotel_reservation_failed: %w", err)
			}
			
			// Update the request metadata with actual allocated rooms
			if itemReq.Metadata == nil {
				itemReq.Metadata = &models.BookingMetadata{}
			}
			itemReq.Metadata.RoomNumbers = rooms
		}

		metadataJSON := "{}"
		if itemReq.Metadata != nil {
			metadata, _ := itemReq.Metadata.ToJSON()
			metadataJSON = metadata
		}

		item := &models.BookingItem{
			ID:        uuid.New(),
			BookingID: booking.ID,
			ItemType:  itemReq.ItemType,
			ItemRefID: itemReq.ItemRefID,
			Price:     itemReq.Price,
			Quantity:  itemReq.Quantity,
			Metadata:  metadataJSON,
			CreatedAt: time.Now(),
		}

		if err := s.bookingItemRepo.CreateWithTx(tx, item); err != nil {
			_ = tx.Rollback()
			return nil, fmt.Errorf("failed to create booking item: %w", err)
		}
		items = append(items, item)
	}

	// 7. Commit
	if err := tx.Commit(); err != nil {
		_ = tx.Rollback()
		return nil, fmt.Errorf("failed to commit booking transaction: %w", err)
	}

	// 8. Notify notification service (fire-and-forget)
	go s.sendBookingNotification(booking)

	return s.toBookingDTO(booking, items), nil
}

func (s *bookingService) GetBookingByID(id uuid.UUID) (*models.BookingDTO, error) {
	booking, err := s.bookingRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	items, err := s.bookingItemRepo.FindByBookingID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get booking items: %w", err)
	}

	return s.toBookingDTO(booking, items), nil
}

func (s *bookingService) GetBookingByReference(reference string) (*models.BookingDTO, error) {
	booking, err := s.bookingRepo.FindByReference(reference)
	if err != nil {
		return nil, err
	}

	items, err := s.bookingItemRepo.FindByBookingID(booking.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get booking items: %w", err)
	}

	return s.toBookingDTO(booking, items), nil
}

func (s *bookingService) GetUserBookings(userID uuid.UUID, limit, offset int) ([]*models.BookingDTO, error) {
	bookings, err := s.bookingRepo.FindByUserID(userID, limit, offset)
	if err != nil {
		return nil, err
	}

	var bookingDTOs []*models.BookingDTO
	for _, booking := range bookings {
		items, err := s.bookingItemRepo.FindByBookingID(booking.ID)
		if err != nil {
			continue // Skip if items can't be loaded
		}
		bookingDTOs = append(bookingDTOs, s.toBookingDTO(booking, items))
	}

	return bookingDTOs, nil
}

func (s *bookingService) CancelBooking(id uuid.UUID) error {
	booking, err := s.bookingRepo.FindByID(id)
	if err != nil {
		return err
	}

	if booking.Status == "cancelled" {
		return bookingerrors.ErrAlreadyCancelled
	}

	return s.bookingRepo.UpdateStatus(id, "cancelled")
}

func (s *bookingService) UpdateBookingStatus(id uuid.UUID, status string) error {
	return s.bookingRepo.UpdateStatus(id, status)
}

func (s *bookingService) toBookingDTO(booking *models.Booking, items []*models.BookingItem) *models.BookingDTO {
	itemDTOs := make([]models.BookingItemDTO, len(items))
	for i, item := range items {
		var metadata *models.BookingMetadata
		if item.Metadata != "" {
			metadata = &models.BookingMetadata{}
			if err := metadata.FromJSON(item.Metadata); err != nil {
				metadata = nil
			}
		}

		itemDTOs[i] = models.BookingItemDTO{
			ID:        item.ID,
			BookingID: item.BookingID,
			ItemType:  item.ItemType,
			ItemRefID: item.ItemRefID,
			Price:     item.Price,
			Quantity:  item.Quantity,
			Metadata:  metadata,
			CreatedAt: item.CreatedAt,
			UpdatedAt: item.UpdatedAt,
		}
	}

	return &models.BookingDTO{
		ID:               booking.ID,
		UserID:           booking.UserID,
		BookingReference: booking.BookingReference,
		BookingType:      booking.BookingType,
		TotalAmount:      booking.TotalAmount,
		Currency:         booking.Currency,
		Status:           booking.Status,
		Items:            itemDTOs,
		CreatedAt:        booking.CreatedAt,
		UpdatedAt:        booking.UpdatedAt,
	}
}

// generateBookingReference generates a unique booking reference.
// Uses a local rand.Rand instance (not the deprecated global rand.Seed).
func generateBookingReference() string {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 8)
	for i := range b {
		b[i] = charset[r.Intn(len(charset))]
	}
	return fmt.Sprintf("BK-%s", string(b))
}

// sendBookingNotification fires a notification event to the notification service.
// Called as a goroutine — errors are logged but never propagate to the caller.
func (s *bookingService) sendBookingNotification(booking *models.Booking) {
	notifURL := os.Getenv("NOTIFICATION_SERVICE_URL")
	if notifURL == "" {
		notifURL = "http://localhost:8087"
	}

	payload := map[string]interface{}{
		"type":      "booking_confirmation",
		"user_id":   booking.UserID.String(),
		"email":     "", // Populated by notification service lookup if needed
		"reference": booking.BookingReference,
		"booking_id": booking.ID.String(),
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return
	}

	resp, err := http.Post(notifURL+"/notifications/send", "application/json", bytes.NewReader(body))
	if err != nil {
		// Not critical — notification is best-effort
		return
	}
	defer resp.Body.Close()
}
