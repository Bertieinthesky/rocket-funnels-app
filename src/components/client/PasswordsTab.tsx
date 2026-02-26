import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Eye,
  EyeOff,
  Copy,
  MoreVertical,
  Pencil,
  Trash2,
  KeyRound,
  Loader2,
  ShieldCheck,
  ExternalLink,
  ShieldAlert,
  User,
} from 'lucide-react';

interface Credential {
  id: string;
  company_id: string;
  label: string;
  value: string;
  username: string | null;
  login_url: string | null;
  has_2fa: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface PasswordsTabProps {
  companyId: string;
}

export function PasswordsTab({ companyId }: PasswordsTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCred, setEditingCred] = useState<Credential | null>(null);
  const [deleteCred, setDeleteCred] = useState<Credential | null>(null);
  const [formLabel, setFormLabel] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formLoginUrl, setFormLoginUrl] = useState('');
  const [formHas2fa, setFormHas2fa] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCredentials();
  }, [companyId]);

  const fetchCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from('company_credentials')
        .select('*')
        .eq('company_id', companyId)
        .order('label');

      if (error) throw error;
      setCredentials(data || []);
    } catch (error) {
      console.error('Error fetching credentials:', error);
      toast({ title: 'Failed to load credentials', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const openAdd = () => {
    setEditingCred(null);
    setFormLabel('');
    setFormValue('');
    setFormUsername('');
    setFormLoginUrl('');
    setFormHas2fa(false);
    setDialogOpen(true);
  };

  const openEdit = (cred: Credential) => {
    setEditingCred(cred);
    setFormLabel(cred.label);
    setFormValue(cred.value);
    setFormUsername(cred.username || '');
    setFormLoginUrl(cred.login_url || '');
    setFormHas2fa(cred.has_2fa || false);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCred(null);
    setFormLabel('');
    setFormValue('');
    setFormUsername('');
    setFormLoginUrl('');
    setFormHas2fa(false);
  };

  const handleSave = async () => {
    if (!formLabel.trim() || !formValue.trim()) {
      toast({
        title: 'Both fields are required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingCred) {
        const { error } = await supabase
          .from('company_credentials')
          .update({
            label: formLabel.trim(),
            value: formValue.trim(),
            username: formUsername.trim() || null,
            login_url: formLoginUrl.trim() || null,
            has_2fa: formHas2fa,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', editingCred.id);

        if (error) throw error;
        toast({ title: 'Credential updated' });
      } else {
        const { error } = await supabase
          .from('company_credentials')
          .insert({
            company_id: companyId,
            label: formLabel.trim(),
            value: formValue.trim(),
            username: formUsername.trim() || null,
            login_url: formLoginUrl.trim() || null,
            has_2fa: formHas2fa,
            created_by: user?.id,
          } as any);

        if (error) throw error;
        toast({ title: 'Credential added' });
      }

      closeDialog();
      fetchCredentials();
    } catch (error) {
      console.error('Error saving credential:', error);
      toast({ title: 'Failed to save credential', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCred) return;

    try {
      const { error } = await supabase
        .from('company_credentials')
        .delete()
        .eq('id', deleteCred.id);

      if (error) throw error;

      toast({ title: 'Credential deleted' });
      setDeleteCred(null);
      fetchCredentials();
    } catch (error) {
      console.error('Error deleting credential:', error);
      toast({ title: 'Failed to delete credential', variant: 'destructive' });
    }
  };

  const maskValue = (val: string) => {
    if (val.length <= 4) return '\u2022'.repeat(val.length);
    return '\u2022'.repeat(val.length - 4) + val.slice(-4);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <div className="h-9 w-36 bg-muted rounded animate-pulse" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            Passwords & Credentials
          </h3>
          <p className="text-sm text-muted-foreground">
            Stored credentials for this client. Team and admin access only.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Credential
        </Button>
      </div>

      {/* Credentials List */}
      {credentials.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <KeyRound className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">No credentials stored</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add login credentials, API keys, or access info for this client.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {credentials.map((cred) => {
            const isRevealed = revealedIds.has(cred.id);

            return (
              <Card key={cred.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-4">
                    <KeyRound className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />

                    {/* Main content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Label + badges row */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {cred.label}
                        </span>
                        {cred.has_2fa && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 px-1.5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 gap-0.5"
                          >
                            <ShieldAlert className="h-3 w-3" />
                            2FA
                          </Badge>
                        )}
                      </div>

                      {/* Username */}
                      {cred.username && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="font-mono">{cred.username}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => copyToClipboard(cred.username!)}
                          >
                            <Copy className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      )}

                      {/* Password value */}
                      <div
                        className="group/pw flex items-center gap-1.5 cursor-pointer"
                        onClick={() => toggleReveal(cred.id)}
                      >
                        <code
                          className={`text-sm px-2 py-0.5 rounded bg-muted font-mono ${
                            !isRevealed ? 'tracking-wider' : ''
                          }`}
                        >
                          {isRevealed ? cred.value : maskValue(cred.value)}
                        </code>
                        {!isRevealed && (
                          <Eye className="h-3 w-3 text-muted-foreground opacity-0 group-hover/pw:opacity-100 transition-opacity" />
                        )}
                        {isRevealed && (
                          <EyeOff className="h-3 w-3 text-muted-foreground opacity-0 group-hover/pw:opacity-100 transition-opacity" />
                        )}
                      </div>

                      {/* Login URL */}
                      {cred.login_url && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          <a
                            href={cred.login_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline truncate max-w-[300px]"
                          >
                            {cred.login_url}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleReveal(cred.id)}
                          >
                            {isRevealed ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          {isRevealed ? 'Hide' : 'Reveal'}
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyToClipboard(cred.value)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">Copy password</TooltipContent>
                      </Tooltip>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(cred)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteCred(cred)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCred ? 'Edit Credential' : 'Add Credential'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Label *</Label>
              <Input
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="e.g., WordPress Admin, ActiveCampaign"
              />
            </div>
            <div className="space-y-2">
              <Label>Username / Email</Label>
              <Input
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Password / Value *</Label>
              <Input
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder="Password, API key, or access info"
                type="password"
              />
            </div>
            <div className="space-y-2">
              <Label>Login URL</Label>
              <Input
                value={formLoginUrl}
                onChange={(e) => setFormLoginUrl(e.target.value)}
                placeholder="https://app.example.com/login"
              />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Switch
                checked={formHas2fa}
                onCheckedChange={setFormHas2fa}
              />
              <div>
                <Label className="text-sm">Two-Factor Authentication</Label>
                <p className="text-xs text-muted-foreground">
                  Requires client contact for access
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editingCred ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteCred}
        onOpenChange={(open) => !open && setDeleteCred(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credential</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteCred?.label}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
