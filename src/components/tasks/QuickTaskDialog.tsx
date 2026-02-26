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
import { useProjects, useCreateProject } from '@/hooks/useProjects';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useCreateTask } from '@/hooks/useTasks';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { PRIORITIES, type Priority } from '@/lib/constants';

const GENERAL_TASKS_NAME = 'General Tasks';

interface QuickTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCompanyId?: string;
  defaultProjectId?: string;
}

export function QuickTaskDialog({
  open,
  onOpenChange,
  defaultCompanyId,
  defaultProjectId,
}: QuickTaskDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const createTask = useCreateTask();
  const createProject = useCreateProject();

  const [title, setTitle] = useState('');
  const [companyId, setCompanyId] = useState(defaultCompanyId || '');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [priority, setPriority] = useState<string>('normal');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { data: companies = [] } = useCompanies({ filter: 'active' });
  const { data: allProjects = [] } = useProjects({});
  const { data: teamMembers = [] } = useTeamMembers();

  // Filter projects to selected company
  const companyProjects = allProjects.filter(
    (p) => p.company_id === companyId,
  );

  // Check if General Tasks exists for the selected company
  const generalTasksProject = companyProjects.find(
    (p) => p.name === GENERAL_TASKS_NAME,
  );

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle('');
      setCompanyId(defaultCompanyId || '');
      setProjectId(defaultProjectId || '');
      setPriority('normal');
      setAssignedTo('');
      setDueDate(undefined);
      setDescription('');
    }
  }, [open, defaultCompanyId, defaultProjectId]);

  // Reset project when company changes
  useEffect(() => {
    if (!defaultProjectId) setProjectId('');
  }, [companyId, defaultProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !companyId) {
      toast({
        title: 'Missing fields',
        description: 'Please enter a title and select a client.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      let targetProjectId = projectId;

      // If no project selected or "general" selected, use or create General Tasks
      if (!targetProjectId || targetProjectId === 'general') {
        if (generalTasksProject) {
          targetProjectId = generalTasksProject.id;
        } else {
          // Auto-create General Tasks campaign
          const newProject = await createProject.mutateAsync({
            company_id: companyId,
            name: GENERAL_TASKS_NAME,
            description: 'Ad-hoc tasks and quick requests',
            project_type: 'other',
            status: 'in_progress',
            phase: 'shaping',
            priority: 'normal',
            created_by: user!.id,
          });
          targetProjectId = newProject.id;
        }
      }

      await createTask.mutateAsync({
        project_id: targetProjectId,
        title: title.trim(),
        description: description || undefined,
        priority,
        assigned_to: assignedTo && assignedTo !== 'none' ? assignedTo : undefined,
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined,
        created_by: user!.id,
      });

      toast({ title: 'Task created', description: title.trim() });
      onOpenChange(false);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create task. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              placeholder="e.g. Update Facebook pixel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

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

          {/* Campaign */}
          {companyId && (
            <div className="space-y-2">
              <Label>Campaign</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="General Tasks (ad-hoc)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Tasks (ad-hoc)</SelectItem>
                  {companyProjects
                    .filter((p) => p.name !== GENERAL_TASKS_NAME)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Priority + Assigned To row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITIES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'MMM d, yyyy') : 'No due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Optional details..."
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
            <Button type="submit" disabled={isCreating}>
              {isCreating && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
