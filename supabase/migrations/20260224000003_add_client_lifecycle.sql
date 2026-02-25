-- Client lifecycle: active → inactive → archived
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- AI CMO link per client (links to external Perplexity space for now)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS ai_cmo_url TEXT;
