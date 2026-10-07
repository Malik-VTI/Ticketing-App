package service

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"booking-service/logging"
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
		slog.Error("outbox worker failed to claim pending events", slog.String("error.message", err.Error()))
		return
	}

	for _, event := range events {
		if err := deliverOutboxEvent(event); err != nil {
			if markErr := s.outboxRepo.MarkOutboxFailed(event.ID, err.Error()); markErr != nil {
				slog.Error("outbox worker failed to mark event as failed", slog.String("outbox.event_id", event.ID.String()), slog.String("error.message", markErr.Error()))
			}
			logging.Event(context.Background(), slog.Default(), slog.LevelWarn, logging.TypeBusiness,
				"notification.dispatch.failed", "failed to deliver booking notification to notification-service",
				slog.String("outbox.event_id", event.ID.String()),
				slog.String("booking.id", event.BookingID.String()),
				slog.Int("outbox.attempt", event.Attempts+1),
				slog.String("error.message", err.Error()))
			continue
		}

		if err := s.outboxRepo.MarkOutboxSent(event.ID); err != nil {
			slog.Error("outbox worker failed to mark event as sent", slog.String("outbox.event_id", event.ID.String()), slog.String("error.message", err.Error()))
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
