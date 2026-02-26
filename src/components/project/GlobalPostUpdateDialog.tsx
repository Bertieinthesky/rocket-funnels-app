import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCompanies } from '@/hooks/useCompanies';
import { useProjects } from '@/hooks/useProjects';
import { useCreateUpdate } from '@/hooks/useUpdates';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { TeamUpdateForm } from './TeamUpdateForm';

interface GlobalPostUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalPostUpdateDialog({ open, onOpenChange }: GlobalPostUpdateDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const createUpdate = useCreateUpdate();
  const { data: companies = [] } = useCompanies({ filter: 'active' });
  const { data: allProjects = [] } = useProjects({});

  const [companyId, setCompanyId] = useState('');
  const [projectId, setProjectId] = useState('');

  const filteredProjects = companyId
    ? allProjects.filter((p) => p.company_id === companyId)
    : [];

  const handleReset = () => {
    setCompanyId('');
    setProjectId('');
  };

  const handleSubmit = async (
    content: string,
    isDeliverable: boolean,
    hoursLogged: number | null,
    deliverableLink: string | null,
    deliverableLinkType: string | null,
    reviewType: string,
  ) => {
    if (!user || !projectId) return;

    createUpdate.mutate(
      {
        project_id: projectId,
        author_id: user.id,
        content,
        is_deliverable: isDeliverable,
        hours_logged: hoursLogged,
        deliverable_link: deliverableLink,
        deliverable_link_type: deliverableLinkType,
        review_type: reviewType,
      },
      {
        onSuccess: () => {
          toast({ title: 'Update posted' });
          handleReset();
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: 'Failed to post update', variant: 'destructive' });
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleReset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Submit Update</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Step 1: Select Client */}
          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select
              value={companyId}
              onValueChange={(v) => {
                setCompanyId(v);
                setProjectId('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client..." />
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

          {/* Step 2: Select Campaign */}
          {companyId && (
            <div className="space-y-1.5">
              <Label>Campaign</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a campaign..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filteredProjects.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No active campaigns for this client.
                </p>
              )}
            </div>
          )}

          {/* Step 3: TeamUpdateForm */}
          {projectId && (
            <TeamUpdateForm
              projectId={projectId}
              onSubmit={handleSubmit}
              defaultExpanded
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
