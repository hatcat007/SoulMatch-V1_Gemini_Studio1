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

const isInvalidRefreshTokenError = (error: any): error is AuthError => {
    return error && typeof error.message === 'string' && (error.message.includes('Invalid Refresh Token') || error.message.includes('Token is expired'));
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);

    const checkSessionAndProfile = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { session: currentSession }, error } = await supabase.auth.getSession();

            if (isInvalidRefreshTokenError(error)) {
                // If token is invalid, the only way to recover is to sign out completely.
                await supabase.auth.signOut();
                // After signOut, onAuthStateChange will fire, but we'll also clear state here for immediate feedback.
                setSession(null);
                setUser(null);
                setOrganization(null);
                return;
            } else if (error) {
                // For other network errors etc., just log it and proceed as if logged out.
                console.error("Error getting session:", error);
                setSession(null);
                setUser(null);
                setOrganization(null);
                return;
            }
            
            setSession(currentSession);
            
            if (!currentSession?.user) {
                // No user session, we are done.
                setUser(null);
                setOrganization(null);
                return;
            }

            const isOrg = currentSession.user.user_metadata?.is_organization;
            if (isOrg) {
                const { data: orgData } = await supabase.from('organizations').select('*').eq('auth_id', currentSession.user.id).single();
                setOrganization(orgData || null);
                if (orgData?.host_name) {
                    // An organization acts through its host, so we need the host's user profile for actions like sending messages.
                    const { data: hostUserData } = await supabase.from('users').select('*').eq('name', orgData.host_name).limit(1).single();
                    setUser(hostUserData || null);
                } else {
                    setUser(null);
                }
            } else {
                const { data } = await supabase.from('users').select('*').eq('auth_id', currentSession.user.id).single();
                setUser(data || null);
                setOrganization(null);
            }

        } catch (e) {
            console.error("Critical error in checkSessionAndProfile:", e);
            // Fallback for any other unexpected errors
            setSession(null);
            setUser(null);
            setOrganization(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // This function is the single source of truth for auth state.
        // It's called on initial mount and whenever the auth state changes.
        checkSessionAndProfile();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            // When auth state changes (login, logout, token refresh), re-run our master check.
            checkSessionAndProfile();
        });

        return () => subscription.unsubscribe();
    }, [checkSessionAndProfile]);
    
    const value = { 
        session, 
        user, 
        organization, 
        loading, 
        refetchUserProfile: checkSessionAndProfile
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