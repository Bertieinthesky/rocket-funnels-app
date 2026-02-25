import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Update = Tables<'updates'> & {
  author_name?: string | null;
  author_email?: string | null;
};

export function useUpdates(projectId: string | undefined) {
  return useQuery({
    queryKey: ['updates', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('updates')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch author profiles in batch
      const authorIds = [...new Set(
        (data || []).map(u => u.author_id).filter(Boolean) as string[]
      )];

      if (authorIds.length === 0) return data || [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', authorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]));

      return (data || []).map(update => {
        const profile = update.author_id ? profileMap.get(update.author_id) : null;
        return {
          ...update,
          author_name: profile?.full_name || null,
          author_email: profile?.email || null,
        };
      });
    },
    enabled: !!projectId,
  });
}

export function useCreateUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update: TablesInsert<'updates'>) => {
      const { data, error } = await supabase
        .from('updates')
        .insert(update)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['updates', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['actionItems'] });
    },
  });
}

export function useUpdateUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'updates'> & { id: string }) => {
      const { data, error } = await supabase
        .from('updates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['updates', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['actionItems'] });
    },
  });
}
