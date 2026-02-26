import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TimesheetFiltersProps {
  clients: Array<{ id: string; name: string }>;
  teamMembers: Array<{ id: string; full_name: string | null; email: string | null }>;
  clientFilter: string;
  teamFilter: string;
  startDate: string;
  endDate: string;
  onClientChange: (value: string) => void;
  onTeamChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

export function TimesheetFilters({
  clients,
  teamMembers,
  clientFilter,
  teamFilter,
  startDate,
  endDate,
  onClientChange,
  onTeamChange,
  onStartDateChange,
  onEndDateChange,
}: TimesheetFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1.5 min-w-[160px]">
        <Label className="text-xs">Client</Label>
        <Select value={clientFilter} onValueChange={onClientChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 min-w-[160px]">
        <Label className="text-xs">Team Member</Label>
        <Select value={teamFilter} onValueChange={onTeamChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="All members" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All members</SelectItem>
            {teamMembers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.full_name || m.email || 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">From</Label>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="h-8 text-xs w-[140px]"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">To</Label>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="h-8 text-xs w-[140px]"
        />
      </div>
    </div>
  );
}
