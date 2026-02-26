import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

export interface StatItem {
  label: string;
  value: number | string;
  icon: LucideIcon;
  subtitle?: string;
  accent?: 'default' | 'destructive' | 'warning' | 'success';
}

interface StatsRowProps {
  stats: StatItem[];
}

const accentMap = {
  default: 'text-foreground',
  destructive: 'text-red-600 dark:text-red-400',
  warning: 'text-orange-600 dark:text-orange-400',
  success: 'text-emerald-600 dark:text-emerald-400',
};

const iconBgMap = {
  default: 'bg-foreground/5',
  destructive: 'bg-red-100 dark:bg-red-900/20',
  warning: 'bg-orange-100 dark:bg-orange-900/20',
  success: 'bg-emerald-100 dark:bg-emerald-900/20',
};

// Map stat count → Tailwind md grid class
const mdGridCols: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
};

export function StatsRow({ stats }: StatsRowProps) {
  const mdClass = mdGridCols[stats.length] || 'md:grid-cols-4';

  return (
    <div className={`grid grid-cols-2 ${mdClass} gap-3`}>
      {stats.map((stat, i) => {
        const accent = stat.accent || 'default';
        const Icon = stat.icon;

        return (
          <Card
            key={stat.label}
            className={`overflow-hidden ${stats.length % 2 !== 0 && i === stats.length - 1 ? 'col-span-2 md:col-span-1' : ''}`}
          >
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${iconBgMap[accent]}`}
                >
                  <Icon className={`h-4 w-4 ${accentMap[accent]}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                    {stat.label}
                  </p>
                  <p className={`text-xl font-semibold tabular-nums leading-tight ${accentMap[accent]}`}>
                    {stat.value}
                  </p>
                  {stat.subtitle && (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {stat.subtitle}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
