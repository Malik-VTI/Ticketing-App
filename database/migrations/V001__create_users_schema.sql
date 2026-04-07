-- Migration: V001 - Create Users Schema
-- Description: Creates the users table for authentication and user management
-- Service: Authentication Service

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(512) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Create index on email for fast lookups
CREATE INDEX IX_users_email ON users(email);

-- Create index on created_at for historical queries
CREATE INDEX IX_users_created_at ON users(created_at);

