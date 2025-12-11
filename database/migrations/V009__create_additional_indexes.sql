-- Migration: V009 - Create Additional Performance Indexes
-- Description: Creates additional indexes for frequently queried columns and composite indexes
-- Service: All Services

-- Composite indexes for common query patterns

-- Flight domain composite indexes
CREATE INDEX IX_flight_schedules_date_status ON flight_schedules(departure_date, status);
CREATE INDEX IX_flight_seats_schedule_status ON flight_seats(flight_schedule_id, status);

-- Train domain composite indexes
CREATE INDEX IX_train_schedules_date_status ON train_schedules(departure_date, status);
CREATE INDEX IX_coach_seats_coach_status ON coach_seats(coach_id, status);

-- Hotel domain composite indexes
CREATE INDEX IX_room_rates_type_date ON room_rates(room_type_id, date);
CREATE INDEX IX_rooms_type_status ON rooms(room_type_id, status);

-- Booking domain composite indexes
CREATE INDEX IX_bookings_user_status ON bookings(user_id, status);
CREATE INDEX IX_bookings_user_created ON bookings(user_id, created_at);
CREATE INDEX IX_booking_items_booking_type ON booking_items(booking_id, item_type);

-- Payment domain composite indexes
CREATE INDEX IX_payments_booking_status ON payments(booking_id, status);
CREATE INDEX IX_payments_user_status ON payments(user_id, status);

-- Coupon domain composite indexes
CREATE INDEX IX_coupons_active_dates ON coupons(is_active, start_date, end_date);

-- Audit log composite indexes
CREATE INDEX IX_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IX_audit_logs_user_timestamp ON audit_logs(performed_by, timestamp);

