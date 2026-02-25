-- Simple credentials/passwords storage per company (team/admin only)
CREATE TABLE public.company_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_credentials ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at
CREATE TRIGGER update_company_credentials_updated_at
  BEFORE UPDATE ON public.company_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: Team and admins only — never client-visible
CREATE POLICY "Team and admins can view credentials"
ON public.company_credentials FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'team') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Team and admins can manage credentials"
ON public.company_credentials FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'team') OR
  public.has_role(auth.uid(), 'admin')
);
