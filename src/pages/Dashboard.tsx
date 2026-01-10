import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Upload, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  FolderKanban,
  Loader2
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  status: string;
  is_blocked: boolean;
  blocked_reason: string | null;
  project_type: string;
  target_date: string | null;
}

interface Company {
  id: string;
  name: string;
  retainer_type: string;
  hours_allocated: number;
  hours_used: number;
}

interface Profile {
  company_id: string | null;
}

const statusColors: Record<string, string> = {
  queued: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/10 text-primary',
  revision: 'bg-warning/10 text-warning',
  review: 'bg-success/10 text-success',
  complete: 'bg-success text-success-foreground',
};

const statusLabels: Record<string, string> = {
  queued: 'Queued',
  in_progress: 'In Progress',
  revision: 'Revision',
  review: 'Review',
  complete: 'Complete',
};

export default function Dashboard() {
  const { user, isClient } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch user's profile to get company_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (profile?.company_id) {
        // Fetch company details
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single();
        
        setCompany(companyData);

        // Fetch projects for the company
        const { data: projectsData } = await supabase
          .from('projects')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false });
        
        setProjects(projectsData || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeProjects = projects.filter(p => p.status !== 'complete');
  const blockedProjects = projects.filter(p => p.is_blocked);
  const completedProjects = projects.filter(p => p.status === 'complete');
  
  const hoursPercentage = company?.hours_allocated 
    ? Math.round((Number(company.hours_used) / company.hours_allocated) * 100)
    : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening with your projects.
            </p>
          </div>
          
          {isClient && (
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/files">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Files
                </Link>
              </Button>
              <Button asChild>
                <Link to="/projects/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Action Needed Banner */}
        {blockedProjects.length > 0 && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Action Needed</p>
                <p className="text-sm text-muted-foreground">
                  {blockedProjects.length} project{blockedProjects.length > 1 ? 's' : ''} waiting for your input
                </p>
              </div>
              <Button variant="destructive" size="sm" asChild>
                <Link to="/projects">View Projects</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeProjects.length}</div>
              <p className="text-xs text-muted-foreground">
                {completedProjects.length} completed this month
              </p>
            </CardContent>
          </Card>
          
          {company?.retainer_type === 'hourly' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Hours Used</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Number(company.hours_used).toFixed(1)} / {company.hours_allocated}
                </div>
                <Progress value={hoursPercentage} className="mt-2 h-2" />
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedProjects.length}</div>
              <p className="text-xs text-muted-foreground">Total projects delivered</p>
            </CardContent>
          </Card>
        </div>

        {/* Current Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Current Projects</CardTitle>
              <CardDescription>Your active and queued projects</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/projects">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {activeProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderKanban className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No active projects</p>
                {isClient && (
                  <Button className="mt-4" asChild>
                    <Link to="/projects/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Submit New Request
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {activeProjects.slice(0, 5).map((project) => (
                  <Link 
                    key={project.id} 
                    to={`/projects/${project.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{project.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {project.project_type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {project.is_blocked && (
                        <Badge variant="destructive" className="text-xs">
                          Blocked
                        </Badge>
                      )}
                      <Badge className={statusColors[project.status]}>
                        {statusLabels[project.status]}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
