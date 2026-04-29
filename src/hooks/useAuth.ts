import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

/**
 * Call this once in the root layout. It subscribes to Supabase's
 * onAuthStateChange and keeps the Zustand store in sync.
 */
export function useAuthListener() {
  const { setSession } = useAuthStore();

  useEffect(() => {
    // Hydrate from persisted session on app start
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Subscribe to live changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);
}

/**
 * Convenience hook for reading auth state anywhere in the app.
 */
export function useAuth() {
  const { session, user, profile, role, isLoading, isInitialised, signOut } =
    useAuthStore();

  return {
    session,
    user,
    profile,
    role,
    isLoading,
    isInitialised,
    isAuthenticated: !!session,
    isClient: role === 'client',
    isCoach: role === 'coach',
    isAdmin: role === 'admin',
    signOut,
  };
}
