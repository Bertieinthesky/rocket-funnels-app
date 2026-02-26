import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type CompanyUpdate = Tables<'company_updates'> & {
  author_name?: string | null;
  author_email?: string | null;
};

export function useCompanyUpdates(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company_updates', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('company_updates')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const authorIds = [...new Set(
        (data || []).map(u => u.author_id).filter(Boolean) as string[]
      )];

      if (authorIds.length === 0) return (data || []) as CompanyUpdate[];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', authorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]));

      return (data || []).map(update => {
        const profile = profileMap.get(update.author_id);
        return {
          ...update,
          author_name: profile?.full_name || null,
          author_email: profile?.email || null,
        };
      }) as CompanyUpdate[];
    },
    enabled: !!companyId,
  });
}

export function useCreateCompanyUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update: { company_id: string; author_id: string; content: string }) => {
      const { data, error } = await supabase
        .from('company_updates')
        .insert(update)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company_updates', data.company_id] });
      queryClient.invalidateQueries({ queryKey: ['activity_feed'] });
    },
  });
}
