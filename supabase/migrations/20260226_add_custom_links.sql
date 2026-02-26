-- Add custom_links JSONB column to companies for user-managed quick links
-- Format: [{ "label": "My Link", "url": "https://..." }, ...]
ALTER TABLE companies ADD COLUMN IF NOT EXISTS custom_links jsonb DEFAULT '[]';
