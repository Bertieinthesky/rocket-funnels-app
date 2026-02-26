import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { CompanyUpdateForm } from './CompanyUpdateForm';
import { SetReminderDialog } from './SetReminderDialog';
import { ActivityFeedItem } from './ActivityFeedItem';
import { useActivityFeed, type ActivityType } from '@/hooks/useActivityFeed';
import { useReminders, useCompleteReminder } from '@/hooks/useReminders';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowRight,
  Loader2,
  Activity,
  CheckCircle2,
  Bell,
  Check,
} from 'lucide-react';
import { formatDistanceToNow, format, isPast, isToday } from 'date-fns';

interface ActivityTabProps {
  companyId: string;
}

const ACTION_ITEM_TYPES: ActivityType[] = [
  'change_request',
  'file_flag',
  'project_blocked',
  'deliverable_review',
];

const ACTIVITY_FILTER_OPTIONS: { label: string; value: ActivityType | 'all' }[] = [
  { label: 'All Activity', value: 'all' },
  { label: 'Updates', value: 'company_update' },
  { label: 'Hours Logged', value: 'hours_logged' },
  { label: 'Files Uploaded', value: 'file_uploaded' },
  { label: 'Credentials', value: 'credential_added' },
  { label: 'Notes', value: 'note_added' },
  { label: 'Tasks Done', value: 'task_completed' },
  { label: 'Projects Done', value: 'project_completed' },
  { label: 'Approved', value: 'deliverable_approved' },
];

export function ActivityTab({ companyId }: ActivityTabProps) {
  const { user } = useAuth();
  const [activityFilter, setActivityFilter] = useState<ActivityType | 'all'>('all');

  const { data: items = [], isLoading } = useActivityFeed({
    companyId,
    limit: 30,
  });

  const { data: reminders = [] } = useReminders(companyId);
  const completeReminder = useCompleteReminder();

  // Only show current user's reminders in action items
  const myReminders = reminders.filter((r) => r.user_id === user?.id);

  // Split into action items vs general activity
  const actionItems = items.filter((i) => ACTION_ITEM_TYPES.includes(i.type));
  const activityItems = items.filter((i) => !ACTION_ITEM_TYPES.includes(i.type));

  // Apply activity type filter
  const filteredActivity =
    activityFilter === 'all'
      ? activityItems
      : activityItems.filter((i) => i.type === activityFilter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with both buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Overview</h3>
          <p className="text-sm text-muted-foreground">
            Action items, reminders, and activity log for this client.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SetReminderDialog companyId={companyId} />
          <CompanyUpdateForm companyId={companyId} />
        </div>
      </div>

      {/* Action Items Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Action Items</h4>
          {(actionItems.length + myReminders.length) > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
              {actionItems.length + myReminders.length}
            </Badge>
          )}
        </div>

        {/* Reminders sub-group */}
        {myReminders.length > 0 && (
          <div className="space-y-1.5">
            {myReminders.map((reminder) => {
              const overdue =
                reminder.due_date &&
                isPast(new Date(reminder.due_date)) &&
                !isToday(new Date(reminder.due_date));
              return (
                <Card
                  key={reminder.id}
                  className="border-orange-200 dark:border-orange-800/30"
                >
                  <CardContent className="py-2.5 px-3 flex items-start gap-3">
                    <div className="p-1.5 rounded-md shrink-0 bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                      <Bell className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-5 px-1.5"
                        >
                          Reminder
                        </Badge>
                        {reminder.due_date && (
                          <span
                            className={`text-[11px] ${
                              overdue
                                ? 'text-red-500 font-medium'
                                : 'text-muted-foreground'
                            }`}
                          >
                            Due {format(new Date(reminder.due_date), 'MMM d')}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground ml-auto">
                          {formatDistanceToNow(new Date(reminder.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{reminder.content}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() =>
                        completeReminder.mutate({
                          id: reminder.id,
                          companyId,
                        })
                      }
                      disabled={completeReminder.isPending}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Existing action items */}
        {actionItems.length === 0 && myReminders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-4 flex items-center justify-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">
                No current action items — all caught up!
              </span>
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
          <div className="ml-auto">
            <Select
              value={activityFilter}
              onValueChange={(v) =>
                setActivityFilter(v as ActivityType | 'all')
              }
            >
              <SelectTrigger className="w-[150px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_FILTER_OPTIONS.map((opt) => (
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
          </div>
        </div>

        {filteredActivity.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center text-muted-foreground">
              <p className="text-sm">
                No recent activity matching this filter.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredActivity.map((item) => (
              <ActivityFeedItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* See All link */}
      <div className="flex justify-center pt-2">
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <Link to={`/clients/${companyId}/activity`}>
            See all activity
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
