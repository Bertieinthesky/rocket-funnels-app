import { useAuth } from '@/contexts/AuthContext';

export const usePermissions = () => {
  const { isAdmin, isTeam, isClient } = useAuth();

  return {
    // Company info permissions
    canEditCompanyInfo: isAdmin,
    canViewCompanyInfo: isTeam || isAdmin,
    
    // File permissions
    canManageFiles: isTeam || isAdmin,
    canUploadFiles: true, // all roles can upload
    canDeleteFiles: isTeam || isAdmin,
    canEditFileDetails: isTeam || isAdmin,
    
    // Note permissions
    canManageNotes: isTeam || isAdmin,
    
    // Project permissions
    canManageProjects: isTeam || isAdmin,
    canCreateProjects: true, // all roles can create (clients for their company)
    
    // Role checks
    isAdmin,
    isTeam,
    isClient,
  };
};
