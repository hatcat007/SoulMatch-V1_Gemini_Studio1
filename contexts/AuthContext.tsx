import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { User, Organization } from '../types';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  organization: Organization | null;
  loading: boolean;
  refetchUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true); // Manages initial load state

  // A single function to fetch profile data based on a session.
  const fetchProfileData = useCallback(async (currentSession: Session | null) => {
    // If no session, clear data and we're done.
    if (!currentSession?.user) {
      setUser(null);
      setOrganization(null);
      return;
    }
    
    // Fetch profile based on session metadata.
    try {
      const isOrganization = currentSession.user.user_metadata?.is_organization;
      if (isOrganization) {
        const { data: orgData, error } = await supabase.from('organizations').select('*').eq('auth_id', currentSession.user.id).single();
        if (error) throw error;
        setOrganization(orgData || null);
        setUser(null);
      } else {
        const { data: userData, error } = await supabase.from('users').select('*').eq('auth_id', currentSession.user.id).single();
        if (error) throw error;
        setUser(userData || null);
        setOrganization(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Clear profiles on error to avoid inconsistent state
      setUser(null);
      setOrganization(null);
    }
  }, []);
  
  // Exposed function for manual refetches.
  const refetchUserProfile = useCallback(async () => {
    // This refetch should not show the main "Loading..." screen,
    // but it should update the data.
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    await fetchProfileData(session);
  }, [fetchProfileData]);

  useEffect(() => {
    let mounted = true;

    // This function handles the initial session load reliably.
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Only update state if the component is still mounted.
      if (mounted) {
        setSession(session);
        await fetchProfileData(session);
        setLoading(false); // End loading after the very first check.
      }
    };
    
    getInitialSession();

    // The onAuthStateChange listener handles subsequent changes (login/logout).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (mounted) {
          setSession(session);
          await fetchProfileData(session);
        }
      }
    );

    // This listener handles re-checking when the tab becomes visible.
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            refetchUserProfile();
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false; // Cleanup to prevent state updates on unmounted component
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchProfileData, refetchUserProfile]);

  const value = { session, user, organization, loading, refetchUserProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
