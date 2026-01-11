import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ChangeRequestModal } from '@/components/project/ChangeRequestModal';
import { TeamUpdateForm } from '@/components/project/TeamUpdateForm';
import { 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Clock,
  FileText,
  Loader2,
  ExternalLink,
  Video,
  Edit2
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
  change_request_text?: string | null;
  change_request_link?: string | null;
  change_request_link_type?: string | null;
  change_request_draft?: boolean | null;
  change_request_submitted_at?: string | null;
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

const getLinkIcon = (type: string | null) => {
  if (type === 'loom' || type === 'youtube' || type === 'vimeo') {
    return Video;
  }
  return FileText;
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isClient, isTeam, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [submittingChangeRequest, setSubmittingChangeRequest] = useState(false);
  
  // Change request modal
  const [changeRequestUpdate, setChangeRequestUpdate] = useState<Update | null>(null);

  const canPostUpdates = isTeam || isAdmin;

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

  const handleApproveDeliverable = async (updateId: string) => {
    // Prevent double-submission
    if (approving) return;
    setApproving(updateId);
    
    try {
      const { error } = await supabase
        .from('updates')
        .update({ 
          is_approved: true,
          change_request_text: null,
          change_request_link: null,
          change_request_link_type: null,
          change_request_draft: false,
          change_request_submitted_at: null,
        })
        .eq('id', updateId);
      
      if (error) throw error;
      
      await fetchProjectData();
      
      toast({
        title: 'Deliverable approved!',
        description: 'Great! The team will continue with the next step.',
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

  const handleSaveChangeRequestDraft = async (text: string, link: string, linkType: string | null) => {
    if (!changeRequestUpdate || submittingChangeRequest) return;
    setSubmittingChangeRequest(true);
    
    try {
      const { error } = await supabase
        .from('updates')
        .update({
          change_request_text: text || null,
          change_request_link: link || null,
          change_request_link_type: linkType,
          change_request_draft: true,
          is_approved: null, // Keep as pending while drafting
        })
        .eq('id', changeRequestUpdate.id);
      
      if (error) throw error;
      
      await fetchProjectData();
      
      toast({
        title: 'Draft saved',
        description: 'Your change request has been saved as a draft.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save draft',
        variant: 'destructive',
      });
    } finally {
      setSubmittingChangeRequest(false);
    }
  };

  const handleSubmitChangeRequest = async (text: string, link: string, linkType: string | null) => {
    if (!changeRequestUpdate || submittingChangeRequest) return;
    setSubmittingChangeRequest(true);
    
    try {
      const { error } = await supabase
        .from('updates')
        .update({
          is_approved: false,
          change_request_text: text || null,
          change_request_link: link || null,
          change_request_link_type: linkType,
          change_request_draft: false,
          change_request_submitted_at: new Date().toISOString(),
        })
        .eq('id', changeRequestUpdate.id);
      
      if (error) throw error;
      
      await fetchProjectData();
      
      toast({
        title: 'Changes requested',
        description: 'Your feedback has been submitted to the team.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit change request',
        variant: 'destructive',
      });
    } finally {
      setSubmittingChangeRequest(false);
    }
  };

  const handlePostUpdate = async (content: string, isDeliverable: boolean, hoursLogged: number | null) => {
    if (!project || !user) return;
    
    try {
      const { error } = await supabase
        .from('updates')
        .insert({
          project_id: project.id,
          author_id: user.id,
          content,
          is_deliverable: isDeliverable,
          hours_logged: hoursLogged,
        });
      
      if (error) throw error;
      
      await fetchProjectData();
      
      toast({
        title: isDeliverable ? 'Deliverable submitted!' : 'Update posted!',
        description: isDeliverable 
          ? 'The client will be notified to review.' 
          : 'Your update has been added to the activity feed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to post update',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || 'U';
  };

  const getExistingDraft = (update: Update) => {
    if (update.change_request_draft && (update.change_request_text || update.change_request_link)) {
      return {
        text: update.change_request_text || '',
        link: update.change_request_link || '',
        linkType: update.change_request_link_type,
      };
    }
    return null;
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

        {/* Team Update Form */}
        {canPostUpdates && (
          <TeamUpdateForm 
            projectId={project.id} 
            onSubmit={handlePostUpdate}
          />
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
                {updates.map((update) => {
                  const hasDraft = update.change_request_draft && (update.change_request_text || update.change_request_link);
                  const LinkIcon = getLinkIcon(update.change_request_link_type);
                  
                  return (
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
                        
                        {/* Deliverable Actions for Client */}
                        {update.is_deliverable && isClient && (
                          <div className="mt-4 pt-4 border-t">
                            {update.is_approved === null || hasDraft ? (
                              <div className="space-y-3">
                                {/* Draft indicator */}
                                {hasDraft && (
                                  <div className="flex items-center gap-2 text-sm text-warning">
                                    <Edit2 className="h-4 w-4" />
                                    <span>You have a draft change request</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setChangeRequestUpdate(update)}
                                    >
                                      Continue Editing
                                    </Button>
                                  </div>
                                )}
                                
                                {!hasDraft && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleApproveDeliverable(update.id)}
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
                                      onClick={() => setChangeRequestUpdate(update)}
                                    >
                                      <XCircle className="mr-1 h-3 w-3" />
                                      Request Changes
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-3">
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
                                      {update.change_request_submitted_at && (
                                        <span className="text-xs text-muted-foreground">
                                          ({format(new Date(update.change_request_submitted_at), 'MMM d, h:mm a')})
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                                
                                {/* Show change request details */}
                                {!update.is_approved && update.change_request_text && (
                                  <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                                    <p className="text-sm font-medium mb-1">Requested Changes:</p>
                                    <p className="text-sm whitespace-pre-wrap">{update.change_request_text}</p>
                                  </div>
                                )}
                                
                                {!update.is_approved && update.change_request_link && (
                                  <a 
                                    href={update.change_request_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                                  >
                                    <LinkIcon className="h-4 w-4" />
                                    <span>View attached feedback</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Show change request details to team */}
                        {update.is_deliverable && canPostUpdates && update.is_approved === false && (
                          <div className="mt-4 pt-4 border-t space-y-3">
                            <div className="flex items-center gap-2 text-sm text-warning">
                              <XCircle className="h-4 w-4" />
                              <span>Client requested changes</span>
                              {update.change_request_submitted_at && (
                                <span className="text-xs text-muted-foreground">
                                  ({format(new Date(update.change_request_submitted_at), 'MMM d, h:mm a')})
                                </span>
                              )}
                            </div>
                            
                            {update.change_request_text && (
                              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                                <p className="text-sm font-medium mb-1">Requested Changes:</p>
                                <p className="text-sm whitespace-pre-wrap">{update.change_request_text}</p>
                              </div>
                            )}
                            
                            {update.change_request_link && (
                              <a 
                                href={update.change_request_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                              >
                                <LinkIcon className="h-4 w-4" />
                                <span>View attached feedback</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}

                        {/* Show approved status to team */}
                        {update.is_deliverable && canPostUpdates && update.is_approved === true && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center gap-2 text-sm text-success">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Client approved this deliverable</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Change Request Modal */}
      <ChangeRequestModal
        open={!!changeRequestUpdate}
        onOpenChange={(open) => !open && setChangeRequestUpdate(null)}
        deliverableTitle={changeRequestUpdate?.content.slice(0, 50) + '...' || ''}
        existingDraft={changeRequestUpdate ? getExistingDraft(changeRequestUpdate) : null}
        onSaveDraft={handleSaveChangeRequestDraft}
        onSubmit={handleSubmitChangeRequest}
      />
    </DashboardLayout>
  );
}
