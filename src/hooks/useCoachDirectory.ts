import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';

export const coachDirectoryKeys = {
  list:     ['coach_directory'] as const,
  detail:   (coachId: string) => ['coach_directory', coachId] as const,
  myStatus: (clientId: string) => ['client', clientId, 'coach_status'] as const,
};

export interface CoachCertification { name: string; issuer: string; year: number }
export interface CoachEducation { degree: string; institution: string; year: number }
export interface CoachExperience { role: string; organization: string; start_year: number; end_year: number | null; description: string }
export interface CoachAchievement { icon: string; title: string; year: number | null; description: string }
export interface CoachTestimonial { client_name: string; rating: number; quote: string }
export interface CoachSocialLinks { instagram?: string; linkedin?: string; youtube?: string; twitter?: string; website?: string }

export interface CoachListing {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  years_experience: number | null;
  specialties: string[] | null;
  clients_served: number;
  tagline?: string | null;
  location?: string | null;
  coaching_philosophy?: string | null;
  certifications?: CoachCertification[];
  education?: CoachEducation[];
  experience_timeline?: CoachExperience[];
  achievements?: CoachAchievement[];
  testimonials?: CoachTestimonial[];
  social_links?: CoachSocialLinks;
}

const COACH_PROFILE_COLUMNS = 'id, full_name, avatar_url, bio, years_experience, specialties, tagline, location, coaching_philosophy, certifications, education, experience_timeline, achievements, testimonials, social_links';

// ── Directory: all coaches, with a live "clients served" count ──────────
export function useCoachDirectory() {
  return useQuery({
    queryKey: coachDirectoryKeys.list,
    queryFn: async () => {
      const { data: coaches, error } = await supabase
        .from('profiles')
        .select(COACH_PROFILE_COLUMNS)
        .eq('role', 'coach')
        .order('full_name');

      if (error) throw error;
      if (!coaches?.length) return [];

      const { data: counts } = await supabase
        .from('profiles')
        .select('assigned_coach_id')
        .not('assigned_coach_id', 'is', null);

      const tally = new Map<string, number>();
      (counts ?? []).forEach((row: any) => {
        tally.set(row.assigned_coach_id, (tally.get(row.assigned_coach_id) ?? 0) + 1);
      });

      return coaches.map((c) => ({ ...c, clients_served: tally.get(c.id) ?? 0 })) as CoachListing[];
    },
  });
}

export function useCoachProfile(coachId: string) {
  return useQuery({
    queryKey: coachDirectoryKeys.detail(coachId),
    enabled: !!coachId,
    queryFn: async () => {
      const [profileRes, countRes] = await Promise.all([
        supabase.from('profiles').select(COACH_PROFILE_COLUMNS).eq('id', coachId).single(),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('assigned_coach_id', coachId),
      ]);
      if (profileRes.error) throw profileRes.error;
      return { ...profileRes.data, clients_served: countRes.count ?? 0 } as CoachListing;
    },
  });
}

// ── Client's current coach relationship status ───────────────────────────
// One of: { state: 'none' } | { state: 'pending', request } | { state: 'assigned', coachId }
export function useMyCoachStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: coachDirectoryKeys.myStatus(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      // Query the DB directly rather than the zustand auth-store snapshot of
      // `profile` — that snapshot is only refreshed on login/session events,
      // so it never reflects a coach approving the request while the app
      // is open. Refresh the store's profile too so the rest of the app
      // (e.g. profile.tsx reading useAuth().profile) picks it up as well.
      const { data: freshProfile, error: profileError } = await supabase
        .from('profiles')
        .select('assigned_coach_id')
        .eq('id', user!.id)
        .single();
      if (profileError) throw profileError;

      if (freshProfile?.assigned_coach_id) {
        useAuthStore.getState().fetchProfile(user!.id);
        return { state: 'assigned' as const, coachId: freshProfile.assigned_coach_id as string };
      }
      const { data, error } = await supabase
        .from('coach_requests')
        .select('id, coach_id, status, message, created_at, coach:profiles!coach_requests_coach_id_fkey(id, full_name, avatar_url)')
        .eq('client_id', user!.id)
        .eq('status', 'pending')
        .maybeSingle();
      if (error) throw error;
      if (data) return { state: 'pending' as const, request: data };
      return { state: 'none' as const };
    },
    refetchInterval: 15000, // poll while waiting for coach approval
  });
}

// ── Send a coach request + notify the coach ──────────────────────────────
export function useRequestCoach() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ coachId, message }: { coachId: string; message?: string }) => {
      const { data, error } = await supabase
        .from('coach_requests')
        .insert({ client_id: user!.id, coach_id: coachId, message: message?.trim() || null })
        .select()
        .single();
      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: coachId,
        title: 'New coach request',
        body: `${profile?.full_name ?? 'A client'} would like you to be their coach.`,
        type: 'coach_request',
        action_url: '/(coach)/coach-requests',
      });

      return data;
    },
    onSuccess: () => {
      if (user?.id) qc.invalidateQueries({ queryKey: coachDirectoryKeys.myStatus(user.id) });
    },
  });
}

// ── Unassign the client's current coach (the "Change my coach" flow) ─────
// Clients own their own profile row (profiles_own_update RLS), so this can
// write directly rather than needing coach/admin approval — unlike getting
// a NEW coach assigned, which does require the coach to approve.
export function useUnassignMyCoach() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ assigned_coach_id: null })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (!user?.id) return;
      qc.invalidateQueries({ queryKey: coachDirectoryKeys.myStatus(user.id) });
      qc.invalidateQueries({ queryKey: ['client', user.id, 'coach_info'] });
      useAuthStore.getState().fetchProfile(user.id);
    },
  });
}

// ── Cancel a pending request ──────────────────────────────────────────────
export function useCancelCoachRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('coach_requests')
        .update({ status: 'cancelled', responded_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (user?.id) qc.invalidateQueries({ queryKey: coachDirectoryKeys.myStatus(user.id) });
    },
  });
}
