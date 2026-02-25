import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2, Link as LinkIcon, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateProject } from '@/hooks/useProjects';
import { useToast } from '@/hooks/use-toast';
import {
  PROJECT_TYPES,
  PRIORITIES,
  type ProjectType,
  type Priority,
} from '@/lib/constants';
import { z } from 'zod';

interface ClientRequestFormProps {
  companyId: string;
  onSuccess: () => void;
}

const requestSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().min(10, 'Please provide more detail about your project'),
  project_type: z.string().min(1, 'Please select a project type'),
  priority: z.string().min(1, 'Please select a priority'),
  target_date: z.string().optional(),
  relevant_links: z.string().optional(),
});

type RequestForm = z.infer<typeof requestSchema>;

export function ClientRequestForm({ companyId, onSuccess }: ClientRequestFormProps) {
  const { user } = useAuth();
  const createProject = useCreateProject();
  const { toast } = useToast();

  const [errors, setErrors] = useState<Partial<Record<keyof RequestForm, string>>>({});
  const [formData, setFormData] = useState<RequestForm>({
    name: '',
    description: '',
    project_type: 'other',
    priority: 'normal',
    target_date: '',
    relevant_links: '',
  });

  const handleChange = (field: keyof RequestForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = requestSchema.safeParse(formData);
    if (!result.success) {
      const newErrors: typeof errors = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as keyof RequestForm] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    const description =
      formData.description +
      (formData.relevant_links
        ? `\n\nRelevant Links:\n${formData.relevant_links}`
        : '');

    createProject.mutate(
      {
        company_id: companyId,
        name: formData.name,
        description,
        project_type: formData.project_type as ProjectType,
        priority: formData.priority,
        target_date: formData.target_date || null,
        created_by: user?.id || null,
        status: 'queued',
        phase: 'shaping',
      },
      {
        onSuccess: () => {
          toast({
            title: 'Request submitted',
            description:
              'Your project request has been added to the queue. The team will review it shortly.',
          });
          onSuccess();
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to submit request',
            variant: 'destructive',
          });
        },
      },
    );
  };

  const priorityKeys = Object.keys(PRIORITIES) as Priority[];
  const typeKeys = Object.keys(PROJECT_TYPES) as ProjectType[];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">New Request</CardTitle>
        <CardDescription>
          Tell us what you need and we'll get it queued up for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Project Name */}
          <div className="space-y-1.5">
            <Label htmlFor="req-name" className="text-sm font-medium">
              Project Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="req-name"
              placeholder="e.g., Homepage Redesign, Blog Content Series"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              disabled={createProject.isPending}
              className="h-9"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Type + Priority — side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.project_type}
                onValueChange={(v) => handleChange('project_type', v)}
                disabled={createProject.isPending}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {typeKeys.map((key) => (
                    <SelectItem key={key} value={key}>
                      {PROJECT_TYPES[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.project_type && (
                <p className="text-xs text-destructive">{errors.project_type}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Priority <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => handleChange('priority', v)}
                disabled={createProject.isPending}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityKeys.map((key) => {
                    const p = PRIORITIES[key];
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${p.dotColor}`}
                          />
                          {p.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.priority && (
                <p className="text-xs text-destructive">{errors.priority}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="req-description" className="text-sm font-medium">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="req-description"
              placeholder="Describe what you need, goals, target audience, and any specific requirements..."
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={createProject.isPending}
              rows={4}
              className="text-sm resize-none"
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description}</p>
            )}
          </div>

          {/* Target Date */}
          <div className="space-y-1.5">
            <Label htmlFor="req-target" className="text-sm font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Target Date
              </span>
            </Label>
            <Input
              id="req-target"
              type="date"
              value={formData.target_date}
              onChange={(e) => handleChange('target_date', e.target.value)}
              disabled={createProject.isPending}
              className="h-9 w-48"
            />
          </div>

          {/* Links */}
          <div className="space-y-1.5">
            <Label htmlFor="req-links" className="text-sm font-medium">
              <span className="flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                Relevant Links / References
              </span>
            </Label>
            <Textarea
              id="req-links"
              placeholder="Paste any relevant URLs, reference sites, Loom videos, Google Docs..."
              value={formData.relevant_links}
              onChange={(e) => handleChange('relevant_links', e.target.value)}
              disabled={createProject.isPending}
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={createProject.isPending}
              className="gap-1.5"
            >
              {createProject.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Submit Request
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
