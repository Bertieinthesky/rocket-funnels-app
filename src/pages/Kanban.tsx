import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2, Filter, Calendar, Bell, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';

interface Project {
  id: string;
  name: string;
  status: string;
  project_type: string;
  is_blocked: boolean;
  blocked_reason: string | null;
  company_id: string;
  company_name?: string;
  target_date: string | null;
}

interface Company {
  id: string;
  name: string;
}

interface ProjectNotifications {
  pendingApprovals: number;
  changeRequests: number;
  newUpdates: number;
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

const projectTypes = ['design', 'development', 'content', 'strategy', 'other'];

export default function Kanban() {
  const { isTeam, isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projectNotifications, setProjectNotifications] = useState<Record<string, ProjectNotifications>>({});
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showBlocked, setShowBlocked] = useState<boolean>(false);

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
      setCompanies(companiesData || []);

      // Fetch notifications for each project (updates with pending approvals, change requests, etc.)
      const projectIds = (projectsData || []).map(p => p.id);
      if (projectIds.length > 0) {
        const { data: updatesData } = await supabase
          .from('updates')
          .select('project_id, is_deliverable, is_approved, change_request_text, change_request_submitted_at')
          .in('project_id', projectIds);

        // Calculate notifications per project
        const notificationsMap: Record<string, ProjectNotifications> = {};
        projectIds.forEach(id => {
          notificationsMap[id] = { pendingApprovals: 0, changeRequests: 0, newUpdates: 0 };
        });

        (updatesData || []).forEach(update => {
          if (!notificationsMap[update.project_id]) return;
          
          // Pending approval = deliverable with is_approved === null
          if (update.is_deliverable && update.is_approved === null) {
            notificationsMap[update.project_id].pendingApprovals++;
          }
          
          // Change request = deliverable with is_approved === false and has change_request_text
          if (update.is_deliverable && update.is_approved === false && update.change_request_text) {
            notificationsMap[update.project_id].changeRequests++;
          }
        });

        setProjectNotifications(notificationsMap);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered projects based on selected filters
  const filteredProjects = useMemo(() => {
    let result = projects;

    if (selectedClient !== 'all') {
      result = result.filter(p => p.company_id === selectedClient);
    }

    if (selectedType !== 'all') {
      result = result.filter(p => p.project_type === selectedType);
    }

    if (showBlocked) {
      result = result.filter(p => p.is_blocked);
    }

    return result;
  }, [projects, selectedClient, selectedType, showBlocked]);

  const clearFilters = () => {
    setSelectedClient('all');
    setSelectedType('all');
    setShowBlocked(false);
  };

  const hasActiveFilters = selectedClient !== 'all' || selectedType !== 'all' || showBlocked;

  const getDueDateInfo = (targetDate: string | null) => {
    if (!targetDate) return null;
    
    const date = new Date(targetDate);
    const now = new Date();
    
    if (isPast(date) && !isToday(date)) {
      return { label: 'Overdue', className: 'text-destructive', icon: Calendar };
    }
    if (isToday(date)) {
      return { label: 'Due today', className: 'text-warning', icon: Calendar };
    }
    if (isTomorrow(date)) {
      return { label: 'Due tomorrow', className: 'text-warning', icon: Calendar };
    }
    const daysUntil = differenceInDays(date, now);
    if (daysUntil <= 7) {
      return { label: format(date, 'MMM d'), className: 'text-muted-foreground', icon: Calendar };
    }
    return { label: format(date, 'MMM d'), className: 'text-muted-foreground', icon: Calendar };
  };

  const getTotalNotifications = (projectId: string) => {
    const notif = projectNotifications[projectId];
    if (!notif) return 0;
    return notif.pendingApprovals + notif.changeRequests;
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Kanban Board</h1>
            <p className="text-muted-foreground">Overview of all projects across clients</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Filters:</span>
          </div>

          {/* Client Filter */}
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[180px] h-9 bg-background">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              <SelectItem value="all">All Clients</SelectItem>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Task Type Filter */}
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[160px] h-9 bg-background">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              <SelectItem value="all">All Types</SelectItem>
              {projectTypes.map(type => (
                <SelectItem key={type} value={type} className="capitalize">
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Show Blocked Toggle */}
          <Button
            variant={showBlocked ? 'default' : 'outline'}
            size="sm"
            className="h-9"
            onClick={() => setShowBlocked(!showBlocked)}
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Blocked Only
          </Button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-muted-foreground"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          )}

          {/* Results count */}
          <div className="ml-auto text-sm text-muted-foreground">
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 min-h-[calc(100vh-280px)]">
          {statusColumns.map((column) => {
            const columnProjects = filteredProjects.filter(p => p.status === column.key);
            
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
                    {columnProjects.map((project) => {
                      const dueDateInfo = getDueDateInfo(project.target_date);
                      const totalNotifications = getTotalNotifications(project.id);
                      const notif = projectNotifications[project.id];
                      
                      return (
                        <Link key={project.id} to={`/projects/${project.id}`}>
                          <Card className={`hover:border-primary/50 transition-colors cursor-pointer ${
                            project.is_blocked 
                              ? 'border-destructive/50 bg-destructive/5 ring-1 ring-destructive/20' 
                              : ''
                          }`}>
                            <CardHeader className="p-3 pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <CardTitle className="text-sm font-medium leading-tight">
                                  {project.name}
                                </CardTitle>
                                <div className="flex items-center gap-1 shrink-0">
                                  {totalNotifications > 0 && (
                                    <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                                      {totalNotifications}
                                    </Badge>
                                  )}
                                  {project.is_blocked && (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                                      <AlertCircle className="h-3 w-3" />
                                      <span className="text-[10px] font-medium uppercase">Blocked</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <CardDescription className="text-xs truncate">
                                {project.company_name}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="p-3 pt-0 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${typeColors[project.project_type]}`}
                                >
                                  {project.project_type}
                                </Badge>
                                
                                {/* Due Date */}
                                {dueDateInfo && (
                                  <span className={`text-xs flex items-center gap-1 ${dueDateInfo.className}`}>
                                    <Calendar className="h-3 w-3" />
                                    {dueDateInfo.label}
                                  </span>
                                )}
                              </div>
                              
                              {/* Notification indicators */}
                              {notif && (notif.pendingApprovals > 0 || notif.changeRequests > 0) && (
                                <div className="flex items-center gap-2 text-[10px]">
                                  {notif.pendingApprovals > 0 && (
                                    <span className="flex items-center gap-1 text-primary">
                                      <CheckCircle className="h-3 w-3" />
                                      {notif.pendingApprovals} pending
                                    </span>
                                  )}
                                  {notif.changeRequests > 0 && (
                                    <span className="flex items-center gap-1 text-warning">
                                      <XCircle className="h-3 w-3" />
                                      {notif.changeRequests} revision{notif.changeRequests !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                    
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