import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCampaignHealth } from '@/hooks/useCampaignHealth';
import { Loader2, Activity } from 'lucide-react';
import type { HealthScoreResult } from '@/lib/healthScore';

interface HealthBreakdownProps {
  projectId: string;
}

const STATUS_COLORS = {
  good: 'bg-emerald-500',
  warning: 'bg-yellow-500',
  critical: 'bg-red-500',
};

const STATUS_DOTS = {
  good: 'bg-emerald-500',
  warning: 'bg-yellow-500',
  critical: 'bg-red-500',
};

/** Compact inline breakdown for use inside a Popover */
export function HealthBreakdownCompact({ health }: { health: HealthScoreResult }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Campaign Health</span>
        <Badge
          variant="secondary"
          className={`text-xs h-5 px-1.5 font-semibold tabular-nums ${health.bgColor} ${health.color}`}
        >
          {health.score}/100
        </Badge>
      </div>
      {health.signals.map((signal) => (
        <div key={signal.name} className="flex items-center gap-2">
          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOTS[signal.status]}`} />
          <span className="text-xs flex-1 truncate">{signal.name}</span>
          <div className="w-16 h-1 bg-muted rounded-full overflow-hidden shrink-0">
            <div
              className={`h-full rounded-full ${STATUS_COLORS[signal.status]}`}
              style={{
                width: `${signal.maxScore > 0 ? (signal.score / signal.maxScore) * 100 : 100}%`,
              }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right shrink-0">
            {signal.score}/{signal.maxScore}
          </span>
        </div>
      ))}
    </div>
  );
}

export function HealthBreakdown({ projectId }: HealthBreakdownProps) {
  const { health, isLoading } = useCampaignHealth(projectId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!health) return null;

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Campaign Health
          </CardTitle>
          <Badge
            variant="secondary"
            className={`text-xs h-6 px-2 font-semibold tabular-nums ${health.bgColor} ${health.color}`}
          >
            {health.score}/100
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {health.signals.map((signal) => (
          <div key={signal.name} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{signal.name}</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {signal.score}/{signal.maxScore}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${STATUS_COLORS[signal.status]}`}
                  style={{
                    width: `${signal.maxScore > 0 ? (signal.score / signal.maxScore) * 100 : 100}%`,
                  }}
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">{signal.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
