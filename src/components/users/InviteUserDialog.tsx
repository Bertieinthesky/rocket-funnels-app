import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Copy, Check } from 'lucide-react';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserDialog({ open, onOpenChange }: InviteUserDialogProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const signupUrl = `${window.location.origin}/auth`;

  const handleReset = () => {
    setEmail('');
    setSending(false);
    setSent(false);
    setCopied(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) handleReset();
    onOpenChange(isOpen);
  };

  const handleSendInvite = async () => {
    if (!email.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: signupUrl,
        },
      });

      if (error) throw error;

      setSent(true);
      toast({
        title: 'Invite sent!',
        description: `Magic link sent to ${email}. They'll appear in Pending once they sign in.`,
      });
    } catch (err: any) {
      toast({
        title: 'Failed to send invite',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(signupUrl);
      setCopied(true);
      toast({ title: 'Link copied!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Send a magic link to invite someone to the portal. Once they sign in, approve them from the Pending tab.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="text-center py-4 space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium">Invite sent to {email}</p>
              <p className="text-sm text-muted-foreground mt-1">
                They'll receive a magic link. Once they sign in, you can approve them and assign a role + company.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                  autoFocus
                />
              </div>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Or share the signup link directly:</p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={signupUrl}
                  className="text-xs h-8 bg-background"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 gap-1.5"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {sent ? (
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                Invite Another
              </Button>
              <Button className="flex-1" onClick={() => handleClose(false)}>
                Done
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 gap-1.5"
                onClick={handleSendInvite}
                disabled={!email.trim() || sending}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Send Invite
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
