import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, FolderKanban, Repeat, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ClientCardProps {
  id: string;
  name: string;
  logo_url: string | null;
  retainer_type: 'unlimited' | 'hourly' | 'one_time';
  hours_allocated: number | null;
  hours_used: number | null;
  active_projects: number;
  project_count: number;
  action_items_for_us?: number;
  action_items_for_client?: number;
  payment_schedule?: string | null;
}

type HourStatus = 'green' | 'yellow' | 'red';

const getHourStatus = (hoursUsed: number, hoursAllocated: number): HourStatus => {
  if (hoursAllocated === 0) return 'green';
  
  const remaining = hoursAllocated - hoursUsed;
  const percentageUsed = (hoursUsed / hoursAllocated) * 100;

  // Red: 2 hours or less remaining or over budget
  if (remaining <= 2) {
    return 'red';
  }

  // Yellow: 75% or more used
  if (percentageUsed >= 75) {
    return 'yellow';
  }

  // Green: Safe zone
  return 'green';
};

const getNextResetDate = (paymentSchedule: string | null | undefined): string => {
  const now = new Date();
  
  // Parse the billing day from payment_schedule (e.g., "1st" or "15th")
  let billingDay = 1; // default to 1st
  if (paymentSchedule) {
    const match = paymentSchedule.match(/(\d+)/);
    if (match) {
      billingDay = parseInt(match[1], 10);
    }
  }
  
  // Calculate the next reset date
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  let nextResetDate: Date;
  
  if (currentDay < billingDay) {
    // Reset is later this month
    nextResetDate = new Date(currentYear, currentMonth, billingDay);
  } else {
    // Reset is next month
    nextResetDate = new Date(currentYear, currentMonth + 1, billingDay);
  }
  
  return format(nextResetDate, 'MMMM do');
};

export function ClientCard({
  id,
  name,
  logo_url,
  retainer_type,
  hours_allocated,
  hours_used,
  active_projects,
  project_count,
  action_items_for_us = 0,
  action_items_for_client = 0,
  payment_schedule,
}: ClientCardProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const hoursPercentage = hours_allocated && hours_allocated > 0 
    ? Math.min(((hours_used || 0) / hours_allocated) * 100, 100)
    : 0;

  const isOverBudget = (hours_used || 0) > (hours_allocated || 0) && hours_allocated && hours_allocated > 0;
  const hourStatus = getHourStatus(hours_used || 0, hours_allocated || 0);

  const getRetainerConfig = () => {
    switch (retainer_type) {
      case 'one_time':
        return {
          label: 'One-Time',
          icon: Zap,
          variant: 'outline' as const,
          className: 'border-amber-500/50 text-amber-600 bg-amber-50 dark:bg-amber-950/20',
        };
      case 'hourly':
        return {
          label: 'Retainer',
          icon: Repeat,
          variant: 'outline' as const,
          className: 'border-emerald-500/50 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20',
        };
      case 'unlimited':
      default:
        return {
          label: 'Unlimited',
          icon: Repeat,
          variant: 'outline' as const,
          className: 'border-primary/50 text-primary bg-primary/5',
        };
    }
  };

  const getProgressColorClass = () => {
    switch (hourStatus) {
      case 'red':
        return 'bg-red-500';
      case 'yellow':
        return 'bg-yellow-500';
      case 'green':
      default:
        return 'bg-emerald-500';
    }
  };

  const retainerConfig = getRetainerConfig();
  const RetainerIcon = retainerConfig.icon;

  const hasActionItems = action_items_for_us > 0 || action_items_for_client > 0;

  return (
    <Link to={`/clients/${id}`}>
      <Card className="group hover:shadow-lg hover:border-primary/30 transition-all duration-200 cursor-pointer h-full bg-card">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <Avatar className="h-14 w-14 ring-2 ring-background shadow-sm">
              <AvatarImage src={logo_url || ''} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-semibold text-lg">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                {name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={retainerConfig.className}>
                  <RetainerIcon className="h-3 w-3 mr-1" />
                  {retainerConfig.label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1.5">
              <FolderKanban className="h-4 w-4" />
              <span className="font-medium text-foreground">{active_projects}</span>
              <span>active</span>
            </div>
            <span className="text-muted-foreground/40">•</span>
            <div>
              <span className="font-medium text-foreground">{project_count}</span>
              <span> total</span>
            </div>
          </div>

          {/* Action Items */}
          {hasActionItems && (
            <div className="flex items-center gap-3 text-sm mb-4 p-2 rounded-md bg-muted/50">
              {action_items_for_us > 0 && (
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="font-medium">{action_items_for_us}</span>
                  <span className="text-muted-foreground">for us</span>
                </div>
              )}
              {action_items_for_us > 0 && action_items_for_client > 0 && (
                <span className="text-muted-foreground/40">•</span>
              )}
              {action_items_for_client > 0 && (
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="font-medium">{action_items_for_client}</span>
                  <span className="text-muted-foreground">for client</span>
                </div>
              )}
            </div>
          )}

          {/* Hours Progress - Only for retainer clients */}
          {retainer_type === 'hourly' && hours_allocated && hours_allocated > 0 && (
            <div className="space-y-2 pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Hours Used</span>
                </div>
                <span className={cn(
                  'font-medium',
                  hourStatus === 'red' && 'text-red-600 dark:text-red-400',
                  hourStatus === 'yellow' && 'text-yellow-600 dark:text-yellow-400',
                  hourStatus === 'green' && 'text-foreground'
                )}>
                  {hours_used || 0} / {hours_allocated}h
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn('h-full rounded-full transition-all duration-500', getProgressColorClass())}
                  style={{ width: `${hoursPercentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                {isOverBudget ? (
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                    Over budget by {((hours_used || 0) - hours_allocated).toFixed(1)}h
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {(hours_allocated - (hours_used || 0)).toFixed(1)}h remaining
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Resets {getNextResetDate(payment_schedule)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}