-- Add new fields to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS invoicing_email text,
ADD COLUMN IF NOT EXISTS company_website text,
ADD COLUMN IF NOT EXISTS hourly_rate decimal,
ADD COLUMN IF NOT EXISTS payment_schedule text CHECK (payment_schedule IN ('1st', '15th'));

-- Create client_notes table
CREATE TABLE public.client_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('Meeting Notes', 'General Info', 'Project Context')),
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

-- Enable RLS on client_notes
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

-- Team and Admin can view all client notes
CREATE POLICY "Team and Admin can view client notes"
ON public.client_notes
FOR SELECT
USING (
  public.has_role(auth.uid(), 'team') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Team and Admin can create client notes
CREATE POLICY "Team and Admin can create client notes"
ON public.client_notes
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'team') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Team and Admin can update their own notes
CREATE POLICY "Team and Admin can update client notes"
ON public.client_notes
FOR UPDATE
USING (
  (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'))
  AND created_by = auth.uid()
);

-- Team and Admin can delete their own notes
CREATE POLICY "Team and Admin can delete client notes"
ON public.client_notes
FOR DELETE
USING (
  (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'))
  AND created_by = auth.uid()
);