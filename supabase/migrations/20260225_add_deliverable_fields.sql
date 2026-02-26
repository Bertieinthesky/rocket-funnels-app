-- Add deliverable link and review type fields to updates
ALTER TABLE updates
  ADD COLUMN IF NOT EXISTS deliverable_link TEXT,
  ADD COLUMN IF NOT EXISTS deliverable_link_type TEXT,
  ADD COLUMN IF NOT EXISTS review_type TEXT DEFAULT 'external';
  -- review_type: 'internal' (team-only review) or 'external' (client-facing)
