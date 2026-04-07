package cache

import (
	"context"
	"fmt"
	"log"
	"time"
)

const lockTTL = 10 * time.Minute
const lockPrefix = "lock:inventory"

// lockKey builds a deterministic key for a schedule item
func lockKey(itemType, scheduleID string) string {
	return fmt.Sprintf("%s:%s:%s", lockPrefix, itemType, scheduleID)
}

// AcquireSeatLock tries to acquire a distributed lock for the given item.
// Uses SET NX PX (atomic Redis operation) to guarantee only one booking
// can proceed at a time for the same flight/train seat inventory.
//
// Returns (true, nil) if the lock was acquired.
// Returns (false, nil) if another booking is already in progress for this item.
// Returns (false, err) if Redis is unavailable — caller should ALLOW the booking to proceed.
func AcquireSeatLock(ctx context.Context, itemType, scheduleID string) (bool, error) {
	if !enabled || client == nil {
		// Redis not available — degrade gracefully, allow booking
		return true, nil
	}

	key := lockKey(itemType, scheduleID)
	// NX = set only if Not eXists; PX = expire in milliseconds
	result, err := client.SetNX(ctx, key, "1", lockTTL).Result()
	if err != nil {
		log.Printf("Warning: Redis error acquiring seat lock for %s: %v. Allowing booking.", key, err)
		// Degrade gracefully
		return true, nil
	}
	return result, nil
}

// ReleaseSeatLock explicitly releases the seat lock.
// Safe to call even when Redis is unavailable.
func ReleaseSeatLock(ctx context.Context, itemType, scheduleID string) {
	if !enabled || client == nil {
		return
	}
	key := lockKey(itemType, scheduleID)
	if err := client.Del(ctx, key).Err(); err != nil {
		log.Printf("Warning: Failed to release seat lock for %s: %v", key, err)
	}
}
