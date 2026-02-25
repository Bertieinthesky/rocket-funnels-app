import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ActionItem {
  id: string;
  type: 'change_request' | 'file_flag' | 'project_blocked' | 'deliverable_review';
  title: string;
  description: string;
  project_id?: string;
  project_name?: string;
  company_id?: string;
  company_name?: string;
  file_id?: string;
  priority: string;
  created_at: string;
}

interface UseActionItemsOptions {
  companyId?: string;
  forRole?: 'team' | 'client';
}

export function useActionItems(options: UseActionItemsOptions = {}) {
  const { user, isClient } = useAuth();
  const forRole = options.forRole || (isClient ? 'client' : 'team');

  return useQuery({
    queryKey: ['actionItems', options.companyId, forRole],
    queryFn: async () => {
      const items: ActionItem[] = [];

      if (forRole === 'team') {
        // Items needing team attention
        // 1. Change requests from clients
        let updatesQuery = supabase
          .from('updates')
          .select('id, project_id, change_request_text, change_request_submitted_at, created_at')
          .eq('is_deliverable', true)
          .eq('is_approved', false)
          .not('change_request_text', 'is', null)
          .eq('change_request_draft', false);

        const { data: changeRequests } = await updatesQuery;

        // Get project names for change requests
        const projectIds = [...new Set((changeRequests || []).map(cr => cr.project_id))];
        let projectMap = new Map<string, { name: string; company_id: string; priority: string }>();

        if (projectIds.length > 0) {
          const { data: projects } = await supabase
            .from('projects')
            .select('id, name, company_id, priority')
            .in('id', projectIds);
          projectMap = new Map(projects?.map(p => [p.id, { name: p.name, company_id: p.company_id, priority: p.priority || 'normal' }]));
        }

        for (const cr of changeRequests || []) {
          const project = projectMap.get(cr.project_id);
          if (options.companyId && project?.company_id !== options.companyId) continue;

          items.push({
            id: cr.id,
            type: 'change_request',
            title: 'Change Request',
            description: cr.change_request_text || 'Client requested changes',
            project_id: cr.project_id,
            project_name: project?.name,
            company_id: project?.company_id,
            priority: project?.priority || 'normal',
            created_at: cr.change_request_submitted_at || cr.created_at,
          });
        }

        // 2. File flags for team
        let flagsQuery = supabase
          .from('file_flags')
          .select('id, file_id, flag_message, created_at')
          .eq('flagged_for', 'team')
          .eq('resolved', false);

        const { data: flags } = await flagsQuery;

        for (const flag of flags || []) {
          items.push({
            id: flag.id,
            type: 'file_flag',
            title: 'File Flagged',
            description: flag.flag_message,
            file_id: flag.file_id,
            priority: 'normal',
            created_at: flag.created_at,
          });
        }

        // 3. Blocked projects (needing team action)
        let blockedQuery = supabase
          .from('projects')
          .select('id, name, company_id, blocked_reason, priority, created_at')
          .eq('is_blocked', true);

        if (options.companyId) {
          blockedQuery = blockedQuery.eq('company_id', options.companyId);
        }

        const { data: blockedProjects } = await blockedQuery;

        for (const bp of blockedProjects || []) {
          items.push({
            id: bp.id,
            type: 'project_blocked',
            title: 'Project Blocked',
            description: bp.blocked_reason || 'Needs attention',
            project_id: bp.id,
            project_name: bp.name,
            company_id: bp.company_id,
            priority: bp.priority || 'urgent',
            created_at: bp.created_at,
          });
        }
      } else {
        // Items needing client attention
        // 1. Deliverables awaiting approval
        const userCompanyId = options.companyId;
        if (!userCompanyId) return items;

        const { data: companyProjects } = await supabase
          .from('projects')
          .select('id, name, priority')
          .eq('company_id', userCompanyId);

        const clientProjectIds = (companyProjects || []).map(p => p.id);
        if (clientProjectIds.length === 0) return items;

        const projectNameMap = new Map(companyProjects?.map(p => [p.id, p]));

        const { data: pendingDeliverables } = await supabase
          .from('updates')
          .select('id, project_id, content, created_at')
          .in('project_id', clientProjectIds)
          .eq('is_deliverable', true)
          .is('is_approved', null);

        for (const pd of pendingDeliverables || []) {
          const project = projectNameMap.get(pd.project_id);
          items.push({
            id: pd.id,
            type: 'deliverable_review',
            title: 'Review Deliverable',
            description: pd.content.slice(0, 100),
            project_id: pd.project_id,
            project_name: project?.name,
            company_id: userCompanyId,
            priority: project?.priority || 'normal',
            created_at: pd.created_at,
          });
        }

        // 2. File flags for client
        const { data: clientFlags } = await supabase
          .from('file_flags')
          .select('id, file_id, flag_message, created_at')
          .eq('flagged_for', 'client')
          .eq('resolved', false);

        for (const flag of clientFlags || []) {
          items.push({
            id: flag.id,
            type: 'file_flag',
            title: 'File Needs Review',
            description: flag.flag_message,
            file_id: flag.file_id,
            priority: 'normal',
            created_at: flag.created_at,
          });
        }
      }

      // Sort by priority then date
      const priorityOrder: Record<string, number> = { urgent: 0, important: 1, normal: 2, queued: 3 };
      items.sort((a, b) => {
        const pDiff = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
        if (pDiff !== 0) return pDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      return items;
    },
    enabled: !!user,
  });
}
