import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FolderKanban,
  Building2,
  Ban,
  CheckSquare,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { useCompanies } from '@/hooks/useCompanies';
import { useActionItems } from '@/hooks/useActionItems';
import { useTasks, type Task } from '@/hooks/useTasks';
import { PRIORITIES, type Priority } from '@/lib/constants';
import { StatsRow, type StatItem } from './StatsRow';
import { ActionItemsWidget } from './ActionItemsWidget';
import { ClientHealthCard } from './ClientHealthCard';
import { isPast, isToday, isTomorrow, differenceInDays, format } from 'date-fns';

function getDueInfo(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isPast(date) && !isToday(date)) {
    return { label: 'Overdue', className: 'text-red-600 dark:text-red-400 font-medium' };
  }
  if (isToday(date)) {
    return { label: 'Today', className: 'text-orange-600 dark:text-orange-400 font-medium' };
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

export function AdminDashboard() {
  const { user } = useAuth();
  const { data: projects = [] } = useProjects({ includeCompleted: true });
  const { data: companies = [] } = useCompanies({ filter: 'active' });
  const { data: actionItems = [], isLoading: actionItemsLoading } = useActionItems({
    forRole: 'team',
  });
  const { data: myTasks = [] } = useTasks({ assignedTo: user?.id });

  // Derived stats
  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== 'complete'),
    [projects],
  );
  const blockedProjects = useMemo(
    () => projects.filter((p) => p.is_blocked),
    [projects],
  );

  // Sort tasks by due date (soonest first, overdue at top, no-date last)
  const sortedTasks = useMemo(() => {
    return [...myTasks].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [myTasks]);

  // Per-company project counts
  const companyProjectCounts = useMemo(() => {
    const map = new Map<
      string,
      { active: number; queued: number; actionItems: number }
    >();

    for (const c of companies) {
      map.set(c.id, { active: 0, queued: 0, actionItems: 0 });
    }

    for (const p of projects) {
      const entry = map.get(p.company_id);
      if (!entry) continue;
      if (p.status === 'queued') entry.queued++;
      else if (p.status !== 'complete') entry.active++;
    }

    for (const ai of actionItems) {
      if (ai.company_id) {
        const entry = map.get(ai.company_id);
        if (entry) entry.actionItems++;
      }
    }

    return map;
  }, [companies, projects, actionItems]);

  const stats: StatItem[] = [
    {
      label: 'Active Campaigns',
      value: activeProjects.length,
      icon: FolderKanban,
    },
    {
      label: 'Active Clients',
      value: companies.length,
      icon: Building2,
    },
    {
      label: 'My Tasks',
      value: myTasks.length,
      icon: CheckSquare,
      accent: myTasks.length > 0 ? 'default' : 'default',
    },
    {
      label: 'Blocked',
      value: blockedProjects.length,
      icon: Ban,
      accent: blockedProjects.length > 0 ? 'destructive' : 'default',
    },
  ];

  return (
    <div className="space-y-5">
      <StatsRow stats={stats} />

      <div className="grid gap-5 lg:grid-cols-5">
        {/* My Tasks */}
        <div className="lg:col-span-2">
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
                  {sortedTasks.slice(0, 8).map((task) => {
                    const priority = PRIORITIES[(task.priority as Priority) || 'normal'];
                    const dueInfo = getDueInfo(task.due_date);

                    return (
                      <Link
                        key={task.id}
                        to={`/projects/${task.project_id}`}
                        className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`h-2 w-2 rounded-full shrink-0 ${priority.dotColor}`} />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs">{priority.label}</TooltipContent>
                        </Tooltip>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{task.project_name}</p>
                        </div>

                        {dueInfo && (
                          <span className={`text-[11px] flex items-center gap-1 shrink-0 ${dueInfo.className}`}>
                            <Calendar className="h-3 w-3" />
                            {dueInfo.label}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                  {sortedTasks.length > 8 && (
                    <div className="text-center pt-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" asChild>
                        <Link to="/kanban">
                          +{sortedTasks.length - 8} more <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Items + Client Health */}
        <div className="lg:col-span-3 space-y-5">
          <ActionItemsWidget
            items={actionItems}
            isLoading={actionItemsLoading}
          />

          {/* Client Health Grid */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Client Health</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {companies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/60 text-xs">
                  No active clients
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {companies.map((company) => {
                    const counts = companyProjectCounts.get(company.id) || {
                      active: 0,
                      queued: 0,
                      actionItems: 0,
                    };
                    return (
                      <ClientHealthCard
                        key={company.id}
                        company={company}
                        activeProjects={counts.active}
                        queuedProjects={counts.queued}
                        actionItemCount={counts.actionItems}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
