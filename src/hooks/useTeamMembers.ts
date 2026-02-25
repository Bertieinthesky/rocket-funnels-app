import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ['teamMembers'],
    queryFn: async () => {
      // Get all users with team or admin roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['team', 'admin']);

      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];

      const userIds = [...new Set(roles.map(r => r.user_id))];
      const roleMap = new Map<string, string>();
      // Use highest privilege role
      for (const r of roles) {
        const current = roleMap.get(r.user_id);
        if (!current || r.role === 'admin') {
          roleMap.set(r.user_id, r.role);
        }
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      return (profiles || []).map(p => ({
        ...p,
        role: roleMap.get(p.id) || 'team',
      })) as TeamMember[];
    },
  });
}
