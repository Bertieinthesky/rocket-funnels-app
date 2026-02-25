-- Add workflow_phase enum for the sequential delivery pipeline
CREATE TYPE public.workflow_phase AS ENUM (
  'shaping',
  'sales_copy',
  'design',
  'crm_config',
  'launch_analyze',
  'cro'
);

-- Add new project type values (copywriting, cro) to existing enum
ALTER TYPE public.project_type ADD VALUE IF NOT EXISTS 'copywriting';
ALTER TYPE public.project_type ADD VALUE IF NOT EXISTS 'cro';

-- Add phase, priority, assignment, and due date tracking to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS phase workflow_phase DEFAULT 'shaping';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS phase_started_at TIMESTAMPTZ;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS phase_due_date DATE;

-- Index for fast filtering on phase, priority, assigned_to
CREATE INDEX IF NOT EXISTS idx_projects_phase ON public.projects(phase);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON public.projects(priority);
CREATE INDEX IF NOT EXISTS idx_projects_assigned_to ON public.projects(assigned_to);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON public.projects(company_id);
