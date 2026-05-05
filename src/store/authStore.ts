import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile, UserRole } from '@/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  isInitialised: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  role: null,
  isLoading: false,
  isInitialised: false,

  setSession: (session) => {
    set({
      session,
      user: session?.user ?? null,
      isInitialised: true,
    });
    if (session?.user) {
      get().fetchProfile(session.user.id);
    } else {
      set({ profile: null, role: null });
    }
  },

  setProfile: (profile) => {
    set({ profile, role: profile?.role ?? null });
  },

  fetchProfile: async (userId: string) => {
  set({ isLoading: true });
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    // "no rows" is not a real error for new users — just wait
    if (error.code === 'PGRST116') {
      console.log('[AuthStore] No profile yet for new user');
    } else {
      console.error('[AuthStore] fetchProfile error:', error.message);
    }
    set({ isLoading: false });
    return;
  }

  set({ profile: data, role: data.role, isLoading: false });
},

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, role: null });
  },

  reset: () => {
    set({
      session: null,
      user: null,
      profile: null,
      role: null,
      isLoading: false,
      isInitialised: false,
    });
  },
}));
