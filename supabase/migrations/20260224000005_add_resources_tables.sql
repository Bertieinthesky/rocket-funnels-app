-- AI Workspaces: directory of external AI tools/Perplexity spaces
CREATE TABLE public.ai_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  url TEXT NOT NULL,
  icon_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_workspaces ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_ai_workspaces_updated_at
  BEFORE UPDATE ON public.ai_workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: Team and admins can view workspaces
CREATE POLICY "Team and admins can view workspaces"
ON public.ai_workspaces FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'team') OR
  public.has_role(auth.uid(), 'admin')
);

-- RLS: Admins can manage workspaces
CREATE POLICY "Admins can manage workspaces"
ON public.ai_workspaces FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- SOPs: standard operating procedures library
CREATE TABLE public.sops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT,       -- markdown body if stored in-app
  external_url TEXT,  -- link to Google Doc, Notion, etc. if external
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_sops_updated_at
  BEFORE UPDATE ON public.sops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: Team and admins can view SOPs
CREATE POLICY "Team and admins can view SOPs"
ON public.sops FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'team') OR
  public.has_role(auth.uid(), 'admin')
);

-- RLS: Team and admins can manage SOPs
CREATE POLICY "Team and admins can manage SOPs"
ON public.sops FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'team') OR
  public.has_role(auth.uid(), 'admin')
);
