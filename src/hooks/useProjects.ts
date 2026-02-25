import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Project = Tables<'projects'> & {
  company_name?: string;
};

interface UseProjectsOptions {
  companyId?: string;
  status?: string;
  assignedTo?: string;
  includeCompleted?: boolean;
}

export function useProjects(options: UseProjectsOptions = {}) {
  return useQuery({
    queryKey: ['projects', options],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (options.companyId) {
        query = query.eq('company_id', options.companyId);
      }
      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.assignedTo) {
        query = query.eq('assigned_to', options.assignedTo);
      }
      if (!options.includeCompleted) {
        query = query.neq('status', 'complete');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch company names in batch
      const companyIds = [...new Set((data || []).map(p => p.company_id))];
      if (companyIds.length === 0) return data || [];

      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds);

      const companyMap = new Map(companies?.map(c => [c.id, c.name]));

      return (data || []).map(project => ({
        ...project,
        company_name: companyMap.get(project.company_id) || 'Unknown',
      }));
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      if (!id) throw new Error('No project ID');
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'projects'> & { id: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.id] });
      queryClient.invalidateQueries({ queryKey: ['actionItems'] });
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project: TablesInsert<'projects'>) => {
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
