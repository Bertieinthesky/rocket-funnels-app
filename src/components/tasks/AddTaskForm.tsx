import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PRIORITIES, type Priority } from '@/lib/constants';
import { Plus, X, Loader2 } from 'lucide-react';
import type { TeamMember } from '@/hooks/useTeamMembers';

interface AddTaskFormProps {
  projectId: string;
  teamMembers: TeamMember[];
  onSubmit: (task: { title: string; priority: string; assigned_to?: string; due_date?: string }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function AddTaskForm({ projectId, teamMembers, onSubmit, onCancel, isSubmitting }: AddTaskFormProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<string>('normal');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      priority,
      assigned_to: assignedTo || undefined,
      due_date: dueDate || undefined,
    });

    // Reset form
    setTitle('');
    setPriority('normal');
    setAssignedTo('');
    setDueDate('');
  };

  const priorityKeys = Object.keys(PRIORITIES) as Priority[];

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
      {/* Title */}
      <Input
        placeholder="Task title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-9 text-sm bg-background"
        autoFocus
      />

      {/* Options row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Priority */}
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {priorityKeys.map(key => {
              const p = PRIORITIES[key];
              return (
                <SelectItem key={key} value={key} className="text-xs">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${p.dotColor}`} />
                    {p.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Assign to */}
        <Select value={assignedTo} onValueChange={setAssignedTo}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Assign to..." />
          </SelectTrigger>
          <SelectContent>
            {teamMembers.map(m => (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                {m.full_name || m.email || 'Team Member'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Due date */}
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="h-8 w-[140px] text-xs"
        />

        <div className="flex-1" />

        {/* Actions */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          className="h-8 text-xs gap-1"
          disabled={!title.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          Add Task
        </Button>
      </div>
    </form>
  );
}
