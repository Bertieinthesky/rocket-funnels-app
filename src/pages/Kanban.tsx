import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import {
  TASK_STATUSES,
  TASK_STATUS_ORDER,
} from '@/lib/constants';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useCompanies } from '@/hooks/useCompanies';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { KanbanFilters, type KanbanFilterState } from '@/components/kanban/KanbanFilters';
import { TaskKanbanCard } from '@/components/kanban/TaskKanbanCard';
import { useToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const DEFAULT_FILTERS: KanbanFilterState = {
  client: 'all',
  campaign: 'all',
  priority: 'all',
  assignedTo: 'all',
  blockedOnly: false,
  showCompleted: false,
};

export default function Kanban() {
  const { isTeam, isAdmin } = useAuth();
  const { toast } = useToast();
  const [filters, setFilters] = useState<KanbanFilterState>(DEFAULT_FILTERS);

  // Data
  const { data: allTasks = [], isLoading: tasksLoading } = useTasks({
    includeDone: true,
  });
  const { data: allProjects = [] } = useProjects({ includeCompleted: true });
  const { data: companies = [] } = useCompanies({ filter: 'all' });
  const { data: teamMembers = [] } = useTeamMembers();
  const updateTask = useUpdateTask();

  // Build campaigns list for filter
  const campaigns = useMemo(
    () => allProjects.map((p) => ({ id: p.id, name: p.name })),
    [allProjects],
  );

  // ── Filtering ────────────────────────────────────────────────────────────

  const filteredTasks = useMemo(() => {
    let result = allTasks;

    if (filters.client !== 'all') {
      result = result.filter((t) => t.company_id === filters.client);
    }
    if (filters.campaign !== 'all') {
      result = result.filter((t) => t.project_id === filters.campaign);
    }
    if (filters.priority !== 'all') {
      result = result.filter((t) => t.priority === filters.priority);
    }
    if (filters.assignedTo !== 'all') {
      result = result.filter((t) => t.assigned_to === filters.assignedTo);
    }
    if (filters.blockedOnly) {
      result = result.filter((t) => t.status === 'blocked');
    }

    return result;
  }, [allTasks, filters]);

  // ── Column distribution ──────────────────────────────────────────────────

  const columns = useMemo(() => {
    const visibleStatuses = filters.showCompleted
      ? TASK_STATUS_ORDER
      : TASK_STATUS_ORDER.filter((s) => s !== 'done');

    return visibleStatuses.map((status) => ({
      status,
      config: TASK_STATUSES[status],
      tasks: filteredTasks.filter((t) => t.status === status),
    }));
  }, [filteredTasks, filters.showCompleted]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleStatusChange = (id: string, status: string) => {
    updateTask.mutate(
      { id, status },
      {
        onError: () => {
          toast({ title: 'Error', description: 'Failed to update task', variant: 'destructive' });
        },
      },
    );
  };

  // ── Guards ───────────────────────────────────────────────────────────────

  if (!isTeam && !isAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">You don't have access to this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (tasksLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kanban Board</h1>
          <p className="text-sm text-muted-foreground">
            All tasks across campaigns
          </p>
        </div>

        {/* Filters */}
        <KanbanFilters
          filters={filters}
          onChange={setFilters}
          companies={companies}
          campaigns={campaigns}
          teamMembers={teamMembers}
          taskCount={filteredTasks.length}
        />

        {/* Board */}
        <div
          className="grid gap-3 min-h-[calc(100vh-260px)]"
          style={{
            gridTemplateColumns: `repeat(${columns.length}, minmax(240px, 1fr))`,
          }}
        >
          {columns.map(({ status, config, tasks }) => {
            const StatusIcon = config.icon;

            return (
              <div key={status} className="flex flex-col min-w-0">
                {/* Column header */}
                <div
                  className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${config.columnColor}`}
                >
                  <div className="flex items-center gap-1.5">
                    <StatusIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">{config.label}</h3>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-5 min-w-[20px] justify-center font-mono tabular-nums"
                  >
                    {tasks.length}
                  </Badge>
                </div>

                {/* Column body */}
                <ScrollArea className="flex-1 border border-t-0 rounded-b-lg bg-muted/20">
                  <div className="p-2 space-y-2">
                    {tasks.map((task) => (
                      <TaskKanbanCard
                        key={task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        canEdit={isTeam || isAdmin}
                      />
                    ))}

                    {tasks.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground/60 text-xs">
                        No tasks
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
