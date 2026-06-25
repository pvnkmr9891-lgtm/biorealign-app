import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

// Fire-and-forget "last seen" heartbeat — used by the admin dashboard to
// show when a coach/client was last active. Never awaited from a render
// path; a failure here is silently logged and otherwise ignored.
function bumpLastSeen(userId: string | undefined) {
  if (!userId) return;
  supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId)
    .then(({ error }) => { if (error) console.warn('[Auth] last_seen_at update failed:', error.message); });
}

/**
 * Call this once in the root layout. It subscribes to Supabase's
 * onAuthStateChange and keeps the Zustand store in sync.
 */
export function useAuthListener() {
  const { setSession } = useAuthStore();

  useEffect(() => {
    // Hydrate from persisted session on app start
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // Stale or invalid refresh token — clear it and force re-login
        console.warn('[Auth] Invalid session token, signing out:', error.message);
        supabase.auth.signOut().finally(() => setSession(null));
      } else {
        setSession(session);
        bumpLastSeen(session?.user?.id);
      }
    });

    // Subscribe to live changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
          setSession(session);
          if (event === 'SIGNED_IN') bumpLastSeen(session?.user?.id);
        } else if (event === 'USER_UPDATED') {
          setSession(session);
        }
        // TOKEN_REFRESH_FAILED — sign out cleanly
        if ((event as string) === 'TOKEN_REFRESH_FAILED') {
          supabase.auth.signOut().finally(() => setSession(null));
        }
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
