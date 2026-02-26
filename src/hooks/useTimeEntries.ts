import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type TimeEntry = Tables<'time_entries'> & {
  user_name?: string | null;
  user_email?: string | null;
  project_name?: string | null;
  task_title?: string | null;
  company_name?: string | null;
};

interface UseTimeEntriesOptions {
  companyId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  fetchAll?: boolean;
}

export function useTimeEntries(options: UseTimeEntriesOptions = {}) {
  return useQuery({
    queryKey: ['time_entries', options],
    queryFn: async () => {
      let query = supabase
        .from('time_entries')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (options.companyId) {
        query = query.eq('company_id', options.companyId);
      }
      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }
      if (options.startDate) {
        query = query.gte('date', options.startDate);
      }
      if (options.endDate) {
        query = query.lte('date', options.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      const entries = data || [];
      if (entries.length === 0) return [] as TimeEntry[];

      // Batch fetch user profiles
      const userIds = [...new Set(entries.map((e) => e.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p]),
      );

      // Batch fetch project names
      const projectIds = [
        ...new Set(entries.filter((e) => e.project_id).map((e) => e.project_id!)),
      ];
      let projectMap = new Map<string, string>();
      if (projectIds.length > 0) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds);
        projectMap = new Map((projects || []).map((p) => [p.id, p.name]));
      }

      // Batch fetch task titles
      const taskIds = [
        ...new Set(entries.filter((e) => e.task_id).map((e) => e.task_id!)),
      ];
      let taskMap = new Map<string, string>();
      if (taskIds.length > 0) {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, title')
          .in('id', taskIds);
        taskMap = new Map((tasks || []).map((t) => [t.id, t.title]));
      }

      // Batch fetch company names
      const companyIds = [
        ...new Set(entries.map((e) => e.company_id)),
      ];
      let companyMap = new Map<string, string>();
      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', companyIds);
        companyMap = new Map((companies || []).map((c) => [c.id, c.name]));
      }

      return entries.map((entry) => {
        const profile = profileMap.get(entry.user_id);
        return {
          ...entry,
          user_name: profile?.full_name || null,
          user_email: profile?.email || null,
          project_name: entry.project_id
            ? projectMap.get(entry.project_id) || null
            : null,
          task_title: entry.task_id ? taskMap.get(entry.task_id) || null : null,
          company_name: companyMap.get(entry.company_id) || null,
        } as TimeEntry;
      });
    },
    enabled: options.fetchAll || !!options.companyId || !!options.userId,
  });
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      company_id: string;
      user_id: string;
      hours: number;
      date: string;
      description?: string;
      project_id?: string | null;
      task_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('time_entries')
        .insert(entry)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time_entries'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
  });
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('time_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time_entries'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
  });
}

export function useCreateBatchTimeEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entries: Array<{
      company_id: string;
      user_id: string;
      hours: number;
      date: string;
      description?: string;
      project_id?: string | null;
      task_id?: string | null;
      is_deliverable?: boolean;
      deliverable_link?: string | null;
      deliverable_link_type?: string | null;
      review_type?: string | null;
    }>) => {
      const { data, error } = await supabase
        .from('time_entries')
        .insert(entries)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time_entries'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
  });
}
