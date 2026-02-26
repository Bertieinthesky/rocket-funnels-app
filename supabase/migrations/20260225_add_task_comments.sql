-- Task comments table for threaded discussions on tasks
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_task_comments_task ON task_comments(task_id);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team and admin can manage task comments"
  ON task_comments FOR ALL
  USING (has_role(auth.uid(), 'team') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view comments on their company tasks"
  ON task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      JOIN profiles pr ON pr.company_id = p.company_id
      WHERE t.id = task_comments.task_id AND pr.id = auth.uid()
    )
  );
