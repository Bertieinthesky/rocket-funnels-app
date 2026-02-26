import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useProject, useUpdateProject } from '@/hooks/useProjects';
import { useUpdates, useCreateUpdate, useUpdateUpdate } from '@/hooks/useUpdates';
import { useCreateTimeEntry } from '@/hooks/useTimeEntries';
import { ChangeRequestModal } from '@/components/project/ChangeRequestModal';
import { TeamUpdateForm } from '@/components/project/TeamUpdateForm';
import { MessageThread } from '@/components/project/MessageThread';
import { BlockDialog } from '@/components/project/BlockDialog';
import { PhaseAdvancer } from '@/components/project/PhaseAdvancer';
import { TaskList } from '@/components/tasks/TaskList';
import {
  PHASES,
  PHASE_ORDER,
  STATUSES,
  STATUS_ORDER,
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
  Package,
  Link as LinkIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { CampaignQuickLinks } from '@/components/campaigns/CampaignQuickLinks';
import { HealthBadge } from '@/components/campaigns/HealthBadge';
import type { Update } from '@/hooks/useUpdates';

const getLinkIcon = (type: string | null) => {
  if (type === 'loom' || type === 'youtube' || type === 'vimeo') return Video;
  if (type === 'figma') return FileText;
  return LinkIcon;
};

const getLinkLabel = (type: string | null) => {
  const labels: Record<string, string> = {
    loom: 'Loom',
    youtube: 'YouTube',
    vimeo: 'Vimeo',
    figma: 'Figma',
    google_docs: 'Google Docs',
    google_drive: 'Google Drive',
    google_sheets: 'Sheets',
    canva: 'Canva',
    notion: 'Notion',
  };
  return type ? labels[type] || 'Link' : 'Link';
};

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
  const createTimeEntry = useCreateTimeEntry();

  // Local state
  const [approving, setApproving] = useState<string | null>(null);
  const [changeRequestUpdate, setChangeRequestUpdate] = useState<Update | null>(null);
  const [showAllUpdates, setShowAllUpdates] = useState(false);
  const [headerStyle, setHeaderStyle] = useState<'A' | 'B'>('A');

  const canPostUpdates = isTeam || isAdmin;

  // Pending deliverables for client (external, not yet approved/rejected)
  const pendingDeliverables = updates.filter(
    (u) =>
      u.is_deliverable &&
      u.is_approved === null &&
      (u.review_type === 'external' || !u.review_type) &&
      !u.change_request_draft,
  );

  // Filter updates for display — clients shouldn't see internal-review deliverables
  const visibleUpdates = isClient
    ? updates.filter((u) => u.review_type !== 'internal')
    : updates;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleStatusChange = (newStatus: string) => {
    if (!project) return;
    updateProject.mutate(
      { id: project.id, status: newStatus as any },
      {
        onSuccess: () => {
          toast({ title: `Status changed to ${STATUSES[newStatus as ProjectStatus]?.label || newStatus}` });
        },
      },
    );
  };

  const handlePriorityChange = (newPriority: string) => {
    if (!project) return;
    updateProject.mutate(
      { id: project.id, priority: newPriority as any },
      {
        onSuccess: () => {
          toast({ title: `Priority changed to ${PRIORITIES[newPriority as Priority]?.label || newPriority}` });
        },
      },
    );
  };

  const handleBlock = (reason: string, notify: boolean) => {
    if (!project || !user) return;
    updateProject.mutate(
      { id: project.id, is_blocked: true, blocked_reason: reason, status: 'blocked' as any },
      {
        onSuccess: () => {
          // Post block as an activity update
          createUpdate.mutate({
            project_id: project.id,
            author_id: user.id,
            content: `Project blocked: ${reason}`,
            is_deliverable: false,
          } as any);
          toast({
            title: 'Project blocked',
            description: notify ? 'Client will be notified.' : undefined,
          });
        },
      },
    );
  };

  const handleUnblock = (resolution?: string, link?: string) => {
    if (!project || !user) return;
    updateProject.mutate(
      { id: project.id, is_blocked: false, blocked_reason: null, status: 'in_progress' as any },
      {
        onSuccess: () => {
          // Post resolution as an activity update
          let content = resolution
            ? `Block resolved: ${resolution}`
            : `Block resolved${project.blocked_reason ? ` (was: ${project.blocked_reason})` : ''}`;
          if (link) content += `\n${link}`;
          createUpdate.mutate({
            project_id: project.id,
            author_id: user.id,
            content,
            is_deliverable: false,
          } as any);
          toast({ title: 'Block resolved', description: resolution || 'Project unblocked.' });
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
    deliverableLink: string | null,
    deliverableLinkType: string | null,
    reviewType: string,
  ) => {
    if (!project || !user) return;

    // Build payload with only non-null optional fields — safe before migration
    const updatePayload: Record<string, any> = {
      project_id: project.id,
      author_id: user.id,
      content,
      is_deliverable: isDeliverable,
    };
    if (hoursLogged && hoursLogged > 0) updatePayload.hours_logged = hoursLogged;
    if (deliverableLink) {
      updatePayload.deliverable_link = deliverableLink;
      updatePayload.deliverable_link_type = deliverableLinkType;
    }
    if (reviewType && reviewType !== 'external') updatePayload.review_type = reviewType;

    createUpdate.mutate(
      updatePayload as any,
      {
        onSuccess: () => {
          // Auto-create time entry when hours are logged
          if (hoursLogged && hoursLogged > 0 && project.company_id) {
            createTimeEntry.mutate({
              company_id: project.company_id,
              project_id: project.id,
              user_id: user.id,
              hours: hoursLogged,
              description: content.slice(0, 100),
              date: new Date().toISOString().split('T')[0],
            });
          }

          toast({
            title: isDeliverable ? 'Deliverable submitted!' : 'Update posted!',
            description: isDeliverable
              ? reviewType === 'internal'
                ? 'Submitted for internal team review.'
                : 'The client will be notified to review.'
              : 'Your update has been added to the activity feed.',
          });
        },
        onError: (err: any) => {
          console.error('Failed to post update:', err);
          toast({
            title: 'Error',
            description: err?.message || 'Failed to post update',
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
          <p className="text-muted-foreground">Campaign not found</p>
          <Button className="mt-4" onClick={() => navigate('/projects')}>
            Back to Campaigns
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Phase badge removed from header — shown in progress bar + advancer only
  const status =
    STATUSES[
      (project.status === 'revision' ? 'in_progress' : project.status) as ProjectStatus
    ] || STATUSES.queued;
  const StatusIcon = status.icon;
  const priority = PRIORITIES[(project.priority as Priority) || 'normal'];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-4">
        {/* ── Layout Toggle (temporary) ─────────────────────────────── */}
        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-muted-foreground mr-1">Layout:</span>
          <Button
            variant={headerStyle === 'A' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-[10px] font-medium"
            onClick={() => setHeaderStyle('A')}
          >
            Streamlined
          </Button>
          <Button
            variant={headerStyle === 'B' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-[10px] font-medium"
            onClick={() => setHeaderStyle('B')}
          >
            Stat Cards
          </Button>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            VARIATION A — Streamlined Inline
           ══════════════════════════════════════════════════════════════ */}
        {headerStyle === 'A' && (
          <>
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
                  {canPostUpdates ? (
                    <Select value={project.priority || 'normal'} onValueChange={handlePriorityChange}>
                      <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:hidden">
                        <span className={`h-2 w-2 rounded-full shrink-0 cursor-pointer ${priority.dotColor}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {(['urgent', 'important', 'normal', 'queued'] as Priority[]).map((p) => (
                          <SelectItem key={p} value={p} className="text-xs">
                            <span className="flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${PRIORITIES[p].dotColor}`} />
                              {PRIORITIES[p].label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={`h-2 w-2 rounded-full shrink-0 ${priority.dotColor}`} />
                  )}
                  {canPostUpdates ? (
                    <Select value={project.status === 'revision' ? 'in_progress' : project.status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:hidden">
                        <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 gap-1 font-medium cursor-pointer ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_ORDER.map((s) => {
                          const sConfig = STATUSES[s];
                          const SIcon = sConfig.icon;
                          return (
                            <SelectItem key={s} value={s} className="text-xs">
                              <span className="flex items-center gap-1.5">
                                <SIcon className="h-3 w-3" />
                                {sConfig.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 gap-1 font-medium ${status.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  )}
                  {project.is_blocked && (
                    <Badge variant="destructive" className="text-[10px] h-5 px-1.5 gap-1">Blocked</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                  {project.company_name && <span>{project.company_name}</span>}
                  {project.company_name && project.target_date && <span className="text-muted-foreground/40">·</span>}
                  {project.target_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Target: {format(new Date(project.target_date), 'MMM d, yyyy')}
                    </span>
                  )}
                  {(project.company_name || project.target_date) && <span className="text-muted-foreground/40">·</span>}
                  <HealthBadge projectId={project.id} />
                </div>
              </div>

              {canPostUpdates && (
                <BlockDialog project={project} onBlock={handleBlock} onUnblock={handleUnblock} />
              )}
            </div>

            {/* Blocked Banner */}
            {project.is_blocked && (
              <Card className="border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="flex items-center gap-3 p-3">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Blocked</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {project.blocked_reason || 'This project is waiting for input'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            VARIATION B — Streamlined Title + Stat Cards
           ══════════════════════════════════════════════════════════════ */}
        {headerStyle === 'B' && (
          <>
            {/* Title row — same as Streamlined */}
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
                <h1 className="text-xl font-semibold tracking-tight truncate">
                  {project.name}
                </h1>
                {project.company_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">{project.company_name}</p>
                )}
              </div>

              {canPostUpdates && (
                <BlockDialog project={project} onBlock={handleBlock} onUnblock={handleUnblock} />
              )}
            </div>

            {/* Stat cards row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-lg border bg-card p-2.5">
                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                {canPostUpdates ? (
                  <Select value={project.status === 'revision' ? 'in_progress' : project.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:hidden">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 gap-1 font-medium cursor-pointer ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                        {project.is_blocked && (
                          <Badge variant="destructive" className="text-[10px] h-5 px-1.5">Blocked</Badge>
                        )}
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map((s) => {
                        const sConfig = STATUSES[s];
                        const SIcon = sConfig.icon;
                        return (
                          <SelectItem key={s} value={s} className="text-xs">
                            <span className="flex items-center gap-1.5">
                              <SIcon className="h-3 w-3" />
                              {sConfig.label}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 gap-1 font-medium ${status.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                    {project.is_blocked && (
                      <Badge variant="destructive" className="text-[10px] h-5 px-1.5">Blocked</Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="rounded-lg border bg-card p-2.5">
                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Priority</p>
                {canPostUpdates ? (
                  <Select value={project.priority || 'normal'} onValueChange={handlePriorityChange}>
                    <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:hidden">
                      <div className="flex items-center gap-1.5 cursor-pointer">
                        <span className={`h-2 w-2 rounded-full ${priority.dotColor}`} />
                        <span className="text-sm font-medium">{priority.label}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {(['urgent', 'important', 'normal', 'queued'] as Priority[]).map((p) => (
                        <SelectItem key={p} value={p} className="text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${PRIORITIES[p].dotColor}`} />
                            {PRIORITIES[p].label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${priority.dotColor}`} />
                    <span className="text-sm font-medium">{priority.label}</span>
                  </div>
                )}
              </div>
              <div className="rounded-lg border bg-card p-2.5">
                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Target</p>
                <p className="text-sm font-medium">
                  {project.target_date
                    ? format(new Date(project.target_date), 'MMM d, yyyy')
                    : '—'}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-2.5">
                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Health</p>
                <HealthBadge projectId={project.id} />
              </div>
            </div>

            {/* Blocked Banner */}
            {project.is_blocked && (
              <Card className="border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="flex items-center gap-3 p-3">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Blocked</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {project.blocked_reason || 'This project is waiting for input'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ── Phase Advancer + Progress Bar (full width) ──────────────── */}
        {canPostUpdates && (
          <Card>
            <CardContent className="p-3 space-y-3">
              {/* Progress bar */}
              <div className="flex items-center gap-1">
                {PHASE_ORDER.map((p, i) => {
                  const currentIdx = PHASE_ORDER.indexOf(project.phase as WorkflowPhase);
                  const pConfig = PHASES[p];
                  const PIcon = pConfig.icon;
                  const isComplete = i < currentIdx;
                  const isCurrent = i === currentIdx;
                  return (
                    <div key={p} className="flex items-center flex-1 min-w-0">
                      <div className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 w-full text-[10px] font-medium transition-colors ${
                        isCurrent ? pConfig.color : isComplete ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-muted/50 text-muted-foreground/50'
                      }`}>
                        <PIcon className="h-3 w-3 shrink-0" />
                        <span className="truncate hidden sm:inline">{pConfig.label}</span>
                      </div>
                      {i < PHASE_ORDER.length - 1 && (
                        <div className={`h-0.5 w-2 shrink-0 ${i < currentIdx ? 'bg-emerald-400' : 'bg-muted'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Phase details + advance controls */}
              <PhaseAdvancer project={project} onAdvance={handleAdvancePhase} onChangePhase={handleChangePhase} />
            </CardContent>
          </Card>
        )}

        {/* ── Pending Deliverables — clients only ────────────────────── */}
        {isClient && pendingDeliverables.length > 0 && (
          <Card className="border-primary/30 bg-primary/[0.03]">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Deliverables Awaiting Your Review
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 ml-1">
                  {pendingDeliverables.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-3">
              {pendingDeliverables.map((update) => {
                const hasDraft = update.change_request_draft && (update.change_request_text || update.change_request_link);
                const DeliverableLinkIcon = getLinkIcon(update.deliverable_link_type || null);
                return (
                  <div key={update.id} className="rounded-lg border bg-background p-3 space-y-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-medium">{update.author_name || 'Team Member'}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(update.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm">{update.content}</p>
                      {update.deliverable_link && (
                        <a href={update.deliverable_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-1.5">
                          <DeliverableLinkIcon className="h-3 w-3" />
                          View Deliverable
                          {update.deliverable_link_type && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 ml-0.5">{getLinkLabel(update.deliverable_link_type)}</Badge>
                          )}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                    {hasDraft ? (
                      <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Draft change request</span>
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setChangeRequestUpdate(update)}>Continue</Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" className="h-8 text-xs" onClick={() => handleApproveDeliverable(update.id)} disabled={approving === update.id}>
                          {approving === update.id ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3 w-3" />}
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setChangeRequestUpdate(update)}>
                          <XCircle className="mr-1.5 h-3 w-3" />
                          Request Changes
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* ── MAIN LAYOUT: Content | Sidebar (Quick Links + Activity) */}
        <div className="grid gap-4 md:grid-cols-[1fr_280px]">
          {/* ── LEFT: Description + Tasks + Chat ────────────────────── */}
          <div className="space-y-4">
            {/* Description */}
            {project.description && (
              <Card>
                <CardContent className="p-3">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Description</p>
                  <p className="text-sm whitespace-pre-wrap">{project.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Tasks */}
            <TaskList projectId={project.id} canEdit={canPostUpdates} />

            {/* Chat + Team Update Form */}
            <Card className="flex flex-col overflow-hidden">
              <Tabs defaultValue="client-chat" className="flex flex-col flex-1">
                <div className="border-b px-4 pt-3 pb-0 shrink-0">
                  <TabsList className="h-9">
                    <TabsTrigger value="client-chat" className="text-xs gap-1.5 h-8 px-4">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Client Chat
                    </TabsTrigger>
                    {canPostUpdates && (
                      <TabsTrigger value="team-notes" className="text-xs gap-1.5 h-8 px-4">
                        <StickyNote className="h-3.5 w-3.5" />
                        Team Notes
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                <TabsContent value="client-chat" className="mt-0 flex-1 md:h-[440px]">
                  <MessageThread projectId={project.id} isInternal={false} />
                </TabsContent>

                {canPostUpdates && (
                  <TabsContent value="team-notes" className="mt-0 flex-1 md:h-[440px]">
                    <MessageThread projectId={project.id} isInternal={true} />
                  </TabsContent>
                )}
              </Tabs>

              {canPostUpdates && (
                <div className="border-t">
                  <TeamUpdateForm projectId={project.id} onSubmit={handlePostUpdate} />
                </div>
              )}
            </Card>
          </div>

          {/* ── RIGHT SIDEBAR: Quick Links + Activity ────────────────── */}
          <div className="flex flex-col gap-4">
            {/* Quick Links */}
            {project.company_id && (
              <CampaignQuickLinks companyId={project.company_id} />
            )}

            {/* Activity Feed */}
            <Card className="md:flex-1 flex flex-col overflow-hidden min-h-0">
              <CardHeader className="pb-2 pt-3 px-3 shrink-0">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-0 flex-1 min-h-0 overflow-hidden relative">
                {visibleUpdates.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground/60">
                    <FileText className="mx-auto h-6 w-6 mb-1.5" />
                    <p className="text-[10px]">No updates yet</p>
                  </div>
                ) : (
                  <div className={`space-y-2 ${showAllUpdates ? 'overflow-y-auto h-full pb-8' : ''}`}>
                    {(showAllUpdates ? visibleUpdates : visibleUpdates.slice(0, 5)).map((update) => {
                      const DeliverableLinkIcon = getLinkIcon(update.deliverable_link_type || null);
                      return (
                        <div
                          key={update.id}
                          className={`rounded-md border p-2 text-xs ${
                            update.is_deliverable ? 'border-primary/30 bg-primary/5' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-medium truncate">{update.author_name || 'Team'}</span>
                            <span className="text-[9px] text-muted-foreground shrink-0 ml-2">
                              {format(new Date(update.created_at), 'MMM d')}
                            </span>
                          </div>
                          <p className="text-muted-foreground line-clamp-2">{update.content}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {update.is_deliverable && (
                              <Badge className="bg-primary/10 text-primary text-[9px] h-3.5 px-1">Deliverable</Badge>
                            )}
                            {update.review_type === 'internal' && (
                              <Badge variant="outline" className="text-[9px] h-3.5 px-1">Internal</Badge>
                            )}
                            {update.hours_logged && (
                              <Badge variant="outline" className="text-[9px] h-3.5 px-1">{update.hours_logged}h</Badge>
                            )}
                            {update.is_approved === true && (
                              <span className="text-[9px] text-emerald-600 flex items-center gap-0.5">
                                <CheckCircle2 className="h-2.5 w-2.5" /> Approved
                              </span>
                            )}
                            {update.is_approved === false && (
                              <span className="text-[9px] text-orange-600 flex items-center gap-0.5">
                                <XCircle className="h-2.5 w-2.5" /> Changes
                              </span>
                            )}
                          </div>
                          {update.deliverable_link && (
                            <a href={update.deliverable_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-1">
                              <DeliverableLinkIcon className="h-2.5 w-2.5" />
                              View
                              <ExternalLink className="h-2 w-2" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                    {showAllUpdates && visibleUpdates.length > 5 && (
                      <div className="flex justify-center pb-2">
                        <Button variant="ghost" size="sm" className="text-[10px] h-6 text-muted-foreground" onClick={() => setShowAllUpdates(false)}>
                          Show less
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {/* Fade gradient + "See all" when collapsed */}
                {!showAllUpdates && visibleUpdates.length > 5 && (
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card via-card/80 to-transparent flex items-end justify-center pb-2 px-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] h-6 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowAllUpdates(true)}
                    >
                      See all {visibleUpdates.length} updates
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Change Request Modal */}
      <ChangeRequestModal
        open={!!changeRequestUpdate}
        onOpenChange={(open) => !open && setChangeRequestUpdate(null)}
        deliverableTitle={
          changeRequestUpdate ? changeRequestUpdate.content.slice(0, 50) + '...' : ''
        }
        existingDraft={changeRequestUpdate ? getExistingDraft(changeRequestUpdate) : null}
        onSaveDraft={handleSaveChangeRequestDraft}
        onSubmit={handleSubmitChangeRequest}
      />
    </DashboardLayout>
  );
}
