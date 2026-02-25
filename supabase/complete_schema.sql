-- ============================================================
-- ROCKET FUNNELS — Complete Database Schema
-- Run this in the Supabase SQL Editor for a fresh project.
-- ============================================================

-- ==================== ENUMS ====================

CREATE TYPE public.app_role AS ENUM ('client', 'team', 'admin');
CREATE TYPE public.retainer_type AS ENUM ('unlimited', 'hourly', 'one_time');
CREATE TYPE public.project_status AS ENUM ('queued', 'in_progress', 'revision', 'review', 'complete');
CREATE TYPE public.project_type AS ENUM ('design', 'development', 'content', 'strategy', 'other', 'copywriting', 'cro');
CREATE TYPE public.file_category AS ENUM ('documents', 'images', 'testimonials', 'video', 'brand', 'content', 'designs', 'copy', 'other');
CREATE TYPE public.workflow_phase AS ENUM ('shaping', 'sales_copy', 'design', 'crm_config', 'launch_analyze', 'cro');

-- ==================== UTILITY FUNCTIONS ====================

-- Timestamp auto-updater
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Role checker (security definer prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ==================== TABLES ====================

-- User roles
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    company_id UUID,
    is_approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Companies
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    retainer_type retainer_type NOT NULL DEFAULT 'unlimited',
    hours_allocated INTEGER DEFAULT 0,
    hours_used NUMERIC(10,2) DEFAULT 0,
    max_concurrent_projects INTEGER DEFAULT 3,
    billing_email TEXT,
    contact_email TEXT,
    invoicing_email TEXT,
    company_website TEXT,
    hourly_rate DECIMAL,
    payment_schedule TEXT CHECK (payment_schedule IN ('1st', '15th')),
    poc_name TEXT,
    is_active BOOLEAN DEFAULT true,
    archived_at TIMESTAMPTZ,
    ai_cmo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK for profiles.company_id
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_company_id_fkey
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;

-- Projects
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    project_type project_type NOT NULL DEFAULT 'other',
    status project_status NOT NULL DEFAULT 'queued',
    phase workflow_phase DEFAULT 'shaping',
    priority TEXT DEFAULT 'normal',
    assigned_to UUID REFERENCES auth.users(id),
    is_blocked BOOLEAN NOT NULL DEFAULT false,
    blocked_reason TEXT,
    target_date DATE,
    phase_started_at TIMESTAMPTZ,
    phase_due_date DATE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updates (activity feed / deliverables)
CREATE TABLE public.updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users(id),
    content TEXT NOT NULL,
    is_deliverable BOOLEAN NOT NULL DEFAULT false,
    is_approved BOOLEAN,
    hours_logged NUMERIC(10,2),
    change_request_text TEXT,
    change_request_link TEXT,
    change_request_link_type TEXT,
    change_request_draft BOOLEAN DEFAULT false,
    change_request_submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Files
CREATE TABLE public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    update_id UUID REFERENCES public.updates(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    title TEXT,
    description TEXT,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    original_file_size BIGINT,
    mime_type TEXT,
    category file_category NOT NULL DEFAULT 'other',
    is_pinned_to_dashboard BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    is_external_link BOOLEAN DEFAULT false,
    is_optimized BOOLEAN DEFAULT false,
    external_platform TEXT,
    video_hosted_link TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- File flags (bi-directional communication on files)
CREATE TABLE public.file_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    flagged_by UUID NOT NULL,
    flagged_by_role TEXT NOT NULL CHECK (flagged_by_role IN ('admin', 'team', 'client')),
    flagged_for TEXT NOT NULL CHECK (flagged_for IN ('team', 'client')),
    flag_message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID,
    resolved_message TEXT,
    resolved_at TIMESTAMPTZ
);

-- Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
    flag_id UUID REFERENCES public.file_flags(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages (client chat + team notes)
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT false,
    link_url TEXT,
    link_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Client notes (internal notes per company)
CREATE TABLE public.client_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('Meeting Notes', 'General Info', 'Project Context')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Company credentials (passwords vault — team/admin only)
CREATE TABLE public.company_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI Workspaces (external AI tools directory)
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

-- SOPs (standard operating procedures)
CREATE TABLE public.sops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT,
    external_url TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==================== TRIGGERS ====================

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON public.files
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_credentials_updated_at
    BEFORE UPDATE ON public.company_credentials
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_workspaces_updated_at
    BEFORE UPDATE ON public.ai_workspaces
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sops_updated_at
    BEFORE UPDATE ON public.sops
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== AUTH TRIGGER ====================

-- Auto-create profile + client role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, is_approved)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
        false
    );
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'client');
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==================== INDEXES ====================

CREATE INDEX idx_projects_phase ON public.projects(phase);
CREATE INDEX idx_projects_priority ON public.projects(priority);
CREATE INDEX idx_projects_assigned_to ON public.projects(assigned_to);
CREATE INDEX idx_projects_company_id ON public.projects(company_id);
CREATE INDEX idx_messages_project_id ON public.messages(project_id);
CREATE INDEX idx_messages_author_id ON public.messages(author_id);
CREATE INDEX idx_messages_is_internal ON public.messages(is_internal);
CREATE INDEX idx_file_flags_file_id ON public.file_flags(file_id);
CREATE INDEX idx_file_flags_flagged_for ON public.file_flags(flagged_for);
CREATE INDEX idx_file_flags_resolved ON public.file_flags(resolved);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_files_is_pinned ON public.files(is_pinned_to_dashboard);
CREATE INDEX idx_files_project_id ON public.files(project_id);

