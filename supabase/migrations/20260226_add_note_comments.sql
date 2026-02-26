-- Threaded comments on client notes
CREATE TABLE note_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES client_notes(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_note_comments_note ON note_comments(note_id);

ALTER TABLE note_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team and admin can manage note comments"
  ON note_comments FOR ALL
  USING (has_role(auth.uid(), 'team') OR has_role(auth.uid(), 'admin'));
