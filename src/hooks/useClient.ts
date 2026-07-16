import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { toLocalDateStr, addDaysToDateStr } from '@/lib/dateHelpers';
import type { DailyCheckin, Enrollment, ProgressMetric, ProgramContent, Session } from '@/types';

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------
export const clientKeys = {
  all:            ['client'] as const,
  enrollment:     (uid: string) => ['client', uid, 'enrollment'] as const,
  checkinToday:   (uid: string) => ['client', uid, 'checkin', 'today'] as const,
  checkinDate:    (uid: string, date: string) => ['client', uid, 'checkin', date] as const,
  checkinMonth:   (uid: string, year: number, month: number) => ['client', uid, 'checkin', 'month', year, month] as const,
  checkins:       (uid: string) => ['client', uid, 'checkins'] as const,
  metrics:        (uid: string) => ['client', uid, 'metrics'] as const,
  latestMetric:   (uid: string) => ['client', uid, 'metrics', 'latest'] as const,
  todayProtocol:  (uid: string, progId: string, week: number) =>
                  ['client', uid, 'protocol', progId, week] as const,
  nextSession:    (uid: string) => ['client', uid, 'session', 'next'] as const,
  streak:         (uid: string) => ['client', uid, 'streak'] as const,
};

// ---------------------------------------------------------------------------
// Update basic profile fields — takes an explicit targetUserId so the same
// mutation works whether the actor is the client editing themselves or an
// admin editing someone else's record. Defaults to the current user so
// existing client-side call sites don't need to pass anything.
// ---------------------------------------------------------------------------
export function useUpdateProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetUserId, data }: { targetUserId?: string; data: Record<string, any> }) => {
      const id = targetUserId ?? user!.id;
      const { error } = await supabase.from('profiles').update(data).eq('id', id);
      if (error) throw error;
      return { id };
    },
    onSuccess: ({ id }) => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'clients'] });
      qc.invalidateQueries({ queryKey: ['admin', 'coaches'] });
      qc.invalidateQueries({ queryKey: ['coach_client', id, 'profile'] });
      // useAuth().profile is a plain Zustand snapshot, not React Query — the
      // invalidations above don't touch it, so self-edits (avatar, mood
      // status, edit-profile) silently wouldn't show until next login.
      if (id === user?.id) useAuthStore.getState().fetchProfile(id);
    },
  });
}

