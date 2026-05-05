import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Platform analytics
// ---------------------------------------------------------------------------
export function useAdminAnalytics() {
  return useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async () => {
      const [clientsRes, enrollmentsRes, checkinsRes, sessionsRes, metricsRes, plansRes] =
        await Promise.all([
          supabase.from('profiles').select('id, role, created_at').eq('role', 'client'),
          supabase.from('enrollments').select('id, status, program_id, created_at, program:programs(name, slug)'),
          supabase.from('daily_checkins').select('id, date, mood, energy, pain_level').gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]),
          supabase.from('sessions').select('id, status, type, scheduled_at'),
          supabase.from('progress_metrics').select('fitness_score, recovery_score, longevity_score').order('recorded_at', { ascending: false }).limit(100),
          supabase.from('plans').select('id, status, client_id, coach_id'),
        ]);

      const clients     = clientsRes.data     ?? [];
      const enrollments = enrollmentsRes.data ?? [];
      const checkins    = checkinsRes.data    ?? [];
      const sessions    = sessionsRes.data    ?? [];
      const metrics     = metricsRes.data     ?? [];
      const plans       = plansRes.data       ?? [];

      const active = enrollments.filter((e: any) => e.status === 'active');

      const programMap: Record<string, { name: string; count: number }> = {};
      active.forEach((e: any) => {
        const slug = e.program?.slug ?? 'unknown';
        if (!programMap[slug]) programMap[slug] = { name: e.program?.name ?? slug, count: 0 };
        programMap[slug].count++;
      });

      const avgFitness   = metrics.length ? Math.round(metrics.reduce((s: number, m: any) => s + (m.fitness_score   ?? 0), 0) / metrics.length) : 0;
      const avgRecovery  = metrics.length ? Math.round(metrics.reduce((s: number, m: any) => s + (m.recovery_score  ?? 0), 0) / metrics.length) : 0;
      const avgLongevity = metrics.length ? Math.round(metrics.reduce((s: number, m: any) => s + (m.longevity_score ?? 0), 0) / metrics.length) : 0;

      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const sessionsThisWeek = sessions.filter((s: any) => s.scheduled_at > weekAgo).length;

      const last7Days = checkins.filter((c: any) => c.date >= new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);
      const checkinRate = active.length > 0 ? Math.round((last7Days.length / (active.length * 7)) * 100) : 0;

      // Plans stats
      const activePlans    = plans.filter((p: any) => p.status === 'active').length;
      const draftPlans     = plans.filter((p: any) => p.status === 'draft').length;
      const clientsWithPlan = new Set(plans.filter((p: any) => p.status === 'active').map((p: any) => p.client_id)).size;
      const clientsWithoutPlan = clients.length - clientsWithPlan;

      return {
        totalClients: clients.length,
        activeEnrollments: active.length,
        sessionsThisWeek,
        checkinRate,
        avgFitness,
        avgRecovery,
        avgLongevity,
        programBreakdown: Object.values(programMap).sort((a, b) => b.count - a.count),
        recentCheckins: checkins.length,
        activePlans,
        draftPlans,
        clientsWithPlan,
        clientsWithoutPlan,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ---------------------------------------------------------------------------
// All users with coach + plan info
// ---------------------------------------------------------------------------
export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
     const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// All coaches (for assignment dropdown)
// ---------------------------------------------------------------------------
export function useAdminCoaches() {
  return useQuery({
    queryKey: ['admin', 'coaches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, created_at')
        .eq('role', 'coach')
        .order('full_name');

      if (error) throw error;

      // Get client count per coach
      const { data: clients } = await supabase
        .from('profiles')
        .select('id, full_name, assigned_coach_id')
        .eq('role', 'client')
        .not('assigned_coach_id', 'is', null);

      const clientMap: Record<string, number> = {};
      (clients ?? []).forEach((c: any) => {
        if (c.assigned_coach_id) {
          clientMap[c.assigned_coach_id] = (clientMap[c.assigned_coach_id] ?? 0) + 1;
        }
      });

      return (data ?? []).map((coach: any) => ({
        ...coach,
        clientCount: clientMap[coach.id] ?? 0,
      }));
    },
  });
}

