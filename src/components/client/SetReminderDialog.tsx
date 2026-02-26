import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateReminder } from '@/hooks/useReminders';
import { useToast } from '@/hooks/use-toast';
import { Bell, CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SetReminderDialogProps {
  companyId: string;
}

export function SetReminderDialog({ companyId }: SetReminderDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const createReminder = useCreateReminder();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;

    createReminder.mutate(
      {
        company_id: companyId,
        user_id: user.id,
        content: content.trim(),
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      },
      {
        onSuccess: () => {
          setContent('');
          setDueDate(undefined);
          setOpen(false);
          toast({ title: 'Reminder set' });
        },
        onError: () => {
          toast({ title: 'Failed to set reminder', variant: 'destructive' });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Bell className="h-3.5 w-3.5" />
          Set Reminder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Set Reminder</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Follow up on ad creative approval..."
            rows={3}
            className="resize-none text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />

          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'gap-1.5 text-xs',
                    !dueDate && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="h-3 w-3" />
                  {dueDate ? format(dueDate, 'MMM d, yyyy') : 'Add due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  disabled={(date) =>
                    date < new Date(new Date().setHours(0, 0, 0, 0))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {dueDate && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => setDueDate(undefined)}
              >
                Clear
              </Button>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleSubmit}
              disabled={!content.trim() || createReminder.isPending}
            >
              {createReminder.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bell className="h-3.5 w-3.5" />
              )}
              Set Reminder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
