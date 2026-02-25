import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TASK_STATUSES,
  TASK_STATUS_ORDER,
  PRIORITIES,
  type TaskStatus,
  type Priority,
} from '@/lib/constants';
import { Calendar } from 'lucide-react';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import type { Task } from '@/hooks/useTasks';

interface TaskKanbanCardProps {
  task: Task;
  onStatusChange: (id: string, status: string) => void;
  canEdit: boolean;
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

export function TaskKanbanCard({ task, onStatusChange, canEdit }: TaskKanbanCardProps) {
  const priority = PRIORITIES[(task.priority as Priority) || 'normal'];
  const dueInfo = getDueInfo(task.due_date);

  return (
    <Card className="transition-all duration-150 hover:shadow-md hover:border-foreground/20 hover:translate-y-[-1px]">
      <CardContent className="p-3 space-y-2">
        {/* Row 1: Priority dot + Title */}
        <div className="flex items-start gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${priority.dotColor}`} />
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              {priority.label} priority
            </TooltipContent>
          </Tooltip>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight truncate">
              {task.title}
            </p>
            {/* Campaign name — links to campaign detail */}
            {task.project_name && (
              <Link
                to={`/projects/${task.project_id}`}
                className="text-[11px] text-muted-foreground hover:text-primary truncate block mt-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                {task.project_name}
                {task.company_name && (
                  <span className="text-muted-foreground/60"> &middot; {task.company_name}</span>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* Row 2: Due date + Assignee */}
        <div className="flex items-center justify-between">
          {dueInfo ? (
            <span className={`text-[11px] flex items-center gap-1 ${dueInfo.className}`}>
              <Calendar className="h-3 w-3" />
              {dueInfo.label}
            </span>
          ) : (
            <span />
          )}

          {task.assignee_name && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px] bg-foreground/10 text-foreground/70">
                    {getInitials(task.assignee_name)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {task.assignee_name}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
