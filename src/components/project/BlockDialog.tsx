import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Ban, Unlock } from 'lucide-react';
import type { Project } from '@/hooks/useProjects';

interface BlockDialogProps {
  project: Project;
  onBlock: (reason: string, notify: boolean) => void;
  onUnblock: () => void;
}

export function BlockDialog({ project, onBlock, onUnblock }: BlockDialogProps) {
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const [open, setOpen] = useState(false);

  const handleBlock = () => {
    onBlock(reason, notify);
    setReason('');
    setOpen(false);
  };

  if (project.is_blocked) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Unlock className="h-3.5 w-3.5" />
            Unblock
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock Project</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the block on "{project.name}" and notify relevant parties.
              {project.blocked_reason && (
                <span className="block mt-2 p-2 rounded bg-muted text-sm text-foreground">
                  Block reason: {project.blocked_reason}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onUnblock}>Unblock</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
          <Ban className="h-3.5 w-3.5" />
          Block
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Block Project</DialogTitle>
          <DialogDescription>
            Block "{project.name}" and optionally notify the client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="block-reason">Reason</Label>
            <Textarea
              id="block-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What's blocking this project?"
              className="min-h-[80px] text-sm resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="block-notify"
                checked={notify}
                onCheckedChange={setNotify}
              />
              <Label htmlFor="block-notify" className="text-sm">
                Notify client
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleBlock}>
            Block Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
