-- Migration: Add missing columns to users table for production database
-- Date: 2025-12-11
-- Purpose: Fix registration endpoint - add name and company columns

-- Add name column (required)
ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT '';

-- Add company column (optional)
ALTER TABLE users ADD COLUMN company TEXT;

-- Add password_hash column for future password auth
ALTER TABLE users ADD COLUMN password_hash TEXT;

-- Add password reset columns
ALTER TABLE users ADD COLUMN password_reset_token_hash TEXT;
ALTER TABLE users ADD COLUMN password_reset_expires DATETIME;

-- Add Stripe integration columns
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;

-- Add last_login_at column
ALTER TABLE users ADD COLUMN last_login_at DATETIME;

-- Update api_key column to be UNIQUE and NOT NULL
-- Note: Cannot modify existing column in SQLite, so we ensure it in code

-- Note: created_at already exists, usage_count already exists
