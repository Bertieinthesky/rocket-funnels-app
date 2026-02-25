-- Tasks table for individual work items within campaigns (projects)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'blocked', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('urgent', 'important', 'normal', 'queued')),
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);

-- RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team and admin can do everything with tasks"
  ON tasks FOR ALL
  USING (has_role('team', auth.uid()) OR has_role('admin', auth.uid()));

CREATE POLICY "Clients can view tasks for their company projects"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN profiles pr ON pr.company_id = p.company_id
      WHERE p.id = tasks.project_id AND pr.id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