-- ==================== ENABLE RLS ====================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;

-- ==================== RLS POLICIES ====================

-- ---- user_roles ----
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ---- profiles ----
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Team and admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ---- companies ----
CREATE POLICY "Clients can view their own company"
ON public.companies FOR SELECT TO authenticated
USING (id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Team and admins can view all companies"
ON public.companies FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage companies"
ON public.companies FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team can update companies"
ON public.companies FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'team'));

-- ---- projects ----
CREATE POLICY "Clients can view their company projects"
ON public.projects FOR SELECT TO authenticated
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Clients can create projects for their company"
ON public.projects FOR INSERT TO authenticated
WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Team and admins can view all projects"
ON public.projects FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team and admins can manage all projects"
ON public.projects FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'));

-- ---- updates ----
CREATE POLICY "Clients can view updates for their projects"
ON public.updates FOR SELECT TO authenticated
USING (project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.profiles pr ON pr.company_id = p.company_id
    WHERE pr.id = auth.uid()
));

CREATE POLICY "Clients can create updates for their projects"
ON public.updates FOR INSERT TO authenticated
WITH CHECK (project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.profiles pr ON pr.company_id = p.company_id
    WHERE pr.id = auth.uid()
));

CREATE POLICY "Clients can update their own updates"
ON public.updates FOR UPDATE TO authenticated
USING (project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.profiles pr ON pr.company_id = p.company_id
    WHERE pr.id = auth.uid()
))
WITH CHECK (project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.profiles pr ON pr.company_id = p.company_id
    WHERE pr.id = auth.uid()
));

CREATE POLICY "Team and admins can manage all updates"
ON public.updates FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'));

-- ---- files ----
CREATE POLICY "Clients can view files for their company"
ON public.files FOR SELECT TO authenticated
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Clients can upload files for their company"
ON public.files FOR INSERT TO authenticated
WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Team and admins can manage all files"
ON public.files FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'));

-- ---- file_flags ----
CREATE POLICY "Team and admins can view all flags"
ON public.file_flags FOR SELECT
USING (has_role(auth.uid(), 'team'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view flags on their company files"
ON public.file_flags FOR SELECT
USING (file_id IN (
    SELECT f.id FROM public.files f
    WHERE f.company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
));

CREATE POLICY "Team and admins can create flags"
ON public.file_flags FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can create flags for team"
ON public.file_flags FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'client'::app_role)
    AND flagged_for = 'team'
    AND file_id IN (
        SELECT f.id FROM public.files f
        WHERE f.company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
);

CREATE POLICY "Users can resolve flags"
ON public.file_flags FOR UPDATE
USING (
    (has_role(auth.uid(), 'team'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    OR (
        has_role(auth.uid(), 'client'::app_role)
        AND file_id IN (
            SELECT f.id FROM public.files f
            WHERE f.company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        )
    )
);

-- ---- notifications ----
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- ---- messages ----
CREATE POLICY "Team and admins can view all messages"
ON public.messages FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view client messages for their projects"
ON public.messages FOR SELECT TO authenticated
USING (
    is_internal = false
    AND project_id IN (
        SELECT p.id FROM public.projects p
        JOIN public.profiles pr ON pr.company_id = p.company_id
        WHERE pr.id = auth.uid()
    )
);

CREATE POLICY "Team and admins can manage all messages"
ON public.messages FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can create client messages on their projects"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
    is_internal = false
    AND project_id IN (
        SELECT p.id FROM public.projects p
        JOIN public.profiles pr ON pr.company_id = p.company_id
        WHERE pr.id = auth.uid()
    )
);

-- ---- client_notes ----
CREATE POLICY "Team and Admin can view client notes"
ON public.client_notes FOR SELECT
USING (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team and Admin can create client notes"
ON public.client_notes FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team and Admin can update client notes"
ON public.client_notes FOR UPDATE
USING ((public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin')) AND created_by = auth.uid());

CREATE POLICY "Team and Admin can delete client notes"
ON public.client_notes FOR DELETE
USING ((public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin')) AND created_by = auth.uid());

-- ---- company_credentials ----
CREATE POLICY "Team and admins can view credentials"
ON public.company_credentials FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team and admins can manage credentials"
ON public.company_credentials FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'));

-- ---- ai_workspaces ----
CREATE POLICY "Team and admins can view workspaces"
ON public.ai_workspaces FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage workspaces"
ON public.ai_workspaces FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ---- sops ----
CREATE POLICY "Team and admins can view SOPs"
ON public.sops FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team and admins can manage SOPs"
ON public.sops FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'team') OR public.has_role(auth.uid(), 'admin'));

-- ==================== STORAGE ====================

INSERT INTO storage.buckets (id, name, public)
VALUES ('portal-files', 'portal-files', true);

CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'portal-files');

CREATE POLICY "Anyone can view public files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'portal-files');

CREATE POLICY "Users can delete their uploaded files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'portal-files' AND auth.uid()::text = (storage.foldername(name))[1]);
