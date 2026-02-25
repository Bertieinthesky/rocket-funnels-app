import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type File = Tables<'files'>;
export type FileFlag = Tables<'file_flags'>;

interface UseFilesOptions {
  companyId?: string;
  projectId?: string;
  category?: string;
}

export function useFiles(options: UseFilesOptions = {}) {
  return useQuery({
    queryKey: ['files', options],
    queryFn: async () => {
      let query = supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });

      if (options.companyId) {
        query = query.eq('company_id', options.companyId);
      }
      if (options.projectId) {
        query = query.eq('project_id', options.projectId);
      }
      if (options.category && options.category !== 'all') {
        query = query.eq('category', options.category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useFileFlags(fileIds: string[]) {
  return useQuery({
    queryKey: ['fileFlags', fileIds],
    queryFn: async () => {
      if (fileIds.length === 0) return [];
      const { data, error } = await supabase
        .from('file_flags')
        .select('*')
        .in('file_id', fileIds)
        .eq('resolved', false);
      if (error) throw error;
      return data || [];
    },
    enabled: fileIds.length > 0,
  });
}

export function useCreateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: TablesInsert<'files'>) => {
      const { data, error } = await supabase
        .from('files')
        .insert(file)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useUpdateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'files'> & { id: string }) => {
      const { data, error } = await supabase
        .from('files')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}
