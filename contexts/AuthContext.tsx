import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { User, Organization } from '../types';
import type { Session, AuthError } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  organization: Organization | null;
  loading: boolean;
  refetchUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to check for a specific Supabase auth error.
const isInvalidRefreshTokenError = (error: any): error is AuthError => {
  return error && typeof error.message === 'string' && error.message.includes('Invalid Refresh Token');
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true); // Start true for initial load

  const fetchProfileData = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      setUser(null);
      setOrganization(null);
      return;
    }

    try {
      const isOrganization = currentSession.user.user_metadata?.is_organization;
      
      if (isOrganization) {
        const { data, error } = await supabase.from('organizations').select('*').eq('auth_id', currentSession.user.id).single();
        if (error && error.code !== 'PGRST116') throw error;
        setOrganization(data || null);
        setUser(null);
      } else {
        const { data, error } = await supabase.from('users').select('*').eq('auth_id', currentSession.user.id).single();
        if (error && error.code !== 'PGRST116') throw error;
        setUser(data || null);
        setOrganization(null);
      }
    } catch (error) {
      console.error("AuthContext: Error fetching profile data:", error);
      setUser(null);
      setOrganization(null);
    }
  }, []);

  const refetchUserProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      if (error) {
        if (isInvalidRefreshTokenError(error)) {
          // This signOut will trigger the onAuthStateChange listener, which will handle all state updates.
          await supabase.auth.signOut();
          return; // The listener takes over responsibility for loading state.
        }
        throw error;
      }
      
      // Manually update session and profile, as getSession doesn't trigger the listener if the session is unchanged.
      setSession(currentSession);
      await fetchProfileData(currentSession);
    } catch (e) {
      console.error("AuthContext: Error during manual refetch:", e);
      setSession(null);
      setUser(null);
      setOrganization(null);
    } finally {
      // This manual refetch function is responsible for its own loading state.
      setLoading(false);
    }
  }, [fetchProfileData]);

  useEffect(() => {
    let mounted = true;

    // Set up the listener which is the single source of truth for auth changes.
    // It fires on init, login, and logout.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (mounted) {
          setLoading(true);
          setSession(newSession);
          await fetchProfileData(newSession);
          setLoading(false);
        }
      }
    );

    // Set up a listener to refresh data when the user returns to the tab.
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && mounted) {
            refetchUserProfile();
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
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
