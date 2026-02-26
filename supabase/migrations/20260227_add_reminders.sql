CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  due_date DATE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reminders_company ON reminders(company_id);
CREATE INDEX idx_reminders_user ON reminders(user_id);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team and admins can view reminders"
  ON public.reminders FOR SELECT
  USING (has_role(auth.uid(), 'team') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage own reminders"
  ON public.reminders FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
