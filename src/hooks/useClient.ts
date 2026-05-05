import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { DailyCheckin, Enrollment, ProgressMetric, ProgramContent, Session } from '@/types';

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------
export const clientKeys = {
  all:            ['client'] as const,
  enrollment:     (uid: string) => ['client', uid, 'enrollment'] as const,
  checkinToday:   (uid: string) => ['client', uid, 'checkin', 'today'] as const,
  checkins:       (uid: string) => ['client', uid, 'checkins'] as const,
  metrics:        (uid: string) => ['client', uid, 'metrics'] as const,
  latestMetric:   (uid: string) => ['client', uid, 'metrics', 'latest'] as const,
  todayProtocol:  (uid: string, progId: string, week: number) =>
                  ['client', uid, 'protocol', progId, week] as const,
  nextSession:    (uid: string) => ['client', uid, 'session', 'next'] as const,
  streak:         (uid: string) => ['client', uid, 'streak'] as const,
};

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
  const today = new Date().toISOString().split('T')[0];

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
}) => {
  const today = new Date().toISOString().split('T')[0];

  // Save check-in
  const { data, error } = await supabase
    .from('daily_checkins')
    .upsert(
      { client_id: user!.id, date: today, ...values },
      { onConflict: 'client_id,date' }
    )
    .select()
    .single();

  if (error) throw error;

  // Compute scores directly (no Edge Function needed)
  const sleepNorm = Math.min((values.sleep_hrs / 8) * 10, 10);
  const painInvert = 10 - values.pain_level;
  const recoveryScore = Math.round(
    (values.mood * 0.25 + values.energy * 0.25 + sleepNorm * 0.35 + painInvert * 0.15) * 10
  );

  const fitnessScore = Math.min(100, Math.round(
    50 + ((values.energy + values.mood) / 20 - 0.5) * 15
  ));

  const longevityScore = Math.round(
    fitnessScore * 0.4 + recoveryScore * 0.6
  );

  // Save computed scores
  await supabase.from('progress_metrics').insert({
    client_id: user!.id,
    enrollment_id: values.enrollment_id ?? null,
    fitness_score:   fitnessScore,
    recovery_score:  recoveryScore,
    longevity_score: longevityScore,
  });

  return data;
},
    onSuccess: () => {
      if (!user?.id) return;
      qc.invalidateQueries({ queryKey: clientKeys.checkinToday(user.id) });
      qc.invalidateQueries({ queryKey: clientKeys.latestMetric(user.id) });
      qc.invalidateQueries({ queryKey: clientKeys.metrics(user.id) });
      qc.invalidateQueries({ queryKey: clientKeys.streak(user.id) });
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
      const { data, error } = await supabase
        .from('progress_metrics')
        .select('recorded_at, fitness_score, recovery_score, longevity_score, posture_score, weight_kg')
        .eq('client_id', user!.id)
        .order('recorded_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as Pick<
        ProgressMetric,
        'recorded_at' | 'fitness_score' | 'recovery_score' | 'longevity_score' | 'posture_score' | 'weight_kg'
      >[];
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
      const today     = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      let streak   = 0;
      let expected = dates[0] === today ? today : yesterday;

      for (const date of dates) {
        if (date === expected) {
          streak++;
          const d = new Date(expected);
          d.setDate(d.getDate() - 1);
          expected = d.toISOString().split('T')[0];
        } else {
          break;
        }
      }

      return streak;
    },
  });
}