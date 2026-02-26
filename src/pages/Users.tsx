import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { UserApprovalModal } from '@/components/users/UserApprovalModal';
import { Search, Users as UsersIcon, Plus, Loader2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  company_id: string | null;
  company_name?: string;
  roles: string[];
  is_approved: boolean;
  created_at: string;
}

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  team: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  client: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export default function Users() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  
  // Approval modal
  const [approvalModalUser, setApprovalModalUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Fetch companies for names
      const companyIds = [...new Set((profilesData || []).map(p => p.company_id).filter(Boolean))];
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds.length > 0 ? companyIds : ['00000000-0000-0000-0000-000000000000']);

      const companyMap = new Map(companiesData?.map(c => [c.id, c.name]));
      const rolesMap = new Map<string, string[]>();
      
      rolesData?.forEach(r => {
        const existing = rolesMap.get(r.user_id) || [];
        rolesMap.set(r.user_id, [...existing, r.role]);
      });

      const usersWithRoles = (profilesData || []).map(profile => ({
        ...profile,
        company_name: profile.company_id ? companyMap.get(profile.company_id) : undefined,
        roles: rolesMap.get(profile.id) || [],
        is_approved: profile.is_approved || false,
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const pendingUsers = users.filter(u => !u.is_approved);
  const approvedUsers = users.filter(u => u.is_approved);

  const filteredPendingUsers = pendingUsers.filter(user =>
    (user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
     user.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredApprovedUsers = approvedUsers.filter(user =>
    (user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
     user.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || 'U';
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">You don't have access to this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  const renderUserTable = (userList: UserProfile[], showApproveAction: boolean) => {
    if (userList.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            {showApproveAction ? (
              <>
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">No pending approvals!</p>
                <p className="text-sm text-muted-foreground">All users have been reviewed.</p>
              </>
            ) : (
              <>
                <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {search ? 'No users found matching your search.' : 'No approved users yet.'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Signed Up</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userList.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(user.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.full_name || 'Unnamed'}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {user.roles.map((role) => (
                      <Badge key={role} className={roleColors[role]}>
                        {role}
                      </Badge>
                    ))}
                    {user.roles.length === 0 && (
                      <span className="text-muted-foreground text-sm">No roles</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {user.company_name || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {showApproveAction ? (
                    <Button 
                      size="sm"
                      onClick={() => setApprovalModalUser(user)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setApprovalModalUser(user)}>
                      Edit
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Users</h1>
            <p className="text-muted-foreground">Manage team and client accounts</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 max-w-sm"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'approved')}>
            <TabsList>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="h-4 w-4" />
                Pending Approval
                {pendingUsers.length > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5">
                    {pendingUsers.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Approved Users ({approvedUsers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              {pendingUsers.length > 0 && (
                <Card className="mb-4 border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-900/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600" />
                      {pendingUsers.length} User{pendingUsers.length !== 1 ? 's' : ''} Awaiting Approval
                    </CardTitle>
                    <CardDescription>
                      Review and assign these users to a company before they can access the portal.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
              {renderUserTable(filteredPendingUsers, true)}
            </TabsContent>

            <TabsContent value="approved" className="mt-4">
              {renderUserTable(filteredApprovedUsers, false)}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <UserApprovalModal
        open={!!approvalModalUser}
        onOpenChange={(open) => !open && setApprovalModalUser(null)}
        user={approvalModalUser}
        onApproved={fetchUsers}
      />
    </DashboardLayout>
  );
}