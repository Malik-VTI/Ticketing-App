package database

import (
	"fmt"
	"log"
)

// RunMigrations creates tables that this service owns but which are not managed
// by an external migration tool. It is safe to call on every startup because
// every statement uses IF NOT EXISTS.
//
// Currently it provisions the notification_outbox table used by the
// Transactional Outbox pattern (ARCH-05): booking-created notifications are
// written to this table in the SAME transaction as the booking, then a
// background worker delivers them to the notification-service and marks them
// sent. This guarantees notifications are never lost even if the
// notification-service is down or this process crashes right after commit.
func RunMigrations() error {
	if DB == nil {
		return fmt.Errorf("cannot run migrations: database connection is not initialized")
	}

	statements := []string{
		`CREATE TABLE IF NOT EXISTS notification_outbox (
			id UUID PRIMARY KEY,
			booking_id UUID NOT NULL,
			event_type VARCHAR(50) NOT NULL,
			payload TEXT NOT NULL,
			status VARCHAR(20) NOT NULL DEFAULT 'pending',
			attempts INT NOT NULL DEFAULT 0,
			last_error TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			sent_at TIMESTAMPTZ
		)`,
		// claimed_at supports safe multi-instance delivery: a worker stamps it when
		// it claims a row, and stale 'processing' rows (from a crashed worker) are
		// reclaimed after a grace period. ADD COLUMN IF NOT EXISTS keeps this safe
		// on pre-existing tables.
		`ALTER TABLE notification_outbox ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ`,
		`CREATE INDEX IF NOT EXISTS idx_outbox_status ON notification_outbox(status, created_at)`,
	}

	for _, stmt := range statements {
		if _, err := DB.Exec(stmt); err != nil {
			return fmt.Errorf("failed to run migration: %w", err)
		}
	}

	log.Println("Database migrations applied successfully (notification_outbox ready)")
	return nil
}
