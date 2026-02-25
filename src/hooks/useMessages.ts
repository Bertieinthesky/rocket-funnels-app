import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Message = Tables<'messages'> & {
  author_name?: string | null;
  author_email?: string | null;
  author_avatar_url?: string | null;
};

interface UseMessagesOptions {
  projectId: string | undefined;
  isInternal?: boolean;
}

export function useMessages({ projectId, isInternal }: UseMessagesOptions) {
  return useQuery({
    queryKey: ['messages', projectId, isInternal],
    queryFn: async () => {
      if (!projectId) return [];

      let query = supabase
        .from('messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (isInternal !== undefined) {
        query = query.eq('is_internal', isInternal);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch author profiles in batch
      const authorIds = [...new Set((data || []).map(m => m.author_id))];
      if (authorIds.length === 0) return data || [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', authorIds);

      const profileMap = new Map(
        profiles?.map(p => [p.id, p])
      );

      return (data || []).map(message => {
        const profile = profileMap.get(message.author_id);
        return {
          ...message,
          author_name: profile?.full_name || null,
          author_email: profile?.email || null,
          author_avatar_url: profile?.avatar_url || null,
        };
      });
    },
    enabled: !!projectId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: TablesInsert<'messages'>) => {
      const { data, error } = await supabase
        .from('messages')
        .insert(message)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['messages', data.project_id] });
    },
  });
}
