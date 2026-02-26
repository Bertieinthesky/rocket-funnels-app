import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCompanies } from '@/hooks/useCompanies';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useCreateProject } from '@/hooks/useProjects';
import { ClientRequestForm } from '@/components/project/ClientRequestForm';
import { BriefReviewScreen } from '@/components/project/BriefReviewScreen';
import {
  PHASES,
  PHASE_ORDER,
  PROJECT_TYPES,
  PRIORITIES,
  type WorkflowPhase,
  type ProjectType,
  type Priority,
} from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Calendar,
  Link as LinkIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({
  current,
  total,
  labels,
}: {
  current: number;
  total: number;
  labels: string[];
}) {
  return (
    <div className="flex items-center gap-1">
      {labels.map((label, idx) => {
        const step = idx + 1;
        const isActive = step === current;
        const isCompleted = step < current;
        return (
          <div key={label} className="flex items-center">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : isCompleted
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              <span
                className={`flex items-center justify-center h-4 w-4 rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : isCompleted
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted-foreground/20 text-muted-foreground'
                }`}
              >
                {step}
              </span>
              {label}
            </div>
            {idx < labels.length - 1 && (
              <div
                className={`w-6 h-px mx-1 ${
                  isCompleted ? 'bg-primary/40' : 'bg-muted-foreground/20'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin/Team Brief Form
// ---------------------------------------------------------------------------

interface BriefFormData {
  companyId: string;
  name: string;
  description: string;
  projectType: string;
  priority: string;
  assignedTo: string;
  targetDate: string;
  selectedPhases: WorkflowPhase[];
  relevantLinks: string;
}

function AdminBriefForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const createProject = useCreateProject();

  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const { data: teamMembers = [], isLoading: teamLoading } = useTeamMembers();

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<BriefFormData>({
    companyId: '',
    name: '',
    description: '',
    projectType: 'other',
    priority: 'normal',
    assignedTo: '',
    targetDate: '',
    selectedPhases: ['shaping'],
    relevantLinks: '',
  });

  const set = (field: keyof BriefFormData, value: string | WorkflowPhase[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const togglePhase = (phase: WorkflowPhase) => {
    setForm((prev) => ({
      ...prev,
      selectedPhases: prev.selectedPhases.includes(phase)
        ? prev.selectedPhases.filter((p) => p !== phase)
        : [...prev.selectedPhases, phase],
    }));
  };

  // ---------- Validation ----------
  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!form.companyId) errs.companyId = 'Select a client';
    if (form.name.length < 3) errs.name = 'At least 3 characters';
    if (form.description.length < 10) errs.description = 'At least 10 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (form.selectedPhases.length === 0)
      errs.selectedPhases = 'Select at least one phase';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // ---------- Confirm ----------
  const handleConfirm = () => {
    const description =
      form.description +
      (form.relevantLinks
        ? `\n\nRelevant Links:\n${form.relevantLinks}`
        : '');

    createProject.mutate(
      {
        company_id: form.companyId,
        name: form.name,
        description,
        project_type: form.projectType as ProjectType,
        priority: form.priority,
        assigned_to: form.assignedTo || null,
        target_date: form.targetDate || null,
        created_by: user?.id || null,
        status: 'queued',
        phase: form.selectedPhases[0] || 'shaping',
        phase_started_at: new Date().toISOString(),
      },
      {
        onSuccess: (data) => {
          toast({
            title: 'Campaign created',
            description: `"${form.name}" campaign has been added.`,
          });
          navigate(`/projects/${data.id}`);
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to create campaign',
            variant: 'destructive',
          });
        },
      },
    );
  };

  const companyName =
    companies.find((c) => c.id === form.companyId)?.name || '';
  const assignedMember = teamMembers.find((m) => m.id === form.assignedTo);

  const priorityKeys = Object.keys(PRIORITIES) as Priority[];
  const typeKeys = Object.keys(PROJECT_TYPES) as ProjectType[];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">New Campaign Brief</h1>
          <p className="text-sm text-muted-foreground">
            Set up a new campaign for a client.
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <StepIndicator
        current={step}
        total={3}
        labels={['Details', 'Configuration', 'Review']}
      />

      {/* Step 1: Client + Name + Description */}
      {step === 1 && (
        <Card>
          <CardContent className="p-5 space-y-5">
            {/* Client */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Client <span className="text-destructive">*</span>
              </Label>
              {companiesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading clients...
                </div>
              ) : (
                <Select
                  value={form.companyId}
                  onValueChange={(v) => set('companyId', v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.companyId && (
                <p className="text-xs text-destructive">{errors.companyId}</p>
              )}
            </div>

            {/* Project Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Project Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g., Homepage Funnel Rebuild"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className="h-9"
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Describe the scope, goals, and deliverables..."
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={4}
                className="text-sm resize-none"
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description}</p>
              )}
            </div>

            {/* Next */}
            <div className="flex justify-end pt-1">
              <Button onClick={handleNext} className="gap-1.5">
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Type, Priority, Phases, Assignment, Date, Links */}
      {step === 2 && (
        <Card>
          <CardContent className="p-5 space-y-5">
            {/* Type + Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Project Type</Label>
                <Select
                  value={form.projectType}
                  onValueChange={(v) => set('projectType', v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeKeys.map((key) => (
                      <SelectItem key={key} value={key}>
                        {PROJECT_TYPES[key].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => set('priority', v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityKeys.map((key) => {
                      const p = PRIORITIES[key];
                      return (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${p.dotColor}`}
                            />
                            {p.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Phase Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Phases <span className="text-destructive">*</span>
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Select which phases this project will go through.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PHASE_ORDER.map((phaseKey) => {
                  const phase = PHASES[phaseKey];
                  const PhaseIcon = phase.icon;
                  const isSelected = form.selectedPhases.includes(phaseKey);

                  return (
                    <label
                      key={phaseKey}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border hover:border-border/80 hover:bg-muted/30'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => togglePhase(phaseKey)}
                      />
                      <div className="flex items-center gap-2">
                        <PhaseIcon
                          className={`h-3.5 w-3.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                        />
                        <span
                          className={`text-sm ${isSelected ? 'font-medium' : ''}`}
                        >
                          {phase.label}
                        </span>
                      </div>
                      {phase.defaultDays && (
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {phase.defaultDays}d
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
              {errors.selectedPhases && (
                <p className="text-xs text-destructive">
                  {errors.selectedPhases}
                </p>
              )}
            </div>

            {/* Assignment + Target Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Assign To</Label>
                {teamLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  <Select
                    value={form.assignedTo}
                    onValueChange={(v) => set('assignedTo', v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.full_name || m.email || 'Team Member'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    Target Date
                  </span>
                </Label>
                <Input
                  type="date"
                  value={form.targetDate}
                  onChange={(e) => set('targetDate', e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            {/* Links */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                <span className="flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  Relevant Links
                </span>
              </Label>
              <Textarea
                placeholder="Paste any Loom videos, Google Docs, reference URLs..."
                value={form.relevantLinks}
                onChange={(e) => set('relevantLinks', e.target.value)}
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            {/* Nav */}
            <div className="flex items-center justify-between pt-1">
              <Button variant="outline" onClick={handleBack} className="gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              <Button onClick={handleNext} className="gap-1.5">
                Review
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <BriefReviewScreen
          briefData={{
            name: form.name,
            description: form.description,
            companyId: form.companyId,
            companyName: companyName,
            projectType: form.projectType,
            priority: form.priority,
            assignedTo: form.assignedTo || null,
            assignedName: assignedMember?.full_name || null,
            targetDate: form.targetDate || null,
            selectedPhases: form.selectedPhases,
            relevantLinks: form.relevantLinks,
          }}
          onConfirm={handleConfirm}
          onBack={handleBack}
          isSubmitting={createProject.isPending}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client View
// ---------------------------------------------------------------------------

function ClientView() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
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

  if (profileLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Submit New Request</h1>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!profile?.company_id) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Submit New Request</h1>
            <p className="text-sm text-destructive">
              Your account isn't linked to a company yet. Please contact us at{' '}
              <a href="mailto:support@rocketfunnels.com" className="underline">support@rocketfunnels.com</a>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Submit New Request</h1>
          <p className="text-sm text-muted-foreground">
            Tell us what you need and we'll get it queued up.
          </p>
        </div>
      </div>
      <ClientRequestForm
        companyId={profile.company_id}
        onSuccess={() => navigate('/projects')}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page — dual-mode based on role
// ---------------------------------------------------------------------------

export default function NewProject() {
  const { isClient } = useAuth();
  const { isDemoMode, demoView } = useDemoMode();

  const effectiveIsClient = isDemoMode ? demoView === 'client' : isClient;

  return (
    <DashboardLayout>
      {effectiveIsClient ? <ClientView /> : <AdminBriefForm />}
    </DashboardLayout>
  );
}
