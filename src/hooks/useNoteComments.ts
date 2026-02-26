import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type NoteComment = Tables<'note_comments'> & {
  author_name?: string | null;
  author_email?: string | null;
  author_avatar?: string | null;
};

export function useNoteComments(noteId: string | undefined) {
  return useQuery({
    queryKey: ['note_comments', noteId],
    queryFn: async () => {
      if (!noteId) return [];

      const { data, error } = await supabase
        .from('note_comments')
        .select('*')
        .eq('note_id', noteId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const comments = data || [];
      if (comments.length === 0) return [] as NoteComment[];

      const authorIds = [...new Set(comments.map(c => c.author_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', authorIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.id, p]),
      );

      return comments.map(c => {
        const profile = profileMap.get(c.author_id);
        return {
          ...c,
          author_name: profile?.full_name || null,
          author_email: profile?.email || null,
          author_avatar: profile?.avatar_url || null,
        } as NoteComment;
      });
    },
    enabled: !!noteId,
  });
}

export function useNoteCommentCount(noteId: string | undefined) {
  return useQuery({
    queryKey: ['note_comment_count', noteId],
    queryFn: async () => {
      if (!noteId) return 0;
      const { count, error } = await supabase
        .from('note_comments')
        .select('id', { count: 'exact', head: true })
        .eq('note_id', noteId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!noteId,
  });
}

export function useCreateNoteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: {
      note_id: string;
      author_id: string;
      content: string;
    }) => {
      const { data, error } = await supabase
        .from('note_comments')
        .insert(comment)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['note_comments', data.note_id] });
      queryClient.invalidateQueries({ queryKey: ['note_comment_count', data.note_id] });
    },
  });
}
