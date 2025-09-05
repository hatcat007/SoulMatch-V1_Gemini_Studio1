import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '../services/supabase';
import type { User, Organization } from '../types';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  organization: Organization | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true); // Start true, set to false once initial check is done.

  useEffect(() => {
    // The onAuthStateChange listener is sufficient. It fires with the initial session
    // right after you subscribe to it, and then for every subsequent auth change.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(null);
        setOrganization(null);

        if (session?.user) {
          try {
            const isOrganization = session.user.user_metadata?.is_organization;
            if (isOrganization) {
              const { data: orgData, error } = await supabase
                .from('organizations')
                .select('*')
                .eq('auth_id', session.user.id)
                .single();
              if (error) throw error;
              setOrganization(orgData || null);
            } else {
              const { data: userData, error } = await supabase
                .from('users')
                .select('*')
                .eq('auth_id', session.user.id)
                .single();
              if (error) throw error;
              setUser(userData || null);
            }
          } catch (error) {
            console.error('Error fetching profile:', error);
            // Still set session, but profiles will be null.
          }
        }
        
        // Once the initial check is done (session is either null or a profile has been fetched),
        // we can stop loading.
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    organization,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
