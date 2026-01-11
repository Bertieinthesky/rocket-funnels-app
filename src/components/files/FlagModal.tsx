import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Flag, Loader2 } from 'lucide-react';

interface FlagModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  onSubmit: (flaggedFor: 'team' | 'client', message: string) => Promise<void>;
  canFlagForClient?: boolean;
  isClient?: boolean;
}

export function FlagModal({ 
  open, 
  onOpenChange, 
  fileName, 
  onSubmit, 
  isClient = false
}: FlagModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-determine flag target: clients flag for team, team/admin flag for client
  const flagTarget: 'team' | 'client' = isClient ? 'team' : 'client';

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(flagTarget, reason);
      setReason('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-600" />
            Flag File
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* File name display */}
          <div className="text-sm text-muted-foreground">
            File: <span className="font-medium text-foreground">{fileName}</span>
          </div>

          {/* Flag target - Auto-determined based on role */}
          <div className="space-y-1">
            <Label className="text-muted-foreground">Flagging for:</Label>
            <p className="font-medium">{isClient ? 'Team' : 'Client'}</p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason for Flagging*</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please describe your reason for flagging this file"
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Examples - Different based on user role */}
          <div className="bg-muted/50 p-3 rounded-md">
            <p className="text-sm font-medium mb-1">💡 Examples:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {isClient ? (
                <>
                  <li>• Question about this file</li>
                  <li>• This file has an issue</li>
                  <li>• I've uploaded requested materials</li>
                </>
              ) : (
                <>
                  <li>• Needs client approval</li>
                  <li>• Please review and provide feedback</li>
                  <li>• Waiting on updated version</li>
                </>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!reason.trim() || submitting}
            variant="destructive"
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Flag for {isClient ? 'Team' : 'Client'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
