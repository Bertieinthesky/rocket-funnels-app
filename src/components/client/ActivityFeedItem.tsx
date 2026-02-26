import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  Flag,
  AlertTriangle,
  CheckCircle2,
  ListChecks,
  FolderKanban,
  FileText,
  ThumbsUp,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Clock,
  Upload,
  KeyRound,
  StickyNote,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ActivityItem, ActivityType } from '@/hooks/useActivityFeed';

interface ActivityFeedItemProps {
  item: ActivityItem;
}

const TYPE_CONFIG: Record<
  ActivityType,
  {
    icon: React.ElementType;
    label: string;
    badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
    bgClass: string;
  }
> = {
  company_update: {
    icon: MessageSquare,
    label: 'Update',
    badgeVariant: 'default',
    bgClass: 'bg-primary/10 text-primary',
  },
  change_request: {
    icon: MessageSquare,
    label: 'Change Request',
    badgeVariant: 'default',
    bgClass: 'bg-primary/10 text-primary',
  },
  file_flag: {
    icon: Flag,
    label: 'File Flagged',
    badgeVariant: 'destructive',
    bgClass: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  },
  project_blocked: {
    icon: AlertTriangle,
    label: 'Blocked',
    badgeVariant: 'destructive',
    bgClass: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  },
  deliverable_review: {
    icon: CheckCircle2,
    label: 'Review Needed',
    badgeVariant: 'secondary',
    bgClass: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  task_completed: {
    icon: ListChecks,
    label: 'Task Done',
    badgeVariant: 'outline',
    bgClass: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  },
  project_completed: {
    icon: FolderKanban,
    label: 'Project Done',
    badgeVariant: 'outline',
    bgClass: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  },
  deliverable_approved: {
    icon: ThumbsUp,
    label: 'Approved',
    badgeVariant: 'outline',
    bgClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  hours_logged: {
    icon: Clock,
    label: 'Hours Logged',
    badgeVariant: 'outline',
    bgClass: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  },
  file_uploaded: {
    icon: Upload,
    label: 'File Uploaded',
    badgeVariant: 'outline',
    bgClass: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  },
  credential_added: {
    icon: KeyRound,
    label: 'Credential Added',
    badgeVariant: 'outline',
    bgClass: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  },
  note_added: {
    icon: StickyNote,
    label: 'Note Added',
    badgeVariant: 'outline',
    bgClass: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  },
};

export function ActivityFeedItem({ item }: ActivityFeedItemProps) {
  const [expanded, setExpanded] = useState(false);
  const config = TYPE_CONFIG[item.type];
  const Icon = config.icon;

  const truncatedDesc =
    item.description.length > 120
      ? item.description.slice(0, 120) + '...'
      : item.description;

  return (
    <div
      className="rounded-lg border bg-card transition-all hover:border-border hover:shadow-sm cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Compact row */}
      <div className="flex items-start gap-3 p-3">
        <div className={`p-1.5 rounded-md shrink-0 ${config.bgClass}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={config.badgeVariant} className="text-[10px] h-5 px-1.5">
              {config.label}
            </Badge>
            {item.project_name && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1">
                <FolderKanban className="h-2.5 w-2.5" />
                {item.project_name}
              </Badge>
            )}
            {item.file_name && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1">
                <FileText className="h-2.5 w-2.5" />
                {item.file_name}
              </Badge>
            )}
            <span className="text-[11px] text-muted-foreground ml-auto shrink-0">
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm mt-1">
            <span className="font-medium">{item.title}</span>
            {!expanded && item.type !== 'company_update' && (
              <span className="text-muted-foreground"> — {truncatedDesc}</span>
            )}
            {!expanded && item.type === 'company_update' && (
              <span className="text-muted-foreground">
                {' '}
                — {truncatedDesc}
              </span>
            )}
          </p>
        </div>

        <div className="shrink-0 text-muted-foreground">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t mx-3 mb-3 mt-0 pt-3">
          <p className="text-sm whitespace-pre-wrap text-muted-foreground mb-3">
            {item.description}
          </p>

          {item.author_name && (
            <p className="text-xs text-muted-foreground mb-3">
              By {item.author_name}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {item.project_id && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" asChild>
                <Link
                  to={`/projects/${item.project_id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                  View Campaign
                </Link>
              </Button>
            )}

            {item.type === 'project_blocked' && item.project_id && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" asChild>
                <Link
                  to={`/projects/${item.project_id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <AlertTriangle className="h-3 w-3" />
                  Resolve Block
                </Link>
              </Button>
            )}

            {item.type === 'deliverable_review' && item.project_id && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" asChild>
                <Link
                  to={`/projects/${item.project_id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Review Deliverable
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
