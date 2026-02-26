import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import {
  useBillingPeriods,
  useUpsertBillingStatus,
  type BillingStatus,
} from '@/hooks/useBillingPeriods';
import { useToast } from '@/hooks/use-toast';
import {
  getAllBillingPeriods,
  computePeriodBreakdown,
  getCurrentBillingPeriod,
} from '@/lib/billing';
import {
  ChevronDown,
  ChevronRight,
  Receipt,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_OPTIONS: { value: BillingStatus; label: string }[] = [
  { value: 'under_review', label: 'Under Review' },
  { value: 'invoice_sent', label: 'Invoice Sent' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'paid', label: 'Paid' },
];

const STATUS_COLORS: Record<BillingStatus, string> = {
  under_review:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  invoice_sent:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  follow_up:
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
};

interface BillingHistoryProps {
  companyId: string;
  hoursAllocated: number;
  hourlyRate: number;
  paymentSchedule: string | null;
}

export function BillingHistory({
  companyId,
  hoursAllocated,
  hourlyRate,
  paymentSchedule,
}: BillingHistoryProps) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: entries = [], isLoading: entriesLoading } = useTimeEntries({
    companyId,
    fetchAll: true,
  });
  const { data: statusRecords = [], isLoading: statusLoading } =
    useBillingPeriods(companyId);
  const upsertStatus = useUpsertBillingStatus();

  // Group entries into billing periods
  const periods = useMemo(() => {
    if (entries.length === 0) return [];

    const groups = getAllBillingPeriods(entries, paymentSchedule);
    const currentPeriod = getCurrentBillingPeriod(paymentSchedule);

    // Build status lookup
    const statusMap = new Map(
      statusRecords.map((s) => [s.period_key, s]),
    );

    // Convert to array, exclude current period, sort newest first
    return [...groups.entries()]
      .filter(([key]) => key !== currentPeriod.key)
      .map(([key, { period, entries: periodEntries }]) => {
        const breakdown = computePeriodBreakdown(periodEntries, hoursAllocated);
        const existingStatus = statusMap.get(key);

        return {
          key,
          period,
          entries: periodEntries,
          breakdown,
          status: (existingStatus?.status || 'under_review') as BillingStatus,
          statusId: existingStatus?.id || null,
        };
      })
      .sort((a, b) => b.period.start.getTime() - a.period.start.getTime());
  }, [entries, paymentSchedule, statusRecords, hoursAllocated]);

  // Auto-create billing status records for periods that don't have them
  useEffect(() => {
    if (statusLoading || entriesLoading || periods.length === 0) return;

    const statusKeys = new Set(statusRecords.map((s) => s.period_key));

    for (const p of periods) {
      if (!statusKeys.has(p.key)) {
        upsertStatus.mutate({
          company_id: companyId,
          period_key: p.key,
          period_start: format(p.period.start, 'yyyy-MM-dd'),
          period_end: format(p.period.end, 'yyyy-MM-dd'),
          period_label: p.period.label,
          hours_allocated: hoursAllocated,
          hourly_rate: hourlyRate,
          status: 'under_review',
        });
      }
    }
    // Only run when periods list changes, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periods.length, statusRecords.length]);

  const handleStatusChange = (periodKey: string, newStatus: BillingStatus) => {
    const period = periods.find((p) => p.key === periodKey);
    if (!period) return;

    upsertStatus.mutate(
      {
        company_id: companyId,
        period_key: periodKey,
        period_start: format(period.period.start, 'yyyy-MM-dd'),
        period_end: format(period.period.end, 'yyyy-MM-dd'),
        period_label: period.period.label,
        hours_allocated: hoursAllocated,
        hourly_rate: hourlyRate,
        status: newStatus,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Status updated',
            description: `${period.period.label} marked as ${STATUS_OPTIONS.find((o) => o.value === newStatus)?.label}.`,
          });
        },
      },
    );
  };

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (entriesLoading || statusLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (periods.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No previous billing periods yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {periods.map((p) => {
        const isExpanded = expanded.has(p.key);
        const regularAmount = p.breakdown.regularHours * hourlyRate;
        const overageAmount = p.breakdown.overageHours * hourlyRate * 1.15;
        const totalAmount = regularAmount + overageAmount;

        return (
          <Card key={p.key}>
            <CardHeader
              className="pb-3 cursor-pointer"
              onClick={() => toggleExpanded(p.key)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <CardTitle className="text-sm">{p.period.label}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.breakdown.totalHours.toFixed(1)} hrs total
                      {p.breakdown.overageHours > 0 && (
                        <span className="text-red-500 ml-1">
                          ({p.breakdown.overageHours.toFixed(1)} overage)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-sm font-medium">
                    ${totalAmount.toFixed(2)}
                  </span>
                  {isAdmin ? (
                    <Select
                      value={p.status}
                      onValueChange={(v) =>
                        handleStatusChange(p.key, v as BillingStatus)
                      }
                    >
                      <SelectTrigger className="h-7 w-[130px] text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="text-xs"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${STATUS_COLORS[p.status]}`}
                    >
                      {STATUS_OPTIONS.find((o) => o.value === p.status)?.label}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 space-y-3">
                {/* Breakdown */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 rounded-md bg-muted/50">
                    <p className="text-lg font-semibold">
                      {p.breakdown.regularHours.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Regular Hours
                    </p>
                  </div>
                  <div className="p-2 rounded-md bg-muted/50">
                    <p
                      className={`text-lg font-semibold ${p.breakdown.overageHours > 0 ? 'text-red-500' : ''}`}
                    >
                      {p.breakdown.overageHours.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Overage Hours
                    </p>
                  </div>
                  <div className="p-2 rounded-md bg-muted/50">
                    <p className="text-lg font-semibold">
                      ${totalAmount.toFixed(0)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Total Amount
                    </p>
                  </div>
                </div>

                {/* Entries table */}
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium">
                          Date
                        </th>
                        <th className="px-3 py-2 text-left font-medium">
                          Team Member
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
                      </tr>
                    </thead>
                    <tbody>
                      {p.entries.map((entry) => {
                        const isOverage = p.breakdown.overageEntryIds.has(
                          entry.id,
                        );
                        return (
                          <tr
                            key={entry.id}
                            className="border-b last:border-0 hover:bg-muted/30"
                          >
                            <td className="px-3 py-2 whitespace-nowrap">
                              {format(
                                new Date(entry.date + 'T00:00:00'),
                                'MMM d',
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {(entry as any).user_name ||
                                (entry as any).user_email ||
                                '—'}
                            </td>
                            <td className="px-3 py-2">
                              {(entry as any).project_name || '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              <span className="flex items-center justify-end gap-1">
                                {entry.hours.toFixed(1)}
                                {isOverage && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[9px] h-4 px-1"
                                  >
                                    Overage
                                  </Badge>
                                )}
                              </span>
                            </td>
                            <td className="px-3 py-2 max-w-[200px] truncate">
                              {(entry as any).description || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Amount breakdown */}
                {p.breakdown.overageHours > 0 && (
                  <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
                    <p>
                      Regular: {p.breakdown.regularHours.toFixed(1)}h ×{' '}
                      ${hourlyRate.toFixed(0)}/hr = ${regularAmount.toFixed(2)}
                    </p>
                    <p className="text-red-500">
                      Overage: {p.breakdown.overageHours.toFixed(1)}h ×{' '}
                      ${(hourlyRate * 1.15).toFixed(0)}/hr ={' '}
                      ${overageAmount.toFixed(2)}
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
