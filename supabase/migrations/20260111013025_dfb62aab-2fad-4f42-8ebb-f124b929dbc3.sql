-- Add columns for change request functionality
ALTER TABLE public.updates
ADD COLUMN IF NOT EXISTS change_request_text TEXT,
ADD COLUMN IF NOT EXISTS change_request_link TEXT,
ADD COLUMN IF NOT EXISTS change_request_link_type TEXT,
ADD COLUMN IF NOT EXISTS change_request_draft BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS change_request_submitted_at TIMESTAMP WITH TIME ZONE;

-- Add a comment for clarity
COMMENT ON COLUMN public.updates.change_request_text IS 'Detailed feedback when client requests changes';
COMMENT ON COLUMN public.updates.change_request_link IS 'Optional link (Google Docs, Loom) for change request feedback';
COMMENT ON COLUMN public.updates.change_request_link_type IS 'Type of link: google_docs, loom, other';
COMMENT ON COLUMN public.updates.change_request_draft IS 'True if change request is still being drafted';
COMMENT ON COLUMN public.updates.change_request_submitted_at IS 'When the change request was submitted';