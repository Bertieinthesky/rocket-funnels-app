import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  ArrowRight, 
  AlertCircle,
  Loader2
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  is_blocked: boolean;
  blocked_reason: string | null;
  project_type: string;
  target_date: string | null;
  created_at: string;
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

export default function Projects() {
  const { user, isClient } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (profile?.company_id) {
        const { data } = await supabase
          .from('projects')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false });
        
        setProjects(data || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeProjects = projects.filter(p => p.status !== 'complete');
  const completedProjects = projects.filter(p => p.status === 'complete');

  const ProjectCard = ({ project }: { project: Project }) => (
    <Link 
      to={`/projects/${project.id}`}
      className="block"
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{project.name}</h3>
                {project.is_blocked && (
                  <Badge variant="destructive" className="text-xs shrink-0">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Blocked
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {project.description || 'No description'}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" className="text-xs capitalize">
                  {project.project_type}
                </Badge>
                {project.target_date && (
                  <span className="text-xs text-muted-foreground">
                    Target: {new Date(project.target_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={statusColors[project.status]}>
                {statusLabels[project.status]}
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          
          {project.is_blocked && project.blocked_reason && (
            <div className="mt-3 p-2 bg-destructive/5 rounded-md border border-destructive/20">
              <p className="text-xs text-destructive">
                <strong>Waiting for:</strong> {project.blocked_reason}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-muted-foreground">
              Manage and track all your projects
            </p>
          </div>
          
          {isClient && (
            <Button asChild>
              <Link to="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active">
              Active ({activeProjects.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedProjects.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-4">
            {activeProjects.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No active projects</p>
                  {isClient && (
                    <Button asChild>
                      <Link to="/projects/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Submit New Request
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {activeProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="completed" className="mt-4">
            {completedProjects.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No completed projects yet
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {completedProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
