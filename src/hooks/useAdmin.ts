import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Platform analytics
// ---------------------------------------------------------------------------
export function useAdminAnalytics() {
  return useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async () => {
      const [clientsRes, enrollmentsRes, checkinsRes, sessionsRes, metricsRes] =
        await Promise.all([
          supabase.from('profiles').select('id, role, created_at').eq('role', 'client'),
          supabase.from('enrollments').select('id, status, program_id, created_at, program:programs(name, slug)'),
          supabase.from('daily_checkins').select('id, date, mood, energy, pain_level').gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]),
          supabase.from('sessions').select('id, status, type, scheduled_at'),
          supabase.from('progress_metrics').select('fitness_score, recovery_score, longevity_score').order('recorded_at', { ascending: false }).limit(100),
        ]);

      const clients     = clientsRes.data     ?? [];
      const enrollments = enrollmentsRes.data ?? [];
      const checkins    = checkinsRes.data    ?? [];
      const sessions    = sessionsRes.data    ?? [];
      const metrics     = metricsRes.data     ?? [];

      // Active enrollments
      const active = enrollments.filter((e: any) => e.status === 'active');

      // Program breakdown
      const programMap: Record<string, { name: string; count: number }> = {};
      active.forEach((e: any) => {
        const slug = e.program?.slug ?? 'unknown';
        if (!programMap[slug]) programMap[slug] = { name: e.program?.name ?? slug, count: 0 };
        programMap[slug].count++;
      });

      // Avg scores
      const avgFitness   = metrics.length ? Math.round(metrics.reduce((s: number, m: any) => s + (m.fitness_score   ?? 0), 0) / metrics.length) : 0;
      const avgRecovery  = metrics.length ? Math.round(metrics.reduce((s: number, m: any) => s + (m.recovery_score  ?? 0), 0) / metrics.length) : 0;
      const avgLongevity = metrics.length ? Math.round(metrics.reduce((s: number, m: any) => s + (m.longevity_score ?? 0), 0) / metrics.length) : 0;

      // Sessions this week
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const sessionsThisWeek = sessions.filter((s: any) => s.scheduled_at > weekAgo).length;

      // Check-in rate (last 7 days)
      const last7Days = checkins.filter((c: any) => c.date >= new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);
      const checkinRate = active.length > 0 ? Math.round((last7Days.length / (active.length * 7)) * 100) : 0;

      return {
        totalClients:     clients.length,
        activeEnrollments: active.length,
        sessionsThisWeek,
        checkinRate,
        avgFitness,
        avgRecovery,
        avgLongevity,
        programBreakdown: Object.values(programMap).sort((a, b) => b.count - a.count),
        recentCheckins:   checkins.length,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ---------------------------------------------------------------------------
// All users for admin
// ---------------------------------------------------------------------------
export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          enrollments:enrollments(
            id, status, current_week,
            program:programs(name, slug)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Update user role
// ---------------------------------------------------------------------------
export function useUpdateUserRole() {
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);
      if (error) throw error;
    },
  });
}

// ---------------------------------------------------------------------------
// Send push notification to all clients
// ---------------------------------------------------------------------------
export function useSendBroadcast() {
  return useMutation({
    mutationFn: async ({ title, body, segment }: { title: string; body: string; segment: 'all' | 'active' }) => {
      const { error } = await supabase.functions.invoke('send-notification', {
        body: { title, body, segment },
      });
      if (error) throw error;
    },
  });
}
