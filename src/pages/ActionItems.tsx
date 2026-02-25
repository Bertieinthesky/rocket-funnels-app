import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useActionItems } from '@/hooks/useActionItems';
import { useCompanies } from '@/hooks/useCompanies';
import { PRIORITIES, type Priority } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  MessageSquare,
  Flag,
  Ban,
  CheckCircle2,
  FolderKanban,
  Building2,
  Loader2,
  Filter,
} from 'lucide-react';

const typeIcons: Record<string, typeof AlertCircle> = {
  change_request: MessageSquare,
  file_flag: Flag,
  project_blocked: Ban,
  deliverable_review: CheckCircle2,
};

const typeLabels: Record<string, string> = {
  change_request: 'Change Request',
  file_flag: 'File Flagged',
  project_blocked: 'Blocked',
  deliverable_review: 'Review Needed',
};

const typeColors: Record<string, string> = {
  change_request:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  file_flag:
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  project_blocked:
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  deliverable_review:
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function ActionItems() {
  const { isTeam, isAdmin } = useAuth();
  const { data: actionItems = [], isLoading } = useActionItems();
  const { data: companies = [] } = useCompanies();

  const [clientFilter, setClientFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  if (!isTeam && !isAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            You don't have access to this page.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Apply filters
  const filtered = actionItems.filter((item) => {
    if (clientFilter !== 'all' && item.company_id !== clientFilter) return false;
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    return true;
  });

  // Group by client
  const grouped = new Map<string, typeof filtered>();
  for (const item of filtered) {
    const key = item.company_name || item.company_id || 'Unknown';
    const existing = grouped.get(key) || [];
    existing.push(item);
    grouped.set(key, existing);
  }

  // Items without a company (e.g. file flags without project context)
  const ungrouped = filtered.filter(
    (item) => !item.company_name && !item.company_id,
  );

  const activeTypes = [
    ...new Set(actionItems.map((i) => i.type)),
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
            Action Items
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Everything across all clients that needs attention.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filter:</span>
          </div>

          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-48 h-9">
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

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {activeTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {typeLabels[type] || type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(clientFilter !== 'all' || typeFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs"
              onClick={() => {
                setClientFilter('all');
                setTypeFilter('all');
              }}
            >
              Clear filters
            </Button>
          )}

          <div className="ml-auto">
            <Badge variant="outline" className="text-xs">
              {filtered.length} item{filtered.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
              <p className="text-lg font-medium">All caught up</p>
              <p className="text-sm text-muted-foreground mt-1">
                {actionItems.length === 0
                  ? 'No action items across any clients.'
                  : 'No items match your current filters.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {[...grouped.entries()].map(([clientName, items]) => (
              <div key={clientName} className="space-y-2">
                {/* Client Group Header */}
                <div className="flex items-center gap-2 pb-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">{clientName}</h3>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {items.length}
                  </Badge>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {items.map((item) => {
                    const TypeIcon = typeIcons[item.type] || AlertCircle;
                    const priorityConfig =
                      PRIORITIES[item.priority as Priority];

                    return (
                      <Card
                        key={item.id}
                        className="hover:border-primary/30 transition-colors"
                      >
                        <CardContent className="py-3 px-4">
                          <div className="flex items-start gap-3">
                            {/* Priority dot + type icon */}
                            <div className="relative mt-0.5">
                              <div
                                className={`p-1.5 rounded-md ${typeColors[item.type] || 'bg-muted text-muted-foreground'}`}
                              >
                                <TypeIcon className="h-3.5 w-3.5" />
                              </div>
                              {priorityConfig && (
                                <span
                                  className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${priorityConfig.dotColor}`}
                                />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <Badge
                                  className={`text-[10px] h-5 px-1.5 ${typeColors[item.type] || ''}`}
                                >
                                  {typeLabels[item.type] || item.type}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">
                                  {formatDistanceToNow(
                                    new Date(item.created_at),
                                    { addSuffix: true },
                                  )}
                                </span>
                              </div>
                              <p className="text-sm line-clamp-1">
                                {item.description}
                              </p>
                              {item.project_name && (
                                <Link
                                  to={`/projects/${item.project_id}`}
                                  className="inline-flex items-center gap-1 mt-1 text-xs text-primary hover:underline"
                                >
                                  <FolderKanban className="h-3 w-3" />
                                  {item.project_name}
                                </Link>
                              )}
                            </div>

                            {/* View button */}
                            {item.project_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs shrink-0"
                                asChild
                              >
                                <Link to={`/projects/${item.project_id}`}>
                                  View
                                </Link>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Ungrouped items (no company) */}
            {ungrouped.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-1">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Other</h3>
                </div>
                <div className="space-y-2">
                  {ungrouped.map((item) => {
                    const TypeIcon = typeIcons[item.type] || AlertCircle;
                    return (
                      <Card key={item.id}>
                        <CardContent className="py-3 px-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-1.5 rounded-md mt-0.5 ${typeColors[item.type] || 'bg-muted'}`}
                            >
                              <TypeIcon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <Badge
                                className={`text-[10px] h-5 px-1.5 mb-0.5 ${typeColors[item.type] || ''}`}
                              >
                                {typeLabels[item.type]}
                              </Badge>
                              <p className="text-sm line-clamp-1">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
