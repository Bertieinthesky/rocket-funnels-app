import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateTask } from '@/hooks/useTasks';
import { useTaskComments, useCreateTaskComment } from '@/hooks/useTaskComments';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useCreateUpdate } from '@/hooks/useUpdates';
import { useCreateTimeEntry } from '@/hooks/useTimeEntries';
import { useToast } from '@/hooks/use-toast';
import {
  TASK_STATUSES,
  TASK_STATUS_ORDER,
  PRIORITIES,
  type TaskStatus,
  type Priority,
} from '@/lib/constants';
import {
  MessageSquare,
  Send,
  Calendar,
  Loader2,
  Pencil,
  Check,
  X,
  ExternalLink,
  FileText,
  StickyNote,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { TeamUpdateForm } from '@/components/project/TeamUpdateForm';
import { MessageThread } from '@/components/project/MessageThread';
import type { Task } from '@/hooks/useTasks';

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return email?.slice(0, 2).toUpperCase() || '?';
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  canEdit,
}: TaskDetailDialogProps) {
  const { user, isClient, isTeam, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const updateTask = useUpdateTask();
  const { data: comments = [], isLoading: commentsLoading } = useTaskComments(
    task?.id,
  );
  const createComment = useCreateTaskComment();
  const createUpdate = useCreateUpdate();
  const createTimeEntry = useCreateTimeEntry();
  const { data: teamMembers = [] } = useTeamMembers();

  const [commentText, setCommentText] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const canPostUpdates = isTeam || isAdmin;

  // Reset editing state when switching tasks
  useEffect(() => {
    setEditingTitle(false);
    setEditingDesc(false);
    setCommentText('');
  }, [task?.id]);

  // Scroll to bottom when new comments appear
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments.length]);

  if (!task) return null;

  const status = TASK_STATUSES[(task.status as TaskStatus) || 'todo'];
  const priority = PRIORITIES[(task.priority as Priority) || 'normal'];
  const assignee = teamMembers.find((m) => m.id === task.assigned_to);

  const handleUpdate = (updates: Record<string, unknown>) => {
    updateTask.mutate(
      { id: task.id, ...updates },
      {
        onError: () => {
          toast({
            title: 'Error',
            description: 'Failed to update task.',
            variant: 'destructive',
          });
        },
      },
    );
  };

  const handleSaveTitle = () => {
    if (titleDraft.trim() && titleDraft.trim() !== task.title) {
      handleUpdate({ title: titleDraft.trim() });
    }
    setEditingTitle(false);
  };

  const handleSaveDesc = () => {
    handleUpdate({ description: descDraft || null });
    setEditingDesc(false);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !user) return;

    try {
      await createComment.mutateAsync({
        task_id: task.id,
        author_id: user.id,
        content: commentText.trim(),
      });
      setCommentText('');
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to post comment.',
        variant: 'destructive',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  // Post update to the parent campaign's activity feed, prefixed with task name
  const handlePostUpdate = async (
    content: string,
    isDeliverable: boolean,
    hoursLogged: number | null,
    deliverableLink: string | null,
    deliverableLinkType: string | null,
    reviewType: string,
  ) => {
    if (!task.project_id || !user) return;

    const prefixedContent = `[${task.title}] ${content}`;

    const updatePayload: Record<string, any> = {
      project_id: task.project_id,
      author_id: user.id,
      content: prefixedContent,
      is_deliverable: isDeliverable,
    };
    if (hoursLogged && hoursLogged > 0) updatePayload.hours_logged = hoursLogged;
    if (deliverableLink) {
      updatePayload.deliverable_link = deliverableLink;
      updatePayload.deliverable_link_type = deliverableLinkType;
    }
    if (reviewType && reviewType !== 'external') updatePayload.review_type = reviewType;

    await new Promise<void>((resolve, reject) => {
      createUpdate.mutate(updatePayload as any, {
        onSuccess: () => {
          if (hoursLogged && hoursLogged > 0 && task.company_id) {
            createTimeEntry.mutate({
              company_id: task.company_id,
              project_id: task.project_id!,
              user_id: user.id,
              hours: hoursLogged,
              description: prefixedContent.slice(0, 100),
              date: new Date().toISOString().split('T')[0],
            });
          }

          toast({
            title: isDeliverable ? 'Deliverable submitted!' : 'Update posted!',
            description: isDeliverable
              ? reviewType === 'internal'
                ? 'Submitted for internal team review.'
                : 'The client will be notified to review.'
              : 'Your update has been added to the campaign activity feed.',
          });
          resolve();
        },
        onError: (err: any) => {
          toast({
            title: 'Error',
            description: err?.message || 'Failed to post update',
            variant: 'destructive',
          });
          reject(err);
        },
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="space-y-3">
          {/* Title */}
          <div className="flex items-start gap-2">
            {editingTitle && canEdit ? (
              <div className="flex-1 flex items-center gap-2">
                <Input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="text-lg font-semibold"
                />
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleSaveTitle}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingTitle(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <DialogTitle
                className={`flex-1 text-lg cursor-pointer hover:text-primary transition-colors ${
                  canEdit ? '' : 'cursor-default'
                }`}
                onClick={() => {
                  if (canEdit) {
                    setTitleDraft(task.title);
                    setEditingTitle(true);
                  }
                }}
              >
                {task.title}
                {canEdit && (
                  <Pencil className="inline-block ml-2 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                )}
              </DialogTitle>
            )}
          </div>

          {/* Meta badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status */}
            {canEdit ? (
              <Select value={task.status} onValueChange={(v) => handleUpdate({ status: v })}>
                <SelectTrigger className="h-7 w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0">
                  <Badge variant="secondary" className={`text-xs h-6 px-2 font-medium ${status.color}`}>
                    {status.label}
                  </Badge>
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {TASK_STATUSES[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="secondary" className={`text-xs h-6 px-2 font-medium ${status.color}`}>
                {status.label}
              </Badge>
            )}

            {/* Priority */}
            {canEdit ? (
              <Select value={task.priority} onValueChange={(v) => handleUpdate({ priority: v })}>
                <SelectTrigger className="h-7 w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0">
                  <Badge variant="outline" className="text-xs h-6 px-2 gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${priority.dotColor}`} />
                    {priority.label}
                  </Badge>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITIES).map(([key, cfg]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline" className="text-xs h-6 px-2 gap-1.5">
                <span className={`h-2 w-2 rounded-full ${priority.dotColor}`} />
                {priority.label}
              </Badge>
            )}

            {/* Assignee */}
            {canEdit ? (
              <Select
                value={task.assigned_to || 'unassigned'}
                onValueChange={(v) => handleUpdate({ assigned_to: v === 'unassigned' ? null : v })}
              >
                <SelectTrigger className="h-7 w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0">
                  <Badge variant="outline" className="text-xs h-6 px-2">
                    {assignee ? assignee.full_name || assignee.email : 'Unassigned'}
                  </Badge>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.full_name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : assignee ? (
              <Badge variant="outline" className="text-xs h-6 px-2">
                {assignee.full_name || assignee.email}
              </Badge>
            ) : null}

            {/* Due date */}
            {task.due_date && (
              <Badge variant="outline" className="text-xs h-6 px-2 gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(task.due_date + 'T00:00:00'), 'MMM d, yyyy')}
              </Badge>
            )}
          </div>

          {/* Campaign */}
          {task.project_name && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Campaign: <span className="font-medium text-foreground">{task.project_name}</span>
                {task.company_name && (
                  <> &middot; {task.company_name}</>
                )}
              </p>
              {task.project_id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] px-2 gap-1"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/projects/${task.project_id}`);
                  }}
                >
                  View Campaign
                  <ExternalLink className="h-2.5 w-2.5" />
                </Button>
              )}
            </div>
          )}
        </DialogHeader>

        <Separator />

        {/* Tabbed content area */}
        <Tabs defaultValue="details" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="h-9 shrink-0">
            <TabsTrigger value="details" className="text-xs gap-1.5 h-8 px-3">
              <FileText className="h-3.5 w-3.5" />
              Details
            </TabsTrigger>
            {canPostUpdates && task.project_id && (
              <TabsTrigger value="update" className="text-xs gap-1.5 h-8 px-3">
                <Send className="h-3.5 w-3.5" />
                Submit Update
              </TabsTrigger>
            )}
            {task.project_id && (
              <TabsTrigger value="chat" className="text-xs gap-1.5 h-8 px-3">
                <MessageSquare className="h-3.5 w-3.5" />
                Chat
              </TabsTrigger>
            )}
            {canPostUpdates && task.project_id && (
              <TabsTrigger value="notes" className="text-xs gap-1.5 h-8 px-3">
                <StickyNote className="h-3.5 w-3.5" />
                Team Notes
              </TabsTrigger>
            )}
          </TabsList>

          {/* ── Details Tab ──────────────────────────────────────────── */}
          <TabsContent value="details" className="flex-1 min-h-0 overflow-y-auto mt-3 space-y-4">
            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Description</h4>
                {canEdit && !editingDesc && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground"
                    onClick={() => {
                      setDescDraft(task.description || '');
                      setEditingDesc(true);
                    }}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>

              {editingDesc ? (
                <div className="space-y-2">
                  <Textarea
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    rows={3}
                    placeholder="Add a description..."
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingDesc(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveDesc}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {task.description || 'No description.'}
                </p>
              )}
            </div>

            {/* Comments — hidden from clients */}
            {!isClient && (
              <>
                <Separator />

                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">
                      Comments {comments.length > 0 && `(${comments.length})`}
                    </h4>
                  </div>

                  {/* Comment thread */}
                  <div className="flex-1 overflow-y-auto max-h-[240px] space-y-3 pr-1">
                    {commentsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No comments yet. Be the first to comment.
                      </p>
                    ) : (
                      comments.map((comment) => {
                        const isOwn = comment.author_id === user?.id;
                        return (
                          <div key={comment.id} className="flex gap-2.5">
                            <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                              <AvatarFallback className="text-[9px] bg-muted">
                                {getInitials(comment.author_name, comment.author_email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="text-xs font-medium">
                                  {isOwn ? 'You' : comment.author_name || comment.author_email || 'Unknown'}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {formatDistanceToNow(new Date(comment.created_at), {
                                    addSuffix: true,
                                  })}
                                </span>
                              </div>
                              <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-0.5">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={commentsEndRef} />
                  </div>

                  {/* Comment input */}
                  <div className="flex items-end gap-2 mt-3 pt-3 border-t">
                    <Textarea
                      placeholder="Write a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      className="min-h-[36px] resize-none text-sm"
                    />
                    <Button
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={handleSubmitComment}
                      disabled={!commentText.trim() || createComment.isPending}
                    >
                      {createComment.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Submit Update Tab ─────────────────────────────────── */}
          {canPostUpdates && task.project_id && (
            <TabsContent value="update" className="flex-1 min-h-0 overflow-y-auto mt-3">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Post an update for <span className="font-medium text-foreground">{task.title}</span>.
                  This will appear in the campaign activity feed.
                </p>
                <TeamUpdateForm
                  projectId={task.project_id}
                  onSubmit={handlePostUpdate}
                  defaultExpanded
                />
              </div>
            </TabsContent>
          )}

          {/* ── Client Chat Tab ──────────────────────────────────── */}
          {task.project_id && (
            <TabsContent value="chat" className="flex-1 min-h-0 mt-0">
              <div className="h-[360px]">
                <MessageThread projectId={task.project_id} isInternal={false} />
              </div>
            </TabsContent>
          )}

          {/* ── Team Notes Tab ───────────────────────────────────── */}
          {canPostUpdates && task.project_id && (
            <TabsContent value="notes" className="flex-1 min-h-0 mt-0">
              <div className="h-[360px]">
                <MessageThread projectId={task.project_id} isInternal={true} />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
