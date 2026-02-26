-- Add username, login URL, and 2FA fields to credential cards
ALTER TABLE company_credentials
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS login_url TEXT,
  ADD COLUMN IF NOT EXISTS has_2fa BOOLEAN DEFAULT false;
