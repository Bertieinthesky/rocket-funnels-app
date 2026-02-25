import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Task = Tables<'tasks'> & {
  project_name?: string;
  company_name?: string;
  company_id?: string;
  assignee_name?: string;
};

interface UseTasksOptions {
  projectId?: string;
  assignedTo?: string;
  status?: string;
  includeDone?: boolean;
}

export function useTasks(options: UseTasksOptions = {}) {
  return useQuery({
    queryKey: ['tasks', options],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (options.projectId) {
        query = query.eq('project_id', options.projectId);
      }
      if (options.assignedTo) {
        query = query.eq('assigned_to', options.assignedTo);
      }
      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (!options.includeDone) {
        query = query.neq('status', 'done');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch project + company info in batch
      const projectIds = [...new Set((data || []).map(t => t.project_id))];
      if (projectIds.length === 0) return (data || []) as Task[];

      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, company_id')
        .in('id', projectIds);

      const projectMap = new Map(projects?.map(p => [p.id, p]));

      // Fetch company names
      const companyIds = [...new Set(projects?.map(p => p.company_id) || [])];
      const { data: companies } = companyIds.length > 0
        ? await supabase.from('companies').select('id, name').in('id', companyIds)
        : { data: [] };
      const companyMap = new Map(companies?.map(c => [c.id, c.name]));

      // Fetch assignee names
      const assigneeIds = [...new Set((data || []).map(t => t.assigned_to).filter(Boolean) as string[])];
      const { data: profiles } = assigneeIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, email').in('id', assigneeIds)
        : { data: [] };
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name || p.email || 'Team Member']));

      return (data || []).map(task => {
        const project = projectMap.get(task.project_id);
        return {
          ...task,
          project_name: project?.name || 'Unknown',
          company_id: project?.company_id,
          company_name: project?.company_id ? companyMap.get(project.company_id) || 'Unknown' : 'Unknown',
          assignee_name: task.assigned_to ? profileMap.get(task.assigned_to) || undefined : undefined,
        } as Task;
      });
    },
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      if (!id) throw new Error('No task ID');
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: TablesInsert<'tasks'>) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'tasks'> & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
