-- Migration: V008 - Create Audit Log Schema
-- Description: Creates audit_logs table for tracking changes and actions
-- Service: All Services (shared)

-- Create audit_logs table
CREATE TABLE audit_logs (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    entity_type VARCHAR(100) NOT NULL, -- e.g., 'booking', 'payment', 'flight'
    entity_id UNIQUEIDENTIFIER NOT NULL,
    action VARCHAR(50) NOT NULL, -- created, updated, deleted, cancelled, etc.
    performed_by UNIQUEIDENTIFIER, -- user_id who performed the action
    timestamp DATETIME2 DEFAULT SYSUTCDATETIME(),
    details NVARCHAR(MAX), -- JSON string for additional details
    ip_address VARCHAR(50),
    user_agent NVARCHAR(500)
);

-- Create indexes for audit_logs
CREATE INDEX IX_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IX_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IX_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX IX_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IX_audit_logs_action ON audit_logs(action);

