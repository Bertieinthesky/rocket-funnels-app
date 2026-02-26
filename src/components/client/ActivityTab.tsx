import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CompanyUpdateForm } from './CompanyUpdateForm';
import { ActivityFeedItem } from './ActivityFeedItem';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { ArrowRight, Loader2, Activity } from 'lucide-react';

interface ActivityTabProps {
  companyId: string;
}

export function ActivityTab({ companyId }: ActivityTabProps) {
  const { data: items = [], isLoading } = useActivityFeed({
    companyId,
    limit: 20,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Post Update button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Activity</h3>
          <p className="text-sm text-muted-foreground">
            Updates, action items, and milestones for this client.
          </p>
        </div>
        <CompanyUpdateForm companyId={companyId} />
      </div>

      {/* Activity Feed */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">No activity yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Post an update or activity from campaigns and tasks will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ActivityFeedItem key={item.id} item={item} />
          ))}
        </div>
      )}

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
