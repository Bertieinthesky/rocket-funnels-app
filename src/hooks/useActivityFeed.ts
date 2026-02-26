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
  | 'deliverable_approved'
  | 'hours_logged'
  | 'file_uploaded'
  | 'credential_added'
  | 'note_added';

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
        timeEntriesRes,
        fileUploadsRes,
        credentialsRes,
        notesRes,
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

        // 9. Time entries (hours logged)
        supabase
          .from('time_entries')
          .select('id, hours, description, date, created_at, user_id, project_id, company_id')
          .eq('company_id', companyId)
          .gte('created_at', cutoffISO)
          .order('created_at', { ascending: false }),

        // 10. File uploads
        supabase
          .from('files')
          .select('id, name, title, uploaded_by, company_id, project_id, created_at')
          .eq('company_id', companyId)
          .gte('created_at', cutoffISO)
          .order('created_at', { ascending: false }),

        // 11. Credentials added
        supabase
          .from('company_credentials')
          .select('id, label, created_by, created_at')
          .eq('company_id', companyId)
          .gte('created_at', cutoffISO)
          .order('created_at', { ascending: false }),

        // 12. Notes added
        supabase
          .from('client_notes')
          .select('id, content, category, created_by, created_at')
          .eq('company_id', companyId)
          .gte('created_at', cutoffISO)
          .order('created_at', { ascending: false }),
      ]);

      // Batch fetch author profiles for all sources
      const companyUpdates = companyUpdatesRes.data || [];
      const allAuthorIds = new Set<string>(companyUpdates.map(u => u.author_id));
      for (const e of timeEntriesRes.data || []) { if (e.user_id) allAuthorIds.add(e.user_id); }
      for (const f of fileUploadsRes.data || []) { if (f.uploaded_by) allAuthorIds.add(f.uploaded_by); }
      for (const c of credentialsRes.data || []) { if (c.created_by) allAuthorIds.add(c.created_by); }
      for (const n of notesRes.data || []) { if (n.created_by) allAuthorIds.add(n.created_by); }

      let profileMap = new Map<string, { full_name: string | null }>();
      const authorIdArr = [...allAuthorIds];
      if (authorIdArr.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', authorIdArr);
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

      // 9. Time entries (hours logged)
      if (timeEntriesRes.data) {
        // Batch fetch project names for time entries
        const teProjectIds = [...new Set(
          timeEntriesRes.data.map(t => t.project_id).filter(Boolean) as string[]
        )];
        let teProjectMap = new Map<string, string>();
        if (teProjectIds.length > 0) {
          const { data: teProjects } = await supabase
            .from('projects')
            .select('id, name')
            .in('id', teProjectIds);
          teProjectMap = new Map((teProjects || []).map(p => [p.id, p.name]));
        }

        for (const entry of timeEntriesRes.data) {
          const profile = profileMap.get(entry.user_id);
          items.push({
            id: `time-${entry.id}`,
            type: 'hours_logged',
            title: `${profile?.full_name || 'Team member'} logged ${entry.hours}h`,
            description: entry.description || `${entry.hours} hours logged`,
            author_name: profile?.full_name || undefined,
            project_id: entry.project_id || undefined,
            project_name: entry.project_id ? teProjectMap.get(entry.project_id) : undefined,
            company_id: companyId,
            created_at: entry.created_at,
            raw: entry,
          });
        }
      }

      // 10. File uploads
      if (fileUploadsRes.data) {
        for (const file of fileUploadsRes.data) {
          const profile = file.uploaded_by ? profileMap.get(file.uploaded_by) : undefined;
          items.push({
            id: `file-upload-${file.id}`,
            type: 'file_uploaded',
            title: `${profile?.full_name || 'Team member'} uploaded a file`,
            description: file.title || file.name,
            author_name: profile?.full_name || undefined,
            file_id: file.id,
            file_name: file.title || file.name,
            project_id: file.project_id || undefined,
            company_id: companyId,
            created_at: file.created_at,
            raw: file,
          });
        }
      }

      // 11. Credentials added
      if (credentialsRes.data) {
        for (const cred of credentialsRes.data) {
          const profile = cred.created_by ? profileMap.get(cred.created_by) : undefined;
          items.push({
            id: `cred-${cred.id}`,
            type: 'credential_added',
            title: `${profile?.full_name || 'Team member'} added a credential`,
            description: cred.label,
            author_name: profile?.full_name || undefined,
            company_id: companyId,
            created_at: cred.created_at,
            raw: cred,
          });
        }
      }

      // 12. Notes added
      if (notesRes.data) {
        for (const note of notesRes.data) {
          const profile = note.created_by ? profileMap.get(note.created_by) : undefined;
          items.push({
            id: `note-${note.id}`,
            type: 'note_added',
            title: `${profile?.full_name || 'Team member'} added a note`,
            description: note.content.slice(0, 200),
            author_name: profile?.full_name || undefined,
            company_id: companyId,
            created_at: note.created_at,
            raw: note,
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
