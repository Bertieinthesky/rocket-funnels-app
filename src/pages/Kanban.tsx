import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Loader2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  status: string;
  project_type: string;
  is_blocked: boolean;
  blocked_reason: string | null;
  company_id: string;
  company_name?: string;
}

const statusColumns = [
  { key: 'queued', label: 'Queued', color: 'bg-muted' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-primary/10' },
  { key: 'revision', label: 'Revision', color: 'bg-orange-100 dark:bg-orange-900/30' },
  { key: 'review', label: 'Review', color: 'bg-blue-100 dark:bg-blue-900/30' },
  { key: 'complete', label: 'Complete', color: 'bg-green-100 dark:bg-green-900/30' },
];

const typeColors: Record<string, string> = {
  design: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  development: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  content: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  strategy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export default function Kanban() {
  const { isTeam, isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch company names
      const companyIds = [...new Set((projectsData || []).map(p => p.company_id))];
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds);

      const companyMap = new Map(companiesData?.map(c => [c.id, c.name]));

      const projectsWithCompany = (projectsData || []).map(project => ({
        ...project,
        company_name: companyMap.get(project.company_id) || 'Unknown',
      }));

      setProjects(projectsWithCompany);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
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
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Kanban Board</h1>
          <p className="text-muted-foreground">Overview of all projects across clients</p>
        </div>

        <div className="grid grid-cols-5 gap-4 min-h-[calc(100vh-220px)]">
          {statusColumns.map((column) => {
            const columnProjects = projects.filter(p => p.status === column.key);
            
            return (
              <div key={column.key} className="flex flex-col">
                <div className={`rounded-t-lg px-3 py-2 ${column.color}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{column.label}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {columnProjects.length}
                    </Badge>
                  </div>
                </div>
                
                <ScrollArea className="flex-1 border border-t-0 rounded-b-lg bg-muted/20">
                  <div className="p-2 space-y-2">
                    {columnProjects.map((project) => (
                      <Link key={project.id} to={`/projects/${project.id}`}>
                        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                          <CardHeader className="p-3 pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-sm font-medium leading-tight">
                                {project.name}
                              </CardTitle>
                              {project.is_blocked && (
                                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                              )}
                            </div>
                            <CardDescription className="text-xs truncate">
                              {project.company_name}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${typeColors[project.project_type]}`}
                            >
                              {project.project_type}
                            </Badge>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                    
                    {columnProjects.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No projects
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}