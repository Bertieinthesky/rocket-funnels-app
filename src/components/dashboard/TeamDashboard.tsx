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
  CheckSquare,
  CalendarClock,
  Ban,
  FolderKanban,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { useActionItems } from '@/hooks/useActionItems';
import { useTasks } from '@/hooks/useTasks';
import {
  TASK_STATUSES,
  PRIORITIES,
  type TaskStatus,
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

  // My assigned tasks
  const { data: myTasks = [] } = useTasks({ assignedTo: user?.id });

  // My assigned campaigns (for stat count)
  const { data: myProjects = [] } = useProjects({
    assignedTo: user?.id,
    includeCompleted: false,
  });

  const { data: actionItems = [], isLoading: actionItemsLoading } = useActionItems({
    forRole: 'team',
  });

  // Stats
  const dueThisWeek = useMemo(() => {
    const now = new Date();
    return myTasks.filter((t) => {
      if (!t.due_date) return false;
      const due = new Date(t.due_date);
      return differenceInDays(due, now) <= 7 && differenceInDays(due, now) >= 0;
    });
  }, [myTasks]);

  const blockedTasks = useMemo(
    () => myTasks.filter((t) => t.status === 'blocked'),
    [myTasks],
  );

  // Sort tasks by due date (soonest first, no-date last)
  const sortedTasks = useMemo(() => {
    return [...myTasks].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [myTasks]);

  const stats: StatItem[] = [
    {
      label: 'My Tasks',
      value: myTasks.length,
      icon: CheckSquare,
    },
    {
      label: 'Due This Week',
      value: dueThisWeek.length,
      icon: CalendarClock,
      accent: dueThisWeek.length > 0 ? 'warning' : 'default',
    },
    {
      label: 'Blocked',
      value: blockedTasks.length,
      icon: Ban,
      accent: blockedTasks.length > 0 ? 'destructive' : 'default',
    },
    {
      label: 'My Campaigns',
      value: myProjects.length,
      icon: FolderKanban,
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
                  No tasks assigned to you
                </div>
              ) : (
                <div className="space-y-1">
                  {sortedTasks.slice(0, 10).map((task) => {
                    const priority = PRIORITIES[(task.priority as Priority) || 'normal'];
                    const statusConfig = TASK_STATUSES[(task.status as TaskStatus) || 'todo'];
                    const StatusIcon = statusConfig.icon;
                    const dueInfo = getDueInfo(task.due_date);

                    return (
                      <Link
                        key={task.id}
                        to={`/projects/${task.project_id}`}
                        className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
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

                        {/* Title + campaign */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {task.project_name}
                            {task.company_name && (
                              <span className="text-muted-foreground/60"> &middot; {task.company_name}</span>
                            )}
                          </p>
                        </div>

                        {/* Status badge */}
                        <Badge
                          variant="secondary"
                          className={`text-[10px] h-5 px-1.5 gap-1 font-medium shrink-0 ${statusConfig.color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>

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
                  {sortedTasks.length > 10 && (
                    <div className="text-center pt-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" asChild>
                        <Link to="/kanban">
                          +{sortedTasks.length - 10} more <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  )}
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

function getDueInfo(dateStr: string | null | undefined) {
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
