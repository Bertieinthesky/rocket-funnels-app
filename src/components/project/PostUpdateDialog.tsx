import { useState, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TeamUpdateForm } from './TeamUpdateForm';

interface PostUpdateDialogProps {
  projectId: string;
  onSubmit: (
    content: string,
    isDeliverable: boolean,
    hoursLogged: number | null,
    deliverableLink: string | null,
    deliverableLinkType: string | null,
    reviewType: string,
  ) => Promise<void>;
  trigger: ReactNode;
  /** Optional prefix added to the update content (e.g. task name) */
  contentPrefix?: string;
}

export function PostUpdateDialog({
  projectId,
  onSubmit,
  trigger,
  contentPrefix,
}: PostUpdateDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (
    content: string,
    isDeliverable: boolean,
    hoursLogged: number | null,
    deliverableLink: string | null,
    deliverableLinkType: string | null,
    reviewType: string,
  ) => {
    const finalContent = contentPrefix
      ? `[${contentPrefix}] ${content}`
      : content;

    await onSubmit(
      finalContent,
      isDeliverable,
      hoursLogged,
      deliverableLink,
      deliverableLinkType,
      reviewType,
    );
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Post Update</DialogTitle>
        </DialogHeader>
        <TeamUpdateForm
          projectId={projectId}
          onSubmit={handleSubmit}
          defaultExpanded
        />
      </DialogContent>
    </Dialog>
  );
}
