-- Messages table for two-tab communication:
-- Client Chat (is_internal = false) — visible to team + client
-- Team Notes (is_internal = true) — visible to team/admin only

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  link_url TEXT,
  link_type TEXT, -- 'loom', 'google_docs', 'youtube', etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Indexes for fast lookups
CREATE INDEX idx_messages_project_id ON public.messages(project_id);
CREATE INDEX idx_messages_author_id ON public.messages(author_id);
CREATE INDEX idx_messages_is_internal ON public.messages(is_internal);

-- RLS: Team and admins can see ALL messages (internal + client)
CREATE POLICY "Team and admins can view all messages"
ON public.messages FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'team') OR
  public.has_role(auth.uid(), 'admin')
);

-- RLS: Clients can see only non-internal messages for their company's projects
CREATE POLICY "Clients can view client messages for their projects"
ON public.messages FOR SELECT
TO authenticated
USING (
  is_internal = false
  AND project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.profiles pr ON pr.company_id = p.company_id
    WHERE pr.id = auth.uid()
  )
);

-- RLS: Team and admins can create any message
CREATE POLICY "Team and admins can create messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'team') OR
  public.has_role(auth.uid(), 'admin')
);

-- RLS: Clients can create non-internal messages on their projects
CREATE POLICY "Clients can create client messages on their projects"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  is_internal = false
  AND project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.profiles pr ON pr.company_id = p.company_id
    WHERE pr.id = auth.uid()
  )
);

-- RLS: Team and admins can manage all messages
CREATE POLICY "Team and admins can manage all messages"
ON public.messages FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'team') OR
  public.has_role(auth.uid(), 'admin')
);
