import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompanies';
import { useActivityFeed, type ActivityType } from '@/hooks/useActivityFeed';
import { ActivityFeedItem } from '@/components/client/ActivityFeedItem';
import { CompanyUpdateForm } from '@/components/client/CompanyUpdateForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Activity, Loader2 } from 'lucide-react';

const DATE_RANGES = [
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
  { label: 'All time', value: '365' },
];

const TYPE_OPTIONS: { label: string; value: ActivityType | 'all' }[] = [
  { label: 'All Types', value: 'all' },
  { label: 'Updates', value: 'company_update' },
  { label: 'Change Requests', value: 'change_request' },
  { label: 'File Flags', value: 'file_flag' },
  { label: 'Blocked', value: 'project_blocked' },
  { label: 'Reviews', value: 'deliverable_review' },
  { label: 'Tasks Done', value: 'task_completed' },
  { label: 'Projects Done', value: 'project_completed' },
  { label: 'Approved', value: 'deliverable_approved' },
];

export default function ClientActivity() {
  const { id } = useParams<{ id: string }>();
  const { isTeam, isAdmin } = useAuth();
  const { data: company, isLoading: companyLoading } = useCompany(id);
  const [daysBack, setDaysBack] = useState(90);
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all');

  const { data: items = [], isLoading } = useActivityFeed({
    companyId: id,
    daysBack,
    typeFilter: typeFilter === 'all' ? undefined : [typeFilter],
  });

  if (!isTeam && !isAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">You don't have access to this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (companyLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/clients/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/clients" className="hover:text-foreground transition-colors">
              Clients
            </Link>
            <span>/</span>
            <Link
              to={`/clients/${id}`}
              className="hover:text-foreground transition-colors"
            >
              {company?.name || 'Client'}
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Activity</span>
          </div>
        </div>

        {/* Post Update */}
        {id && <CompanyUpdateForm companyId={id} />}

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as ActivityType | 'all')}
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(daysBack)}
            onValueChange={(v) => setDaysBack(Number(v))}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value} className="text-xs">
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="text-[10px] h-6 px-2">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Badge>
        </div>

        {/* Activity Feed */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">No activity found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting the filters above.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <ActivityFeedItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
