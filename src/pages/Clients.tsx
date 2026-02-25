import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ClientCard } from '@/components/clients/ClientCard';
import { AddClientDialog } from '@/components/clients/AddClientDialog';
import { Search, Building2, Archive, Power, PowerOff } from 'lucide-react';

type LifecycleFilter = 'active' | 'inactive' | 'archived';
type RetainerFilter = 'all' | 'retainer' | 'one_time';

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  retainer_type: 'unlimited' | 'hourly' | 'one_time';
  hours_allocated: number | null;
  hours_used: number | null;
  max_concurrent_projects: number | null;
  billing_email: string | null;
  payment_schedule: string | null;
  is_active: boolean;
  archived_at: string | null;
  project_count?: number;
  active_projects?: number;
  queued_projects?: number;
  action_items_for_us?: number;
  action_items_for_client?: number;
}

export default function Clients() {
  const { isTeam, isAdmin } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lifecycle, setLifecycle] = useState<LifecycleFilter>('active');
  const [retainerFilter, setRetainerFilter] = useState<RetainerFilter>('all');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data: companiesData, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;

      // Fetch project counts for each company
      const companiesWithProjects = await Promise.all(
        (companiesData || []).map(async (company) => {
          const { count: totalCount } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);

          const { count: activeCount } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .in('status', ['in_progress', 'revision', 'review']);

          const { count: queuedCount } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .eq('status', 'queued');

          // Fetch action items for us (team) - files flagged for team
          const { count: actionItemsForUs } = await supabase
            .from('file_flags')
            .select('*, files!inner(company_id)', { count: 'exact', head: true })
            .eq('files.company_id', company.id)
            .eq('flagged_for', 'team')
            .eq('resolved', false);

          // Fetch action items for client - files flagged for client
          const { count: actionItemsForClient } = await supabase
            .from('file_flags')
            .select('*, files!inner(company_id)', { count: 'exact', head: true })
            .eq('files.company_id', company.id)
            .eq('flagged_for', 'client')
            .eq('resolved', false);

          return {
            ...company,
            project_count: totalCount || 0,
            active_projects: activeCount || 0,
            queued_projects: queuedCount || 0,
            action_items_for_us: actionItemsForUs || 0,
            action_items_for_client: actionItemsForClient || 0,
          };
        })
      );

      setCompanies(companiesWithProjects as Company[]);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  // Lifecycle filter
  const lifecycleFiltered = companies.filter((company) => {
    if (lifecycle === 'active') {
      return company.is_active && !company.archived_at;
    }
    if (lifecycle === 'inactive') {
      return !company.is_active && !company.archived_at;
    }
    if (lifecycle === 'archived') {
      return !!company.archived_at;
    }
    return true;
  });

  // Search + retainer filter
  const filteredCompanies = lifecycleFiltered.filter((company) => {
    const matchesSearch = company.name.toLowerCase().includes(search.toLowerCase());
    const matchesRetainer =
      retainerFilter === 'all'
        ? true
        : retainerFilter === 'retainer'
          ? company.retainer_type === 'hourly' || company.retainer_type === 'unlimited'
          : company.retainer_type === 'one_time';
    return matchesSearch && matchesRetainer;
  });

  // Counts for lifecycle tabs
  const activeCount = companies.filter((c) => c.is_active && !c.archived_at).length;
  const inactiveCount = companies.filter((c) => !c.is_active && !c.archived_at).length;
  const archivedCount = companies.filter((c) => !!c.archived_at).length;

  if (!isTeam && !isAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">You don't have access to this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Clients</h1>
            <p className="text-sm text-muted-foreground">Manage your client accounts</p>
          </div>
          {isAdmin && <AddClientDialog />}
        </div>

        {/* Lifecycle tabs */}
        <div className="flex items-center gap-1 border-b">
          <button
            onClick={() => setLifecycle('active')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              lifecycle === 'active'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            Active
            {activeCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {activeCount}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setLifecycle('inactive')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              lifecycle === 'inactive'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <PowerOff className="h-3.5 w-3.5" />
            Inactive
            {inactiveCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {inactiveCount}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setLifecycle('archived')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              lifecycle === 'archived'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Archive className="h-3.5 w-3.5" />
            Archived
            {archivedCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {archivedCount}
              </Badge>
            )}
          </button>
        </div>

        {/* Search + retainer filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={retainerFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRetainerFilter('all')}
            >
              All
            </Button>
            <Button
              variant={retainerFilter === 'retainer' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRetainerFilter('retainer')}
            >
              Retainer
            </Button>
            <Button
              variant={retainerFilter === 'one_time' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRetainerFilter('one_time')}
            >
              One-Time
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="h-14 w-14 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 bg-muted rounded" />
                      <div className="h-5 w-20 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-24 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCompanies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {search
                  ? 'No clients found matching your search.'
                  : lifecycle === 'archived'
                    ? 'No archived clients.'
                    : lifecycle === 'inactive'
                      ? 'No inactive clients.'
                      : 'No active clients yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies.map((company) => (
              <ClientCard
                key={company.id}
                id={company.id}
                name={company.name}
                logo_url={company.logo_url}
                retainer_type={company.retainer_type}
                hours_allocated={company.hours_allocated}
                hours_used={company.hours_used}
                active_projects={company.active_projects || 0}
                queued_projects={company.queued_projects || 0}
                action_items_for_us={company.action_items_for_us || 0}
                action_items_for_client={company.action_items_for_client || 0}
                payment_schedule={company.payment_schedule}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
