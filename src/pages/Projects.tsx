import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import {
  PHASES,
  PHASE_ORDER,
  STATUSES,
  PRIORITIES,
  type WorkflowPhase,
  type ProjectStatus,
  type Priority,
} from '@/lib/constants';
import {
  Plus,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckSquare,
  Calendar,
  FolderKanban,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import type { Project } from '@/hooks/useProjects';
import type { Task } from '@/hooks/useTasks';

// ---------------------------------------------------------------------------
// Campaign Card with phase pipeline + task progress
// ---------------------------------------------------------------------------

interface CampaignCardProps {
  project: Project;
  tasks: Task[];
  assigneeName?: string;
}

function getInitials(name?: string | null): string {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return '?';
}

function CampaignCard({ project, tasks, assigneeName }: CampaignCardProps) {
  const phase = PHASES[project.phase as WorkflowPhase] || PHASES.shaping;
  const PhaseIcon = phase.icon;
  const priority = PRIORITIES[(project.priority as Priority) || 'normal'];
  const status = STATUSES[(project.status === 'revision' ? 'in_progress' : project.status) as ProjectStatus] || STATUSES.queued;
  const StatusIcon = status.icon;

  // Phase progress
  const currentPhaseIndex = PHASE_ORDER.indexOf(project.phase as WorkflowPhase);

  // Task progress
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;

  // Due date
  const dueStr = project.phase_due_date || project.target_date;
  const isOverdue = dueStr && isPast(new Date(dueStr)) && !isToday(new Date(dueStr));

  return (
    <Link to={`/projects/${project.id}`} className="block group">
      <Card className={`transition-all duration-150 hover:shadow-md hover:border-foreground/20 ${
        project.is_blocked ? 'border-red-300 dark:border-red-800' : ''
      }`}>
        <CardContent className="p-4 space-y-3">
          {/* Row 1: Name + Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full shrink-0 ${priority.dotColor}`} />
                <h3 className="text-sm font-semibold truncate">{project.name}</h3>
                {project.is_blocked && (
                  <Badge variant="destructive" className="text-[10px] h-5 px-1.5 gap-1 shrink-0">
                    <AlertCircle className="h-3 w-3" />
                    Blocked
                  </Badge>
                )}
              </div>
              {project.company_name && (
                <p className="text-[11px] text-muted-foreground mt-0.5 ml-4">
                  {project.company_name}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 gap-1 font-medium ${status.color}`}>
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Row 2: Phase pipeline visualization */}
          <div className="flex items-center gap-1">
            {PHASE_ORDER.map((phaseKey, idx) => {
              const isCurrent = project.phase === phaseKey;
              const isPassed = idx < currentPhaseIndex;

              return (
                <Tooltip key={phaseKey}>
                  <TooltipTrigger asChild>
                    <div className={`flex-1 h-1.5 rounded-full transition-colors ${
                      isCurrent
                        ? 'bg-primary'
                        : isPassed
                          ? 'bg-primary/40'
                          : 'bg-muted'
                    }`} />
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    {PHASES[phaseKey].label}
                    {isCurrent && ' (current)'}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Row 3: Phase label + Tasks + Due + Assignee */}
          <div className="flex items-center gap-3 text-[11px]">
            <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 gap-1 font-medium ${phase.color}`}>
              <PhaseIcon className="h-3 w-3" />
              {phase.label}
            </Badge>

            {totalTasks > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <CheckSquare className="h-3 w-3" />
                {doneTasks}/{totalTasks} tasks
              </span>
            )}

            <div className="flex-1" />

            {dueStr && (
              <span className={`flex items-center gap-1 ${
                isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'
              }`}>
                <Calendar className="h-3 w-3" />
                {isOverdue ? 'Overdue' : format(new Date(dueStr), 'MMM d')}
              </span>
            )}

            {assigneeName && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px] bg-foreground/10 text-foreground/70">
                      {getInitials(assigneeName)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent className="text-xs">{assigneeName}</TooltipContent>
              </Tooltip>
            )}
          </div>

          {project.is_blocked && project.blocked_reason && (
            <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200/50 dark:border-red-800/30">
              <p className="text-[11px] text-red-600 dark:text-red-400">
                <strong>Blocked:</strong> {project.blocked_reason}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Projects() {
  const { isClient, isTeam, isAdmin } = useAuth();
  const { isDemoMode, demoView } = useDemoMode();
  const [activeTab, setActiveTab] = useState('active');

  const effectiveIsClient = isDemoMode ? demoView === 'client' : isClient;
  const effectiveIsTeam = isDemoMode ? demoView === 'team' || demoView === 'admin' : isTeam || isAdmin;

  const { data: projects = [], isLoading: projectsLoading } = useProjects({
    includeCompleted: true,
  });
  const { data: allTasks = [] } = useTasks({ includeDone: true });
  const { data: teamMembers = [] } = useTeamMembers();

  const assigneeMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const tm of teamMembers) {
      m.set(tm.id, tm.full_name || tm.email || 'Team Member');
    }
    return m;
  }, [teamMembers]);

  const tasksByProject = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of allTasks) {
      const existing = m.get(t.project_id) || [];
      existing.push(t);
      m.set(t.project_id, existing);
    }
    return m;
  }, [allTasks]);

  const activeProjects = useMemo(() => projects.filter(p => p.status !== 'complete'), [projects]);
  const completedProjects = useMemo(() => projects.filter(p => p.status === 'complete'), [projects]);

  if (projectsLoading) {
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
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
            <p className="text-sm text-muted-foreground">
              {effectiveIsClient
                ? 'Track your campaign progress'
                : `${activeProjects.length} active campaign${activeProjects.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {effectiveIsClient && (
            <Button asChild>
              <Link to="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Link>
            </Button>
          )}
          {effectiveIsTeam && (
            <Button asChild>
              <Link to="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                New Campaign
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
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FolderKanban className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">No active campaigns</p>
                  <Button asChild>
                    <Link to="/projects/new">
                      <Plus className="mr-2 h-4 w-4" />
                      {effectiveIsClient ? 'Submit Request' : 'New Campaign'}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {activeProjects.map((project) => (
                  <CampaignCard
                    key={project.id}
                    project={project}
                    tasks={tasksByProject.get(project.id) || []}
                    assigneeName={project.assigned_to ? assigneeMap.get(project.assigned_to) : undefined}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {completedProjects.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  No completed campaigns yet
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {completedProjects.map((project) => (
                  <CampaignCard
                    key={project.id}
                    project={project}
                    tasks={tasksByProject.get(project.id) || []}
                    assigneeName={project.assigned_to ? assigneeMap.get(project.assigned_to) : undefined}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
