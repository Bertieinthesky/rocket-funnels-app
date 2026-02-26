import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EditTimeEntryDialog } from './EditTimeEntryDialog';
import { useTimeEntries, useDeleteTimeEntry, type TimeEntry } from '@/hooks/useTimeEntries';
import { useCompanies } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getBillingPeriod } from '@/lib/billing';
import { Trash2, Pencil, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface TimeEntriesTableProps {
  companyId: string;
}

export function TimeEntriesTable({ companyId }: TimeEntriesTableProps) {
  const { isAdmin, isTeam } = useAuth();
  const { toast } = useToast();
  const { data: entries = [], isLoading } = useTimeEntries({ companyId });
  const { data: companies = [] } = useCompanies({ filter: 'active' });
  const deleteEntry = useDeleteTimeEntry();
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  const paymentSchedule = companies.find((c) => c.id === companyId)
    ? ((companies.find((c) => c.id === companyId) as any)?.payment_schedule ?? null)
    : null;

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          No time entries yet. Click "Log Time" to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Team Member</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead>Task</TableHead>
            <TableHead className="text-right">Hours</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Billing Period</TableHead>
            {(isAdmin || isTeam) && <TableHead className="w-20" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const billing = getBillingPeriod(entry.date, paymentSchedule);
            return (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap text-sm">
                  {format(new Date(entry.date + 'T00:00:00'), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-sm">
                  {entry.user_name || entry.user_email || 'Unknown'}
                </TableCell>
                <TableCell className="text-sm">
                  {entry.project_name ? (
                    <Badge variant="secondary" className="text-xs">
                      {entry.project_name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm max-w-[150px] truncate">
                  {entry.task_title || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium text-sm">
                  {entry.hours}h
                </TableCell>
                <TableCell className="text-sm max-w-[200px] truncate text-muted-foreground">
                  {entry.description || '—'}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {billing.label}
                  </Badge>
                </TableCell>
                {(isAdmin || isTeam) && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditingEntry(entry)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(entry)}
                          disabled={deleteEntry.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}

          {/* Total row */}
          <TableRow className="border-t-2 font-medium">
            <TableCell colSpan={4} className="text-sm">
              Total
            </TableCell>
            <TableCell className="text-right text-sm">
              {totalHours.toFixed(1)}h
            </TableCell>
            <TableCell colSpan={(isAdmin || isTeam) ? 3 : 2} />
          </TableRow>
        </TableBody>
      </Table>

      {editingEntry && (
        <EditTimeEntryDialog
          entry={editingEntry}
          open={!!editingEntry}
          onOpenChange={(open) => !open && setEditingEntry(null)}
        />
      )}
    </div>
  );
}
