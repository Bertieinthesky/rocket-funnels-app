import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useProject, useUpdateProject } from '@/hooks/useProjects';
import { useUpdates, useCreateUpdate, useUpdateUpdate } from '@/hooks/useUpdates';
import { ChangeRequestModal } from '@/components/project/ChangeRequestModal';
import { TeamUpdateForm } from '@/components/project/TeamUpdateForm';
import { MessageThread } from '@/components/project/MessageThread';
import { BlockDialog } from '@/components/project/BlockDialog';
import { PhaseAdvancer } from '@/components/project/PhaseAdvancer';
import {
  PHASES,
  STATUSES,
  PRIORITIES,
  type WorkflowPhase,
  type ProjectStatus,
  type Priority,
} from '@/lib/constants';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Loader2,
  ExternalLink,
  Video,
  Edit2,
  MessageSquare,
  StickyNote,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Update } from '@/hooks/useUpdates';

const getLinkIcon = (type: string | null) => {
  if (type === 'loom' || type === 'youtube' || type === 'vimeo') return Video;
  return FileText;
};

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return email?.slice(0, 2).toUpperCase() || 'U';
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isClient, isTeam, isAdmin } = useAuth();
  const { toast } = useToast();

  // React Query
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: updates = [] } = useUpdates(id);
  const updateProject = useUpdateProject();
  const createUpdate = useCreateUpdate();
  const updateUpdate = useUpdateUpdate();

  // Local state
  const [approving, setApproving] = useState<string | null>(null);
  const [changeRequestUpdate, setChangeRequestUpdate] = useState<Update | null>(null);

  const canPostUpdates = isTeam || isAdmin;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleBlock = (reason: string, notify: boolean) => {
    if (!project) return;
    updateProject.mutate(
      { id: project.id, is_blocked: true, blocked_reason: reason },
      {
        onSuccess: () => {
          toast({
            title: 'Project blocked',
            description: notify ? 'Client will be notified.' : undefined,
          });
        },
      },
    );
  };

  const handleUnblock = () => {
    if (!project) return;
    updateProject.mutate(
      { id: project.id, is_blocked: false, blocked_reason: null },
      {
        onSuccess: () => {
          toast({ title: 'Project unblocked' });
        },
      },
    );
  };

  const handleAdvancePhase = (nextPhase: WorkflowPhase) => {
    if (!project) return;
    const phaseConfig = PHASES[nextPhase];
    const dueDate = phaseConfig.defaultDays
      ? new Date(Date.now() + phaseConfig.defaultDays * 86400000).toISOString().split('T')[0]
      : null;

    updateProject.mutate(
      {
        id: project.id,
        phase: nextPhase as any,
        phase_started_at: new Date().toISOString(),
        phase_due_date: dueDate,
      },
      {
        onSuccess: () => {
          toast({ title: `Phase advanced to ${phaseConfig.label}` });
        },
      },
    );
  };

  const handleChangePhase = (phase: WorkflowPhase) => {
    if (!project) return;
    updateProject.mutate(
      {
        id: project.id,
        phase: phase as any,
        phase_started_at: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          toast({ title: `Phase changed to ${PHASES[phase].label}` });
        },
      },
    );
  };

  const handleApproveDeliverable = async (updateId: string) => {
    if (approving) return;
    setApproving(updateId);

    updateUpdate.mutate(
      {
        id: updateId,
        is_approved: true,
        change_request_text: null,
        change_request_link: null,
        change_request_link_type: null,
        change_request_draft: false,
        change_request_submitted_at: null,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Deliverable approved!',
            description: 'The team will continue with the next step.',
          });
          setApproving(null);
        },
        onError: () => {
          toast({
            title: 'Error',
            description: 'Failed to approve deliverable',
            variant: 'destructive',
          });
          setApproving(null);
        },
      },
    );
  };

  const handleSaveChangeRequestDraft = async (
    text: string,
    link: string,
    linkType: string | null,
  ) => {
    if (!changeRequestUpdate) return;

    updateUpdate.mutate(
      {
        id: changeRequestUpdate.id,
        change_request_text: text || null,
        change_request_link: link || null,
        change_request_link_type: linkType,
        change_request_draft: true,
        is_approved: null,
      },
      {
        onSuccess: () => {
          toast({ title: 'Draft saved' });
        },
        onError: () => {
          toast({
            title: 'Error',
            description: 'Failed to save draft',
            variant: 'destructive',
          });
        },
      },
    );
  };

  const handleSubmitChangeRequest = async (
    text: string,
    link: string,
    linkType: string | null,
  ) => {
    if (!changeRequestUpdate) return;

    updateUpdate.mutate(
      {
        id: changeRequestUpdate.id,
        is_approved: false,
        change_request_text: text || null,
        change_request_link: link || null,
        change_request_link_type: linkType,
        change_request_draft: false,
        change_request_submitted_at: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          toast({
            title: 'Changes requested',
            description: 'Your feedback has been submitted to the team.',
          });
          setChangeRequestUpdate(null);
        },
        onError: () => {
          toast({
            title: 'Error',
            description: 'Failed to submit change request',
            variant: 'destructive',
          });
        },
      },
    );
  };

  const handlePostUpdate = async (
    content: string,
    isDeliverable: boolean,
    hoursLogged: number | null,
  ) => {
    if (!project || !user) return;

    createUpdate.mutate(
      {
        project_id: project.id,
        author_id: user.id,
        content,
        is_deliverable: isDeliverable,
        hours_logged: hoursLogged,
      },
      {
        onSuccess: () => {
          toast({
            title: isDeliverable ? 'Deliverable submitted!' : 'Update posted!',
            description: isDeliverable
              ? 'The client will be notified to review.'
              : 'Your update has been added to the activity feed.',
          });
        },
        onError: () => {
          toast({
            title: 'Error',
            description: 'Failed to post update',
            variant: 'destructive',
          });
        },
      },
    );
  };

  const getExistingDraft = (update: Update) => {
    if (
      update.change_request_draft &&
      (update.change_request_text || update.change_request_link)
    ) {
      return {
        text: update.change_request_text || '',
        link: update.change_request_link || '',
        linkType: update.change_request_link_type,
      };
    }
    return null;
  };

  // ── Guards ───────────────────────────────────────────────────────────────

  if (projectLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Project not found</p>
          <Button className="mt-4" onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const phase = PHASES[project.phase as WorkflowPhase] || PHASES.shaping;
  const PhaseIcon = phase.icon;
  const status =
    STATUSES[
      (project.status === 'revision' ? 'in_progress' : project.status) as ProjectStatus
    ] || STATUSES.queued;
  const StatusIcon = status.icon;
  const priority = PRIORITIES[(project.priority as Priority) || 'normal'];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 mt-0.5"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold tracking-tight truncate">
                {project.name}
              </h1>

              {/* Priority dot */}
              <span className={`h-2 w-2 rounded-full shrink-0 ${priority.dotColor}`} />

              {/* Status badge */}
              <Badge
                variant="secondary"
                className={`text-[10px] h-5 px-1.5 gap-1 font-medium ${status.color}`}
              >
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>

              {/* Phase badge */}
              <Badge
                variant="secondary"
                className={`text-[10px] h-5 px-1.5 gap-1 font-medium ${phase.color}`}
              >
                <PhaseIcon className="h-3 w-3" />
                {phase.label}
              </Badge>

              {project.is_blocked && (
                <Badge variant="destructive" className="text-[10px] h-5 px-1.5 gap-1">
                  Blocked
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
              {project.company_name && (
                <span>{project.company_name}</span>
              )}
              {project.target_date && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Target: {format(new Date(project.target_date), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>

          {/* Block/Unblock — team/admin only */}
          {canPostUpdates && (
            <BlockDialog
              project={project}
              onBlock={handleBlock}
              onUnblock={handleUnblock}
            />
          )}
        </div>

        {/* Blocked Banner */}
        {project.is_blocked && (
          <Card className="border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="flex items-center gap-3 p-3">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  Blocked
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {project.blocked_reason || 'This project is waiting for input'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Phase Advancer — team/admin only */}
        {canPostUpdates && (
          <Card>
            <CardContent className="p-3">
              <PhaseAdvancer
                project={project}
                onAdvance={handleAdvancePhase}
                onChangePhase={handleChangePhase}
              />
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {project.description && (
          <Card>
            <CardContent className="p-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Description
              </p>
              <p className="text-sm whitespace-pre-wrap">{project.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Messaging Tabs */}
        <Card>
          <Tabs defaultValue="client-chat">
            <CardHeader className="pb-0 pt-3 px-3">
              <TabsList className="h-8">
                <TabsTrigger value="client-chat" className="text-xs gap-1.5 h-7">
                  <MessageSquare className="h-3 w-3" />
                  Client Chat
                </TabsTrigger>
                {canPostUpdates && (
                  <TabsTrigger value="team-notes" className="text-xs gap-1.5 h-7">
                    <StickyNote className="h-3 w-3" />
                    Team Notes
                  </TabsTrigger>
                )}
              </TabsList>
            </CardHeader>

            <TabsContent value="client-chat" className="mt-0">
              <MessageThread projectId={project.id} isInternal={false} />
            </TabsContent>

            {canPostUpdates && (
              <TabsContent value="team-notes" className="mt-0">
                <MessageThread projectId={project.id} isInternal={true} />
              </TabsContent>
            )}
          </Tabs>
        </Card>

        {/* Team Update Form */}
        {canPostUpdates && (
          <TeamUpdateForm projectId={project.id} onSubmit={handlePostUpdate} />
        )}

        {/* Activity Feed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Activity</CardTitle>
            <CardDescription className="text-xs">
              Updates and deliverables
            </CardDescription>
          </CardHeader>
          <CardContent>
            {updates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground/60">
                <FileText className="mx-auto h-8 w-8 mb-2" />
                <p className="text-xs">No updates yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {updates.map((update) => {
                  const hasDraft =
                    update.change_request_draft &&
                    (update.change_request_text || update.change_request_link);
                  const LinkIconComponent = getLinkIcon(
                    update.change_request_link_type || null,
                  );

                  return (
                    <div key={update.id} className="relative pl-8">
                      <div className="absolute left-0 top-0">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] bg-foreground/10 text-foreground/70">
                            {getInitials(update.author_name, update.author_email)}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div
                        className={`rounded-lg border p-3 ${
                          update.is_deliverable
                            ? 'border-primary/30 bg-primary/5'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium">
                              {update.author_name || 'Team Member'}
                            </span>
                            {update.is_deliverable && (
                              <Badge className="bg-primary/10 text-primary text-[10px] h-4 px-1">
                                Deliverable
                              </Badge>
                            )}
                            {update.hours_logged && (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-4 px-1"
                              >
                                {update.hours_logged}h
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(update.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>

                        <p className="text-sm whitespace-pre-wrap">
                          {update.content}
                        </p>

                        {/* Client: approve / request changes */}
                        {update.is_deliverable && isClient && (
                          <div className="mt-3 pt-3 border-t">
                            {update.is_approved === null || hasDraft ? (
                              <div className="space-y-2">
                                {hasDraft && (
                                  <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
                                    <Edit2 className="h-3.5 w-3.5" />
                                    <span>Draft change request</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-[10px]"
                                      onClick={() =>
                                        setChangeRequestUpdate(update)
                                      }
                                    >
                                      Continue
                                    </Button>
                                  </div>
                                )}
                                {!hasDraft && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() =>
                                        handleApproveDeliverable(update.id)
                                      }
                                      disabled={approving === update.id}
                                    >
                                      {approving === update.id ? (
                                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                      )}
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      onClick={() =>
                                        setChangeRequestUpdate(update)
                                      }
                                    >
                                      <XCircle className="mr-1 h-3 w-3" />
                                      Request Changes
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div
                                  className={`flex items-center gap-1.5 text-xs ${
                                    update.is_approved
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-orange-600 dark:text-orange-400'
                                  }`}
                                >
                                  {update.is_approved ? (
                                    <>
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Approved
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="h-3.5 w-3.5" />
                                      Changes requested
                                      {update.change_request_submitted_at && (
                                        <span className="text-[10px] text-muted-foreground ml-1">
                                          {format(
                                            new Date(
                                              update.change_request_submitted_at,
                                            ),
                                            'MMM d',
                                          )}
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>

                                {!update.is_approved &&
                                  update.change_request_text && (
                                    <div className="p-2 rounded bg-orange-50 dark:bg-orange-900/10 border border-orange-200/50 dark:border-orange-800/30">
                                      <p className="text-xs font-medium mb-0.5">
                                        Requested Changes:
                                      </p>
                                      <p className="text-xs whitespace-pre-wrap">
                                        {update.change_request_text}
                                      </p>
                                    </div>
                                  )}

                                {!update.is_approved &&
                                  update.change_request_link && (
                                    <a
                                      href={update.change_request_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                                    >
                                      <LinkIconComponent className="h-3 w-3" />
                                      View feedback
                                      <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                  )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Team: see change request details */}
                        {update.is_deliverable &&
                          canPostUpdates &&
                          update.is_approved === false && (
                            <div className="mt-3 pt-3 border-t space-y-2">
                              <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400">
                                <XCircle className="h-3.5 w-3.5" />
                                Client requested changes
                                {update.change_request_submitted_at && (
                                  <span className="text-[10px] text-muted-foreground ml-1">
                                    {format(
                                      new Date(
                                        update.change_request_submitted_at,
                                      ),
                                      'MMM d, h:mm a',
                                    )}
                                  </span>
                                )}
                              </div>

                              {update.change_request_text && (
                                <div className="p-2 rounded bg-orange-50 dark:bg-orange-900/10 border border-orange-200/50 dark:border-orange-800/30">
                                  <p className="text-xs font-medium mb-0.5">
                                    Requested Changes:
                                  </p>
                                  <p className="text-xs whitespace-pre-wrap">
                                    {update.change_request_text}
                                  </p>
                                </div>
                              )}

                              {update.change_request_link && (
                                <a
                                  href={update.change_request_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                                >
                                  <LinkIconComponent className="h-3 w-3" />
                                  View feedback
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>
                          )}

                        {/* Team: see approved */}
                        {update.is_deliverable &&
                          canPostUpdates &&
                          update.is_approved === true && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Client approved
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Change Request Modal */}
      <ChangeRequestModal
        open={!!changeRequestUpdate}
        onOpenChange={(open) => !open && setChangeRequestUpdate(null)}
        deliverableTitle={
          changeRequestUpdate
            ? changeRequestUpdate.content.slice(0, 50) + '...'
            : ''
        }
        existingDraft={
          changeRequestUpdate ? getExistingDraft(changeRequestUpdate) : null
        }
        onSaveDraft={handleSaveChangeRequestDraft}
        onSubmit={handleSubmitChangeRequest}
      />
    </DashboardLayout>
  );
}
