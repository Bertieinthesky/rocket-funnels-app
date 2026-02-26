import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CompanyUpdateForm } from './CompanyUpdateForm';
import { ActivityFeedItem } from './ActivityFeedItem';
import { useActivityFeed, type ActivityType } from '@/hooks/useActivityFeed';
import {
  ArrowRight,
  Loader2,
  Activity,
  CheckCircle2,
  Bell,
} from 'lucide-react';

interface ActivityTabProps {
  companyId: string;
}

const ACTION_ITEM_TYPES: ActivityType[] = [
  'change_request',
  'file_flag',
  'project_blocked',
  'deliverable_review',
];

export function ActivityTab({ companyId }: ActivityTabProps) {
  const { data: items = [], isLoading } = useActivityFeed({
    companyId,
    limit: 30,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Split into action items vs general activity
  const actionItems = items.filter((i) => ACTION_ITEM_TYPES.includes(i.type));
  const activityItems = items.filter((i) => !ACTION_ITEM_TYPES.includes(i.type));

  return (
    <div className="space-y-6">
      {/* Header with Post Update button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Activity</h3>
          <p className="text-sm text-muted-foreground">
            Action items, updates, and milestones for this client.
          </p>
        </div>
        <CompanyUpdateForm companyId={companyId} />
      </div>

      {/* Action Items Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Action Items</h4>
          {actionItems.length > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
              {actionItems.length}
            </Badge>
          )}
        </div>

        {actionItems.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-4 flex items-center justify-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">No current action items — all caught up!</span>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {actionItems.map((item) => (
              <ActivityFeedItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Recent Activity</h4>
        </div>

        {activityItems.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center text-muted-foreground">
              <p className="text-sm">No recent activity. Post an update or complete tasks to see activity here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {activityItems.map((item) => (
              <ActivityFeedItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* See All link */}
      {items.length >= 20 && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link to={`/clients/${companyId}/activity`}>
              See all activity
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
