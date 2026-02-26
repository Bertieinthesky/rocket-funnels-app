-- Add client brief / one-sheet fields to companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS brief_content TEXT,
  ADD COLUMN IF NOT EXISTS brief_link TEXT,
  ADD COLUMN IF NOT EXISTS brief_link_type TEXT,
  ADD COLUMN IF NOT EXISTS icp_description TEXT,
  ADD COLUMN IF NOT EXISTS brand_voice TEXT,
  ADD COLUMN IF NOT EXISTS brand_colors JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS brand_fonts JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;
