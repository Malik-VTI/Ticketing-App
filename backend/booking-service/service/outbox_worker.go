package service

import (
	"bytes"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"booking-service/repository"
)

const (
	// outboxPollInterval is how often the worker scans for pending events.
	outboxPollInterval = 5 * time.Second
	// outboxBatchSize is the maximum number of events processed per tick.
	outboxBatchSize = 20
)

// outboxHTTPClient is shared by the worker; it bounds each delivery attempt so
// a hung notification-service can't stall the worker loop.
var outboxHTTPClient = &http.Client{Timeout: 10 * time.Second}

// StartOutboxWorker launches a background goroutine that drains the
// notification outbox (Transactional Outbox / ARCH-05). On every tick it fetches
// a batch of pending events and POSTs each to the notification-service. Successful
// deliveries are marked 'sent'; failures bump the attempt counter and stay
// 'pending' until they exhaust repository.MaxOutboxAttempts, after which they are
// marked 'failed'. The goroutine never blocks startup.
func (s *bookingService) StartOutboxWorker() {
	go func() {
		ticker := time.NewTicker(outboxPollInterval)
		defer ticker.Stop()
		for range ticker.C {
			s.processOutboxBatch()
		}
	}()
}

// processOutboxBatch delivers one batch of pending outbox events.
func (s *bookingService) processOutboxBatch() {
	events, err := s.outboxRepo.ClaimPendingOutbox(outboxBatchSize)
	if err != nil {
		log.Printf("ERROR: outbox worker gagal claim pending events: %v", err)
		return
	}

	for _, event := range events {
		if err := deliverOutboxEvent(event); err != nil {
			if markErr := s.outboxRepo.MarkOutboxFailed(event.ID, err.Error()); markErr != nil {
				log.Printf("ERROR: outbox worker gagal menandai event %s failed: %v", event.ID, markErr)
			}
			log.Printf("WARN: outbox worker gagal kirim notifikasi event %s (booking %s, attempt %d): %v",
				event.ID, event.BookingID, event.Attempts+1, err)
			continue
		}

		if err := s.outboxRepo.MarkOutboxSent(event.ID); err != nil {
			log.Printf("ERROR: outbox worker gagal menandai event %s sent: %v", event.ID, err)
		}
	}
}

// deliverOutboxEvent POSTs a single outbox event payload to the
// notification-service. A non-2xx HTTP status is treated as a delivery failure
// so the event is retried.
func deliverOutboxEvent(event repository.OutboxEvent) error {
	notifURL := os.Getenv("NOTIFICATION_SERVICE_URL")
	if notifURL == "" {
		notifURL = "http://localhost:8087"
	}

	resp, err := outboxHTTPClient.Post(
		notifURL+"/notifications/send",
		"application/json",
		bytes.NewReader([]byte(event.Payload)),
	)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("notification-service returned status %d", resp.StatusCode)
	}

	return nil
}
