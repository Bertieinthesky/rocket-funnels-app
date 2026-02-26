import { useState, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useCompany } from '@/hooks/useCompanies';
import { useProjects } from '@/hooks/useProjects';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileManagerTab } from '@/components/client/FileManagerTab';
import { ActivityTab } from '@/components/client/ActivityTab';
import { HourTracker } from '@/components/client/HourTracker';
import { BillingHistory } from '@/components/client/BillingHistory';
import { PasswordsTab } from '@/components/client/PasswordsTab';
import { InformationTab } from '@/components/client/InformationTab';
import { LogTimeDialog } from '@/components/time/LogTimeDialog';
import { TimeEntriesTable } from '@/components/time/TimeEntriesTable';
import {
  getAllBillingPeriods,
  getCurrentBillingPeriod,
  computePeriodBreakdown,
} from '@/lib/billing';
import {
  STATUSES,
  PHASES,
  type ProjectStatus,
  type WorkflowPhase,
} from '@/lib/constants';
import {
  ArrowLeft,
  FolderKanban,
  FileText,
  Settings,
  Plus,
  Building2,
  Activity,
  KeyRound,
  Clock,
  Loader2,
  Receipt,
} from 'lucide-react';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { isTeam, isAdmin } = useAuth();
  const { canEditCompanyInfo } = usePermissions();
  const [logTimeOpen, setLogTimeOpen] = useState(false);
  const rawTab = searchParams.get('tab') || 'activity';
  // Legacy tab params → consolidated information tab
  const initialTab = ['company-info', 'brief', 'notes'].includes(rawTab)
    ? 'information'
    : rawTab;

  const { data: company, isLoading: companyLoading, refetch: refetchCompany } = useCompany(id);
  const { data: projects = [], isLoading: projectsLoading } = useProjects({
    companyId: id,
    includeCompleted: true,
  });

  const loading = companyLoading || projectsLoading;

  if (!isTeam && !isAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">You don't have access to this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Company not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/clients">Back to Clients</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const activeProjects = projects.filter((p) => p.status !== 'complete');
  const completedProjects = projects.filter((p) => p.status === 'complete');
  const isRetainer =
    company.retainer_type === 'hourly' || company.retainer_type === 'unlimited';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-4 flex-1">
            <Avatar className="h-12 w-12">
              <AvatarImage src={company.logo_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-base">
                {getInitials(company.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-semibold">{company.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-muted-foreground">
                  {company.billing_email || company.contact_email}
                </span>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 capitalize">
                  {company.retainer_type === 'hourly'
                    ? 'Retainer'
                    : company.retainer_type === 'one_time'
                      ? 'One-Time'
                      : company.retainer_type}
                </Badge>
              </div>
            </div>
          </div>
          {isAdmin && (
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Projects</CardDescription>
              <CardTitle className="text-3xl">{activeProjects.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {company.max_concurrent_projects
                  ? `of ${company.max_concurrent_projects} max concurrent`
                  : `${completedProjects.length} completed`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Plan Type</CardDescription>
              <CardTitle className="text-3xl capitalize">
                {company.retainer_type === 'hourly'
                  ? 'Retainer'
                  : company.retainer_type === 'one_time'
                    ? 'One-Time'
                    : company.retainer_type}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={isRetainer ? 'default' : 'secondary'}>
                {isRetainer ? 'Hourly Billing' : 'Project Fee'}
              </Badge>
            </CardContent>
          </Card>

          {isRetainer && (
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Hours Tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <HourTracker
                  hoursUsed={company.hours_used || 0}
                  monthlyHours={company.hours_allocated || 0}
                  showWarning={false}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue={initialTab} className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="activity" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-1.5">
              <FolderKanban className="h-3.5 w-3.5" />
              Projects ({projects.length})
            </TabsTrigger>
            <TabsTrigger value="information" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Information
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Files
            </TabsTrigger>
            <TabsTrigger value="passwords" className="gap-1.5">
              <KeyRound className="h-3.5 w-3.5" />
              Passwords
            </TabsTrigger>
            {isRetainer && (
              <TabsTrigger value="hours" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Hours
              </TabsTrigger>
            )}
          </TabsList>

          {/* Activity */}
          <TabsContent value="activity">
            <ActivityTab companyId={company.id} />
          </TabsContent>

          {/* Projects */}
          <TabsContent value="projects" className="space-y-4">
            <div className="flex justify-end">
              <Button asChild>
                <Link to={`/projects/new?company=${company.id}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Link>
              </Button>
            </div>

            {activeProjects.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Active Projects
                </h3>
                <div className="grid gap-3">
                  {activeProjects.map((project) => {
                    const statusConfig = STATUSES[project.status as ProjectStatus];
                    const phaseConfig = PHASES[project.phase as WorkflowPhase];

                    return (
                      <Link key={project.id} to={`/projects/${project.id}`}>
                        <Card className="hover:border-primary/50 transition-colors">
                          <CardContent className="py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{project.name}</span>
                              {project.is_blocked && (
                                <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                                  Blocked
                                </Badge>
                              )}
                              {phaseConfig && (
                                <Badge className={`text-[10px] h-5 px-1.5 ${phaseConfig.color}`}>
                                  {phaseConfig.label}
                                </Badge>
                              )}
                            </div>
                            {statusConfig && (
                              <Badge className={`text-[10px] h-5 px-1.5 ${statusConfig.color}`}>
                                {statusConfig.label}
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {completedProjects.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Completed Projects
                </h3>
                <div className="grid gap-3">
                  {completedProjects.map((project) => (
                    <Link key={project.id} to={`/projects/${project.id}`}>
                      <Card className="hover:border-primary/50 transition-colors opacity-70">
                        <CardContent className="py-4 flex items-center justify-between">
                          <span className="font-medium">{project.name}</span>
                          <Badge className="text-[10px] h-5 px-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Complete
                          </Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {projects.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No projects yet for this client.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Information (Info + Brief + Notes) */}
          <TabsContent value="information">
            <InformationTab
              company={company}
              companyId={company.id}
              onUpdate={() => refetchCompany()}
            />
          </TabsContent>

          {/* Files */}
          <TabsContent value="files">
            <FileManagerTab
              companyId={company.id}
              projects={projects.map((p) => ({ id: p.id, name: p.name }))}
            />
          </TabsContent>

          {/* Passwords */}
          <TabsContent value="passwords">
            <PasswordsTab companyId={company.id} />
          </TabsContent>

          {/* Hours */}
          {isRetainer && (
            <TabsContent value="hours">
              <HoursTab
                company={company}
                isAdmin={isAdmin}
                isTeam={isTeam}
                logTimeOpen={logTimeOpen}
                setLogTimeOpen={setLogTimeOpen}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

/* ------------------------------------------------------------------ */
/*  Hours Tab – period-scoped stats, overage tracking, billing history */
/* ------------------------------------------------------------------ */

function HoursTab({
  company,
  isAdmin,
  isTeam,
  logTimeOpen,
  setLogTimeOpen,
}: {
  company: any;
  isAdmin: boolean;
  isTeam: boolean;
  logTimeOpen: boolean;
  setLogTimeOpen: (open: boolean) => void;
}) {
  const paymentSchedule = (company as any).payment_schedule ?? null;
  const hoursAllocated = company.hours_allocated || 0;
  const hourlyRate = company.hourly_rate || 0;

  const { data: entries = [] } = useTimeEntries({ companyId: company.id });

  // Compute billing periods from entries
  const periodGroups = useMemo(
    () => getAllBillingPeriods(entries, paymentSchedule),
    [entries, paymentSchedule],
  );

  const currentPeriod = useMemo(
    () => getCurrentBillingPeriod(paymentSchedule),
    [paymentSchedule],
  );

  // Build sorted period list for the selector (newest first)
  const periodOptions = useMemo(() => {
    const opts = [...periodGroups.entries()].map(([key, { period }]) => ({
      key,
      label: period.label,
      start: period.start,
    }));
    // Make sure current period is always in the list even if no entries yet
    if (!opts.find((o) => o.key === currentPeriod.key)) {
      opts.push({
        key: currentPeriod.key,
        label: currentPeriod.label,
        start: currentPeriod.start,
      });
    }
    return opts.sort((a, b) => b.start.getTime() - a.start.getTime());
  }, [periodGroups, currentPeriod]);

  const [selectedPeriodKey, setSelectedPeriodKey] = useState(currentPeriod.key);

  // Entries for the selected period
  const periodEntries = useMemo(() => {
    const group = periodGroups.get(selectedPeriodKey);
    return group?.entries || [];
  }, [periodGroups, selectedPeriodKey]);

  // Period breakdown (overage calculation)
  const breakdown = useMemo(
    () => computePeriodBreakdown(periodEntries, hoursAllocated),
    [periodEntries, hoursAllocated],
  );

  const selectedLabel =
    periodOptions.find((o) => o.key === selectedPeriodKey)?.label ||
    currentPeriod.label;

  return (
    <>
      <div className="space-y-6">
        {/* Header with period selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg font-semibold">Hours Overview</h3>
              <p className="text-sm text-muted-foreground">
                Billing period usage and tracking.
              </p>
            </div>
            <Select value={selectedPeriodKey} onValueChange={setSelectedPeriodKey}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue>{selectedLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((opt) => (
                  <SelectItem key={opt.key} value={opt.key} className="text-xs">
                    {opt.label}
                    {opt.key === currentPeriod.key && ' (Current)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(isTeam || isAdmin) && (
            <Button onClick={() => setLogTimeOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Log Time
            </Button>
          )}
        </div>

        {/* Period-scoped quick stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-semibold">
                {breakdown.totalHours.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Hours Used</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-semibold">
                {Math.max(hoursAllocated - breakdown.totalHours, 0).toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Hours Remaining
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-semibold">
                ${hourlyRate.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Hourly Rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Period usage tracker */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedLabel} Usage
            </CardTitle>
            <CardDescription>
              {hoursAllocated
                ? `${hoursAllocated} hours allocated`
                : 'No hours allocated'}
              {hourlyRate ? ` at $${hourlyRate}/hr` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HourTracker
              hoursUsed={breakdown.totalHours}
              monthlyHours={hoursAllocated}
              showWarning={true}
            />

            {/* Overage info */}
            {breakdown.overageHours > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Overage: {breakdown.overageHours.toFixed(1)} hours
                </p>
                {hourlyRate > 0 && (
                  <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                    Estimated overage cost: $
                    {(breakdown.overageHours * hourlyRate * 1.15).toFixed(2)} (at
                    ~${(hourlyRate * 1.15).toFixed(0)}/hr overage rate)
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time Entries for selected period */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Time Entries — {selectedLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TimeEntriesTable
              companyId={company.id}
              overageEntryIds={breakdown.overageEntryIds}
            />
          </CardContent>
        </Card>

        {/* Billing History */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-semibold">Billing History</h3>
          </div>
          <BillingHistory
            companyId={company.id}
            hoursAllocated={hoursAllocated}
            hourlyRate={hourlyRate}
            paymentSchedule={paymentSchedule}
          />
        </div>
      </div>

      <LogTimeDialog
        open={logTimeOpen}
        onOpenChange={setLogTimeOpen}
        defaultCompanyId={company.id}
      />
    </>
  );
}
