import { useAuth } from '@/contexts/AuthContext';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { TeamDashboard } from '@/components/dashboard/TeamDashboard';
import { ClientDashboard } from '@/components/dashboard/ClientDashboard';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { isClient, isTeam, isAdmin, loading } = useAuth();
  const { isDemoMode, demoView } = useDemoMode();

  // Determine effective role (demo mode lets admins preview other views)
  const effectiveRole: 'admin' | 'team' | 'client' = isDemoMode
    ? demoView
    : isAdmin
      ? 'admin'
      : isTeam
        ? 'team'
        : 'client';

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {effectiveRole === 'admin' && <AdminDashboard />}
      {effectiveRole === 'team' && <TeamDashboard />}
      {effectiveRole === 'client' && <ClientDashboard />}
    </DashboardLayout>
  );
}
