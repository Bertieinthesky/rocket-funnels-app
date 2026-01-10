import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HourTrackerProps {
  hoursUsed: number;
  monthlyHours: number;
  showWarning?: boolean;
  className?: string;
}

type HourStatus = 'green' | 'yellow' | 'red';

const getHourStatus = (hoursUsed: number, monthlyHours: number): HourStatus => {
  if (monthlyHours === 0) return 'green';
  
  const remaining = monthlyHours - hoursUsed;
  const percentageUsed = (hoursUsed / monthlyHours) * 100;

  // Red: 2 hours or less remaining
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

const statusConfig = {
  green: {
    label: 'On Track',
    badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    progressClass: 'bg-green-500',
  },
  yellow: {
    label: 'Caution',
    badgeClass: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    progressClass: 'bg-yellow-500',
  },
  red: {
    label: 'Critical',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    progressClass: 'bg-red-500',
  },
};

export function HourTracker({ hoursUsed, monthlyHours, showWarning = true, className }: HourTrackerProps) {
  const status = getHourStatus(hoursUsed, monthlyHours);
  const config = statusConfig[status];
  const remaining = Math.max(monthlyHours - hoursUsed, 0);
  const percentageUsed = monthlyHours > 0 ? Math.min((hoursUsed / monthlyHours) * 100, 100) : 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with hours and status badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {hoursUsed}/{monthlyHours} hours
          </span>
        </div>
        <Badge variant="outline" className={config.badgeClass}>
          {config.label}
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn('h-full rounded-full transition-all duration-500', config.progressClass)}
          style={{ width: `${percentageUsed}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{remaining} hours remaining</span>
        <span>{percentageUsed.toFixed(1)}% used</span>
      </div>

      {/* Warning alert for red/yellow status */}
      {showWarning && status === 'red' && (
        <Alert variant="destructive" className="mt-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Client is approaching hour limit. Consider discussing renewal or additional hours.
          </AlertDescription>
        </Alert>
      )}

      {showWarning && status === 'yellow' && (
        <Alert className="mt-3 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
            Hours are running low. Monitor usage closely.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
