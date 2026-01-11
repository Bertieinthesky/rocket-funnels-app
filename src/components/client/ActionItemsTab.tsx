import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Flag, 
  MessageSquare, 
  CheckCircle2,
  Clock,
  FileText,
  FolderKanban,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActionItem {
  id: string;
  type: 'change_request' | 'file_flag' | 'project_blocked' | 'deliverable_review';
  title: string;
  description: string;
  project_id?: string;
  project_name?: string;
  file_id?: string;
  file_name?: string;
  update_id?: string;
  created_at: string;
  for_role: 'team' | 'client';
}

interface ActionItemsTabProps {
  companyId: string;
}

export function ActionItemsTab({ companyId }: ActionItemsTabProps) {
  const [loading, setLoading] = useState(true);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'team' | 'client'>('team');

  useEffect(() => {
    fetchActionItems();
  }, [companyId]);

  const fetchActionItems = async () => {
    try {
      const items: ActionItem[] = [];

      // 1. Change Requests from clients (action for team)
      const { data: updates } = await supabase
        .from('updates')
        .select(`
          id,
          change_request_text,
          change_request_submitted_at,
          project_id,
          projects!inner(id, name, company_id)
        `)
        .not('change_request_text', 'is', null)
        .not('change_request_submitted_at', 'is', null)
        .eq('change_request_draft', false);

      if (updates) {
        const companyUpdates = updates.filter((u: any) => u.projects?.company_id === companyId);
        companyUpdates.forEach((u: any) => {
          items.push({
            id: `change-${u.id}`,
            type: 'change_request',
            title: 'Change Request',
            description: u.change_request_text?.substring(0, 100) + (u.change_request_text?.length > 100 ? '...' : ''),
            project_id: u.project_id,
            project_name: u.projects?.name,
            update_id: u.id,
            created_at: u.change_request_submitted_at,
            for_role: 'team',
          });
        });
      }

      // 2. File flags (for team = client flagged, for client = team flagged)
      const { data: files } = await supabase
        .from('files')
        .select('id, name, title')
        .eq('company_id', companyId);

      if (files && files.length > 0) {
        const fileIds = files.map(f => f.id);
        const { data: flags } = await supabase
          .from('file_flags')
          .select('*')
          .in('file_id', fileIds)
          .eq('resolved', false);

        if (flags) {
          flags.forEach(flag => {
            const file = files.find(f => f.id === flag.file_id);
            items.push({
              id: `flag-${flag.id}`,
              type: 'file_flag',
              title: 'File Flagged',
              description: flag.flag_message?.substring(0, 100) + (flag.flag_message?.length > 100 ? '...' : ''),
              file_id: flag.file_id,
              file_name: file?.title || file?.name,
              created_at: flag.created_at,
              for_role: flag.flagged_for as 'team' | 'client',
            });
          });
        }
      }

      // 3. Blocked Projects (action for client)
      const { data: blockedProjects } = await supabase
        .from('projects')
        .select('id, name, blocked_reason, updated_at')
        .eq('company_id', companyId)
        .eq('is_blocked', true);

      if (blockedProjects) {
        blockedProjects.forEach(p => {
          items.push({
            id: `blocked-${p.id}`,
            type: 'project_blocked',
            title: 'Project Blocked',
            description: p.blocked_reason || 'This project is currently blocked',
            project_id: p.id,
            project_name: p.name,
            created_at: p.updated_at,
            for_role: 'client',
          });
        });
      }

      // 4. Deliverables pending review (action for client)
      const { data: pendingDeliverables } = await supabase
        .from('updates')
        .select(`
          id,
          content,
          created_at,
          project_id,
          projects!inner(id, name, company_id)
        `)
        .eq('is_deliverable', true)
        .is('is_approved', null);

      if (pendingDeliverables) {
        const companyDeliverables = pendingDeliverables.filter((d: any) => d.projects?.company_id === companyId);
        companyDeliverables.forEach((d: any) => {
          items.push({
            id: `deliverable-${d.id}`,
            type: 'deliverable_review',
            title: 'Deliverable Review',
            description: d.content?.substring(0, 100) + (d.content?.length > 100 ? '...' : ''),
            project_id: d.project_id,
            project_name: d.projects?.name,
            update_id: d.id,
            created_at: d.created_at,
            for_role: 'client',
          });
        });
      }

      // Sort by date (most recent first)
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setActionItems(items);
    } catch (error) {
      console.error('Error fetching action items:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIconForType = (type: ActionItem['type']) => {
    switch (type) {
      case 'change_request':
        return <MessageSquare className="h-4 w-4" />;
      case 'file_flag':
        return <Flag className="h-4 w-4" />;
      case 'project_blocked':
        return <AlertTriangle className="h-4 w-4" />;
      case 'deliverable_review':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getBadgeVariant = (type: ActionItem['type']) => {
    switch (type) {
      case 'change_request':
        return 'default';
      case 'file_flag':
        return 'destructive';
      case 'project_blocked':
        return 'destructive';
      case 'deliverable_review':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const teamItems = actionItems.filter(item => item.for_role === 'team');
  const clientItems = actionItems.filter(item => item.for_role === 'client');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderActionItems = (items: ActionItem[]) => {
    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">All caught up!</p>
            <p className="text-sm text-muted-foreground">No pending action items.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {items.map(item => (
          <Card key={item.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="py-4">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${
                  item.type === 'project_blocked' || item.type === 'file_flag' 
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    : item.type === 'deliverable_review'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-primary/10 text-primary'
                }`}>
                  {getIconForType(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getBadgeVariant(item.type)}>
                      {item.type === 'change_request' && 'Change Request'}
                      {item.type === 'file_flag' && 'File Flagged'}
                      {item.type === 'project_blocked' && 'Blocked'}
                      {item.type === 'deliverable_review' && 'Review Needed'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-1">{item.title}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {item.project_name && (
                      <Link to={`/projects/${item.project_id}`}>
                        <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                          <FolderKanban className="h-3 w-3" />
                          {item.project_name}
                        </Badge>
                      </Link>
                    )}
                    {item.file_name && (
                      <Badge variant="outline" className="gap-1">
                        <FileText className="h-3 w-3" />
                        {item.file_name}
                      </Badge>
                    )}
                  </div>
                </div>
                {item.project_id && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/projects/${item.project_id}`}>
                      View
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Action Items</h3>
        <p className="text-sm text-muted-foreground">
          Pending tasks and items requiring attention for this client.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'team' | 'client')}>
        <TabsList>
          <TabsTrigger value="team" className="gap-2">
            For Team
            {teamItems.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">
                {teamItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="client" className="gap-2">
            For Client
            {clientItems.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">
                {clientItems.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-4">
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Team Action Items</CardTitle>
              <CardDescription>
                Tasks requiring action from the team (change requests, file reviews, etc.)
              </CardDescription>
            </CardHeader>
          </Card>
          {renderActionItems(teamItems)}
        </TabsContent>

        <TabsContent value="client" className="mt-4">
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Client Action Items</CardTitle>
              <CardDescription>
                Tasks requiring client attention (blocked projects, deliverable reviews, etc.)
              </CardDescription>
            </CardHeader>
          </Card>
          {renderActionItems(clientItems)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
