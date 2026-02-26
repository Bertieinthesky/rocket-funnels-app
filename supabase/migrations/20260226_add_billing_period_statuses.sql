-- Billing period statuses: tracks invoice workflow per company per billing period
CREATE TABLE IF NOT EXISTS billing_period_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_label TEXT NOT NULL,
  hours_allocated NUMERIC(6,2),
  hourly_rate NUMERIC(8,2),
  status TEXT NOT NULL DEFAULT 'under_review',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, period_key)
);

ALTER TABLE billing_period_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read billing_period_statuses"
  ON billing_period_statuses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Team can manage billing_period_statuses"
  ON billing_period_statuses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'team'));
