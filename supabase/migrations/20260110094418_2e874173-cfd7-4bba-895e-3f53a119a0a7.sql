-- Create app_role enum for user roles (client, team, admin)
CREATE TYPE public.app_role AS ENUM ('client', 'team', 'admin');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create profiles table for user information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    company_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create retainer_type enum
CREATE TYPE public.retainer_type AS ENUM ('unlimited', 'hourly');

-- Create companies table for client companies
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    retainer_type retainer_type NOT NULL DEFAULT 'unlimited',
    hours_allocated INTEGER DEFAULT 0,
    hours_used NUMERIC(10,2) DEFAULT 0,
    max_concurrent_projects INTEGER DEFAULT 3,
    billing_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Add foreign key for profiles.company_id
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;

-- Create project_status enum (5 statuses)
CREATE TYPE public.project_status AS ENUM ('queued', 'in_progress', 'revision', 'review', 'complete');

-- Create project_type enum
CREATE TYPE public.project_type AS ENUM ('design', 'development', 'content', 'strategy', 'other');

-- Create projects table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    project_type project_type NOT NULL DEFAULT 'other',
    status project_status NOT NULL DEFAULT 'queued',
    is_blocked BOOLEAN NOT NULL DEFAULT false,
    blocked_reason TEXT,
    target_date DATE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create updates table (activity feed)
CREATE TABLE public.updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users(id),
    content TEXT NOT NULL,
    is_deliverable BOOLEAN NOT NULL DEFAULT false,
    is_approved BOOLEAN,
    hours_logged NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on updates
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;

-- Create file_category enum
CREATE TYPE public.file_category AS ENUM ('brand', 'content', 'designs', 'copy', 'other');

-- Create files table
CREATE TABLE public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    update_id UUID REFERENCES public.updates(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    category file_category NOT NULL DEFAULT 'other',
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on files
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '')
    );
    
    -- Default new users to client role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'client');
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Team and admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'team') OR 
    public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for companies
CREATE POLICY "Clients can view their own company"
ON public.companies FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Team and admins can view all companies"
ON public.companies FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'team') OR 
    public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can manage companies"
ON public.companies FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for projects
CREATE POLICY "Clients can view their company projects"
ON public.projects FOR SELECT
TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Clients can create projects for their company"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (
    company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Team and admins can view all projects"
ON public.projects FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'team') OR 
    public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Team and admins can manage all projects"
ON public.projects FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'team') OR 
    public.has_role(auth.uid(), 'admin')
);

-- RLS Policies for updates
CREATE POLICY "Clients can view updates for their projects"
ON public.updates FOR SELECT
TO authenticated
USING (
    project_id IN (
        SELECT p.id FROM public.projects p
        JOIN public.profiles pr ON pr.company_id = p.company_id
        WHERE pr.id = auth.uid()
    )
);

CREATE POLICY "Clients can create updates for their projects"
ON public.updates FOR INSERT
TO authenticated
WITH CHECK (
    project_id IN (
        SELECT p.id FROM public.projects p
        JOIN public.profiles pr ON pr.company_id = p.company_id
        WHERE pr.id = auth.uid()
    )
);

CREATE POLICY "Clients can update their own updates (approve deliverables)"
ON public.updates FOR UPDATE
TO authenticated
USING (
    project_id IN (
        SELECT p.id FROM public.projects p
        JOIN public.profiles pr ON pr.company_id = p.company_id
        WHERE pr.id = auth.uid()
    )
)
WITH CHECK (
    project_id IN (
        SELECT p.id FROM public.projects p
        JOIN public.profiles pr ON pr.company_id = p.company_id
        WHERE pr.id = auth.uid()
    )
);

CREATE POLICY "Team and admins can manage all updates"
ON public.updates FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'team') OR 
    public.has_role(auth.uid(), 'admin')
);

-- RLS Policies for files
CREATE POLICY "Clients can view files for their company"
ON public.files FOR SELECT
TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Clients can upload files for their company"
ON public.files FOR INSERT
TO authenticated
WITH CHECK (
    company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Team and admins can manage all files"
ON public.files FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'team') OR 
    public.has_role(auth.uid(), 'admin')
);