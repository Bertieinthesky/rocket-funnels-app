import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSendMessage } from '@/hooks/useMessages';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useToast } from '@/hooks/use-toast';

interface TeamRequestPopoverProps {
  projectId: string;
  trigger: React.ReactNode;
}

export function TeamRequestPopover({ projectId, trigger }: TeamRequestPopoverProps) {
  const { user } = useAuth();
  const sendMessage = useSendMessage();
  const { data: teamMembers = [] } = useTeamMembers();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = () => {
    if (!description.trim() || !user) return;

    const assigneeName = teamMembers.find((m) => m.id === assignee)?.full_name;
    const formatted = [
      `**Team Request**`,
      assigneeName ? `To: ${assigneeName}` : '',
      dueDate ? `Due: ${dueDate}` : '',
      '',
      description.trim(),
    ]
      .filter(Boolean)
      .join('\n');

    sendMessage.mutate(
      {
        project_id: projectId,
        author_id: user.id,
        content: formatted,
        is_internal: true,
      },
      {
        onSuccess: () => {
          toast({ title: 'Request posted', description: 'Team note added.' });
          setDescription('');
          setAssignee('');
          setDueDate('');
          setOpen(false);
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4 space-y-3">
        <div>
          <h4 className="text-sm font-semibold">Request from Team</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Post an internal request on this project.
          </p>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">What's needed?</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the request..."
            className="min-h-[60px] text-sm resize-none"
            rows={3}
          />
        </div>

        {/* Assignee + Due Date row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs font-medium">For</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Anyone" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.full_name || m.email || 'Team Member'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium">Due</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <Button
          size="sm"
          className="w-full h-8 text-xs gap-1.5"
          disabled={!description.trim() || sendMessage.isPending}
          onClick={handleSubmit}
        >
          {sendMessage.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Send className="h-3 w-3" />
          )}
          Post Request
        </Button>
      </PopoverContent>
    </Popover>
  );
}
