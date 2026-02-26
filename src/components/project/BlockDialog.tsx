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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Ban, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import type { Project } from '@/hooks/useProjects';

interface BlockDialogProps {
  project: Project;
  onBlock: (reason: string, notify: boolean) => void;
  onUnblock: (resolution?: string, link?: string) => void;
}

export function BlockDialog({ project, onBlock, onUnblock }: BlockDialogProps) {
  const [reason, setReason] = useState('');
  const [resolution, setResolution] = useState('');
  const [resolutionLink, setResolutionLink] = useState('');
  const [notify, setNotify] = useState(true);
  const [blockOpen, setBlockOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);

  const handleBlock = () => {
    onBlock(reason, notify);
    setReason('');
    setBlockOpen(false);
  };

  const handleResolve = () => {
    onUnblock(resolution.trim() || undefined, resolutionLink.trim() || undefined);
    setResolution('');
    setResolutionLink('');
    setResolveOpen(false);
  };

  if (project.is_blocked) {
    return (
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-emerald-600 hover:text-emerald-700 border-emerald-200 hover:border-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark as Resolved
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Block</DialogTitle>
            <DialogDescription>
              Mark "{project.name}" as resolved and unblock the project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {project.blocked_reason && (
              <div className="rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 p-3">
                <p className="text-[10px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
                  Blocked Because
                </p>
                <p className="text-sm">{project.blocked_reason}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="resolution">Resolution (optional)</Label>
              <Textarea
                id="resolution"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="What was done to resolve the block?"
                className="min-h-[80px] text-sm resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolution-link" className="flex items-center gap-1.5">
                <LinkIcon className="h-3 w-3" />
                Link (optional)
              </Label>
              <Input
                id="resolution-link"
                value={resolutionLink}
                onChange={(e) => setResolutionLink(e.target.value)}
                placeholder="Paste a Loom, Google Doc, or other link..."
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                This will appear in the activity feed.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleResolve}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Resolve & Unblock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
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
          <Button variant="outline" onClick={() => setBlockOpen(false)}>
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
