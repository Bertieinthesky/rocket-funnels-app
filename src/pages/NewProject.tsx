import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { z } from 'zod';

const projectSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().min(10, 'Please provide more detail about your project'),
  project_type: z.enum(['design', 'development', 'content', 'strategy', 'other']),
  relevant_links: z.string().optional(),
  target_date: z.string().optional(),
});

type ProjectForm = z.infer<typeof projectSchema>;

export default function NewProject() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectForm, string>>>({});
  
  const [formData, setFormData] = useState<ProjectForm>({
    name: '',
    description: '',
    project_type: 'other',
    relevant_links: '',
    target_date: '',
  });

  const handleChange = (field: keyof ProjectForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = projectSchema.safeParse(formData);
    
    if (!result.success) {
      const newErrors: typeof errors = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          newErrors[err.path[0] as keyof ProjectForm] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Get user's company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();
      
      if (profileError || !profile?.company_id) {
        throw new Error('Unable to find your company. Please contact support.');
      }
      
      // Create the project
      const { error: projectError } = await supabase
        .from('projects')
        .insert({
          company_id: profile.company_id,
          name: formData.name,
          description: formData.description + (formData.relevant_links ? `\n\nRelevant Links:\n${formData.relevant_links}` : ''),
          project_type: formData.project_type,
          target_date: formData.target_date || null,
          created_by: user?.id,
          status: 'queued',
        });
      
      if (projectError) throw projectError;
      
      toast({
        title: 'Project submitted!',
        description: 'Your project request has been added to the queue.',
      });
      
      navigate('/projects');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create project',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Submit New Project</h1>
            <p className="text-muted-foreground">
              Tell us about your new project request
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Provide as much detail as possible to help us understand your needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Homepage Redesign, Blog Content Series"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="project_type">Project Type *</Label>
                <Select 
                  value={formData.project_type} 
                  onValueChange={(value) => handleChange('project_type', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="content">Content</SelectItem>
                    <SelectItem value="strategy">Strategy</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.project_type && <p className="text-sm text-destructive">{errors.project_type}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what you need, goals, target audience, and any specific requirements..."
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  disabled={isSubmitting}
                  rows={5}
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="relevant_links">Relevant Links / Logins</Label>
                <Textarea
                  id="relevant_links"
                  placeholder="Include any relevant URLs, reference sites, or login credentials..."
                  value={formData.relevant_links}
                  onChange={(e) => handleChange('relevant_links', e.target.value)}
                  disabled={isSubmitting}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="target_date">Target Completion Date (optional)</Label>
                <Input
                  id="target_date"
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => handleChange('target_date', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(-1)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Project
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
