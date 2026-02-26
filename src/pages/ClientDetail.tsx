import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useCompany } from '@/hooks/useCompanies';
import { useProjects } from '@/hooks/useProjects';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CompanyInfoTab } from '@/components/client/CompanyInfoTab';
import { ClientNotesTab } from '@/components/client/ClientNotesTab';
import { FileManagerTab } from '@/components/client/FileManagerTab';
import { ActivityTab } from '@/components/client/ActivityTab';
import { HourTracker } from '@/components/client/HourTracker';
import { PasswordsTab } from '@/components/client/PasswordsTab';
import { ClientBriefTab } from '@/components/client/ClientBriefTab';
import { LogTimeDialog } from '@/components/time/LogTimeDialog';
import { TimeEntriesTable } from '@/components/time/TimeEntriesTable';
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
  StickyNote,
  Activity,
  KeyRound,
  Clock,
  Loader2,
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
  const initialTab = searchParams.get('tab') || 'activity';

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
              Activity
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-1.5">
              <FolderKanban className="h-3.5 w-3.5" />
              Projects ({projects.length})
            </TabsTrigger>
            <TabsTrigger value="company-info" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Info
            </TabsTrigger>
            <TabsTrigger value="brief" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Brief
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5">
              <StickyNote className="h-3.5 w-3.5" />
              Notes
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

          {/* Company Info */}
          <TabsContent value="company-info">
            <CompanyInfoTab company={company} onUpdate={() => refetchCompany()} />
          </TabsContent>

          {/* Client Brief */}
          <TabsContent value="brief">
            <ClientBriefTab company={company} />
          </TabsContent>

          {/* Notes */}
          <TabsContent value="notes">
            <ClientNotesTab companyId={company.id} />
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
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Hours Overview</h3>
                    <p className="text-sm text-muted-foreground">
                      Monthly hour tracking and usage for this retainer client.
                    </p>
                  </div>
                  {(isTeam || isAdmin) && (
                    <Button onClick={() => setLogTimeOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Log Time
                    </Button>
                  )}
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="py-4 text-center">
                      <p className="text-2xl font-semibold">
                        {company.hours_used || 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Hours Used</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4 text-center">
                      <p className="text-2xl font-semibold">
                        {Math.max(
                          (company.hours_allocated || 0) - (company.hours_used || 0),
                          0,
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Hours Remaining
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4 text-center">
                      <p className="text-2xl font-semibold">
                        ${company.hourly_rate?.toFixed(0) || '0'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Hourly Rate
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Monthly Usage</CardTitle>
                    <CardDescription>
                      {company.hours_allocated
                        ? `${company.hours_allocated} hours allocated per month`
                        : 'No hours allocated'}
                      {company.hourly_rate
                        ? ` at $${company.hourly_rate}/hr`
                        : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <HourTracker
                      hoursUsed={company.hours_used || 0}
                      monthlyHours={company.hours_allocated || 0}
                      showWarning={true}
                    />

                    {/* Overage info */}
                    {company.hours_used != null &&
                      company.hours_allocated != null &&
                      company.hours_used > company.hours_allocated && (
                        <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
                          <p className="text-sm font-medium text-red-700 dark:text-red-400">
                            Overage:{' '}
                            {(company.hours_used - company.hours_allocated).toFixed(1)} hours
                          </p>
                          {company.hourly_rate && (
                            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                              Estimated overage cost: $
                              {(
                                (company.hours_used - company.hours_allocated) *
                                (company.hourly_rate * 1.15)
                              ).toFixed(2)}{' '}
                              (at ~$
                              {(company.hourly_rate * 1.15).toFixed(0)}/hr overage rate)
                            </p>
                          )}
                        </div>
                      )}
                  </CardContent>
                </Card>

                {/* Time Entries */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Time Entries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TimeEntriesTable companyId={company.id} />
                  </CardContent>
                </Card>
              </div>

              <LogTimeDialog
                open={logTimeOpen}
                onOpenChange={setLogTimeOpen}
                defaultCompanyId={company.id}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
