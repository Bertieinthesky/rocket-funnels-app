import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDemoMode } from '@/contexts/DemoModeContext';
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
  Eye,
  AlertCircle,
  Rocket,
  Clock,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { GlobalActions } from './GlobalActions';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading, signOut, isClient, isTeam, isAdmin } = useAuth();
  const { isDemoMode, demoView, toggleDemoMode, setDemoView } = useDemoMode();
  const navigate = useNavigate();

  // Admins can use demo mode to preview other role views
  const canUseDemoMode = isAdmin;

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
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/kanban', icon: Kanban, label: 'Tasks' },
    { to: '/action-items', icon: AlertCircle, label: 'Action Items' },
    { to: '/timesheets', icon: Clock, label: 'Timesheets' },
    { to: '/files', icon: FileText, label: 'Files' },
  ];

  const adminNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clients', icon: Building2, label: 'Clients' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/kanban', icon: Kanban, label: 'Tasks' },
    { to: '/action-items', icon: AlertCircle, label: 'Action Items' },
    { to: '/timesheets', icon: Clock, label: 'Timesheets' },
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
          {/* Branded header — refined */}
          <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Rocket className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-[15px] tracking-tight text-sidebar-accent-foreground">
                Rocket Funnels
              </span>
            </div>
          </SidebarHeader>

          {/* Navigation */}
          <SidebarContent className="px-3 py-3">
            <SidebarMenu className="space-y-0.5">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.to}
                      className="relative flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-white/[0.06]"
                      activeClassName="text-sidebar-accent-foreground bg-white/[0.08] before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-0.5 before:rounded-full before:bg-primary"
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="text-sm">{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border p-4 space-y-3">
            {/* Demo Mode Toggle - Only for Admins */}
            {canUseDemoMode && (
              <div className="rounded-md border border-sidebar-border bg-white/[0.03] p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-sidebar-foreground" />
                    <Label htmlFor="demo-mode" className="text-xs font-medium text-sidebar-accent-foreground">
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
                    <SelectTrigger className="w-full h-8 text-xs bg-white/[0.06] border-sidebar-border text-sidebar-accent-foreground">
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
              <Avatar className="h-8 w-8 ring-1 ring-white/10">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-white text-xs font-medium">
                  {getInitials(user.user_metadata?.full_name, user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-sidebar-accent-foreground">
                  {user.user_metadata?.full_name || user.email}
                </p>
                <div className="flex items-center gap-1">
                  {isDemoMode ? (
                    <Badge variant="outline" className="text-[10px] border-sidebar-border text-sidebar-foreground">
                      {getRoleLabel()}
                    </Badge>
                  ) : (
                    <p className="text-[11px] text-sidebar-foreground/60">
                      {getRoleLabel()}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-accent-foreground hover:bg-white/[0.06]"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1">
          <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
            <SidebarTrigger />
            {isDemoMode && (
              <Badge variant="outline" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                Viewing as {demoView}
              </Badge>
            )}
            <div className="flex-1" />
            <GlobalActions />
            <NotificationCenter />
          </header>
          <main className="flex-1 p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
