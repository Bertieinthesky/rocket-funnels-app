import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  PHASES,
  PHASE_ORDER,
  PRIORITIES,
  type WorkflowPhase,
  type Priority,
} from '@/lib/constants';
import type { Project } from '@/hooks/useProjects';
import type { TeamMember } from '@/hooks/useTeamMembers';
import {
  MoreHorizontal,
  Calendar,
  Ban,
  Unlock,
  Send,
  ArrowRight,
  CheckCircle,
  MessageSquare,
} from 'lucide-react';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';

interface NotificationCounts {
  pendingApprovals: number;
  changeRequests: number;
}

interface KanbanCardProps {
  project: Project;
  notifications: NotificationCounts;
  assignee?: TeamMember;
  onBlock: (id: string, reason: string, notify: boolean) => void;
  onUnblock: (id: string) => void;
  onSendForReview: (id: string) => void;
  onChangePhase: (id: string, phase: WorkflowPhase) => void;
}

export function KanbanCard({
  project,
  notifications,
  assignee,
  onBlock,
  onUnblock,
  onSendForReview,
  onChangePhase,
}: KanbanCardProps) {
  const [blockReason, setBlockReason] = useState('');
  const [blockNotify, setBlockNotify] = useState(true);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const phase = PHASES[project.phase as WorkflowPhase] || PHASES.shaping;
  const PhaseIcon = phase.icon;
  const priority = PRIORITIES[(project.priority as Priority) || 'normal'];
  const totalNotifications = notifications.pendingApprovals + notifications.changeRequests;
  const dueInfo = getDueInfo(project.phase_due_date || project.target_date);

  const handleBlock = () => {
    onBlock(project.id, blockReason, blockNotify);
    setBlockReason('');
    setBlockOpen(false);
  };

  const handleReview = () => {
    onSendForReview(project.id);
    setReviewOpen(false);
  };

  return (
    <div className="group relative">
      <Link to={`/projects/${project.id}`} className="block">
        <Card
          className={`
            transition-all duration-150
            hover:shadow-md hover:border-foreground/20
            ${project.is_blocked
              ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
              : 'hover:translate-y-[-1px]'
            }
          `}
        >
          <CardContent className="p-3 space-y-2.5">
            {/* Row 1: Priority dot + Name + Notification badge */}
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
                  {project.name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {project.company_name}
                </p>
              </div>

              {totalNotifications > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold tabular-nums shrink-0">
                      {totalNotifications}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {notifications.pendingApprovals > 0 && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {notifications.pendingApprovals} pending approval{notifications.pendingApprovals !== 1 ? 's' : ''}
                      </div>
                    )}
                    {notifications.changeRequests > 0 && (
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {notifications.changeRequests} change request{notifications.changeRequests !== 1 ? 's' : ''}
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Row 2: Phase badge */}
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 gap-1 font-medium ${phase.color}`}>
                <PhaseIcon className="h-3 w-3" />
                {phase.label}
              </Badge>

              {project.is_blocked && (
                <Badge variant="destructive" className="text-[10px] h-5 px-1.5 gap-1">
                  <Ban className="h-3 w-3" />
                  Blocked
                </Badge>
              )}
            </div>

            {/* Row 3: Due date + Assignee */}
            <div className="flex items-center justify-between">
              {dueInfo ? (
                <span className={`text-[11px] flex items-center gap-1 ${dueInfo.className}`}>
                  <Calendar className="h-3 w-3" />
                  {dueInfo.label}
                </span>
              ) : (
                <span />
              )}

              {assignee && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[9px] bg-foreground/10 text-foreground/70">
                        {getInitials(assignee.full_name, assignee.email)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {assignee.full_name || assignee.email}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Action menu — appears on hover */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6 shadow-sm"
              onClick={(e) => e.preventDefault()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* Block / Unblock */}
            {project.is_blocked ? (
              <DropdownMenuItem onClick={() => onUnblock(project.id)}>
                <Unlock className="h-3.5 w-3.5 mr-2" />
                Unblock Project
              </DropdownMenuItem>
            ) : (
              <Popover open={blockOpen} onOpenChange={setBlockOpen}>
                <PopoverTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Ban className="h-3.5 w-3.5 mr-2" />
                    Block Project
                  </DropdownMenuItem>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Block Project</p>
                    <p className="text-xs text-muted-foreground">
                      Provide a reason and optionally notify the client.
                    </p>
                  </div>
                  <Textarea
                    placeholder="What's blocking this project?"
                    className="text-sm min-h-[60px]"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`notify-${project.id}`}
                        checked={blockNotify}
                        onCheckedChange={setBlockNotify}
                      />
                      <Label htmlFor={`notify-${project.id}`} className="text-xs">
                        Notify client
                      </Label>
                    </div>
                    <Button size="sm" variant="destructive" onClick={handleBlock}>
                      Block
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Send for Review */}
            <Popover open={reviewOpen} onOpenChange={setReviewOpen}>
              <PopoverTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Send className="h-3.5 w-3.5 mr-2" />
                  Send for Review
                </DropdownMenuItem>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Send for Review</p>
                  <p className="text-xs text-muted-foreground">
                    The client will be notified that this project is ready for their review.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setReviewOpen(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleReview}>
                    <Send className="h-3 w-3 mr-1.5" />
                    Send
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenuSeparator />

            {/* Change Phase */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowRight className="h-3.5 w-3.5 mr-2" />
                Change Phase
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-44">
                {PHASE_ORDER.map((key) => {
                  const p = PHASES[key];
                  const Icon = p.icon;
                  const isCurrent = project.phase === key;
                  return (
                    <DropdownMenuItem
                      key={key}
                      disabled={isCurrent}
                      onClick={() => onChangePhase(project.id, key)}
                      className={isCurrent ? 'opacity-50' : ''}
                    >
                      <Icon className="h-3.5 w-3.5 mr-2" />
                      {p.label}
                      {isCurrent && (
                        <span className="ml-auto text-[10px] text-muted-foreground">current</span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

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

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return email?.slice(0, 2).toUpperCase() || '??';
}
