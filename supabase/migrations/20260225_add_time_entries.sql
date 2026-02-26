-- Time entries table for tracking hours worked on clients
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  hours NUMERIC(6,2) NOT NULL CHECK (hours > 0),
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_time_entries_company ON time_entries(company_id);
CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team and admin can manage time entries"
  ON time_entries FOR ALL
  USING (has_role(auth.uid(), 'team') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view time entries for their company"
  ON time_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.company_id = time_entries.company_id
    )
  );

-- Sync trigger: keep companies.hours_used in sync with time_entries
CREATE OR REPLACE FUNCTION sync_company_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE companies SET hours_used = (
      SELECT COALESCE(SUM(hours), 0) FROM time_entries WHERE company_id = OLD.company_id
    ) WHERE id = OLD.company_id;
    RETURN OLD;
  ELSE
    UPDATE companies SET hours_used = (
      SELECT COALESCE(SUM(hours), 0) FROM time_entries WHERE company_id = NEW.company_id
    ) WHERE id = NEW.company_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_hours_on_time_entry
  AFTER INSERT OR UPDATE OR DELETE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION sync_company_hours();
