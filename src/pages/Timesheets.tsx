import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { TimesheetFilters } from '@/components/time/TimesheetFilters';
import { LogTimeDialog } from '@/components/time/LogTimeDialog';
import { EditTimeEntryDialog } from '@/components/time/EditTimeEntryDialog';
import { useTimeEntries, useDeleteTimeEntry, type TimeEntry } from '@/hooks/useTimeEntries';
import { useCompanies } from '@/hooks/useCompanies';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getBillingPeriod } from '@/lib/billing';
import {
  Loader2,
  Clock,
  Plus,
  ChevronDown,
  ChevronRight,
  Package,
  Pencil,
  Trash2,
} from 'lucide-react';
import { format, startOfMonth } from 'date-fns';

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return email?.slice(0, 2).toUpperCase() || 'U';
}

export default function Timesheets() {
  const now = new Date();
  const { isAdmin, isTeam } = useAuth();
  const { toast } = useToast();
  const [clientFilter, setClientFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [startDate, setStartDate] = useState(
    format(startOfMonth(now), 'yyyy-MM-dd'),
  );
  const [endDate, setEndDate] = useState(format(now, 'yyyy-MM-dd'));
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [logTimeOpen, setLogTimeOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  const { data: entries = [], isLoading } = useTimeEntries({
    fetchAll: true,
    startDate,
    endDate,
  });
  const { data: companies = [] } = useCompanies({ filter: 'active' });
  const { data: teamMembers = [] } = useTeamMembers();
  const deleteEntry = useDeleteTimeEntry();

  // Build payment schedule lookup by company id
  const paymentScheduleMap = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const c of companies) {
      map.set(c.id, (c as any).payment_schedule ?? null);
    }
    return map;
  }, [companies]);

  const handleDelete = async (entry: TimeEntry) => {
    try {
      await deleteEntry.mutateAsync(entry.id);
      toast({ title: 'Entry deleted', description: `${entry.hours}h removed.` });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete entry.',
        variant: 'destructive',
      });
    }
  };

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = entries;
    if (clientFilter !== 'all') {
      result = result.filter((e) => e.company_id === clientFilter);
    }
    if (teamFilter !== 'all') {
      result = result.filter((e) => e.user_id === teamFilter);
    }
    return result;
  }, [entries, clientFilter, teamFilter]);

  // Group by user
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      {
        userId: string;
        userName: string | null;
        userEmail: string | null;
        totalHours: number;
        entries: typeof filtered;
      }
    >();

    for (const entry of filtered) {
      const existing = map.get(entry.user_id);
      if (existing) {
        existing.totalHours += entry.hours;
        existing.entries.push(entry);
      } else {
        map.set(entry.user_id, {
          userId: entry.user_id,
          userName: entry.user_name || null,
          userEmail: entry.user_email || null,
          totalHours: entry.hours,
          entries: [entry],
        });
      }
    }

    return [...map.values()].sort((a, b) => b.totalHours - a.totalHours);
  }, [filtered]);

  const totalHours = filtered.reduce((sum, e) => sum + e.hours, 0);

  const toggleCollapse = (userId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Timesheets</h1>
            <p className="text-sm text-muted-foreground">
              Time entries across all team members and clients.
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setLogTimeOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Log Time
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <TimesheetFilters
              clients={companies}
              teamMembers={teamMembers}
              clientFilter={clientFilter}
              teamFilter={teamFilter}
              startDate={startDate}
              endDate={endDate}
              onClientChange={setClientFilter}
              onTeamChange={setTeamFilter}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {totalHours.toFixed(1)} hours total
          </span>
          <span className="text-sm text-muted-foreground">
            across {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : grouped.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No time entries found for the selected filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {grouped.map((group) => {
              const isCollapsed = collapsed.has(group.userId);
              return (
                <Card key={group.userId}>
                  <CardHeader
                    className="pb-3 cursor-pointer"
                    onClick={() => toggleCollapse(group.userId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(group.userName, group.userEmail)}
                          </AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-sm">
                          {group.userName || group.userEmail || 'Unknown'}
                        </CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {group.totalHours.toFixed(1)} hrs
                      </Badge>
                    </div>
                  </CardHeader>

                  {!isCollapsed && (
                    <CardContent className="pt-0">
                      <div className="rounded-md border overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="px-3 py-2 text-left font-medium">
                                Date
                              </th>
                              <th className="px-3 py-2 text-left font-medium">
                                Client
                              </th>
                              <th className="px-3 py-2 text-left font-medium">
                                Campaign
                              </th>
                              <th className="px-3 py-2 text-right font-medium">
                                Hours
                              </th>
                              <th className="px-3 py-2 text-left font-medium">
                                Description
                              </th>
                              <th className="px-3 py-2 text-left font-medium">
                                Billing Period
                              </th>
                              {(isAdmin || isTeam) && (
                                <th className="px-3 py-2 text-center font-medium">
                                  Actions
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {group.entries.map((entry) => {
                              const billing = getBillingPeriod(
                                entry.date,
                                paymentScheduleMap.get(entry.company_id) ?? null,
                              );
                              return (
                                <tr
                                  key={entry.id}
                                  className="border-b last:border-0 hover:bg-muted/30"
                                >
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    {format(new Date(entry.date), 'MMM d')}
                                  </td>
                                  <td className="px-3 py-2">
                                    {entry.company_name || '—'}
                                  </td>
                                  <td className="px-3 py-2">
                                    {entry.project_name || '—'}
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium">
                                    {entry.hours.toFixed(1)}
                                  </td>
                                  <td className="px-3 py-2 max-w-[200px] truncate">
                                    {entry.description || '—'}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    <Badge variant="outline" className="text-[10px] font-normal">
                                      {billing.label}
                                    </Badge>
                                  </td>
                                  {(isAdmin || isTeam) && (
                                    <td className="px-3 py-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        {entry.is_deliverable && (
                                          <Package className="h-3 w-3 text-primary" />
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingEntry(entry);
                                          }}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        {isAdmin && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDelete(entry);
                                            }}
                                            disabled={deleteEntry.isPending}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <LogTimeDialog open={logTimeOpen} onOpenChange={setLogTimeOpen} />
      {editingEntry && (
        <EditTimeEntryDialog
          entry={editingEntry}
          open={!!editingEntry}
          onOpenChange={(open) => !open && setEditingEntry(null)}
        />
      )}
    </DashboardLayout>
  );
}
