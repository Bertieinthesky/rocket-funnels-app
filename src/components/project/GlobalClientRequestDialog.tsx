import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ClientRequestForm } from './ClientRequestForm';
import { Loader2 } from 'lucide-react';

interface GlobalClientRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalClientRequestDialog({ open, onOpenChange }: GlobalClientRequestDialogProps) {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !user) return;

    setLoading(true);
    supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setCompanyId(data?.company_id || null);
        setLoading(false);
      });
  }, [open, user]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Submit a Request</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !companyId ? (
          <p className="text-sm text-muted-foreground py-4">
            Your account hasn't been linked to a company yet. Please contact your account manager.
          </p>
        ) : (
          <ClientRequestForm
            companyId={companyId}
            onSuccess={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
