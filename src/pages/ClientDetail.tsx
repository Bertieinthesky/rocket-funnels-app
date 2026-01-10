import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CompanyInfoTab } from '@/components/client/CompanyInfoTab';
import { ClientNotesTab } from '@/components/client/ClientNotesTab';
import { 
  ArrowLeft, 
  FolderKanban, 
  FileText, 
  Settings,
  Plus,
  Building2,
  StickyNote
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  retainer_type: string;
  hours_allocated: number | null;
  hours_used: number | null;
  max_concurrent_projects: number | null;
  billing_email: string | null;
  contact_email: string | null;
  invoicing_email: string | null;
  company_website: string | null;
  hourly_rate: number | null;
  payment_schedule: string | null;
}

interface Project {
  id: string;
  name: string;
  status: string;
  project_type: string;
  is_blocked: boolean;
  created_at: string;
}

const statusColors: Record<string, string> = {
  queued: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/10 text-primary',
  revision: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  review: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  complete: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const statusLabels: Record<string, string> = {
  queued: 'Queued',
  in_progress: 'In Progress',
  revision: 'Revision',
  review: 'Review',
  complete: 'Complete',
};

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { isTeam, isAdmin } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCompanyData();
    }
  }, [id]);

  const fetchCompanyData = async () => {
    try {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      if (companyError) throw companyError;
      setCompany(companyData);

      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', id)
        .order('created_at', { ascending: false });

      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error fetching company:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!isTeam && !isAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">You don't have access to this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Company not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/clients">Back to Clients</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const activeProjects = projects.filter(p => p.status !== 'complete');
  const completedProjects = projects.filter(p => p.status === 'complete');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-4 flex-1">
            <Avatar className="h-14 w-14">
              <AvatarImage src={company.logo_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                {getInitials(company.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{company.name}</h1>
              <p className="text-muted-foreground">{company.billing_email}</p>
            </div>
          </div>
          {isAdmin && (
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Projects</CardDescription>
              <CardTitle className="text-3xl">{activeProjects.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                of {company.max_concurrent_projects} max concurrent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Plan Type</CardDescription>
              <CardTitle className="text-3xl capitalize">{company.retainer_type}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={company.retainer_type === 'unlimited' ? 'default' : 'secondary'}>
                {company.retainer_type === 'unlimited' ? 'Unlimited Projects' : 'Hourly Billing'}
              </Badge>
            </CardContent>
          </Card>

          {company.retainer_type === 'hourly' && (
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Hours Used</CardDescription>
                <CardTitle className="text-3xl">
                  {company.hours_used || 0}/{company.hours_allocated || 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(((company.hours_used || 0) / (company.hours_allocated || 1)) * 100, 100)}%` 
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList>
            <TabsTrigger value="projects" className="gap-2">
              <FolderKanban className="h-4 w-4" />
              Projects ({projects.length})
            </TabsTrigger>
            <TabsTrigger value="company-info" className="gap-2">
              <Building2 className="h-4 w-4" />
              Company Info
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-2">
              <StickyNote className="h-4 w-4" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-2">
              <FileText className="h-4 w-4" />
              Files
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-4">
            <div className="flex justify-end">
              <Button asChild>
                <Link to={`/projects/new?company=${company.id}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Link>
              </Button>
            </div>

            {activeProjects.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Active Projects
                </h3>
                <div className="grid gap-3">
                  {activeProjects.map((project) => (
                    <Link key={project.id} to={`/projects/${project.id}`}>
                      <Card className="hover:border-primary/50 transition-colors">
                        <CardContent className="py-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{project.name}</span>
                            {project.is_blocked && (
                              <Badge variant="destructive">Blocked</Badge>
                            )}
                          </div>
                          <Badge className={statusColors[project.status]}>
                            {statusLabels[project.status]}
                          </Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {completedProjects.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Completed Projects
                </h3>
                <div className="grid gap-3">
                  {completedProjects.map((project) => (
                    <Link key={project.id} to={`/projects/${project.id}`}>
                      <Card className="hover:border-primary/50 transition-colors opacity-70">
                        <CardContent className="py-4 flex items-center justify-between">
                          <span className="font-medium">{project.name}</span>
                          <Badge className={statusColors[project.status]}>
                            {statusLabels[project.status]}
                          </Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {projects.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No projects yet for this client.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="company-info">
            <CompanyInfoTab company={company} onUpdate={fetchCompanyData} />
          </TabsContent>

          <TabsContent value="notes">
            <ClientNotesTab companyId={company.id} />
          </TabsContent>

          <TabsContent value="files">
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">File library coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}