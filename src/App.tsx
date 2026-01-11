import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import Auth from "./pages/Auth";
import PendingApproval from "./pages/PendingApproval";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import NewProject from "./pages/NewProject";
import ProjectDetail from "./pages/ProjectDetail";
import Files from "./pages/Files";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Kanban from "./pages/Kanban";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Protected route wrapper that checks approval status
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isApproved, isAdmin, isTeam } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Admins and team members bypass approval check
  if (!isApproved && !isAdmin && !isTeam) {
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
}

// Route that only shows for unapproved users
function PendingApprovalRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isApproved, isAdmin, isTeam } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If approved (or admin/team), redirect to dashboard
  if (isApproved || isAdmin || isTeam) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/pending-approval" element={
      <PendingApprovalRoute>
        <PendingApproval />
      </PendingApprovalRoute>
    } />
    <Route path="/dashboard" element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    } />
    <Route path="/projects" element={
      <ProtectedRoute>
        <Projects />
      </ProtectedRoute>
    } />
    <Route path="/projects/new" element={
      <ProtectedRoute>
        <NewProject />
      </ProtectedRoute>
    } />
    <Route path="/projects/:id" element={
      <ProtectedRoute>
        <ProjectDetail />
      </ProtectedRoute>
    } />
    <Route path="/files" element={
      <ProtectedRoute>
        <Files />
      </ProtectedRoute>
    } />
    <Route path="/clients" element={
      <ProtectedRoute>
        <Clients />
      </ProtectedRoute>
    } />
    <Route path="/clients/:id" element={
      <ProtectedRoute>
        <ClientDetail />
      </ProtectedRoute>
    } />
    <Route path="/kanban" element={
      <ProtectedRoute>
        <Kanban />
      </ProtectedRoute>
    } />
    <Route path="/users" element={
      <ProtectedRoute>
        <Users />
      </ProtectedRoute>
    } />
    <Route path="/settings" element={
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    } />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DemoModeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </DemoModeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
