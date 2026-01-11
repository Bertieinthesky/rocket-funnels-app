import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDemoMode } from '@/contexts/DemoModeContext';
import funnelFuelLogo from '@/assets/funnel-fuel-logo.jpg';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  LayoutDashboard, 
  FolderKanban, 
  FileText, 
  Settings,
  LogOut,
  Users,
  Building2,
  Kanban,
  Loader2,
  Eye
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading, signOut, isClient, isTeam, isAdmin } = useAuth();
  const { isDemoMode, demoView, toggleDemoMode, setDemoView } = useDemoMode();
  const navigate = useNavigate();

  // Check if user is super admin (has all 3 roles)
  const isSuperAdmin = isClient && isTeam && isAdmin;

  // Determine effective role based on demo mode
  const effectiveIsClient = isDemoMode ? demoView === 'client' : isClient;
  const effectiveIsTeam = isDemoMode ? demoView === 'team' || demoView === 'admin' : isTeam;
  const effectiveIsAdmin = isDemoMode ? demoView === 'admin' : isAdmin;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || 'U';
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Navigation items based on role
  const clientNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/files', icon: FileText, label: 'Files' },
  ];

  const teamNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clients', icon: Building2, label: 'Clients' },
    { to: '/kanban', icon: Kanban, label: 'Kanban' },
    { to: '/files', icon: FileText, label: 'Files' },
  ];

  const adminNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clients', icon: Building2, label: 'Companies' },
    { to: '/kanban', icon: Kanban, label: 'Kanban' },
    { to: '/files', icon: FileText, label: 'Files' },
    { to: '/users', icon: Users, label: 'Users' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const navItems = effectiveIsAdmin ? adminNavItems : effectiveIsTeam ? teamNavItems : clientNavItems;

  const getRoleLabel = () => {
    if (isDemoMode) {
      return `Demo: ${demoView.charAt(0).toUpperCase() + demoView.slice(1)}`;
    }
    return isAdmin ? 'Admin' : isTeam ? 'Team' : 'Client';
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border p-4">
            <div className="flex items-center gap-2">
              <img 
                src={funnelFuelLogo} 
                alt="Funnel Fuel Logo" 
                className="h-8 w-8 rounded-lg object-cover"
              />
              <span className="font-semibold text-lg">Funnel Fuel</span>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-2">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.to}
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          
          <SidebarFooter className="border-t border-sidebar-border p-4 space-y-4">
            {/* Demo Mode Toggle - Only for Super Admin */}
            {isSuperAdmin && (
              <div className="rounded-lg border border-dashed border-primary/50 bg-primary/5 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <Label htmlFor="demo-mode" className="text-sm font-medium">
                      Demo Mode
                    </Label>
                  </div>
                  <Switch
                    id="demo-mode"
                    checked={isDemoMode}
                    onCheckedChange={toggleDemoMode}
                  />
                </div>
                
                {isDemoMode && (
                  <Select value={demoView} onValueChange={(v) => setDemoView(v as 'admin' | 'team' | 'client')}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Select view" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client View</SelectItem>
                      <SelectItem value="team">Team View</SelectItem>
                      <SelectItem value="admin">Admin View</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* User Info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {getInitials(user.user_metadata?.full_name, user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.user_metadata?.full_name || user.email}
                </p>
                <div className="flex items-center gap-1">
                  {isDemoMode ? (
                    <Badge variant="outline" className="text-xs border-primary text-primary">
                      {getRoleLabel()}
                    </Badge>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {getRoleLabel()}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <SidebarInset className="flex-1">
          <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            {isDemoMode && (
              <Badge variant="outline" className="border-primary text-primary">
                <Eye className="h-3 w-3 mr-1" />
                Viewing as {demoView}
              </Badge>
            )}
            <div className="flex-1" />
            <NotificationCenter />
          </header>
          <main className="flex-1 p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}