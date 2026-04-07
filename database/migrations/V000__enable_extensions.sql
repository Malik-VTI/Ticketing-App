-- Migration: V000 - Enable PostgreSQL Extensions
-- Description: Enables extensions required by other migrations
-- Service: Shared

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

