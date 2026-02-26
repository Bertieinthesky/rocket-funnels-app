import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'client' | 'team' | 'admin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  rolesLoading: boolean;
  roles: AppRole[];
  isApproved: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isClient: boolean;
  isTeam: boolean;
  isAdmin: boolean;
  refreshApprovalStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dev quick-access: signs into a real Supabase account so RLS works
const DEV_PASSWORD = 'rocket123';
const DEV_EMAIL = 'dev@rocketfunnels.com';
const DEV_SUPABASE_PASSWORD = 'RocketDev123!';

export async function devBypassLogin(password: string): Promise<{ success: boolean; error?: string }> {
  if (password !== DEV_PASSWORD) {
    return { success: false, error: 'Incorrect password' };
  }

  // Try signing in first
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: DEV_EMAIL,
    password: DEV_SUPABASE_PASSWORD,
  });

  if (!signInError) {
    // Signed in successfully — ensure admin role + approval
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await ensureDevAdminSetup(user.id);
    }
    return { success: true };
  }

  // Account doesn't exist — create it
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: DEV_EMAIL,
    password: DEV_SUPABASE_PASSWORD,
    options: {
      data: { full_name: 'Dev Admin' },
    },
  });

  if (signUpError) {
    return { success: false, error: signUpError.message };
  }

  if (signUpData.user) {
    await ensureDevAdminSetup(signUpData.user.id);
  }

  return { success: true };
}

async function ensureDevAdminSetup(userId: string) {
  // Ensure admin role exists
  const { data: existingRoles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin');

  if (!existingRoles || existingRoles.length === 0) {
    await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' });
  }

  // Ensure profile is approved
  await supabase
    .from('profiles')
    .update({ is_approved: true })
    .eq('id', userId);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role and approval fetching with setTimeout to avoid deadlock
        if (session?.user) {
          setRolesLoading(true);
          setTimeout(async () => {
            await Promise.all([
              fetchUserRoles(session.user.id),
              fetchApprovalStatus(session.user.id)
            ]);
            setRolesLoading(false);
          }, 0);
        } else {
          setRoles([]);
          setIsApproved(false);
          setRolesLoading(false);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setRolesLoading(true);
        Promise.all([
          fetchUserRoles(session.user.id),
          fetchApprovalStatus(session.user.id)
        ]).then(() => setRolesLoading(false));
      } else {
        setRolesLoading(false);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;

      // De-dupe in case there are accidental duplicates
      const unique = Array.from(new Set((data || []).map(r => r.role as AppRole)));
      setRoles(unique);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      setRoles([]);
    }
  };

  const fetchApprovalStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      setIsApproved(data?.is_approved || false);
    } catch (error) {
      console.error('Error fetching approval status:', error);
      setIsApproved(false);
    }
  };

  const refreshApprovalStatus = async () => {
    if (user) {
      await fetchApprovalStatus(user.id);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });
    
    return { error: error as Error | null };
  };

  const signInWithMagicLink = async (email: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
    setIsApproved(false);
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  // Pick a single effective role to avoid UI/permission duplication when a user has multiple role rows.
  // Highest privilege wins: admin > team > client
  const primaryRole: AppRole = roles.includes('admin')
    ? 'admin'
    : roles.includes('team')
      ? 'team'
      : 'client';

  const isClient = primaryRole === 'client';
  const isTeam = primaryRole === 'team';
  const isAdmin = primaryRole === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      rolesLoading,
      roles,
      isApproved,
      signUp,
      signIn,
      signInWithGoogle,
      signInWithMagicLink,
      signOut,
      hasRole,
      isClient,
      isTeam,
      isAdmin,
      refreshApprovalStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
