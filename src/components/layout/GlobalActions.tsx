import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { LogTimeDialog } from '@/components/time/LogTimeDialog';
import { GlobalPostUpdateDialog } from '@/components/project/GlobalPostUpdateDialog';
import { GlobalClientRequestDialog } from '@/components/project/GlobalClientRequestDialog';
import { Clock, Send, MessageSquarePlus } from 'lucide-react';

export function GlobalActions() {
  const { isClient, isTeam, isAdmin } = useAuth();
  const { isDemoMode, demoView } = useDemoMode();

  const effectiveIsClient = isDemoMode ? demoView === 'client' : isClient;
  const effectiveIsTeam = isDemoMode ? demoView === 'team' || demoView === 'admin' : isTeam || isAdmin;

  const [logTimeOpen, setLogTimeOpen] = useState(false);
  const [postUpdateOpen, setPostUpdateOpen] = useState(false);
  const [clientRequestOpen, setClientRequestOpen] = useState(false);

  if (effectiveIsTeam) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 hidden sm:inline-flex"
          onClick={() => setLogTimeOpen(true)}
        >
          <Clock className="h-3.5 w-3.5" />
          Log Hours
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 hidden sm:inline-flex"
          onClick={() => setPostUpdateOpen(true)}
        >
          <Send className="h-3.5 w-3.5" />
          Submit Update
        </Button>

        <LogTimeDialog open={logTimeOpen} onOpenChange={setLogTimeOpen} />
        <GlobalPostUpdateDialog open={postUpdateOpen} onOpenChange={setPostUpdateOpen} />
      </>
    );
  }

  if (effectiveIsClient) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 hidden sm:inline-flex"
          onClick={() => setClientRequestOpen(true)}
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          Submit a Request
        </Button>

        <GlobalClientRequestDialog open={clientRequestOpen} onOpenChange={setClientRequestOpen} />
      </>
    );
  }

  return null;
}
