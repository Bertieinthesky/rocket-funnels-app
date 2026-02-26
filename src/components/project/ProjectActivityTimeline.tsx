import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Update } from '@/hooks/useUpdates';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ExternalLink,
  FileText,
  Video,
  Link as LinkIcon,
} from 'lucide-react';
import { format } from 'date-fns';

const getLinkIcon = (type: string | null) => {
  if (type === 'loom' || type === 'youtube' || type === 'vimeo') return Video;
  if (type === 'figma') return FileText;
  return LinkIcon;
};

const getLinkLabel = (type: string | null) => {
  const labels: Record<string, string> = {
    loom: 'Loom',
    youtube: 'YouTube',
    vimeo: 'Vimeo',
    figma: 'Figma',
    google_docs: 'Google Docs',
    google_drive: 'Google Drive',
    google_sheets: 'Sheets',
    canva: 'Canva',
    notion: 'Notion',
  };
  return type ? labels[type] || 'Link' : 'Link';
};

function getInitials(name?: string | null) {
  if (!name) return 'T';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface ProjectActivityTimelineProps {
  updates: Update[];
  onBack: () => void;
}

export function ProjectActivityTimeline({ updates, onBack }: ProjectActivityTimelineProps) {
  // Group updates by date (descending), within each day show oldest-first
  const dateGroups = useMemo(() => {
    const groups = new Map<string, Update[]>();
    for (const update of updates) {
      const key = format(new Date(update.created_at), 'yyyy-MM-dd');
      const list = groups.get(key) || [];
      list.push(update);
      groups.set(key, list);
    }

    // Sort date keys descending (newest first)
    const sorted = [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));

    // Within each day, reverse to show oldest-first (chronological)
    return sorted.map(([dateKey, dayUpdates]) => ({
      dateKey,
      label: format(new Date(dateKey + 'T00:00:00'), 'EEEE, MMMM d, yyyy'),
      updates: [...dayUpdates].reverse(),
    }));
  }, [updates]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Overview
        </Button>
        <span className="text-sm font-medium">
          All Activity
        </span>
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
          {updates.length} updates
        </Badge>
      </div>

      {/* Timeline */}
      {dateGroups.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="mx-auto h-8 w-8 mb-2" />
          <p className="text-sm">No activity recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dateGroups.map((group) => (
            <div key={group.dateKey}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Updates for this date */}
              <div className="space-y-3 ml-2">
                {group.updates.map((update) => {
                  const DeliverableLinkIcon = getLinkIcon(update.deliverable_link_type || null);
                  return (
                    <div
                      key={update.id}
                      className={`flex gap-3 ${
                        update.is_deliverable ? '' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                        <AvatarFallback className="text-[10px] bg-muted">
                          {getInitials(update.author_name)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Content */}
                      <div className={`flex-1 min-w-0 rounded-lg border p-3 ${
                        update.is_deliverable ? 'border-primary/30 bg-primary/[0.03]' : ''
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">
                            {update.author_name || 'Team Member'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(update.created_at), 'h:mm a')}
                          </span>
                          {/* Badges */}
                          {update.is_deliverable && (
                            <Badge className="bg-primary/10 text-primary text-[9px] h-4 px-1.5 border-0">
                              Deliverable
                            </Badge>
                          )}
                          {update.review_type === 'internal' && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                              Internal
                            </Badge>
                          )}
                          {update.hours_logged && update.hours_logged > 0 && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                              {update.hours_logged}h logged
                            </Badge>
                          )}
                        </div>

                        {/* Full content — no truncation */}
                        <p className="text-sm whitespace-pre-wrap">
                          {update.content}
                        </p>

                        {/* Approval status */}
                        {update.is_approved === true && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Approved
                          </div>
                        )}
                        {update.is_approved === false && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                              <XCircle className="h-3 w-3" />
                              Changes Requested
                            </div>
                            {update.change_request_text && (
                              <p className="text-xs text-muted-foreground pl-4 border-l-2 border-orange-200 dark:border-orange-800">
                                {update.change_request_text}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Deliverable link */}
                        {update.deliverable_link && (
                          <a
                            href={update.deliverable_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-2"
                          >
                            <DeliverableLinkIcon className="h-3 w-3" />
                            View Deliverable
                            {update.deliverable_link_type && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1 ml-0.5">
                                {getLinkLabel(update.deliverable_link_type)}
                              </Badge>
                            )}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}

                        {/* Change request link */}
                        {update.change_request_link && (
                          <a
                            href={update.change_request_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:underline mt-1"
                          >
                            <LinkIcon className="h-3 w-3" />
                            Change Request Reference
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
