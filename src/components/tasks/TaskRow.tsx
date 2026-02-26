import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  TASK_STATUSES,
  TASK_STATUS_ORDER,
  PRIORITIES,
  type TaskStatus,
  type Priority,
} from '@/lib/constants';
import { Trash2, Calendar, GripVertical } from 'lucide-react';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import type { Task } from '@/hooks/useTasks';
import type { TeamMember } from '@/hooks/useTeamMembers';

interface TaskRowProps {
  task: Task;
  teamMembers: TeamMember[];
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
  onClickTask?: (task: Task) => void;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return email?.slice(0, 2).toUpperCase() || '?';
}

function getDueInfo(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isPast(date) && !isToday(date)) {
    return { label: 'Overdue', className: 'text-red-600 dark:text-red-400 font-medium', color: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400' };
  }
  if (isToday(date)) {
    return { label: 'Today', className: 'text-orange-600 dark:text-orange-400 font-medium', color: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400' };
  }
  if (isTomorrow(date)) {
    return { label: 'Tomorrow', className: 'text-orange-500 dark:text-orange-400', color: 'border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400' };
  }
  const days = differenceInDays(date, new Date());
  if (days <= 7) {
    return { label: format(date, 'EEE, MMM d'), className: 'text-muted-foreground', color: '' };
  }
  return { label: format(date, 'MMM d'), className: 'text-muted-foreground', color: '' };
}

export function TaskRow({ task, teamMembers, onUpdate, onDelete, canEdit, onClickTask }: TaskRowProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const isDone = task.status === 'done';
  const priority = PRIORITIES[(task.priority as Priority) || 'normal'];
  const status = TASK_STATUSES[(task.status as TaskStatus) || 'todo'];
  const dueInfo = getDueInfo(task.due_date);
  const assignee = teamMembers.find(m => m.id === task.assigned_to);

  const handleToggleDone = () => {
    onUpdate(task.id, { status: isDone ? 'todo' : 'done' });
  };

  const handleStatusChange = (newStatus: string) => {
    onUpdate(task.id, { status: newStatus });
  };

  const handleAssigneeChange = (userId: string) => {
    onUpdate(task.id, { assigned_to: userId === 'unassigned' ? null : userId });
  };

  return (
    <div className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all hover:shadow-sm ${
      isDone
        ? 'bg-muted/30 border-transparent'
        : 'bg-card border-border/50 hover:border-border'
    }`}>
      {/* Checkbox */}
      {canEdit && (
        <Checkbox
          checked={isDone}
          onCheckedChange={handleToggleDone}
          className="shrink-0"
        />
      )}

      {/* Priority dot */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`h-2 w-2 rounded-full shrink-0 ${priority.dotColor}`} />
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          {priority.label}
        </TooltipContent>
      </Tooltip>

      {/* Title + Campaign */}
      <button
        type="button"
        className={`flex-1 min-w-0 text-left hover:underline ${
          isDone ? 'line-through text-muted-foreground' : 'text-foreground'
        }`}
        onClick={() => onClickTask?.(task)}
      >
        <span className="text-sm truncate block">{task.title}</span>
        {task.project_name && (
          <span className="text-[10px] text-muted-foreground truncate block">{task.project_name}</span>
        )}
      </button>

      {/* Status select */}
      {canEdit && !isDone && (
        <Select value={task.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-6 w-auto gap-1 border-0 bg-transparent px-1.5 text-[10px] font-medium shadow-none focus:ring-0">
            <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 font-medium ${status.color}`}>
              {status.label}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            {TASK_STATUS_ORDER.map(s => (
              <SelectItem key={s} value={s} className="text-xs">
                {TASK_STATUSES[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {isDone && (
        <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 font-medium ${status.color}`}>
          {status.label}
        </Badge>
      )}

      {/* Assignee */}
      {canEdit && !isDone ? (
        <Select
          value={task.assigned_to || 'unassigned'}
          onValueChange={handleAssigneeChange}
        >
          <SelectTrigger className="h-6 w-6 p-0 border-0 bg-transparent shadow-none focus:ring-0 [&>svg]:hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                    {assignee ? getInitials(assignee.full_name, assignee.email) : '—'}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {assignee ? assignee.full_name || assignee.email : 'Unassigned'}
              </TooltipContent>
            </Tooltip>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
            {teamMembers.map(m => (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                {m.full_name || m.email || 'Team Member'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : assignee ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                {getInitials(assignee.full_name, assignee.email)}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent className="text-xs">
            {assignee.full_name || assignee.email}
          </TooltipContent>
        </Tooltip>
      ) : null}

      {/* Due date */}
      {dueInfo && (
        <span className={`text-[11px] flex items-center gap-1 shrink-0 ${dueInfo.className}`}>
          <Calendar className="h-3 w-3" />
          {dueInfo.label}
        </span>
      )}

      {/* Delete */}
      {canEdit && (
        <div className="shrink-0">
          {showConfirmDelete ? (
            <div className="flex items-center gap-1">
              <Button
                variant="destructive"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => { onDelete(task.id); setShowConfirmDelete(false); }}
              >
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setShowConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={() => setShowConfirmDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
