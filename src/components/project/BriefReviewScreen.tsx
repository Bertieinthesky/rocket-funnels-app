import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Link as LinkIcon,
  User,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import {
  PHASES,
  PHASE_ORDER,
  PROJECT_TYPES,
  PRIORITIES,
  type WorkflowPhase,
  type ProjectType,
  type Priority,
} from '@/lib/constants';
import { format } from 'date-fns';

interface BriefReviewScreenProps {
  briefData: {
    name: string;
    description: string;
    companyId: string;
    companyName: string;
    projectType: string;
    priority: string;
    assignedTo: string | null;
    assignedName: string | null;
    targetDate: string | null;
    selectedPhases: string[];
    relevantLinks: string;
  };
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

function getInitials(name: string | null): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function BriefReviewScreen({
  briefData,
  onConfirm,
  onBack,
  isSubmitting,
}: BriefReviewScreenProps) {
  const typeConfig = PROJECT_TYPES[briefData.projectType as ProjectType];
  const priorityConfig = PRIORITIES[briefData.priority as Priority];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Review Project Brief</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Confirm the details before creating this project.
          </p>
        </div>
        <Badge
          variant="outline"
          className="text-xs border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Ready to create
        </Badge>
      </div>

      <Card>
        <CardContent className="p-5 space-y-5">
          {/* Project Name + Client */}
          <div className="space-y-3">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Project
              </span>
              <h4 className="text-base font-semibold mt-0.5">{briefData.name}</h4>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">{briefData.companyName}</span>
              </div>
              {typeConfig && (
                <Badge className={`text-[10px] h-5 px-1.5 ${typeConfig.color}`}>
                  {typeConfig.label}
                </Badge>
              )}
              {priorityConfig && (
                <Badge className={`text-[10px] h-5 px-1.5 ${priorityConfig.color}`}>
                  <span
                    className={`h-1.5 w-1.5 rounded-full mr-1 ${priorityConfig.dotColor}`}
                  />
                  {priorityConfig.label}
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Description
            </span>
            <p className="text-sm mt-1 whitespace-pre-wrap text-foreground/80">
              {briefData.description}
            </p>
          </div>

          <Separator />

          {/* Phase Pipeline */}
          <div>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Phases
            </span>
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {PHASE_ORDER.map((phaseKey, idx) => {
                const phase = PHASES[phaseKey];
                const isSelected = briefData.selectedPhases.includes(phaseKey);
                const PhaseIcon = phase.icon;

                return (
                  <div key={phaseKey} className="flex items-center">
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        isSelected
                          ? phase.color
                          : 'bg-muted/50 text-muted-foreground/40'
                      }`}
                    >
                      <PhaseIcon className="h-3 w-3" />
                      {phase.label}
                    </div>
                    {idx < PHASE_ORDER.length - 1 && (
                      <div
                        className={`w-4 h-px mx-0.5 ${
                          isSelected &&
                          briefData.selectedPhases.includes(PHASE_ORDER[idx + 1])
                            ? 'bg-foreground/20'
                            : 'bg-muted-foreground/15'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Assignment + Date Row */}
          <div className="flex items-start gap-6">
            {/* Assigned To */}
            <div>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Assigned To
              </span>
              <div className="flex items-center gap-2 mt-1.5">
                {briefData.assignedTo ? (
                  <>
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">
                        {getInitials(briefData.assignedName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {briefData.assignedName}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Unassigned
                  </span>
                )}
              </div>
            </div>

            {/* Target Date */}
            <div>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Target Date
              </span>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">
                  {briefData.targetDate
                    ? format(new Date(briefData.targetDate), 'MMM d, yyyy')
                    : 'No target date'}
                </span>
              </div>
            </div>
          </div>

          {/* Links */}
          {briefData.relevantLinks && (
            <>
              <Separator />
              <div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Relevant Links
                </span>
                <div className="flex items-start gap-1.5 mt-1.5">
                  <LinkIcon className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <p className="text-sm whitespace-pre-wrap text-foreground/80">
                    {briefData.relevantLinks}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Go Back
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isSubmitting}
          className="gap-1.5"
        >
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Create Project
        </Button>
      </div>
    </div>
  );
}
