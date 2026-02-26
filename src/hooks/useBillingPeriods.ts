import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type BillingStatus = 'under_review' | 'invoice_sent' | 'follow_up' | 'paid';

export interface BillingPeriodStatus {
  id: string;
  company_id: string;
  period_key: string;
  period_start: string;
  period_end: string;
  period_label: string;
  hours_allocated: number | null;
  hourly_rate: number | null;
  status: BillingStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useBillingPeriods(companyId: string | undefined) {
  return useQuery({
    queryKey: ['billing_periods', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('billing_period_statuses' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('period_start', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as BillingPeriodStatus[];
    },
    enabled: !!companyId,
  });
}

export function useUpsertBillingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: {
      company_id: string;
      period_key: string;
      period_start: string;
      period_end: string;
      period_label: string;
      hours_allocated?: number | null;
      hourly_rate?: number | null;
      status: BillingStatus;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('billing_period_statuses' as any)
        .upsert(
          {
            ...record,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'company_id,period_key' },
        )
        .select()
        .single();

      if (error) throw error;
      return data as unknown as BillingPeriodStatus;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['billing_periods', variables.company_id],
      });
    },
  });
}
