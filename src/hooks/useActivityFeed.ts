import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ActivityType =
  | 'company_update'
  | 'change_request'
  | 'file_flag'
  | 'project_blocked'
  | 'deliverable_review'
  | 'task_completed'
  | 'project_completed'
  | 'deliverable_approved';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  author_name?: string;
  project_id?: string;
  project_name?: string;
  task_id?: string;
  file_id?: string;
  file_name?: string;
  update_id?: string;
  company_id: string;
  created_at: string;
  raw?: Record<string, any>;
}

interface UseActivityFeedOptions {
  companyId: string | undefined;
  limit?: number;
  typeFilter?: ActivityType[];
  daysBack?: number;
}

export function useActivityFeed({
  companyId,
  limit,
  typeFilter,
  daysBack = 90,
}: UseActivityFeedOptions) {
  return useQuery({
    queryKey: ['activity_feed', companyId, limit, typeFilter, daysBack],
    queryFn: async () => {
      if (!companyId) return [];

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysBack);
      const cutoffISO = cutoff.toISOString();

      const items: ActivityItem[] = [];

      // Fetch all data sources in parallel
      const [
        companyUpdatesRes,
        changeRequestsRes,
        fileFlagsRes,
        blockedProjectsRes,
        pendingDeliverablesRes,
        completedTasksRes,
        completedProjectsRes,
        approvedDeliverablesRes,
      ] = await Promise.all([
        // 1. Company updates
        supabase
          .from('company_updates')
          .select('*')
          .eq('company_id', companyId)
          .gte('created_at', cutoffISO)
          .order('created_at', { ascending: false }),

        // 2. Change requests
        supabase
          .from('updates')
          .select(`
            id, change_request_text, change_request_submitted_at, project_id,
            projects!inner(id, name, company_id)
          `)
          .not('change_request_text', 'is', null)
          .not('change_request_submitted_at', 'is', null)
          .eq('change_request_draft', false),

        // 3. File flags
        supabase
          .from('files')
          .select('id, name, title')
          .eq('company_id', companyId),

        // 4. Blocked projects
        supabase
          .from('projects')
          .select('id, name, blocked_reason, updated_at')
          .eq('company_id', companyId)
          .eq('is_blocked', true),

        // 5. Deliverables pending review
        supabase
          .from('updates')
          .select(`
            id, content, created_at, project_id, deliverable_link, review_type,
            projects!inner(id, name, company_id)
          `)
          .eq('is_deliverable', true)
          .is('is_approved', null),

        // 6. Completed tasks (last N days)
        supabase
          .from('tasks')
          .select(`
            id, title, status, updated_at, project_id,
            projects!inner(id, name, company_id)
          `)
          .eq('status', 'done')
          .gte('updated_at', cutoffISO),

        // 7. Completed projects (last N days)
        supabase
          .from('projects')
          .select('id, name, updated_at')
          .eq('company_id', companyId)
          .eq('status', 'complete')
          .gte('updated_at', cutoffISO),

        // 8. Approved deliverables (last N days)
        supabase
          .from('updates')
          .select(`
            id, content, created_at, project_id, is_approved,
            projects!inner(id, name, company_id)
          `)
          .eq('is_deliverable', true)
          .eq('is_approved', true)
          .gte('created_at', cutoffISO),
      ]);

      // Batch fetch author profiles for company updates
      const companyUpdates = companyUpdatesRes.data || [];
      const authorIds = [...new Set(companyUpdates.map(u => u.author_id))];
      let profileMap = new Map<string, { full_name: string | null }>();

      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', authorIds);
        profileMap = new Map((profiles || []).map(p => [p.id, p]));
      }

      // 1. Company updates
      for (const u of companyUpdates) {
        const profile = profileMap.get(u.author_id);
        items.push({
          id: `update-${u.id}`,
          type: 'company_update',
          title: `${profile?.full_name || 'Team member'} posted an update`,
          description: u.content,
          author_name: profile?.full_name || undefined,
          company_id: companyId,
          created_at: u.created_at,
          raw: u,
        });
      }

      // 2. Change requests
      if (changeRequestsRes.data) {
        const filtered = changeRequestsRes.data.filter(
          (u: any) => u.projects?.company_id === companyId,
        );
        for (const u of filtered) {
          const proj = (u as any).projects;
          items.push({
            id: `change-${u.id}`,
            type: 'change_request',
            title: 'Change Request',
            description: u.change_request_text || '',
            project_id: u.project_id,
            project_name: proj?.name,
            update_id: u.id,
            company_id: companyId,
            created_at: u.change_request_submitted_at!,
            raw: u,
          });
        }
      }

      // 3. File flags
      if (fileFlagsRes.data && fileFlagsRes.data.length > 0) {
        const fileIds = fileFlagsRes.data.map(f => f.id);
        const { data: flags } = await supabase
          .from('file_flags')
          .select('*')
          .in('file_id', fileIds)
          .eq('resolved', false);

        if (flags) {
          for (const flag of flags) {
            const file = fileFlagsRes.data.find(f => f.id === flag.file_id);
            items.push({
              id: `flag-${flag.id}`,
              type: 'file_flag',
              title: 'File Flagged',
              description: flag.flag_message || '',
              file_id: flag.file_id,
              file_name: file?.title || file?.name,
              company_id: companyId,
              created_at: flag.created_at,
              raw: { ...flag, for_role: flag.flagged_for },
            });
          }
        }
      }

      // 4. Blocked projects
      if (blockedProjectsRes.data) {
        for (const p of blockedProjectsRes.data) {
          items.push({
            id: `blocked-${p.id}`,
            type: 'project_blocked',
            title: 'Project Blocked',
            description: p.blocked_reason || 'This project is currently blocked',
            project_id: p.id,
            project_name: p.name,
            company_id: companyId,
            created_at: p.updated_at,
            raw: p,
          });
        }
      }

      // 5. Deliverables pending review
      if (pendingDeliverablesRes.data) {
        const filtered = pendingDeliverablesRes.data.filter(
          (d: any) => d.projects?.company_id === companyId,
        );
        for (const d of filtered) {
          const proj = (d as any).projects;
          items.push({
            id: `deliverable-${d.id}`,
            type: 'deliverable_review',
            title: 'Deliverable Review',
            description: d.content || '',
            project_id: d.project_id,
            project_name: proj?.name,
            update_id: d.id,
            company_id: companyId,
            created_at: d.created_at,
            raw: d,
          });
        }
      }

      // 6. Completed tasks
      if (completedTasksRes.data) {
        const filtered = completedTasksRes.data.filter(
          (t: any) => t.projects?.company_id === companyId,
        );
        for (const t of filtered) {
          const proj = (t as any).projects;
          items.push({
            id: `task-done-${t.id}`,
            type: 'task_completed',
            title: 'Task Completed',
            description: t.title,
            project_id: t.project_id,
            project_name: proj?.name,
            task_id: t.id,
            company_id: companyId,
            created_at: t.updated_at,
            raw: t,
          });
        }
      }

      // 7. Completed projects
      if (completedProjectsRes.data) {
        for (const p of completedProjectsRes.data) {
          items.push({
            id: `project-done-${p.id}`,
            type: 'project_completed',
            title: 'Project Completed',
            description: p.name,
            project_id: p.id,
            project_name: p.name,
            company_id: companyId,
            created_at: p.updated_at,
            raw: p,
          });
        }
      }

      // 8. Approved deliverables
      if (approvedDeliverablesRes.data) {
        const filtered = approvedDeliverablesRes.data.filter(
          (d: any) => d.projects?.company_id === companyId,
        );
        for (const d of filtered) {
          const proj = (d as any).projects;
          items.push({
            id: `approved-${d.id}`,
            type: 'deliverable_approved',
            title: 'Deliverable Approved',
            description: d.content || '',
            project_id: d.project_id,
            project_name: proj?.name,
            update_id: d.id,
            company_id: companyId,
            created_at: d.created_at,
            raw: d,
          });
        }
      }

      // Sort by date (most recent first)
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Apply type filter
      let filtered = items;
      if (typeFilter && typeFilter.length > 0) {
        filtered = items.filter(item => typeFilter.includes(item.type));
      }

      // Apply limit
      if (limit) {
        return filtered.slice(0, limit);
      }

      return filtered;
    },
    enabled: !!companyId,
  });
}
