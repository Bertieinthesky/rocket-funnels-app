import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FolderKanban,
  Building2,
  Ban,
  Eye,
} from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useCompanies } from '@/hooks/useCompanies';
import { useActionItems } from '@/hooks/useActionItems';
import { StatsRow, type StatItem } from './StatsRow';
import { ActionItemsWidget } from './ActionItemsWidget';
import { ClientHealthCard } from './ClientHealthCard';

export function AdminDashboard() {
  const { data: projects = [] } = useProjects({ includeCompleted: true });
  const { data: companies = [] } = useCompanies({ filter: 'active' });
  const { data: actionItems = [], isLoading: actionItemsLoading } = useActionItems({
    forRole: 'team',
  });

  // Derived stats
  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== 'complete'),
    [projects],
  );
  const blockedProjects = useMemo(
    () => projects.filter((p) => p.is_blocked),
    [projects],
  );
  const reviewProjects = useMemo(
    () => projects.filter((p) => p.status === 'review'),
    [projects],
  );

  // Per-company project counts
  const companyProjectCounts = useMemo(() => {
    const map = new Map<
      string,
      { active: number; queued: number; actionItems: number }
    >();

    for (const c of companies) {
      map.set(c.id, { active: 0, queued: 0, actionItems: 0 });
    }

    for (const p of projects) {
      const entry = map.get(p.company_id);
      if (!entry) continue;
      if (p.status === 'queued') entry.queued++;
      else if (p.status !== 'complete') entry.active++;
    }

    for (const ai of actionItems) {
      if (ai.company_id) {
        const entry = map.get(ai.company_id);
        if (entry) entry.actionItems++;
      }
    }

    return map;
  }, [companies, projects, actionItems]);

  const stats: StatItem[] = [
    {
      label: 'Active Campaigns',
      value: activeProjects.length,
      icon: FolderKanban,
    },
    {
      label: 'Active Clients',
      value: companies.length,
      icon: Building2,
    },
    {
      label: 'Blocked',
      value: blockedProjects.length,
      icon: Ban,
      accent: blockedProjects.length > 0 ? 'destructive' : 'default',
    },
    {
      label: 'In Review',
      value: reviewProjects.length,
      icon: Eye,
      accent: reviewProjects.length > 0 ? 'warning' : 'default',
    },
  ];

  return (
    <div className="space-y-5">
      <StatsRow stats={stats} />

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Action Items — wider column */}
        <div className="lg:col-span-2">
          <ActionItemsWidget
            items={actionItems}
            isLoading={actionItemsLoading}
          />
        </div>

        {/* Client Health Grid */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Client Health</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {companies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/60 text-xs">
                  No active clients
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {companies.map((company) => {
                    const counts = companyProjectCounts.get(company.id) || {
                      active: 0,
                      queued: 0,
                      actionItems: 0,
                    };
                    return (
                      <ClientHealthCard
                        key={company.id}
                        company={company}
                        activeProjects={counts.active}
                        queuedProjects={counts.queued}
                        actionItemCount={counts.actionItems}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
