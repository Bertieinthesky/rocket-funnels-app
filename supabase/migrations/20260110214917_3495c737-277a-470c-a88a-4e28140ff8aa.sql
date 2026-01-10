-- Add is_pinned_to_dashboard and is_favorite columns to files table
ALTER TABLE public.files 
ADD COLUMN IF NOT EXISTS is_pinned_to_dashboard BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_external_link BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS external_platform TEXT;

-- Create file_flags table for bi-directional communication
CREATE TABLE public.file_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  flagged_by UUID NOT NULL,
  flagged_by_role TEXT NOT NULL CHECK (flagged_by_role IN ('admin', 'team', 'client')),
  flagged_for TEXT NOT NULL CHECK (flagged_for IN ('team', 'client')),
  flag_message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_message TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('file_upload', 'file_flagged', 'flag_resolved', 'file_pinned')),
  file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
  flag_id UUID REFERENCES public.file_flags(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.file_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file_flags

-- Team/Admin can view all flags
CREATE POLICY "Team and admins can view all flags"
ON public.file_flags
FOR SELECT
USING (has_role(auth.uid(), 'team'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Clients can view flags on files in their company's projects
CREATE POLICY "Clients can view flags on their company files"
ON public.file_flags
FOR SELECT
USING (
  file_id IN (
    SELECT f.id FROM public.files f
    WHERE f.company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- Team/Admin can create flags
CREATE POLICY "Team and admins can create flags"
ON public.file_flags
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Clients can create flags (only for team)
CREATE POLICY "Clients can create flags for team"
ON public.file_flags
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'client'::app_role) 
  AND flagged_for = 'team'
  AND file_id IN (
    SELECT f.id FROM public.files f
    WHERE f.company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- Anyone can resolve flags (update resolved fields)
CREATE POLICY "Users can resolve flags"
ON public.file_flags
FOR UPDATE
USING (
  (has_role(auth.uid(), 'team'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  OR (
    has_role(auth.uid(), 'client'::app_role) 
    AND file_id IN (
      SELECT f.id FROM public.files f
      WHERE f.company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  )
);

-- RLS Policies for notifications

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

-- Team/Admin can create notifications
CREATE POLICY "Team and admins can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Allow authenticated users to create notifications (for flag system)
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_flags_file_id ON public.file_flags(file_id);
CREATE INDEX IF NOT EXISTS idx_file_flags_flagged_for ON public.file_flags(flagged_for);
CREATE INDEX IF NOT EXISTS idx_file_flags_resolved ON public.file_flags(resolved);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_files_is_pinned ON public.files(is_pinned_to_dashboard);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON public.files(project_id);