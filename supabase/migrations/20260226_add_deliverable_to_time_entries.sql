-- Add deliverable fields to time_entries
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS is_deliverable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deliverable_link text,
  ADD COLUMN IF NOT EXISTS deliverable_link_type text,
  ADD COLUMN IF NOT EXISTS review_type text DEFAULT 'external';
