import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, MessageSquare, User } from 'lucide-react';
import { format } from 'date-fns';

interface FlagData {
  id: string;
  flag_message: string;
  flagged_by_role: string;
  flagged_for: string;
  created_at: string;
  resolved: boolean;
  resolved_by?: string;
  resolved_message?: string;
  resolved_at?: string;
  flagged_by_name?: string;
  resolved_by_name?: string;
}

interface FlagResolveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flag: FlagData | null;
  fileName: string;
  onResolve: (flagId: string, message: string) => Promise<void>;
}

export function FlagResolveModal({ 
  open, 
  onOpenChange, 
  flag,
  fileName,
  onResolve 
}: FlagResolveModalProps) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!flag) return null;

  const handleResolve = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await onResolve(flag.id, message);
      setMessage('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {flag.resolved ? 'Flag Details' : 'Resolve Flag'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            File: <span className="font-medium text-foreground">{fileName}</span>
          </div>

          {/* Original Flag */}
          <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Flagged by {flag.flagged_by_role}
              </Badge>
              <span className="text-xs text-muted-foreground">
                for {flag.flagged_for}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <p className="text-sm">{flag.flag_message}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {flag.flagged_by_name || 'Unknown'} • {format(new Date(flag.created_at), 'MMM d, yyyy h:mm a')}
            </p>
          </div>

          {/* Resolution (if resolved) */}
          {flag.resolved && flag.resolved_message && (
            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:text-green-400">
                  Resolved
                </Badge>
              </div>
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                <p className="text-sm">{flag.resolved_message}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {flag.resolved_by_name || 'Unknown'} • {flag.resolved_at ? format(new Date(flag.resolved_at), 'MMM d, yyyy h:mm a') : ''}
              </p>
            </div>
          )}

          {/* Resolve Form (if not resolved) */}
          {!flag.resolved && (
            <>
              <div className="space-y-2">
                <Label>Resolution Message*</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Let them know what action you took..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleResolve} 
                  disabled={!message.trim() || submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Resolve Flag
                </Button>
              </div>
            </>
          )}

          {flag.resolved && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
