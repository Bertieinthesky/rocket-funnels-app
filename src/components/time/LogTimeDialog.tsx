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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanies } from '@/hooks/useCompanies';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useCreateTimeEntry } from '@/hooks/useTimeEntries';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface LogTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCompanyId?: string;
  defaultProjectId?: string;
}

export function LogTimeDialog({
  open,
  onOpenChange,
  defaultCompanyId,
  defaultProjectId,
}: LogTimeDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const createTimeEntry = useCreateTimeEntry();

  const [companyId, setCompanyId] = useState(defaultCompanyId || '');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [taskId, setTaskId] = useState('');
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());

  const { data: companies = [] } = useCompanies({ filter: 'active' });
  const { data: allProjects = [] } = useProjects({});
  const { data: tasks = [] } = useTasks({
    projectId: projectId || undefined,
    includeDone: true,
  });

  // Filter projects to selected company
  const companyProjects = allProjects.filter(
    (p) => p.company_id === companyId,
  );

  // Reset dependent fields when parent changes
  useEffect(() => {
    if (!defaultProjectId) setProjectId('');
    setTaskId('');
  }, [companyId, defaultProjectId]);

  useEffect(() => {
    setTaskId('');
  }, [projectId]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setCompanyId(defaultCompanyId || '');
      setProjectId(defaultProjectId || '');
      setTaskId('');
      setHours('');
      setDescription('');
      setDate(new Date());
    }
  }, [open, defaultCompanyId, defaultProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numHours = parseFloat(hours);
    if (!companyId || !numHours || numHours <= 0) {
      toast({
        title: 'Missing fields',
        description: 'Please select a client and enter valid hours.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createTimeEntry.mutateAsync({
        company_id: companyId,
        user_id: user!.id,
        hours: numHours,
        date: format(date, 'yyyy-MM-dd'),
        description: description || undefined,
        project_id: projectId && projectId !== 'none' ? projectId : null,
        task_id: taskId && taskId !== 'none' ? taskId : null,
      });

      toast({ title: 'Time logged', description: `${numHours}h recorded.` });
      onOpenChange(false);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to log time. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Time</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client */}
          <div className="space-y-2">
            <Label>Client *</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campaign (optional) */}
          {companyId && companyProjects.length > 0 && (
            <div className="space-y-2">
              <Label>Campaign</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {companyProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Task (optional) */}
          {projectId && projectId !== 'none' && tasks.length > 0 && (
            <div className="space-y-2">
              <Label>Task</Label>
              <Select value={taskId} onValueChange={setTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select task (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Hours + Date row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hours *</Label>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                placeholder="1.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
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
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="What did you work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTimeEntry.isPending}>
              {createTimeEntry.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Log Time
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
