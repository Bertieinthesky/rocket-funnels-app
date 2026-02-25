import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FolderKanban, Clock, AlertTriangle } from 'lucide-react';
import type { Company } from '@/hooks/useCompanies';

interface ClientHealthCardProps {
  company: Company;
  activeProjects: number;
  queuedProjects: number;
  actionItemCount: number;
}

export function ClientHealthCard({
  company,
  activeProjects,
  queuedProjects,
  actionItemCount,
}: ClientHealthCardProps) {
  const isRetainer = company.retainer_type === 'hourly';
  const hoursUsed = Number(company.hours_used) || 0;
  const hoursAllocated = company.hours_allocated || 0;
  const hoursPercentage = hoursAllocated > 0 ? Math.round((hoursUsed / hoursAllocated) * 100) : 0;
  const hoursWarning = hoursPercentage >= 90;
  const hoursOverage = hoursPercentage > 100;

  return (
    <Link to={`/clients/${company.id}`} className="block">
      <Card className="hover:shadow-md hover:border-foreground/20 transition-all duration-150 hover:translate-y-[-1px] h-full">
        <CardContent className="p-3.5 space-y-2.5">
          {/* Name + Action Items badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{company.name}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                {isRetainer ? 'Retainer' : 'One-Time'}
              </p>
            </div>
            {actionItemCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="destructive"
                    className="text-[10px] h-5 min-w-[20px] justify-center tabular-nums shrink-0"
                  >
                    {actionItemCount}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {actionItemCount} action item{actionItemCount !== 1 ? 's' : ''}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Project counts */}
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-muted-foreground">
              <FolderKanban className="h-3 w-3" />
              {activeProjects} active
            </span>
            {queuedProjects > 0 && (
              <span className="text-muted-foreground/70">
                {queuedProjects} queued
              </span>
            )}
          </div>

          {/* Hours bar (retainer only) */}
          {isRetainer && hoursAllocated > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {hoursUsed.toFixed(1)} / {hoursAllocated}hrs
                </span>
                <span
                  className={`font-medium tabular-nums ${
                    hoursOverage
                      ? 'text-red-600 dark:text-red-400'
                      : hoursWarning
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-muted-foreground'
                  }`}
                >
                  {hoursPercentage}%
                  {hoursOverage && <AlertTriangle className="h-3 w-3 inline ml-0.5" />}
                </span>
              </div>
              <Progress
                value={Math.min(hoursPercentage, 100)}
                className={`h-1.5 ${
                  hoursOverage
                    ? '[&>div]:bg-red-500'
                    : hoursWarning
                      ? '[&>div]:bg-orange-500'
                      : ''
                }`}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
