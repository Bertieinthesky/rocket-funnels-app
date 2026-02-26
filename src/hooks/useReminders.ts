import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Reminder = Tables<'reminders'> & {
  author_name?: string | null;
};

export function useReminders(companyId: string | undefined) {
  return useQuery({
    queryKey: ['reminders', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_completed', false)
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map((r) => r.user_id))];
      if (userIds.length === 0) return (data || []) as Reminder[];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      return (data || []).map((r) => ({
        ...r,
        author_name: profileMap.get(r.user_id)?.full_name || null,
      })) as Reminder[];
    },
    enabled: !!companyId,
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminder: TablesInsert<'reminders'>) => {
      const { data, error } = await supabase
        .from('reminders')
        .insert(reminder)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reminders', data.company_id] });
    },
  });
}

export function useCompleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      const { error } = await supabase
        .from('reminders')
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { companyId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reminders', data.companyId] });
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { companyId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reminders', data.companyId] });
    },
  });
}
