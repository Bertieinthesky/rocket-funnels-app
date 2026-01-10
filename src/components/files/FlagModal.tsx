import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
}

export function FlagModal({ 
  open, 
  onOpenChange, 
  fileName, 
  onSubmit, 
  canFlagForClient = false 
}: FlagModalProps) {
  const [flaggedFor, setFlaggedFor] = useState<'team' | 'client'>('team');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(flaggedFor, message);
      setMessage('');
      setFlaggedFor('team');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Flag File
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            File: <span className="font-medium text-foreground">{fileName}</span>
          </div>

          <div className="space-y-3">
            <Label>Flag for:</Label>
            <RadioGroup 
              value={flaggedFor} 
              onValueChange={(v) => setFlaggedFor(v as 'team' | 'client')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="team" id="flag-team" />
                <Label htmlFor="flag-team" className="cursor-pointer">Team</Label>
              </div>
              {canFlagForClient && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="client" id="flag-client" />
                  <Label htmlFor="flag-client" className="cursor-pointer">Client</Label>
                </div>
              )}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Message*</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Let them know:
• What you need
• What's wrong or missing
• What action is required"
              rows={4}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!message.trim() || submitting}
              variant="destructive"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Flag File
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
