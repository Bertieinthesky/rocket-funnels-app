import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Plus,
  Upload,
  Clock,
  AlertTriangle,
  FolderKanban,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useProjects } from '@/hooks/useProjects';
import { useActionItems } from '@/hooks/useActionItems';
import { useCompany } from '@/hooks/useCompanies';
import {
  PHASES,
  STATUSES,
  type WorkflowPhase,
  type ProjectStatus,
} from '@/lib/constants';
import { ActionItemsWidget } from './ActionItemsWidget';

export function ClientDashboard() {
  const { user } = useAuth();

  // Get client's company_id from profile
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user');
      const { data, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const companyId = profile?.company_id || undefined;

  const { data: company } = useCompany(companyId);
  const { data: projects = [] } = useProjects({
    companyId,
    includeCompleted: false,
  });
  const { data: actionItems = [], isLoading: actionItemsLoading } = useActionItems({
    forRole: 'client',
    companyId,
  });

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== 'complete'),
    [projects],
  );

  // Hours tracking
  const isRetainer = company?.retainer_type === 'hourly';
  const hoursUsed = Number(company?.hours_used) || 0;
  const hoursAllocated = company?.hours_allocated || 0;
  const hoursPercentage =
    hoursAllocated > 0 ? Math.round((hoursUsed / hoursAllocated) * 100) : 0;
  const hoursOverage = hoursPercentage > 100;
  const hoursWarning = hoursPercentage >= 75;

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || '';

  return (
    <div className="space-y-5">
      {/* Welcome + Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here's what's happening with your campaigns.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/files">
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Upload Files
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/projects/new">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Request
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Left: Active Projects + Hours */}
        <div className="lg:col-span-3 space-y-4">
          {/* Hours Tracker (retainer only) */}
          {isRetainer && hoursAllocated > 0 && (
            <Card
              className={
                hoursOverage
                  ? 'border-red-300 dark:border-red-800'
                  : hoursWarning
                    ? 'border-orange-300 dark:border-orange-800'
                    : ''
              }
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Monthly Hours</span>
                  </div>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      hoursOverage
                        ? 'text-red-600 dark:text-red-400'
                        : hoursWarning
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-foreground'
                    }`}
                  >
                    {hoursUsed.toFixed(1)} / {hoursAllocated}hrs
                  </span>
                </div>
                <Progress
                  value={Math.min(hoursPercentage, 100)}
                  className={`h-2 ${
                    hoursOverage
                      ? '[&>div]:bg-red-500'
                      : hoursWarning
                        ? '[&>div]:bg-orange-500'
                        : ''
                  }`}
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    {hoursPercentage}% used
                  </span>
                  {hoursOverage && (
                    <span className="text-[10px] text-red-600 dark:text-red-400 flex items-center gap-1 font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      Overage — billed at $170-175/hr
                    </span>
                  )}
                  {hoursWarning && !hoursOverage && (
                    <span className="text-[10px] text-orange-600 dark:text-orange-400">
                      Approaching limit
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Projects */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold">Active Campaigns</CardTitle>
                <Badge variant="secondary" className="text-[10px] h-5 tabular-nums">
                  {activeProjects.length}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" asChild>
                <Link to="/projects">
                  View All <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {activeProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/60">
                  <FolderKanban className="h-8 w-8 mb-2" />
                  <p className="text-xs">No active campaigns</p>
                  <Button size="sm" className="mt-3" asChild>
                    <Link to="/projects/new">
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Submit Request
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {activeProjects.map((project) => {
                    const phase = PHASES[project.phase as WorkflowPhase] || PHASES.shaping;
                    const PhaseIcon = phase.icon;
                    const status =
                      STATUSES[
                        (project.status === 'revision'
                          ? 'in_progress'
                          : project.status) as ProjectStatus
                      ] || STATUSES.queued;
                    const StatusIcon = status.icon;

                    return (
                      <Link
                        key={project.id}
                        to={`/projects/${project.id}`}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {project.name}
                          </p>
                        </div>

                        {/* Phase badge */}
                        <Badge
                          variant="secondary"
                          className={`text-[10px] h-5 px-1.5 gap-1 font-medium shrink-0 ${phase.color}`}
                        >
                          <PhaseIcon className="h-3 w-3" />
                          {phase.label}
                        </Badge>

                        {/* Status */}
                        <Badge
                          variant="secondary"
                          className={`text-[10px] h-5 px-1.5 gap-1 font-medium shrink-0 ${status.color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>

                        {/* Blocked */}
                        {project.is_blocked && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] h-5 px-1.5 shrink-0"
                          >
                            Blocked
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Action Items */}
        <div className="lg:col-span-2">
          <ActionItemsWidget
            items={actionItems}
            isLoading={actionItemsLoading}
            title="Needs Your Attention"
          />
        </div>
      </div>
    </div>
  );
}
