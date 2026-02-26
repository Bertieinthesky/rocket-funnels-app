import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CampaignTaskCombobox } from './CampaignTaskCombobox';
import { useUpdateTimeEntry, type TimeEntry } from '@/hooks/useTimeEntries';
import { useProjects } from '@/hooks/useProjects';
import { useToast } from '@/hooks/use-toast';
import { detectLinkType } from '@/lib/constants';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface EditTimeEntryDialogProps {
  entry: TimeEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTimeEntryDialog({ entry, open, onOpenChange }: EditTimeEntryDialogProps) {
  const { toast } = useToast();
  const updateEntry = useUpdateTimeEntry();
  const { data: allProjects = [] } = useProjects({});

  const [hours, setHours] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [isDeliverable, setIsDeliverable] = useState(false);
  const [deliverableLink, setDeliverableLink] = useState('');
  const [reviewType, setReviewType] = useState('external');

  // Populate from entry when dialog opens
  useEffect(() => {
    if (open && entry) {
      setHours(String(entry.hours));
      setDate(new Date(entry.date + 'T00:00:00'));
      setDescription(entry.description || '');
      setProjectId(entry.project_id || '');
      setTaskId(entry.task_id || '');
      setIsDeliverable(entry.is_deliverable || false);
      setDeliverableLink(entry.deliverable_link || '');
      setReviewType(entry.review_type || 'external');
    }
  }, [open, entry]);

  const linkType = deliverableLink ? detectLinkType(deliverableLink) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedHours = parseFloat(hours);
    if (!parsedHours || parsedHours <= 0) {
      toast({
        title: 'Invalid hours',
        description: 'Please enter a valid number of hours.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateEntry.mutateAsync({
        id: entry.id,
        hours: parsedHours,
        date: format(date, 'yyyy-MM-dd'),
        description: description || undefined,
        project_id: projectId || null,
        task_id: taskId || null,
        is_deliverable: isDeliverable,
        deliverable_link: isDeliverable && deliverableLink ? deliverableLink : null,
        deliverable_link_type:
          isDeliverable && deliverableLink ? detectLinkType(deliverableLink) : null,
        review_type: isDeliverable ? reviewType : null,
      });

      toast({
        title: 'Entry updated',
        description: `${parsedHours}h on ${format(date, 'MMM d')} updated.`,
      });
      onOpenChange(false);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update entry. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Time Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campaign / Task */}
          <div className="space-y-1.5">
            <Label className="text-xs">Campaign / Task</Label>
            <CampaignTaskCombobox
              companyId={entry.company_id}
              projectId={projectId}
              taskId={taskId}
              projects={allProjects}
              onChange={(pid, tid) => {
                setProjectId(pid);
                setTaskId(tid);
              }}
            />
          </div>

          {/* Hours + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Hours *</Label>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-8 justify-start text-left font-normal text-xs"
                  >
                    <CalendarIcon className="mr-1.5 h-3 w-3" />
                    {format(date, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    disabled={{ after: new Date() }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              placeholder="What was worked on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          {/* Deliverable toggle */}
          <div className="flex items-center gap-2">
            <Switch
              checked={isDeliverable}
              onCheckedChange={setIsDeliverable}
              className="scale-90"
            />
            <Label className="text-xs text-muted-foreground">Mark as deliverable</Label>
          </div>

          {isDeliverable && (
            <div className="space-y-3 pl-4 border-l-2 border-primary/20">
              <div className="space-y-1.5">
                <Label className="text-xs">Deliverable Link</Label>
                <Input
                  placeholder="https://..."
                  value={deliverableLink}
                  onChange={(e) => setDeliverableLink(e.target.value)}
                  className="h-8 text-xs"
                />
                {linkType && (
                  <p className="text-[10px] text-muted-foreground capitalize">
                    Detected: {linkType}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Review Type</Label>
                <Select value={reviewType} onValueChange={setReviewType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="external">External (Client)</SelectItem>
                    <SelectItem value="internal">Internal (Team)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateEntry.isPending}>
              {updateEntry.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
