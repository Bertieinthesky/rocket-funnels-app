import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FolderKanban,
  CalendarClock,
  Ban,
  Eye,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { useActionItems } from '@/hooks/useActionItems';
import {
  PHASES,
  STATUSES,
  PRIORITIES,
  type WorkflowPhase,
  type ProjectStatus,
  type Priority,
} from '@/lib/constants';
import { StatsRow, type StatItem } from './StatsRow';
import { ActionItemsWidget } from './ActionItemsWidget';
import {
  isToday,
  isTomorrow,
  isPast,
  differenceInDays,
  format,
} from 'date-fns';

export function TeamDashboard() {
  const { user } = useAuth();

  // My assigned projects
  const { data: myProjects = [] } = useProjects({
    assignedTo: user?.id,
    includeCompleted: false,
  });

  // All projects for stats
  const { data: allProjects = [] } = useProjects({ includeCompleted: false });

  const { data: actionItems = [], isLoading: actionItemsLoading } = useActionItems({
    forRole: 'team',
  });

  // Stats
  const dueThisWeek = useMemo(() => {
    const now = new Date();
    return myProjects.filter((p) => {
      const dueStr = p.phase_due_date || p.target_date;
      if (!dueStr) return false;
      const due = new Date(dueStr);
      return differenceInDays(due, now) <= 7 && differenceInDays(due, now) >= 0;
    });
  }, [myProjects]);

  const myBlocked = useMemo(
    () => myProjects.filter((p) => p.is_blocked),
    [myProjects],
  );

  const myReview = useMemo(
    () => myProjects.filter((p) => p.status === 'review'),
    [myProjects],
  );

  // Sort my tasks by due date (soonest first, no-date last)
  const sortedTasks = useMemo(() => {
    return [...myProjects].sort((a, b) => {
      const aDate = a.phase_due_date || a.target_date;
      const bDate = b.phase_due_date || b.target_date;
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    });
  }, [myProjects]);

  const stats: StatItem[] = [
    {
      label: 'My Projects',
      value: myProjects.length,
      icon: FolderKanban,
    },
    {
      label: 'Due This Week',
      value: dueThisWeek.length,
      icon: CalendarClock,
      accent: dueThisWeek.length > 0 ? 'warning' : 'default',
    },
    {
      label: 'Blocked',
      value: myBlocked.length,
      icon: Ban,
      accent: myBlocked.length > 0 ? 'destructive' : 'default',
    },
    {
      label: 'In Review',
      value: myReview.length,
      icon: Eye,
    },
  ];

  return (
    <div className="space-y-5">
      <StatsRow stats={stats} />

      <div className="grid gap-5 lg:grid-cols-5">
        {/* My Tasks */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">My Tasks</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" asChild>
                <Link to="/kanban">
                  Kanban <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {sortedTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/60 text-xs">
                  No projects assigned
                </div>
              ) : (
                <div className="space-y-1">
                  {sortedTasks.map((project) => {
                    const phase = PHASES[project.phase as WorkflowPhase] || PHASES.shaping;
                    const PhaseIcon = phase.icon;
                    const status = STATUSES[(project.status === 'revision' ? 'in_progress' : project.status) as ProjectStatus] || STATUSES.queued;
                    const priority = PRIORITIES[(project.priority as Priority) || 'normal'];
                    const dueInfo = getDueInfo(project.phase_due_date || project.target_date);

                    return (
                      <Link
                        key={project.id}
                        to={`/projects/${project.id}`}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        {/* Priority dot */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`h-2 w-2 rounded-full shrink-0 ${priority.dotColor}`} />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs">
                            {priority.label}
                          </TooltipContent>
                        </Tooltip>

                        {/* Name + company */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{project.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {project.company_name}
                          </p>
                        </div>

                        {/* Phase badge */}
                        <Badge
                          variant="secondary"
                          className={`text-[10px] h-5 px-1.5 gap-1 font-medium shrink-0 ${phase.color}`}
                        >
                          <PhaseIcon className="h-3 w-3" />
                          {phase.label}
                        </Badge>

                        {/* Blocked indicator */}
                        {project.is_blocked && (
                          <Badge variant="destructive" className="text-[10px] h-5 px-1.5 shrink-0">
                            Blocked
                          </Badge>
                        )}

                        {/* Due date */}
                        {dueInfo && (
                          <span
                            className={`text-[11px] flex items-center gap-1 shrink-0 ${dueInfo.className}`}
                          >
                            <Calendar className="h-3 w-3" />
                            {dueInfo.label}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Items */}
        <div className="lg:col-span-2">
          <ActionItemsWidget
            items={actionItems}
            isLoading={actionItemsLoading}
          />
        </div>
      </div>
    </div>
  );
}

// ── Helper ──────────────────────────────────────────────────────────────

function getDueInfo(dateStr: string | null) {
  if (!dateStr) return null;
  const date = new Date(dateStr);

  if (isPast(date) && !isToday(date)) {
    return { label: 'Overdue', className: 'text-red-600 dark:text-red-400 font-medium' };
  }
  if (isToday(date)) {
    return { label: 'Due today', className: 'text-orange-600 dark:text-orange-400 font-medium' };
  }
  if (isTomorrow(date)) {
    return { label: 'Tomorrow', className: 'text-orange-500 dark:text-orange-400' };
  }
  const days = differenceInDays(date, new Date());
  if (days <= 7) {
    return { label: format(date, 'EEE, MMM d'), className: 'text-muted-foreground' };
  }
  return { label: format(date, 'MMM d'), className: 'text-muted-foreground' };
}
