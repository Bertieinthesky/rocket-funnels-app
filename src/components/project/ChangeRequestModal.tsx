import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Save, Link as LinkIcon, Video, FileText, ExternalLink } from 'lucide-react';

interface ChangeRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliverableTitle: string;
  existingDraft?: {
    text: string;
    link: string;
    linkType: string | null;
  } | null;
  onSaveDraft: (text: string, link: string, linkType: string | null) => Promise<void>;
  onSubmit: (text: string, link: string, linkType: string | null) => Promise<void>;
}

const detectLinkType = (url: string): string | null => {
  if (!url) return null;
  if (url.includes('loom.com')) return 'loom';
  if (url.includes('docs.google.com')) return 'google_docs';
  if (url.includes('drive.google.com')) return 'google_drive';
  if (url.includes('sheets.google.com')) return 'google_sheets';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  if (url.includes('figma.com')) return 'figma';
  return 'other';
};

const getLinkTypeDisplay = (type: string | null): { label: string; icon: React.ElementType } => {
  switch (type) {
    case 'loom':
      return { label: 'Loom Video', icon: Video };
    case 'google_docs':
      return { label: 'Google Docs', icon: FileText };
    case 'google_drive':
      return { label: 'Google Drive', icon: FileText };
    case 'google_sheets':
      return { label: 'Google Sheets', icon: FileText };
    case 'youtube':
      return { label: 'YouTube', icon: Video };
    case 'vimeo':
      return { label: 'Vimeo', icon: Video };
    case 'figma':
      return { label: 'Figma', icon: FileText };
    default:
      return { label: 'Link', icon: LinkIcon };
  }
};

export function ChangeRequestModal({
  open,
  onOpenChange,
  deliverableTitle,
  existingDraft,
  onSaveDraft,
  onSubmit,
}: ChangeRequestModalProps) {
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load existing draft when modal opens
  useEffect(() => {
    if (open && existingDraft) {
      setText(existingDraft.text || '');
      setLink(existingDraft.link || '');
    } else if (open) {
      setText('');
      setLink('');
    }
  }, [open, existingDraft]);

  const linkType = detectLinkType(link);
  const linkDisplay = link ? getLinkTypeDisplay(linkType) : null;
  const LinkTypeIcon = linkDisplay?.icon || LinkIcon;

  const handleSaveDraft = async () => {
    if (saving || submitting) return; // Prevent double-submission
    setSaving(true);
    try {
      await onSaveDraft(text, link, linkType);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (saving || submitting) return; // Prevent double-submission
    setSubmitting(true);
    try {
      await onSubmit(text, link, linkType);
      setText('');
      setLink('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const hasContent = text.trim() || link.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Changes</DialogTitle>
          <DialogDescription>
            Provide feedback for: <span className="font-medium text-foreground">{deliverableTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing draft indicator */}
          {existingDraft && (
            <Badge variant="outline" className="gap-1">
              <Save className="h-3 w-3" />
              Draft saved
            </Badge>
          )}

          {/* Feedback text */}
          <div className="space-y-2">
            <Label htmlFor="feedback">What changes would you like?</Label>
            <Textarea
              id="feedback"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe the changes you'd like to see. Be as specific as possible..."
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              💡 Tip: The more detail you provide, the faster we can make the right changes.
            </p>
          </div>

          {/* Link input */}
          <div className="space-y-2">
            <Label htmlFor="link">Add a link (optional)</Label>
            <div className="relative">
              <Input
                id="link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Paste a Google Doc or Loom link..."
                className="pr-24"
              />
              {linkDisplay && (
                <Badge variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2 gap-1 text-xs">
                  <LinkTypeIcon className="h-3 w-3" />
                  {linkDisplay.label}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Share a Google Doc with detailed notes or record a Loom video explaining your feedback.
            </p>
          </div>

          {/* Link preview */}
          {link && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 text-sm">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <a 
                  href={link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate flex-1"
                >
                  {link}
                </a>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={saving || submitting || !hasContent}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Draft
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || submitting || !hasContent}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Submit Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
