-- Security hardening migration
-- Adds columns required by the hardened authentication system.
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE users
  ADD COLUMN failed_login_attempts INT DEFAULT 0 AFTER reset_password_expires,
  ADD COLUMN lockout_until TIMESTAMP NULL AFTER failed_login_attempts,
  ADD COLUMN token_version INT DEFAULT 0 AFTER lockout_until;