import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  PRIORITIES,
  type Priority,
} from '@/lib/constants';
import type { Company } from '@/hooks/useCompanies';
import type { TeamMember } from '@/hooks/useTeamMembers';
import { X, SlidersHorizontal, OctagonAlert } from 'lucide-react';

export interface KanbanFilterState {
  client: string;
  campaign: string;
  priority: string;
  assignedTo: string;
  blockedOnly: boolean;
  showCompleted: boolean;
}

interface Campaign {
  id: string;
  name: string;
}

interface KanbanFiltersProps {
  filters: KanbanFilterState;
  onChange: (filters: KanbanFilterState) => void;
  companies: Company[];
  campaigns: Campaign[];
  teamMembers: TeamMember[];
  taskCount: number;
}

export function KanbanFilters({
  filters,
  onChange,
  companies,
  campaigns,
  teamMembers,
  taskCount,
}: KanbanFiltersProps) {
  const set = (key: keyof KanbanFilterState, value: string | boolean) =>
    onChange({ ...filters, [key]: value });

  const hasActive =
    filters.client !== 'all' ||
    filters.campaign !== 'all' ||
    filters.priority !== 'all' ||
    filters.assignedTo !== 'all' ||
    filters.blockedOnly;

  const clearAll = () =>
    onChange({
      client: 'all',
      campaign: 'all',
      priority: 'all',
      assignedTo: 'all',
      blockedOnly: false,
      showCompleted: filters.showCompleted,
    });

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-muted-foreground mr-1">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="text-xs font-medium uppercase tracking-wider">Filters</span>
      </div>

      {/* Client */}
      <Select value={filters.client} onValueChange={(v) => set('client', v)}>
        <SelectTrigger className="h-8 w-[150px] text-xs bg-background">
          <SelectValue placeholder="All Clients" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Clients</SelectItem>
          {companies.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Campaign */}
      <Select value={filters.campaign} onValueChange={(v) => set('campaign', v)}>
        <SelectTrigger className="h-8 w-[160px] text-xs bg-background">
          <SelectValue placeholder="All Campaigns" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Campaigns</SelectItem>
          {campaigns.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority */}
      <Select value={filters.priority} onValueChange={(v) => set('priority', v)}>
        <SelectTrigger className="h-8 w-[130px] text-xs bg-background">
          <SelectValue placeholder="All Priorities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          {(Object.keys(PRIORITIES) as Priority[]).map((key) => (
            <SelectItem key={key} value={key}>
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${PRIORITIES[key].dotColor}`} />
                {PRIORITIES[key].label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Assigned To */}
      <Select value={filters.assignedTo} onValueChange={(v) => set('assignedTo', v)}>
        <SelectTrigger className="h-8 w-[140px] text-xs bg-background">
          <SelectValue placeholder="Anyone" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Anyone</SelectItem>
          {teamMembers.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.full_name || m.email || 'Team Member'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Blocked Only */}
      <Button
        variant={filters.blockedOnly ? 'destructive' : 'outline'}
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={() => set('blockedOnly', !filters.blockedOnly)}
      >
        <OctagonAlert className="h-3.5 w-3.5" />
        Blocked
      </Button>

      {/* Show Completed */}
      <Button
        variant={filters.showCompleted ? 'secondary' : 'outline'}
        size="sm"
        className="h-8 text-xs"
        onClick={() => set('showCompleted', !filters.showCompleted)}
      >
        {filters.showCompleted ? 'Hide Done' : 'Show Done'}
      </Button>

      {/* Clear */}
      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground gap-1"
          onClick={clearAll}
        >
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}

      {/* Count */}
      <div className="ml-auto">
        <Badge variant="secondary" className="text-xs font-mono tabular-nums">
          {taskCount} task{taskCount !== 1 ? 's' : ''}
        </Badge>
      </div>
    </div>
  );
}
