import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, CheckCircle, Building2, UserCog } from 'lucide-react';

interface Company {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface UserApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onApproved: () => void;
}

type UserRole = 'client' | 'team' | 'admin';

export function UserApprovalModal({ open, onOpenChange, user, onApproved }: UserApprovalModalProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [loading, setLoading] = useState(false);
  const [fetchingCompanies, setFetchingCompanies] = useState(true);

  useEffect(() => {
    if (open) {
      fetchCompanies();
      setSelectedCompany('');
      setSelectedRole('client');
    }
  }, [open]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setFetchingCompanies(false);
    }
  };

  const handleApprove = async () => {
    if (!user || !currentUser) return;

    // Clients must have a company assigned
    if (selectedRole === 'client' && !selectedCompany) {
      toast({
        title: 'Company Required',
        description: 'Please select a company to assign this client to.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Update profile with approval and company assignment
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_approved: true,
          approved_by: currentUser.id,
          approved_at: new Date().toISOString(),
          company_id: selectedRole === 'client' ? selectedCompany : null,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Ensure user has exactly ONE role (prevents accidental multi-role users)
      // 1) Clear existing roles
      const { error: deleteRolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id);

      if (deleteRolesError) throw deleteRolesError;

      // 2) Insert selected role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: selectedRole,
        });

      if (roleError) throw roleError;

      toast({
        title: 'User Approved',
        description: `${user.full_name || user.email} has been approved and assigned.`,
      });

      onApproved();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || 'U';
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Approve User
          </DialogTitle>
          <DialogDescription>
            Review and approve this user's account, then assign them to a role and company.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(user.full_name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.full_name || 'Unnamed'}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Assign Role
            </Label>
            <RadioGroup 
              value={selectedRole} 
              onValueChange={(v) => setSelectedRole(v as UserRole)}
              className="grid grid-cols-3 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="client" id="role-client" />
                <Label htmlFor="role-client" className="cursor-pointer">Client</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="team" id="role-team" />
                <Label htmlFor="role-team" className="cursor-pointer">Team</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="admin" id="role-admin" />
                <Label htmlFor="role-admin" className="cursor-pointer">Admin</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Company Assignment (only for clients) */}
          {selectedRole === 'client' && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Assign to Company*
              </Label>
              {fetchingCompanies ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading companies...
                </div>
              ) : (
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {companies.length === 0 && !fetchingCompanies && (
                <p className="text-sm text-muted-foreground">
                  No companies found. Create a company first before approving client users.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleApprove} 
            disabled={loading || (selectedRole === 'client' && !selectedCompany)}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Approve & Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
