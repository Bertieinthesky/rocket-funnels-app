-- Company-level updates for the Activity feed on Client Detail
CREATE TABLE company_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_updates_company ON company_updates(company_id);
CREATE INDEX idx_company_updates_created ON company_updates(created_at DESC);

ALTER TABLE company_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team and admin can manage company updates"
  ON company_updates FOR ALL
  USING (has_role(auth.uid(), 'team') OR has_role(auth.uid(), 'admin'));
