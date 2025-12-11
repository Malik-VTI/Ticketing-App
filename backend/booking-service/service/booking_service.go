package service

import (
	"fmt"
	"math/rand"
	"time"

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
}

type bookingService struct {
	bookingRepo     repository.BookingRepository
	bookingItemRepo repository.BookingItemRepository
}

func NewBookingService(
	bookingRepo repository.BookingRepository,
	bookingItemRepo repository.BookingItemRepository,
) BookingService {
	return &bookingService{
		bookingRepo:     bookingRepo,
		bookingItemRepo: bookingItemRepo,
	}
}

func (s *bookingService) CreateBooking(userID uuid.UUID, req *models.CreateBookingRequest) (*models.BookingDTO, error) {
	// Generate booking reference
	bookingRef := generateBookingReference()
	
	// Calculate total amount
	var totalAmount float64
	for _, item := range req.Items {
		totalAmount += item.Price * float64(item.Quantity)
	}
	
	// Create booking
	booking := &models.Booking{
		ID:              uuid.New(),
		UserID:          userID,
		BookingReference: bookingRef,
		BookingType:     req.BookingType,
		TotalAmount:     totalAmount,
		Currency:        "IDR", // Default currency
		Status:          "pending",
		CreatedAt:       time.Now(),
	}
	
	if err := s.bookingRepo.Create(booking); err != nil {
		return nil, fmt.Errorf("failed to create booking: %w", err)
	}
	
	// Create booking items
	var items []*models.BookingItem
	for _, itemReq := range req.Items {
		metadataJSON := ""
		if itemReq.Metadata != nil {
			metadata, err := itemReq.Metadata.ToJSON()
			if err != nil {
				return nil, fmt.Errorf("failed to serialize metadata: %w", err)
			}
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
		
		if err := s.bookingItemRepo.Create(item); err != nil {
			// Rollback: delete booking if items fail
			s.bookingRepo.Delete(booking.ID)
			return nil, fmt.Errorf("failed to create booking item: %w", err)
		}
		
		items = append(items, item)
	}
	
	// Convert to DTO
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
		return fmt.Errorf("booking is already cancelled")
	}
	
	if booking.Status == "confirmed" {
		// For confirmed bookings, we might want to handle refunds
		// For now, just cancel
	}
	
	return s.bookingRepo.UpdateStatus(id, "cancelled")
}

func (s *bookingService) toBookingDTO(booking *models.Booking, items []*models.BookingItem) *models.BookingDTO {
	itemDTOs := make([]models.BookingItemDTO, len(items))
	for i, item := range items {
		var metadata *models.BookingMetadata
		if item.Metadata != "" {
			metadata = &models.BookingMetadata{}
			if err := metadata.FromJSON(item.Metadata); err != nil {
				// If parsing fails, just leave metadata as nil
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
		ID:              booking.ID,
		UserID:          booking.UserID,
		BookingReference: booking.BookingReference,
		BookingType:     booking.BookingType,
		TotalAmount:     booking.TotalAmount,
		Currency:        booking.Currency,
		Status:          booking.Status,
		Items:           itemDTOs,
		CreatedAt:       booking.CreatedAt,
		UpdatedAt:       booking.UpdatedAt,
	}
}

// generateBookingReference generates a unique booking reference
func generateBookingReference() string {
	rand.Seed(time.Now().UnixNano())
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 8)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return fmt.Sprintf("BK-%s", string(b))
}

