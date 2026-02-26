import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface BillingPeriod {
  label: string;
  start: Date;
  end: Date;
  key: string;
}

export interface PeriodBreakdown {
  totalHours: number;
  regularHours: number;
  overageHours: number;
  overageEntryIds: Set<string>;
}

export function getBillingPeriod(
  entryDate: string,
  paymentSchedule: string | null,
): BillingPeriod {
  const date = new Date(entryDate + 'T00:00:00');

  if (paymentSchedule === '15th') {
    const day = date.getDate();
    let start: Date;
    let end: Date;

    if (day >= 15) {
      start = new Date(date.getFullYear(), date.getMonth(), 15);
      end = new Date(date.getFullYear(), date.getMonth() + 1, 14);
    } else {
      start = new Date(date.getFullYear(), date.getMonth() - 1, 15);
      end = new Date(date.getFullYear(), date.getMonth(), 14);
    }

    const startLabel = format(start, 'MMM d');
    const endLabel = format(end, 'MMM d');
    return { label: `${startLabel} – ${endLabel}`, start, end, key: getPeriodKey(start, paymentSchedule) };
  }

  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return { label: format(date, 'MMM yyyy'), start, end, key: getPeriodKey(start, null) };
}

export function getPeriodKey(periodStart: Date, paymentSchedule: string | null): string {
  if (paymentSchedule === '15th') {
    return format(periodStart, 'yyyy-MM') + '-15';
  }
  return format(periodStart, 'yyyy-MM');
}

export function getCurrentBillingPeriod(paymentSchedule: string | null): BillingPeriod {
  const today = format(new Date(), 'yyyy-MM-dd');
  return getBillingPeriod(today, paymentSchedule);
}

export function getAllBillingPeriods<T extends { date: string; id: string; hours: number }>(
  entries: T[],
  paymentSchedule: string | null,
): Map<string, { period: BillingPeriod; entries: T[] }> {
  const groups = new Map<string, { period: BillingPeriod; entries: T[] }>();

  for (const entry of entries) {
    const period = getBillingPeriod(entry.date, paymentSchedule);
    const existing = groups.get(period.key);
    if (existing) {
      existing.entries.push(entry);
    } else {
      groups.set(period.key, { period, entries: [entry] });
    }
  }

  // Sort entries within each group by date ascending
  for (const group of groups.values()) {
    group.entries.sort((a, b) => a.date.localeCompare(b.date));
  }

  return groups;
}

export function computePeriodBreakdown<T extends { id: string; hours: number; date: string }>(
  entries: T[],
  hoursAllocated: number,
): PeriodBreakdown {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const totalHours = sorted.reduce((sum, e) => sum + e.hours, 0);
  const overageEntryIds = new Set<string>();

  let cumulative = 0;
  for (const entry of sorted) {
    cumulative += entry.hours;
    if (cumulative > hoursAllocated) {
      overageEntryIds.add(entry.id);
    }
  }

  return {
    totalHours,
    regularHours: Math.min(totalHours, hoursAllocated),
    overageHours: Math.max(totalHours - hoursAllocated, 0),
    overageEntryIds,
  };
}
