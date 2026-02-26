import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCampaignHealth } from '@/hooks/useCampaignHealth';
import { HealthBreakdownCompact } from '@/components/campaigns/HealthBreakdown';

interface HealthBadgeProps {
  projectId: string;
}

export function HealthBadge({ projectId }: HealthBadgeProps) {
  const { health, isLoading } = useCampaignHealth(projectId);

  if (isLoading || !health) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant="secondary"
          className={`text-[10px] h-5 px-1.5 font-medium tabular-nums cursor-pointer ${health.bgColor} ${health.color}`}
        >
          {health.score} — {health.label}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <HealthBreakdownCompact health={health} />
      </PopoverContent>
    </Popover>
  );
}
