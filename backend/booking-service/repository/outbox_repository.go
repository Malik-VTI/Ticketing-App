package repository

import (
	"database/sql"
	"fmt"

	"booking-service/database"

	"github.com/google/uuid"
)

// MaxOutboxAttempts is the number of delivery attempts after which an outbox
// event is permanently marked 'failed' and no longer retried by the worker.
const MaxOutboxAttempts = 5

// OutboxEvent is a single row of the notification_outbox table — a durable,
// to-be-delivered notification written atomically with the booking that
// produced it (Transactional Outbox pattern).
type OutboxEvent struct {
	ID        uuid.UUID
	BookingID uuid.UUID
	EventType string
	Payload   string
	Status    string
	Attempts  int
}

// OutboxRepository persists and dispatches notification outbox events.
type OutboxRepository interface {
	// InsertOutboxTx inserts a pending outbox row using the provided
	// transaction, so the event is committed atomically with the booking.
	InsertOutboxTx(tx *sql.Tx, id uuid.UUID, bookingID uuid.UUID, eventType string, payload string) error
	// ClaimPendingOutbox atomically claims up to `limit` deliverable events
	// (status 'pending', plus 'processing' rows orphaned by a crashed worker),
	// marking them 'processing' so concurrent workers/replicas never grab the
	// same row (FOR UPDATE SKIP LOCKED). Oldest first.
	ClaimPendingOutbox(limit int) ([]OutboxEvent, error)
	// MarkOutboxSent marks an event as successfully delivered.
	MarkOutboxSent(id uuid.UUID) error
	// MarkOutboxFailed records a failed delivery attempt; once attempts reach
	// MaxOutboxAttempts the event is marked 'failed' and stops being retried.
	MarkOutboxFailed(id uuid.UUID, errMsg string) error
}

type outboxRepository struct{}

func NewOutboxRepository() OutboxRepository {
	return &outboxRepository{}
}

func (r *outboxRepository) InsertOutboxTx(tx *sql.Tx, id uuid.UUID, bookingID uuid.UUID, eventType string, payload string) error {
	query := `
		INSERT INTO notification_outbox (id, booking_id, event_type, payload, status, attempts)
		VALUES ($1, $2, $3, $4, 'pending', 0)
	`

	_, err := tx.Exec(query, id, bookingID, eventType, payload)
	if err != nil {
		return fmt.Errorf("failed to insert outbox event: %w", err)
	}

	return nil
}

func (r *outboxRepository) ClaimPendingOutbox(limit int) ([]OutboxEvent, error) {
	// Atomically claim a batch: pick 'pending' rows (or 'processing' rows stuck
	// for >2m because a worker died mid-delivery), lock them with SKIP LOCKED so a
	// second replica skips already-claimed rows, and flip them to 'processing'.
	// RETURNING gives us the claimed rows in one round-trip — no separate SELECT.
	query := `
		UPDATE notification_outbox
		SET status = 'processing', claimed_at = now()
		WHERE id IN (
			SELECT id
			FROM notification_outbox
			WHERE status = 'pending'
			   OR (status = 'processing' AND claimed_at < now() - interval '2 minutes')
			ORDER BY created_at ASC
			LIMIT $1
			FOR UPDATE SKIP LOCKED
		)
		RETURNING id, booking_id, event_type, payload, status, attempts
	`

	rows, err := database.DB.Query(query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to claim pending outbox events: %w", err)
	}
	defer rows.Close()

	var events []OutboxEvent
	for rows.Next() {
		var e OutboxEvent
		if err := rows.Scan(&e.ID, &e.BookingID, &e.EventType, &e.Payload, &e.Status, &e.Attempts); err != nil {
			return nil, fmt.Errorf("failed to scan outbox event: %w", err)
		}
		events = append(events, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate outbox events: %w", err)
	}

	return events, nil
}

func (r *outboxRepository) MarkOutboxSent(id uuid.UUID) error {
	query := `
		UPDATE notification_outbox
		SET status = 'sent', sent_at = now()
		WHERE id = $1
	`

	if _, err := database.DB.Exec(query, id); err != nil {
		return fmt.Errorf("failed to mark outbox event sent: %w", err)
	}

	return nil
}

func (r *outboxRepository) MarkOutboxFailed(id uuid.UUID, errMsg string) error {
	// Increment attempts and record the error. When attempts reach the maximum
	// the event transitions to 'failed' (terminal); otherwise it stays 'pending'
	// so the worker retries it on a later tick.
	query := `
		UPDATE notification_outbox
		SET attempts = attempts + 1,
		    last_error = $2,
		    status = CASE WHEN attempts + 1 >= $3 THEN 'failed' ELSE 'pending' END
		WHERE id = $1
	`

	if _, err := database.DB.Exec(query, id, errMsg, MaxOutboxAttempts); err != nil {
		return fmt.Errorf("failed to mark outbox event failed: %w", err)
	}

	return nil
}
