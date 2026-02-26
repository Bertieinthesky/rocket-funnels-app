import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { detectLinkType } from '@/lib/constants';
import {
  Loader2,
  Send,
  Package,
  Link as LinkIcon,
  ExternalLink,
  Video,
  FileText,
  Users,
  Eye,
} from 'lucide-react';

interface TeamUpdateFormProps {
  projectId: string;
  onSubmit: (
    content: string,
    isDeliverable: boolean,
    hoursLogged: number | null,
    deliverableLink: string | null,
    deliverableLinkType: string | null,
    reviewType: string,
  ) => Promise<void>;
  /** Start with form expanded (used inside dialogs) */
  defaultExpanded?: boolean;
}

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

export function TeamUpdateForm({ projectId, onSubmit, defaultExpanded }: TeamUpdateFormProps) {
  const [content, setContent] = useState('');
  const [isDeliverable, setIsDeliverable] = useState(false);
  const [hoursLogged, setHoursLogged] = useState('');
  const [deliverableLink, setDeliverableLink] = useState('');
  const [reviewType, setReviewType] = useState('external');
  const [submitting, setSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? false);

  const linkType = deliverableLink ? detectLinkType(deliverableLink) : null;
  const LinkTypeIcon = getLinkIcon(linkType);

  const resetForm = () => {
    setContent('');
    setIsDeliverable(false);
    setHoursLogged('');
    setDeliverableLink('');
    setReviewType('external');
    if (!defaultExpanded) setIsExpanded(false);
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const hours = hoursLogged ? parseFloat(hoursLogged) : null;
      await onSubmit(
        content.trim(),
        isDeliverable,
        hours,
        isDeliverable && deliverableLink ? deliverableLink : null,
        isDeliverable && deliverableLink ? linkType : null,
        isDeliverable ? reviewType : 'external',
      );
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const formFields = (
    <>
      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="update-content">Update</Label>
        <Textarea
          id="update-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share progress, notes, or deliverable details..."
          rows={4}
          className="resize-none"
        />
      </div>

      {/* Options row */}
      <div className="flex items-center gap-6 flex-wrap">
        {/* Deliverable toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="is-deliverable"
            checked={isDeliverable}
            onCheckedChange={setIsDeliverable}
          />
          <Label
            htmlFor="is-deliverable"
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <Package className="h-4 w-4" />
            Mark as Deliverable
          </Label>
        </div>

        {/* Hours logged */}
        <div className="flex items-center gap-2">
          <Label htmlFor="hours" className="text-sm whitespace-nowrap">
            Hours:
          </Label>
          <Input
            id="hours"
            type="number"
            step="0.25"
            min="0"
            value={hoursLogged}
            onChange={(e) => setHoursLogged(e.target.value)}
            placeholder="0"
            className="w-20 h-8"
          />
        </div>
      </div>

      {/* Deliverable-specific fields */}
      {isDeliverable && (
        <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
          {/* Review type */}
          <div className="flex items-center gap-3">
            <Label className="text-xs font-medium whitespace-nowrap">
              Review:
            </Label>
            <Select value={reviewType} onValueChange={setReviewType}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="external" className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <Eye className="h-3 w-3" />
                    Client Review
                  </span>
                </SelectItem>
                <SelectItem value="internal" className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    Internal Review
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[10px] text-muted-foreground">
              {reviewType === 'internal'
                ? 'Only visible to team members'
                : 'Client will be prompted to approve'}
            </span>
          </div>

          {/* Deliverable link */}
          <div className="space-y-1.5">
            <Label htmlFor="deliverable-link" className="text-xs font-medium">
              Deliverable Link (optional)
            </Label>
            <div className="relative">
              <Input
                id="deliverable-link"
                value={deliverableLink}
                onChange={(e) => setDeliverableLink(e.target.value)}
                placeholder="Paste a Figma, Google Doc, or Loom link..."
                className="h-8 text-sm pr-24"
              />
              {deliverableLink && linkType && (
                <Badge
                  variant="secondary"
                  className="absolute right-2 top-1/2 -translate-y-1/2 gap-1 text-[10px] h-5"
                >
                  <LinkTypeIcon className="h-3 w-3" />
                  {getLinkLabel(linkType)}
                </Badge>
              )}
            </div>
          </div>

          {/* Link preview */}
          {deliverableLink && (
            <div className="flex items-center gap-2 text-xs text-primary">
              <ExternalLink className="h-3 w-3" />
              <a
                href={deliverableLink}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline truncate"
              >
                {deliverableLink}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        {!defaultExpanded && (
          <Button variant="ghost" onClick={resetForm}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {isDeliverable ? 'Submit for Approval' : 'Post Update'}
        </Button>
      </div>
    </>
  );

  if (!isExpanded) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsExpanded(true)}
          >
            <Send className="mr-2 h-4 w-4" />
            Post an Update
          </Button>
        </CardContent>
      </Card>
    );
  }

  // When used inside a dialog, render without wrapping Card
  if (defaultExpanded) {
    return <div className="space-y-4">{formFields}</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Send className="h-4 w-4" />
          Post an Update
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {formFields}
      </CardContent>
    </Card>
  );
}
