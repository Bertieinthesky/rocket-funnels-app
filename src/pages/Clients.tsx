import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Building2, Clock, FolderKanban, Plus } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  retainer_type: string;
  hours_allocated: number | null;
  hours_used: number | null;
  max_concurrent_projects: number | null;
  billing_email: string | null;
  project_count?: number;
  active_projects?: number;
}

export default function Clients() {
  const { isTeam, isAdmin } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

          return {
            ...company,
            project_count: totalCount || 0,
            active_projects: activeCount || 0,
          };
        })
      );

      setCompanies(companiesWithProjects);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

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
            <p className="text-muted-foreground">Manage your client companies</p>
          </div>
          {isAdmin && (
            <Button asChild>
              <Link to="/clients/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Link>
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 max-w-sm"
          />
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="h-5 w-32 bg-muted rounded" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : filteredCompanies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {search ? 'No companies found matching your search.' : 'No companies yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies.map((company) => (
              <Link key={company.id} to={`/clients/${company.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={company.logo_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(company.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{company.name}</CardTitle>
                        <CardDescription className="truncate">
                          {company.billing_email || 'No billing email'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <FolderKanban className="h-4 w-4 text-muted-foreground" />
                        <span>{company.active_projects} active</span>
                      </div>
                      {company.retainer_type === 'hourly' && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{company.hours_used || 0}/{company.hours_allocated || 0}h</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                      <Badge variant={company.retainer_type === 'unlimited' ? 'default' : 'secondary'}>
                        {company.retainer_type === 'unlimited' ? 'Unlimited' : 'Hourly'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}