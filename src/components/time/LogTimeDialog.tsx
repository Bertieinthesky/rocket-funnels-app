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
import { Card } from '@/components/ui/card';
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
import { useCreateBatchTimeEntries } from '@/hooks/useTimeEntries';
import { useCreateUpdate } from '@/hooks/useUpdates';
import { useToast } from '@/hooks/use-toast';
import { detectLinkType } from '@/lib/constants';
import { CalendarIcon, Loader2, Plus, X } from 'lucide-react';
import { format } from 'date-fns';

interface LogTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCompanyId?: string;
  defaultProjectId?: string;
}

interface TimeEntryRow {
  companyId: string;
  projectId: string;
  taskId: string;
  hours: string;
  date: Date;
  description: string;
  isDeliverable: boolean;
  deliverableLink: string;
  reviewType: string;
}

const emptyRow = (defaultCompanyId?: string, defaultProjectId?: string): TimeEntryRow => ({
  companyId: defaultCompanyId || '',
  projectId: defaultProjectId || '',
  taskId: '',
  hours: '',
  date: new Date(),
  description: '',
  isDeliverable: false,
  deliverableLink: '',
  reviewType: 'external',
});

function TimeEntryRowForm({
  row,
  index,
  onChange,
  onRemove,
  canRemove,
  companies,
  allProjects,
}: {
  row: TimeEntryRow;
  index: number;
  onChange: (index: number, updates: Partial<TimeEntryRow>) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  companies: Array<{ id: string; name: string }>;
  allProjects: Array<{ id: string; name: string; company_id: string }>;
}) {
  const companyProjects = allProjects.filter((p) => p.company_id === row.companyId);
  const { data: tasks = [] } = useTasks({
    projectId: row.projectId && row.projectId !== 'none' ? row.projectId : undefined,
    includeDone: true,
  });

  const linkType = row.deliverableLink ? detectLinkType(row.deliverableLink) : null;

  return (
    <Card className="p-4 space-y-3 relative">
      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={() => onRemove(index)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Client + Campaign row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Client *</Label>
          <Select
            value={row.companyId}
            onValueChange={(v) =>
              onChange(index, { companyId: v, projectId: '', taskId: '' })
            }
          >
            <SelectTrigger className="h-8 text-xs">
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

        <div className="space-y-1.5">
          <Label className="text-xs">Campaign</Label>
          <Select
            value={row.projectId}
            onValueChange={(v) => onChange(index, { projectId: v, taskId: '' })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Optional" />
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
      </div>

      {/* Task (if campaign selected) */}
      {row.projectId && row.projectId !== 'none' && tasks.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs">Task</Label>
          <Select
            value={row.taskId}
            onValueChange={(v) => onChange(index, { taskId: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Optional" />
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Hours *</Label>
          <Input
            type="number"
            step="0.25"
            min="0.25"
            placeholder="1.5"
            value={row.hours}
            onChange={(e) => onChange(index, { hours: e.target.value })}
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
                {format(row.date, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={row.date}
                onSelect={(d) => d && onChange(index, { date: d })}
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
          placeholder="What did you work on?"
          value={row.description}
          onChange={(e) => onChange(index, { description: e.target.value })}
          rows={2}
          className="text-xs resize-none"
        />
      </div>

      {/* Deliverable toggle */}
      <div className="flex items-center gap-2">
        <Switch
          checked={row.isDeliverable}
          onCheckedChange={(v) => onChange(index, { isDeliverable: v })}
          className="scale-90"
        />
        <Label className="text-xs text-muted-foreground">Mark as deliverable</Label>
      </div>

      {row.isDeliverable && (
        <div className="space-y-3 pl-4 border-l-2 border-primary/20">
          <div className="space-y-1.5">
            <Label className="text-xs">Deliverable Link</Label>
            <Input
              placeholder="https://..."
              value={row.deliverableLink}
              onChange={(e) => onChange(index, { deliverableLink: e.target.value })}
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
            <Select
              value={row.reviewType}
              onValueChange={(v) => onChange(index, { reviewType: v })}
            >
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
    </Card>
  );
}

export function LogTimeDialog({
  open,
  onOpenChange,
  defaultCompanyId,
  defaultProjectId,
}: LogTimeDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const createBatch = useCreateBatchTimeEntries();
  const createUpdate = useCreateUpdate();

  const [rows, setRows] = useState<TimeEntryRow[]>([
    emptyRow(defaultCompanyId, defaultProjectId),
  ]);

  const { data: companies = [] } = useCompanies({ filter: 'active' });
  const { data: allProjects = [] } = useProjects({});

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setRows([emptyRow(defaultCompanyId, defaultProjectId)]);
    }
  }, [open, defaultCompanyId, defaultProjectId]);

  const updateRow = (index: number, updates: Partial<TimeEntryRow>) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...updates } : r)),
    );
  };

  const addRow = () => {
    // Copy client from last row for convenience
    const lastRow = rows[rows.length - 1];
    setRows((prev) => [
      ...prev,
      emptyRow(lastRow?.companyId || defaultCompanyId, undefined),
    ]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all rows
    const invalidRows = rows.filter(
      (r) => !r.companyId || !r.hours || parseFloat(r.hours) <= 0,
    );
    if (invalidRows.length > 0) {
      toast({
        title: 'Missing fields',
        description: 'Each row needs a client and valid hours.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const entries = rows.map((r) => ({
        company_id: r.companyId,
        user_id: user!.id,
        hours: parseFloat(r.hours),
        date: format(r.date, 'yyyy-MM-dd'),
        description: r.description || undefined,
        project_id: r.projectId && r.projectId !== 'none' ? r.projectId : null,
        task_id: r.taskId && r.taskId !== 'none' ? r.taskId : null,
        is_deliverable: r.isDeliverable,
        deliverable_link: r.isDeliverable && r.deliverableLink ? r.deliverableLink : null,
        deliverable_link_type:
          r.isDeliverable && r.deliverableLink
            ? detectLinkType(r.deliverableLink)
            : null,
        review_type: r.isDeliverable ? r.reviewType : null,
      }));

      await createBatch.mutateAsync(entries);

      // For deliverable rows with a project, also create an update entry
      const deliverableRows = rows.filter(
        (r) => r.isDeliverable && r.projectId && r.projectId !== 'none',
      );
      for (const dr of deliverableRows) {
        await createUpdate.mutateAsync({
          project_id: dr.projectId,
          author_id: user!.id,
          content: dr.description || 'Deliverable submitted',
          is_deliverable: true,
          deliverable_link: dr.deliverableLink || null,
          deliverable_link_type: dr.deliverableLink
            ? detectLinkType(dr.deliverableLink)
            : null,
          review_type: dr.reviewType,
          hours_logged: parseFloat(dr.hours),
        });
      }

      const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
      toast({
        title: 'Time logged',
        description: `${totalHours}h recorded across ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}.`,
      });
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
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Time</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {rows.map((row, i) => (
            <TimeEntryRowForm
              key={i}
              row={row}
              index={i}
              onChange={updateRow}
              onRemove={removeRow}
              canRemove={rows.length > 1}
              companies={companies}
              allProjects={allProjects}
            />
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={addRow}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Another Entry
          </Button>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createBatch.isPending}>
              {createBatch.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Log {rows.length > 1 ? `${rows.length} Entries` : 'Time'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
