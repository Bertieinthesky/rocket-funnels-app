import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TaskRow } from './TaskRow';
import { useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, ChevronRight, Building2 } from 'lucide-react';
import type { Task } from '@/hooks/useTasks';
import type { Company } from '@/hooks/useCompanies';

interface TaskListViewProps {
  tasks: Task[];
  companies: Company[];
  onSelectTask: (task: Task) => void;
  canEdit: boolean;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRetainerLabel(type: string | null | undefined): string {
  if (type === 'unlimited' || type === 'hourly') return 'Retainer';
  if (type === 'one_time') return 'One-Time';
  return '';
}

export function TaskListView({ tasks, companies, onSelectTask, canEdit }: TaskListViewProps) {
  const { data: teamMembers = [] } = useTeamMembers();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { toast } = useToast();

  // Track collapsed state per company
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapsed = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleUpdate = (id: string, updates: Record<string, unknown>) => {
    updateTask.mutate(
      { id, ...updates },
      {
        onError: () => {
          toast({ title: 'Error', description: 'Failed to update task.', variant: 'destructive' });
        },
      },
    );
  };

  const handleDelete = (id: string) => {
    deleteTask.mutate(id, {
      onError: () => {
        toast({ title: 'Error', description: 'Failed to delete task.', variant: 'destructive' });
      },
    });
  };

  // Group tasks by company_id
  const grouped = new Map<string, Task[]>();
  const generalTasks: Task[] = [];

  for (const task of tasks) {
    if (task.company_id) {
      const existing = grouped.get(task.company_id) || [];
      existing.push(task);
      grouped.set(task.company_id, existing);
    } else {
      generalTasks.push(task);
    }
  }

  // Build sections: company + tasks, sorted by # of tasks (most first)
  const companySections = companies
    .map((company) => ({
      company,
      tasks: grouped.get(company.id) || [],
    }))
    .filter((s) => s.tasks.length > 0)
    .sort((a, b) => b.tasks.length - a.tasks.length);

  if (companySections.length === 0 && generalTasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">No tasks match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {companySections.map(({ company, tasks: companyTasks }) => {
        const isCollapsed = collapsed[company.id] ?? false;
        const activeTasks = companyTasks.filter((t) => t.status !== 'done');
        const doneTasks = companyTasks.filter((t) => t.status === 'done');
        const retainerLabel = getRetainerLabel(company.retainer_type);

        return (
          <Card key={company.id} className="overflow-hidden">
            <CardHeader
              className="p-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => toggleCollapsed(company.id)}
            >
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-5 w-5 p-0 shrink-0">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>

                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={company.logo_url || ''} />
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-semibold">
                    {getInitials(company.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">{company.name}</span>
                    {retainerLabel && (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0">
                        {retainerLabel}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 tabular-nums">
                    {activeTasks.length} active
                  </Badge>
                  {doneTasks.length > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 tabular-nums text-muted-foreground">
                      {doneTasks.length} done
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            {!isCollapsed && (
              <CardContent className="px-3 pb-3 pt-0 space-y-1">
                {companyTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    teamMembers={teamMembers}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    canEdit={canEdit}
                    onClickTask={onSelectTask}
                  />
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* General Tasks (no company) */}
      {generalTasks.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader
            className="p-3 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => toggleCollapsed('_general')}
          >
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-5 w-5 p-0 shrink-0">
                {collapsed['_general'] ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              </div>

              <span className="text-sm font-semibold flex-1">General Tasks</span>

              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 tabular-nums">
                {generalTasks.length} task{generalTasks.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>

          {!collapsed['_general'] && (
            <CardContent className="px-3 pb-3 pt-0 space-y-1">
              {generalTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  teamMembers={teamMembers}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  canEdit={canEdit}
                  onClickTask={onSelectTask}
                />
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
