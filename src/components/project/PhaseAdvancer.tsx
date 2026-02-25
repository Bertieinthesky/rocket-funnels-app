import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ArrowRight, ChevronDown, Calendar } from 'lucide-react';
import {
  PHASES,
  PHASE_ORDER,
  getNextPhase,
  type WorkflowPhase,
} from '@/lib/constants';
import type { Project } from '@/hooks/useProjects';
import { format } from 'date-fns';

interface PhaseAdvancerProps {
  project: Project;
  onAdvance: (nextPhase: WorkflowPhase) => void;
  onChangePhase: (phase: WorkflowPhase) => void;
}

export function PhaseAdvancer({ project, onAdvance, onChangePhase }: PhaseAdvancerProps) {
  const currentPhase = PHASES[project.phase as WorkflowPhase] || PHASES.shaping;
  const CurrentIcon = currentPhase.icon;
  const nextPhaseKey = getNextPhase((project.phase as WorkflowPhase) || 'shaping');
  const nextPhase = nextPhaseKey ? PHASES[nextPhaseKey] : null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Current phase — prominent */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Phase
        </span>
        <Badge className={`text-xs h-6 px-2 gap-1.5 font-medium ${currentPhase.color}`}>
          <CurrentIcon className="h-3.5 w-3.5" />
          {currentPhase.label}
        </Badge>
      </div>

      {/* Phase dates */}
      {(project.phase_started_at || project.phase_due_date) && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {project.phase_started_at && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Started {format(new Date(project.phase_started_at), 'MMM d')}
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Phase start date</TooltipContent>
            </Tooltip>
          )}
          {project.phase_started_at && project.phase_due_date && (
            <span className="text-muted-foreground/40">—</span>
          )}
          {project.phase_due_date && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1">
                  Due {format(new Date(project.phase_due_date), 'MMM d')}
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Phase due date</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 ml-auto">
        {/* Advance button */}
        {nextPhase && nextPhaseKey && (
          <Button
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => onAdvance(nextPhaseKey)}
          >
            <ArrowRight className="h-3 w-3" />
            Advance to {nextPhase.label}
          </Button>
        )}

        {/* Jump to any phase */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {PHASE_ORDER.map((key) => {
              const p = PHASES[key];
              const Icon = p.icon;
              const isCurrent = project.phase === key;
              return (
                <DropdownMenuItem
                  key={key}
                  disabled={isCurrent}
                  onClick={() => onChangePhase(key)}
                  className={isCurrent ? 'opacity-50' : ''}
                >
                  <Icon className="h-3.5 w-3.5 mr-2" />
                  {p.label}
                  {isCurrent && (
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      current
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
