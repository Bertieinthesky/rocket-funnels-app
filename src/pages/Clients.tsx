import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ClientCard } from '@/components/clients/ClientCard';
import { Search, Building2, Plus } from 'lucide-react';

type FilterType = 'all' | 'retainer' | 'one_time';

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  retainer_type: 'unlimited' | 'hourly' | 'one_time';
  hours_allocated: number | null;
  hours_used: number | null;
  max_concurrent_projects: number | null;
  billing_email: string | null;
  project_count?: number;
  active_projects?: number;
  action_items_for_us?: number;
  action_items_for_client?: number;
}

export default function Clients() {
  const { isTeam, isAdmin } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

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
            .in('status', ['queued', 'in_progress', 'revision', 'review']);

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

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' 
      ? true 
      : filter === 'retainer' 
        ? company.retainer_type === 'hourly' || company.retainer_type === 'unlimited'
        : company.retainer_type === 'one_time';
    return matchesSearch && matchesFilter;
  });

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
            <h1 className="text-3xl font-bold">Clients</h1>
            <p className="text-muted-foreground">Manage your client accounts</p>
          </div>
          {isAdmin && (
            <Button asChild>
              <Link to="/clients/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Link>
            </Button>
          )}
        </div>

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
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'retainer' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('retainer')}
            >
              Retainer
            </Button>
            <Button
              variant={filter === 'one_time' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('one_time')}
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
                {search ? 'No clients found matching your search.' : 'No clients yet.'}
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
                project_count={company.project_count || 0}
                action_items_for_us={company.action_items_for_us || 0}
                action_items_for_client={company.action_items_for_client || 0}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}