// ---------------------------------------------------------------------------
// Clients with their assigned coach
// ---------------------------------------------------------------------------
export function useAdminClients() {
  return useQuery({
    queryKey: ['admin', 'clients'],
    queryFn: async () => {
      const { data, error } = await supabase
  .from('profiles')
  .select('id, full_name, phone, created_at, assigned_coach_id, onboarding_completed')
  .eq('role', 'client')
  .order('full_name');

if (error) {
  console.error('[useAdminClients] error:', error.message);
  throw error;
}
      // Get coach names
      const { data: coaches } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'coach');

      const coachMap: Record<string, string> = {};
      (coaches ?? []).forEach((c: any) => { coachMap[c.id] = c.full_name; });

      // Get plan counts
      const { data: plans } = await supabase
        .from('plans')
        .select('client_id, status');

      const planMap: Record<string, string> = {};
      (plans ?? []).forEach((p: any) => {
        if (p.status === 'active') planMap[p.client_id] = 'active';
        else if (!planMap[p.client_id]) planMap[p.client_id] = p.status;
      });

      return (data ?? []).map((client: any) => ({
        ...client,
        coach_name: client.assigned_coach_id ? coachMap[client.assigned_coach_id] : null,
        plan_status: planMap[client.id] ?? null,
        active_enrollment: client.enrollments?.find((e: any) => e.status === 'active') ?? null,
      }));
    },
  });
}

// ---------------------------------------------------------------------------
// Assign coach to client
// ---------------------------------------------------------------------------
export function useAssignCoach() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, coachId }: { clientId: string; coachId: string | null }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ assigned_coach_id: coachId })
        .eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'clients'] });
      qc.invalidateQueries({ queryKey: ['admin', 'coaches'] });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Update user role
// ---------------------------------------------------------------------------
export function useUpdateUserRole() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'clients'] });
      qc.invalidateQueries({ queryKey: ['admin', 'coaches'] });
    },
  });
}

// ---------------------------------------------------------------------------
// All assessments (for admin review)
// ---------------------------------------------------------------------------
export function useAdminAssessments() {
  return useQuery({
    queryKey: ['admin', 'assessments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Get client names
      const { data: clients } = await supabase
        .from('profiles')
        .select('id, full_name, assigned_coach_id')
        .eq('role', 'client');

      const { data: coaches } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'coach');

      const clientMap: Record<string, any> = {};
      (clients ?? []).forEach((c: any) => { clientMap[c.id] = c; });

      const coachMap: Record<string, string> = {};
      (coaches ?? []).forEach((c: any) => { coachMap[c.id] = c.full_name; });

      return (data ?? []).map((a: any) => ({
        ...a,
        client_name: clientMap[a.client_id]?.full_name ?? 'Unknown',
        coach_name: clientMap[a.client_id]?.assigned_coach_id
          ? coachMap[clientMap[a.client_id].assigned_coach_id]
          : null,
      }));
    },
  });
}

// ---------------------------------------------------------------------------
// Single assessment detail
// ---------------------------------------------------------------------------
export function useAssessmentDetail(assessmentId: string) {
  return useQuery({
    queryKey: ['admin', 'assessment', assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (error) throw error;
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// Send broadcast notification
// ---------------------------------------------------------------------------
export function useSendBroadcast() {
  return useMutation({
    mutationFn: async ({ title, body, segment }: { title: string; body: string; segment: 'all' | 'active' }) => {
      // Insert into notifications table for all relevant users
      let query = supabase.from('profiles').select('id').eq('role', 'client');
      if (segment === 'active') {
        const { data: activeClients } = await supabase
          .from('enrollments')
          .select('client_id')
          .eq('status', 'active');
        const ids = (activeClients ?? []).map((e: any) => e.client_id);
        if (ids.length === 0) return;
        query = query.in('id', ids);
      }

      const { data: clients } = await query;
      if (!clients?.length) return;

      const notifications = clients.map((c: any) => ({
        user_id: c.id,
        title,
        body,
        type: 'broadcast',
      }));

      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) throw error;
    },
  });
}
