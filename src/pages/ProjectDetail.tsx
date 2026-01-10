import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Clock,
  FileText,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  is_blocked: boolean;
  blocked_reason: string | null;
  project_type: string;
  target_date: string | null;
  created_at: string;
}

interface Update {
  id: string;
  content: string;
  is_deliverable: boolean;
  is_approved: boolean | null;
  hours_logged: number | null;
  created_at: string;
  author_id: string | null;
  author_name?: string | null;
  author_email?: string | null;
}

const statusColors: Record<string, string> = {
  queued: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/10 text-primary',
  revision: 'bg-warning/10 text-warning',
  review: 'bg-success/10 text-success',
  complete: 'bg-success text-success-foreground',
};

const statusLabels: Record<string, string> = {
  queued: 'Queued',
  in_progress: 'In Progress',
  revision: 'Revision',
  review: 'Review',
  complete: 'Complete',
};

const statusOrder = ['queued', 'in_progress', 'revision', 'review', 'complete'];

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isClient } = useAuth();
  const { toast } = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchProjectData();
    }
  }, [id]);

  const fetchProjectData = async () => {
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      
      if (projectError) throw projectError;
      setProject(projectData);

      const { data: updatesData } = await supabase
        .from('updates')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });
      
      // Fetch author info for each update
      const updatesWithAuthors = await Promise.all(
        (updatesData || []).map(async (update) => {
          if (update.author_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', update.author_id)
              .single();
            return {
              ...update,
              author_name: profile?.full_name,
              author_email: profile?.email
            };
          }
          return update;
        })
      );
      
      setUpdates(updatesWithAuthors);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDeliverable = async (updateId: string, approved: boolean) => {
    setApproving(updateId);
    
    try {
      const { error } = await supabase
        .from('updates')
        .update({ is_approved: approved })
        .eq('id', updateId);
      
      if (error) throw error;
      
      // Refresh updates
      await fetchProjectData();
      
      toast({
        title: approved ? 'Deliverable approved!' : 'Changes requested',
        description: approved 
          ? 'Great! The team will continue with the next step.' 
          : 'Your feedback has been noted.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update deliverable',
        variant: 'destructive',
      });
    } finally {
      setApproving(null);
    }
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Project not found</p>
          <Button className="mt-4" onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const currentStatusIndex = statusOrder.indexOf(project.status);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge className={statusColors[project.status]}>
                {statusLabels[project.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="outline" className="capitalize">{project.project_type}</Badge>
              {project.target_date && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Target: {format(new Date(project.target_date), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Blocked Banner */}
        {project.is_blocked && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="flex items-center gap-4 p-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Action Required</p>
                <p className="text-sm text-muted-foreground">
                  {project.blocked_reason || 'This project is waiting for your input'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Timeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Project Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {statusOrder.map((status, index) => (
                <div key={status} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div 
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        index <= currentStatusIndex 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {index < currentStatusIndex ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className="text-xs mt-1 text-muted-foreground">
                      {statusLabels[status]}
                    </span>
                  </div>
                  {index < statusOrder.length - 1 && (
                    <div 
                      className={`flex-1 h-0.5 mx-2 ${
                        index < currentStatusIndex ? 'bg-primary' : 'bg-muted'
                      }`} 
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        {project.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{project.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>Updates and deliverables for this project</CardDescription>
          </CardHeader>
          <CardContent>
            {updates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No updates yet</p>
                <p className="text-sm">Updates will appear here as work progresses</p>
              </div>
            ) : (
              <div className="space-y-4">
                {updates.map((update) => (
                  <div key={update.id} className="relative pl-8">
                    <div className="absolute left-0 top-0">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {getInitials(update.author_name, update.author_email)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className={`rounded-lg border p-4 ${update.is_deliverable ? 'border-primary bg-primary/5' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {update.author_name || 'Team Member'}
                          </span>
                          {update.is_deliverable && (
                            <Badge className="bg-primary/10 text-primary">Deliverable</Badge>
                          )}
                          {update.hours_logged && (
                            <Badge variant="outline" className="text-xs">
                              {update.hours_logged}h logged
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(update.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{update.content}</p>
                      
                      {/* Deliverable Actions */}
                      {update.is_deliverable && isClient && (
                        <div className="mt-4 pt-4 border-t">
                          {update.is_approved === null ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproveDeliverable(update.id, true)}
                                disabled={approving === update.id}
                              >
                                {approving === update.id ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveDeliverable(update.id, false)}
                                disabled={approving === update.id}
                              >
                                <XCircle className="mr-1 h-3 w-3" />
                                Request Changes
                              </Button>
                            </div>
                          ) : (
                            <div className={`flex items-center gap-2 text-sm ${
                              update.is_approved ? 'text-success' : 'text-warning'
                            }`}>
                              {update.is_approved ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>Approved</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4" />
                                  <span>Changes requested</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
