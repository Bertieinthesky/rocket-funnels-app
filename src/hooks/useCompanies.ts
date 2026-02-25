import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesUpdate } from '@/integrations/supabase/types';

export type Company = Tables<'companies'>;

export interface CompanyWithStats extends Company {
  active_projects: number;
  queued_projects: number;
  team_action_items: number;
  client_action_items: number;
}

interface UseCompaniesOptions {
  filter?: 'active' | 'inactive' | 'archived' | 'all';
}

export function useCompanies(options: UseCompaniesOptions = {}) {
  const filter = options.filter || 'active';

  return useQuery({
    queryKey: ['companies', filter],
    queryFn: async () => {
      let query = supabase.from('companies').select('*').order('name');

      if (filter === 'active') {
        query = query.eq('is_active', true).is('archived_at', null);
      } else if (filter === 'inactive') {
        query = query.eq('is_active', false).is('archived_at', null);
      } else if (filter === 'archived') {
        query = query.not('archived_at', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      if (!id) throw new Error('No company ID');
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCompanyWithStats(id: string | undefined) {
  return useQuery({
    queryKey: ['company', id, 'stats'],
    queryFn: async () => {
      if (!id) throw new Error('No company ID');

      const [companyRes, projectsRes, flagsForTeamRes, flagsForClientRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', id).single(),
        supabase.from('projects').select('id, status').eq('company_id', id),
        supabase.from('file_flags').select('id', { count: 'exact', head: true })
          .eq('flagged_for', 'team').eq('resolved', false)
          .in('file_id', (
            supabase.from('files').select('id').eq('company_id', id) as any
          )),
        supabase.from('file_flags').select('id', { count: 'exact', head: true })
          .eq('flagged_for', 'client').eq('resolved', false)
          .in('file_id', (
            supabase.from('files').select('id').eq('company_id', id) as any
          )),
      ]);

      if (companyRes.error) throw companyRes.error;

      const projects = projectsRes.data || [];
      const activeStatuses = ['in_progress', 'revision', 'review'];

      return {
        ...companyRes.data,
        active_projects: projects.filter(p => activeStatuses.includes(p.status)).length,
        queued_projects: projects.filter(p => p.status === 'queued').length,
        team_action_items: flagsForTeamRes.count || 0,
        client_action_items: flagsForClientRes.count || 0,
      } as CompanyWithStats;
    },
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (company: {
      name: string;
      retainer_type: 'unlimited' | 'hourly' | 'one_time';
      contact_email?: string;
      billing_email?: string;
      poc_name?: string;
      company_website?: string;
      hours_allocated?: number;
      hourly_rate?: number;
      payment_schedule?: string;
    }) => {
      const { data, error } = await supabase
        .from('companies')
        .insert(company)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'companies'> & { id: string }) => {
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company', data.id] });
    },
  });
}
