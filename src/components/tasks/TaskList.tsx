import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { TaskRow } from './TaskRow';
import { AddTaskForm } from './AddTaskForm';
import { Plus, CheckSquare, Loader2 } from 'lucide-react';

interface TaskListProps {
  projectId: string;
  canEdit: boolean;
}

export function TaskList({ projectId, canEdit }: TaskListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: tasks = [], isLoading } = useTasks({ projectId, includeDone: true });
  const { data: teamMembers = [] } = useTeamMembers();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // Sort: incomplete first (by priority order), done at bottom
  const sortedTasks = useMemo(() => {
    const priorityOrder: Record<string, number> = { urgent: 0, important: 1, normal: 2, queued: 3 };
    return [...tasks].sort((a, b) => {
      // Done tasks go to bottom
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;
      // Sort by priority
      const aPriority = priorityOrder[a.priority] ?? 2;
      const bPriority = priorityOrder[b.priority] ?? 2;
      if (aPriority !== bPriority) return aPriority - bPriority;
      // Then by sort_order
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  }, [tasks]);

  const doneCount = tasks.filter(t => t.status === 'done').length;
  const totalCount = tasks.length;

  const handleAddTask = (taskData: { title: string; priority: string; assigned_to?: string; due_date?: string }) => {
    createTask.mutate(
      {
        project_id: projectId,
        title: taskData.title,
        priority: taskData.priority,
        assigned_to: taskData.assigned_to || null,
        due_date: taskData.due_date || null,
        created_by: user?.id || null,
        sort_order: totalCount,
      },
      {
        onSuccess: () => {
          toast({ title: 'Task added' });
          setShowAddForm(false);
        },
        onError: (error) => {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
      },
    );
  };

  const handleUpdateTask = (id: string, updates: Record<string, unknown>) => {
    updateTask.mutate({ id, ...updates } as any, {
      onError: (error) => {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      },
    });
  };

  const handleDeleteTask = (id: string) => {
    deleteTask.mutate(id, {
      onSuccess: () => {
        toast({ title: 'Task deleted' });
      },
      onError: (error) => {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Tasks</CardTitle>
          {totalCount > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 tabular-nums">
              {doneCount}/{totalCount}
            </Badge>
          )}
        </div>
        {canEdit && !showAddForm && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-3 w-3" />
            Add Task
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {/* Add Task Form */}
        {showAddForm && (
          <AddTaskForm
            projectId={projectId}
            teamMembers={teamMembers}
            onSubmit={handleAddTask}
            onCancel={() => setShowAddForm(false)}
            isSubmitting={createTask.isPending}
          />
        )}

        {/* Task List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sortedTasks.length === 0 && !showAddForm ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/60">
            <CheckSquare className="h-8 w-8 mb-2" />
            <p className="text-xs">No tasks yet</p>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 h-7 text-xs gap-1"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-3 w-3" />
                Add your first task
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {sortedTasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                teamMembers={teamMembers}
                onUpdate={handleUpdateTask}
                onDelete={handleDeleteTask}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="pt-2">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