// ---------------------------------------------------------------------------
// Active enrollment
// ---------------------------------------------------------------------------
export function useActiveEnrollment() {
  const { user } = useAuth();

  return useQuery({
    queryKey: clientKeys.enrollment(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          program:programs(*),
          coach:profiles!enrollments_coach_id_fkey(id, full_name, avatar_url)
        `)
        .eq('client_id', user!.id)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return (data as Enrollment & { program: any; coach: any }) ?? null;
    },
    staleTime: 1000 * 60 * 10,
  });
}

// ---------------------------------------------------------------------------
// Today's check-in
// ---------------------------------------------------------------------------
export function useTodayCheckin() {
  const { user } = useAuth();
  const today = toLocalDateStr(new Date());

  return useQuery({
    queryKey: clientKeys.checkinToday(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('client_id', user!.id)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      return data as DailyCheckin | null;
    },
  });
}

// ---------------------------------------------------------------------------
// Checkin by specific date
// ---------------------------------------------------------------------------
export function useCheckinByDate(date: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: clientKeys.checkinDate(user?.id ?? '', date),
    enabled: !!user?.id && !!date,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('client_id', user!.id)
        .eq('date', date)
        .maybeSingle();

      if (error) throw error;
      return data as DailyCheckin | null;
    },
  });
}

// ---------------------------------------------------------------------------
// All checkin dates for the last 6 months (for calendar highlighting)
// ---------------------------------------------------------------------------
export function useCheckinAllDates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...clientKeys.checkins(user?.id ?? ''), 'dates'],
    enabled: !!user?.id,
    queryFn: async () => {
      const from = new Date();
      from.setMonth(from.getMonth() - 6);
      const fromStr = toLocalDateStr(from);

      const { data, error } = await supabase
        .from('daily_checkins')
        .select('date')
        .eq('client_id', user!.id)
        .gte('date', fromStr)
        .order('date', { ascending: false });

      if (error) throw error;
      return (data ?? []).map(d => d.date as string);
    },
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// Save check-in (upsert) + trigger score calculator
// ---------------------------------------------------------------------------
export function useSaveCheckin() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (values: {
  mood: number;
  energy: number;
  sleep_hrs: number;
  pain_level: number;
  notes?: string;
  enrollment_id?: string;
  date?: string;
}) => {
  const { date: dateOverride, ...rest } = values;
  const today = dateOverride ?? toLocalDateStr(new Date());

  // Save check-in
  const { data, error } = await supabase
    .from('daily_checkins')
    .upsert(
      { client_id: user!.id, date: today, ...rest },
      { onConflict: 'client_id,date' }
    )
    .select()
    .single();

  if (error) throw error;

  // Normalise all inputs to 0-10 so max inputs → 100 on every score.
  const moodNorm    = ((values.mood - 1) / 9) * 10;
  const energyNorm  = (values.energy / 12) * 10;
  const sleepNorm   = Math.min((values.sleep_hrs / 8) * 10, 10);
  const painInvert  = 10 - Math.min((values.pain_level / 12) * 10, 10);
  const recoveryScore = Math.round(
    (moodNorm * 0.25 + energyNorm * 0.25 + sleepNorm * 0.35 + painInvert * 0.15) * 10
  );
  const fitnessScore = Math.round((energyNorm * 0.6 + moodNorm * 0.4) * 10);

  const longevityScore = Math.round(
    fitnessScore * 0.4 + recoveryScore * 0.6
  );

  // Save computed scores — use the check-in date so past-date entries land on the right day
  await supabase.from('progress_metrics').insert({
    client_id: user!.id,
    enrollment_id: values.enrollment_id ?? null,
    fitness_score:   fitnessScore,
    recovery_score:  recoveryScore,
    longevity_score: longevityScore,
    recorded_at: today + 'T12:00:00',
  });

  return data;
},
    onSuccess: (_, variables) => {
      if (!user?.id) return;
      const savedDate = variables.date ?? toLocalDateStr(new Date());
      const [y, m] = savedDate.split('-').map(Number);
      qc.invalidateQueries({ queryKey: clientKeys.checkinToday(user.id) });
      qc.invalidateQueries({ queryKey: clientKeys.checkinDate(user.id, savedDate) });
      qc.invalidateQueries({ queryKey: clientKeys.checkins(user.id) });
      qc.invalidateQueries({ queryKey: clientKeys.latestMetric(user.id) });
      qc.invalidateQueries({ queryKey: clientKeys.metrics(user.id) });
      qc.invalidateQueries({ queryKey: clientKeys.streak(user.id) });
      // Home page uses these exact keys — must invalidate them explicitly
      qc.invalidateQueries({ queryKey: ['client', user.id, 'recent_metrics'] });
      qc.invalidateQueries({ queryKey: ['client', user.id, 'last_checkin'] });
      qc.invalidateQueries({ queryKey: ['alignment', user.id] });
      qc.invalidateQueries({ queryKey: ['client_streaks', user.id] });
      qc.invalidateQueries({ queryKey: ['client', user.id, 'week_activity'] });
      qc.invalidateQueries({ queryKey: ['client', user.id, 'score_for_date', savedDate] });
    },
  });
}

// ---------------------------------------------------------------------------
// Latest progress metric (for dashboard score rings)
// ---------------------------------------------------------------------------
export function useLatestMetric() {
  const { user } = useAuth();

  return useQuery({
    queryKey: clientKeys.latestMetric(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress_metrics')
        .select('*')
        .eq('client_id', user!.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ProgressMetric | null;
    },
  });
}

// ---------------------------------------------------------------------------
// Progress history (last 8 entries — for charts)
// ---------------------------------------------------------------------------
export function useProgressHistory(limit = 8) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...clientKeys.metrics(user?.id ?? ''), limit],
    enabled: !!user?.id,
    queryFn: async () => {
      // Fetch extra rows (newest first) so we can deduplicate per day,
      // then return the last `limit` unique days in ascending order.
      const { data, error } = await supabase
        .from('progress_metrics')
        .select('recorded_at, fitness_score, recovery_score, longevity_score, posture_score, weight_kg')
        .eq('client_id', user!.id)
        .order('recorded_at', { ascending: false })
        .limit(limit * 20);

      if (error) throw error;

      // Keep only the latest entry per calendar date (rows arrive newest-first)
      const seen = new Set<string>();
      const deduped: typeof data = [];
      for (const row of (data ?? [])) {
        const day = row.recorded_at.split('T')[0];
        if (!seen.has(day)) {
          seen.add(day);
          deduped.push(row);
        }
      }

      // Reverse to ascending, then take the last `limit` unique days
      return deduped.reverse().slice(-limit) as Pick<
        ProgressMetric,
        'recorded_at' | 'fitness_score' | 'recovery_score' | 'longevity_score' | 'posture_score' | 'weight_kg'
      >[];
    },
  });
}

export interface CheckinVitalRow {
  date: string; // YYYY-MM-DD
  mood: number | null;
  energy: number | null;
  sleep_hrs: number | null;
  pain_level: number | null;
}

// The raw numbers behind the computed scores (mood/energy/sleep/pain), for
// the Score Trend chart's "Raw" toggle on the client's own Progress screen —
// self-service mirror of useClientCheckinVitals (coach viewing a client).
// progress_metrics (fitness/recovery/longevity scores) doesn't carry these;
// they only live in daily_checkins.
export function useMyCheckinVitals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...clientKeys.checkins(user?.id ?? ''), 'vitals'],
    enabled: !!user?.id,
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('date, mood, energy, sleep_hrs, pain_level')
        .eq('client_id', user!.id)
        .gte('date', cutoff)
        .order('date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CheckinVitalRow[];
    },
  });
}

// ---------------------------------------------------------------------------
// Today's protocol — program content for current week, day of week
// ---------------------------------------------------------------------------
export function useTodayProtocol(programId?: string, currentWeek?: number) {
  const { user } = useAuth();
  const dayOfWeek = new Date().getDay() || 7; // 1=Mon … 7=Sun

  return useQuery({
    queryKey: clientKeys.todayProtocol(user?.id ?? '', programId ?? '', currentWeek ?? 0),
    enabled: !!programId && !!currentWeek,
    staleTime: 1000 * 60 * 60, // content doesn't change intraday
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_content')
        .select('*')
        .eq('program_id', programId!)
        .eq('week_num', currentWeek!)
        .or(`day_num.is.null,day_num.eq.${dayOfWeek}`)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return (data ?? []) as ProgramContent[];
    },
  });
}

// ---------------------------------------------------------------------------
// Next upcoming session
// ---------------------------------------------------------------------------
export function useNextSession() {
  const { user } = useAuth();

  return useQuery({
    queryKey: clientKeys.nextSession(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          coach:profiles!sessions_coach_id_fkey(full_name, avatar_url)
        `)
        .eq('client_id', user!.id)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as (Session & { coach: any }) | null;
    },
  });
}

// ---------------------------------------------------------------------------
// Check-in streak
// ---------------------------------------------------------------------------
export function useCheckinStreak() {
  const { user } = useAuth();

  return useQuery({
    queryKey: clientKeys.streak(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('date')
        .eq('client_id', user!.id)
        .order('date', { ascending: false })
        .limit(60);

      if (error) throw error;

      const dates = (data ?? []).map(d => d.date);
      if (!dates.length) return 0;

      // Allow streak to start from today OR yesterday
      const today     = toLocalDateStr(new Date());
      const yesterday = addDaysToDateStr(today, -1);

      let streak   = 0;
      let expected = dates[0] === today ? today : yesterday;

      for (const date of dates) {
        if (date === expected) {
          streak++;
          expected = addDaysToDateStr(expected, -1);
        } else {
          break;
        }
      }

      return streak;
    },
  });
}