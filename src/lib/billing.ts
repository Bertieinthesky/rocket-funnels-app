import { format, startOfMonth, endOfMonth } from 'date-fns';

export function getBillingPeriod(
  entryDate: string,
  paymentSchedule: string | null,
): { label: string; start: Date; end: Date } {
  const date = new Date(entryDate + 'T00:00:00');

  if (paymentSchedule === '15th') {
    const day = date.getDate();
    let start: Date;
    let end: Date;

    if (day >= 15) {
      // Period: 15th of this month to 14th of next month
      start = new Date(date.getFullYear(), date.getMonth(), 15);
      end = new Date(date.getFullYear(), date.getMonth() + 1, 14);
    } else {
      // Period: 15th of previous month to 14th of this month
      start = new Date(date.getFullYear(), date.getMonth() - 1, 15);
      end = new Date(date.getFullYear(), date.getMonth(), 14);
    }

    const startLabel = format(start, 'MMM d');
    const endLabel = format(end, 'MMM d');
    return { label: `${startLabel} – ${endLabel}`, start, end };
  }

  // Default "1st" schedule: calendar month
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return { label: format(date, 'MMM yyyy'), start, end };
}
