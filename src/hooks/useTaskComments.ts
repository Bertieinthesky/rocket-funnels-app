import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type TaskComment = Tables<'task_comments'> & {
  author_name?: string | null;
  author_email?: string | null;
  author_avatar?: string | null;
};

export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task_comments', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const comments = data || [];
      if (comments.length === 0) return [] as TaskComment[];

      // Batch fetch author profiles
      const authorIds = [...new Set(comments.map((c) => c.author_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', authorIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p]),
      );

      return comments.map((c) => {
        const profile = profileMap.get(c.author_id);
        return {
          ...c,
          author_name: profile?.full_name || null,
          author_email: profile?.email || null,
          author_avatar: profile?.avatar_url || null,
        } as TaskComment;
      });
    },
    enabled: !!taskId,
  });
}

export function useTaskCommentCount(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task_comment_count', taskId],
    queryFn: async () => {
      if (!taskId) return 0;
      const { count, error } = await supabase
        .from('task_comments')
        .select('id', { count: 'exact', head: true })
        .eq('task_id', taskId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!taskId,
  });
}

export function useCreateTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: {
      task_id: string;
      author_id: string;
      content: string;
    }) => {
      const { data, error } = await supabase
        .from('task_comments')
        .insert(comment)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task_comments', data.task_id] });
      queryClient.invalidateQueries({ queryKey: ['task_comment_count', data.task_id] });
    },
  });
}
