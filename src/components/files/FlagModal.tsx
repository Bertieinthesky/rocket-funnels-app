import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  canFlagForClient = false,
  isClient = false
}: FlagModalProps) {
  const [flaggedFor, setFlaggedFor] = useState<'team' | 'client'>('team');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      // Clients always flag for team
      await onSubmit(isClient ? 'team' : flaggedFor, reason);
      setReason('');
      setFlaggedFor('team');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setFlaggedFor('team');
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

          {/* Flag target - Team/Admin can choose, Clients only see "Team" */}
          {!isClient && canFlagForClient ? (
            <div className="space-y-3">
              <Label>Flag for:*</Label>
              <RadioGroup 
                value={flaggedFor} 
                onValueChange={(v) => setFlaggedFor(v as 'team' | 'client')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="team" id="flag-team" />
                  <Label htmlFor="flag-team" className="cursor-pointer">Team</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="client" id="flag-client" />
                  <Label htmlFor="flag-client" className="cursor-pointer">Client</Label>
                </div>
              </RadioGroup>
            </div>
          ) : (
            <div className="space-y-1">
              <Label className="text-muted-foreground">Flagging for:</Label>
              <p className="font-medium">Team</p>
            </div>
          )}

          {/* Reason - Changed from "Message" */}
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
              {!isClient ? (
                <>
                  <li>• Needs client approval</li>
                  <li>• Contains error that needs fixing</li>
                  <li>• Waiting on updated version</li>
                </>
              ) : (
                <>
                  <li>• Question about this file</li>
                  <li>• This file has an issue</li>
                  <li>• I've uploaded requested materials</li>
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
            Flag File
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
