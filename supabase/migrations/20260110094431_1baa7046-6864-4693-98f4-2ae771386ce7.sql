-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('portal-files', 'portal-files', true);

-- Storage policies for file uploads
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'portal-files');

CREATE POLICY "Anyone can view public files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'portal-files');

CREATE POLICY "Users can delete their uploaded files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'portal-files' AND auth.uid()::text = (storage.foldername(name))[1]);