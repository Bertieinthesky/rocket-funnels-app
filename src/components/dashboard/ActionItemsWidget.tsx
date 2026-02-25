import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MessageSquare,
  Flag,
  Ban,
  CheckCircle,
  ArrowRight,
  Inbox,
} from 'lucide-react';
import type { ActionItem } from '@/hooks/useActionItems';
import { formatDistanceToNow } from 'date-fns';

interface ActionItemsWidgetProps {
  items: ActionItem[];
  isLoading?: boolean;
  maxItems?: number;
  title?: string;
}

const typeConfig: Record<
  ActionItem['type'],
  { icon: typeof MessageSquare; label: string; color: string }
> = {
  change_request: {
    icon: MessageSquare,
    label: 'Change Request',
    color: 'text-orange-600 dark:text-orange-400',
  },
  file_flag: {
    icon: Flag,
    label: 'File Flag',
    color: 'text-blue-600 dark:text-blue-400',
  },
  project_blocked: {
    icon: Ban,
    label: 'Blocked',
    color: 'text-red-600 dark:text-red-400',
  },
  deliverable_review: {
    icon: CheckCircle,
    label: 'Review',
    color: 'text-emerald-600 dark:text-emerald-400',
  },
};

const priorityBorder: Record<string, string> = {
  urgent: 'border-l-red-500',
  important: 'border-l-yellow-500',
  normal: 'border-l-green-500',
  queued: 'border-l-purple-500',
};

export function ActionItemsWidget({
  items,
  isLoading,
  maxItems = 8,
  title = 'Action Items',
}: ActionItemsWidgetProps) {
  const displayed = items.slice(0, maxItems);
  const remaining = items.length - maxItems;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {items.length > 0 && (
            <Badge
              variant="destructive"
              className="text-[10px] h-5 min-w-[20px] justify-center tabular-nums"
            >
              {items.length}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" asChild>
          <Link to="/action-items">
            View All <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/60">
            <Inbox className="h-8 w-8 mb-2" />
            <p className="text-xs">No action items</p>
          </div>
        ) : (
          <div className="space-y-1">
            {displayed.map((item) => {
              const config = typeConfig[item.type];
              const Icon = config.icon;
              const borderColor = priorityBorder[item.priority] || priorityBorder.normal;

              const content = (
                <div
                  className={`flex items-start gap-3 p-2.5 rounded-lg border-l-2 ${borderColor} hover:bg-muted/50 transition-colors cursor-pointer group`}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="mt-0.5 shrink-0">
                        <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs">
                      {config.label}
                    </TooltipContent>
                  </Tooltip>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium truncate">{item.title}</p>
                      {item.project_name && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          — {item.project_name}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      {item.description}
                    </p>
                  </div>

                  <span className="text-[10px] text-muted-foreground/70 shrink-0 mt-0.5">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </span>
                </div>
              );

              if (item.project_id) {
                return (
                  <Link key={item.id} to={`/projects/${item.project_id}`} className="block">
                    {content}
                  </Link>
                );
              }

              return <div key={item.id}>{content}</div>;
            })}

            {remaining > 0 && (
              <Link
                to="/action-items"
                className="block text-center py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                +{remaining} more item{remaining !== 1 ? 's' : ''}
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
