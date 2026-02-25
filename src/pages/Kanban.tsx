import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import {
  STATUSES,
  STATUS_ORDER,
  type ProjectStatus,
  type WorkflowPhase,
} from '@/lib/constants';
import { useProjects, useUpdateProject } from '@/hooks/useProjects';
import { useCompanies } from '@/hooks/useCompanies';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { KanbanFilters, type KanbanFilterState } from '@/components/kanban/KanbanFilters';
import { KanbanCard } from '@/components/kanban/KanbanCard';
import { useToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// Notifications hook — counts pending approvals + change requests per project
// ---------------------------------------------------------------------------

interface ProjectNotificationCounts {
  pendingApprovals: number;
  changeRequests: number;
}

function useProjectNotifications(projectIds: string[]) {
  return useQuery({
    queryKey: ['projectNotifications', projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return {};

      const { data, error } = await supabase
        .from('updates')
        .select('project_id, is_deliverable, is_approved, change_request_text')
        .in('project_id', projectIds);

      if (error) throw error;

      const map: Record<string, ProjectNotificationCounts> = {};
      for (const id of projectIds) {
        map[id] = { pendingApprovals: 0, changeRequests: 0 };
      }

      for (const row of data || []) {
        if (!map[row.project_id]) continue;
        if (row.is_deliverable && row.is_approved === null) {
          map[row.project_id].pendingApprovals++;
        }
        if (row.is_deliverable && row.is_approved === false && row.change_request_text) {
          map[row.project_id].changeRequests++;
        }
      }

      return map;
    },
    enabled: projectIds.length > 0,
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const DEFAULT_FILTERS: KanbanFilterState = {
  client: 'all',
  phase: 'all',
  type: 'all',
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
  const { data: allProjects = [], isLoading: projectsLoading } = useProjects({
    includeCompleted: true,
  });
  const { data: companies = [] } = useCompanies({ filter: 'all' });
  const { data: teamMembers = [] } = useTeamMembers();
  const updateProject = useUpdateProject();

  // Notification counts
  const projectIds = useMemo(() => allProjects.map((p) => p.id), [allProjects]);
  const { data: notificationsMap = {} } = useProjectNotifications(projectIds);

  // Assignee lookup
  const assigneeMap = useMemo(() => {
    const m = new Map<string, (typeof teamMembers)[number]>();
    for (const tm of teamMembers) m.set(tm.id, tm);
    return m;
  }, [teamMembers]);

  // ── Filtering ────────────────────────────────────────────────────────────

  const filteredProjects = useMemo(() => {
    let result = allProjects;

    if (filters.client !== 'all') {
      result = result.filter((p) => p.company_id === filters.client);
    }
    if (filters.phase !== 'all') {
      result = result.filter((p) => p.phase === filters.phase);
    }
    if (filters.type !== 'all') {
      result = result.filter((p) => p.project_type === filters.type);
    }
    if (filters.priority !== 'all') {
      result = result.filter((p) => p.priority === filters.priority);
    }
    if (filters.assignedTo !== 'all') {
      result = result.filter((p) => p.assigned_to === filters.assignedTo);
    }
    if (filters.blockedOnly) {
      result = result.filter((p) => p.is_blocked);
    }

    return result;
  }, [allProjects, filters]);

  // ── Column distribution ──────────────────────────────────────────────────
  // Blocked is a virtual column: is_blocked === true regardless of actual status.
  // "revision" status maps to "in_progress" column.

  const columns = useMemo(() => {
    const visibleStatuses = filters.showCompleted
      ? STATUS_ORDER
      : STATUS_ORDER.filter((s) => s !== 'complete');

    return visibleStatuses.map((status) => {
      let columnProjects;

      if (status === 'blocked') {
        columnProjects = filteredProjects.filter((p) => p.is_blocked);
      } else {
        columnProjects = filteredProjects.filter((p) => {
          if (p.is_blocked) return false; // blocked projects only appear in blocked column
          const projectStatus = p.status === 'revision' ? 'in_progress' : p.status;
          return projectStatus === status;
        });
      }

      return {
        status,
        config: STATUSES[status],
        projects: columnProjects,
      };
    });
  }, [filteredProjects, filters.showCompleted]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleBlock = (id: string, reason: string, notify: boolean) => {
    updateProject.mutate(
      { id, is_blocked: true, blocked_reason: reason },
      {
        onSuccess: () => {
          toast({ title: 'Project blocked', description: notify ? 'Client will be notified.' : undefined });
        },
      },
    );
  };

  const handleUnblock = (id: string) => {
    updateProject.mutate(
      { id, is_blocked: false, blocked_reason: null },
      {
        onSuccess: () => {
          toast({ title: 'Project unblocked' });
        },
      },
    );
  };

  const handleSendForReview = (id: string) => {
    updateProject.mutate(
      { id, status: 'review' as any },
      {
        onSuccess: () => {
          toast({ title: 'Sent for review', description: 'The client will be notified.' });
        },
      },
    );
  };

  const handleChangePhase = (id: string, phase: WorkflowPhase) => {
    updateProject.mutate(
      {
        id,
        phase: phase as any,
        phase_started_at: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          toast({ title: 'Phase updated' });
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

  if (projectsLoading) {
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
            All projects across clients
          </p>
        </div>

        {/* Filters */}
        <KanbanFilters
          filters={filters}
          onChange={setFilters}
          companies={companies}
          teamMembers={teamMembers}
          projectCount={filteredProjects.length}
        />

        {/* Board */}
        <div
          className="grid gap-3 min-h-[calc(100vh-260px)]"
          style={{
            gridTemplateColumns: `repeat(${columns.length}, minmax(240px, 1fr))`,
          }}
        >
          {columns.map(({ status, config, projects }) => {
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
                    {projects.length}
                  </Badge>
                </div>

                {/* Column body */}
                <ScrollArea className="flex-1 border border-t-0 rounded-b-lg bg-muted/20">
                  <div className="p-2 space-y-2">
                    {projects.map((project) => (
                      <KanbanCard
                        key={project.id}
                        project={project}
                        notifications={
                          notificationsMap[project.id] || {
                            pendingApprovals: 0,
                            changeRequests: 0,
                          }
                        }
                        assignee={
                          project.assigned_to
                            ? assigneeMap.get(project.assigned_to)
                            : undefined
                        }
                        onBlock={handleBlock}
                        onUnblock={handleUnblock}
                        onSendForReview={handleSendForReview}
                        onChangePhase={handleChangePhase}
                      />
                    ))}

                    {projects.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground/60 text-xs">
                        No projects
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
