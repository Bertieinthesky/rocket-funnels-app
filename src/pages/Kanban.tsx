import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, LayoutGrid, List } from 'lucide-react';
import { QuickTaskDialog } from '@/components/tasks/QuickTaskDialog';
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog';
import type { Task } from '@/hooks/useTasks';
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
import { TaskListView } from '@/components/tasks/TaskListView';
import { useToast } from '@/hooks/use-toast';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// ---------------------------------------------------------------------------
// Draggable card wrapper
// ---------------------------------------------------------------------------

function DraggableCard({
  task,
  onStatusChange,
  canEdit,
  onClickTask,
}: {
  task: Task;
  onStatusChange: (id: string, status: string) => void;
  canEdit: boolean;
  onClickTask: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    transition: isDragging ? undefined : 'transform 200ms ease',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskKanbanCard
        task={task}
        onStatusChange={onStatusChange}
        canEdit={canEdit}
        onClickTask={onClickTask}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Droppable column wrapper
// ---------------------------------------------------------------------------

function DroppableColumn({
  status,
  isOver,
  children,
}: {
  status: string;
  isOver: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 border border-t-0 rounded-b-lg transition-colors duration-200 ${
        isOver
          ? 'bg-primary/5 border-primary/30'
          : 'bg-muted/20'
      }`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const DEFAULT_FILTERS: KanbanFilterState = {
  client: 'all',
  campaign: 'all',
  priority: 'all',
  assignedTo: 'all',
  retainerType: 'all',
  blockedOnly: false,
  showCompleted: false,
};

export default function Kanban() {
  const { isTeam, isAdmin } = useAuth();
  const { toast } = useToast();
  const [filters, setFilters] = useState<KanbanFilterState>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  // Sensors — require a small movement before starting drag (allows clicks)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

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

  // Build a company retainer type lookup for filtering
  const companyRetainerMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of companies) {
      map.set(c.id, c.retainer_type || '');
    }
    return map;
  }, [companies]);

  const filteredTasks = useMemo(() => {
    let result = allTasks;

    if (filters.client !== 'all') {
      result = result.filter((t) => t.company_id === filters.client);
    }
    if (filters.retainerType !== 'all') {
      result = result.filter((t) => {
        if (!t.company_id) return false;
        const rt = companyRetainerMap.get(t.company_id) || '';
        if (filters.retainerType === 'retainer') return rt === 'unlimited' || rt === 'hourly';
        if (filters.retainerType === 'one_time') return rt === 'one_time';
        return true;
      });
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
  }, [allTasks, filters, companyRetainerMap]);

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

  // ── Drag handlers ──────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    setActiveTask(task || null);
  };

  const handleDragOver = (event: { over: { id: string } | null }) => {
    setOverColumnId(event.over?.id ? String(event.over.id) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    setOverColumnId(null);

    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const newStatus = String(over.id);
    const task = active.data.current?.task as Task | undefined;

    // Only update if dropped on a different status column
    if (task && task.status !== newStatus && TASK_STATUS_ORDER.includes(newStatus as any)) {
      handleStatusChange(taskId, newStatus);
    }
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
            <p className="text-sm text-muted-foreground">
              {viewMode === 'kanban'
                ? 'Drag tasks between columns to update status'
                : 'Tasks grouped by client'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 rounded-none gap-1.5 text-xs"
                onClick={() => setViewMode('kanban')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Kanban
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 rounded-none gap-1.5 text-xs"
                onClick={() => setViewMode('list')}
              >
                <List className="h-3.5 w-3.5" />
                List
              </Button>
            </div>

            {(isTeam || isAdmin) && (
              <Button onClick={() => setQuickTaskOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            )}
          </div>
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

        {/* View */}
        {viewMode === 'kanban' ? (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div
              className="grid gap-3 min-h-[calc(100vh-260px)] overflow-x-auto pb-2 md:overflow-x-visible"
              style={{
                gridTemplateColumns: `repeat(${columns.length}, minmax(200px, 1fr))`,
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

                    {/* Droppable column body */}
                    <DroppableColumn status={status} isOver={overColumnId === status}>
                      <ScrollArea className="flex-1">
                        <div className="p-2 space-y-2">
                          {tasks.map((task) => (
                            <DraggableCard
                              key={task.id}
                              task={task}
                              onStatusChange={handleStatusChange}
                              canEdit={isTeam || isAdmin}
                              onClickTask={setSelectedTask}
                            />
                          ))}

                          {tasks.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground/60 text-xs">
                              No tasks
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </DroppableColumn>
                  </div>
                );
              })}
            </div>

            {/* Drag overlay — ghost card while dragging */}
            <DragOverlay dropAnimation={null}>
              {activeTask && (
                <div className="rotate-2 scale-[1.02] opacity-90 shadow-xl">
                  <TaskKanbanCard
                    task={activeTask}
                    onStatusChange={() => {}}
                    canEdit={false}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          <TaskListView
            tasks={filters.showCompleted ? filteredTasks : filteredTasks.filter((t) => t.status !== 'done')}
            companies={companies}
            onSelectTask={setSelectedTask}
            canEdit={isTeam || isAdmin}
          />
        )}
      </div>

      <QuickTaskDialog
        open={quickTaskOpen}
        onOpenChange={setQuickTaskOpen}
      />

      <TaskDetailDialog
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
        canEdit={isTeam || isAdmin}
      />
    </DashboardLayout>
  );
}
