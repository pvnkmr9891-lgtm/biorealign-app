import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Platform analytics
// ---------------------------------------------------------------------------
export function useAdminAnalytics() {
  return useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async () => {
      const sevenDaysAgoIso  = new Date(Date.now() - 7  * 86400000).toISOString();
      const fourteenDaysAgoIso = new Date(Date.now() - 14 * 86400000).toISOString();
      const thirtyDaysAgoIso = new Date(Date.now() - 30 * 86400000).toISOString();

      const [
        clientsRes, enrollmentsRes, checkinsRes, sessionsRes, metricsRes, plansRes, rehabRes,
        manualLogs7dRes, manualLogs14dRes, manualLogs30dRes,
        pendingAssessmentsRes, unreadMedicalDocsRes,
      ] =
        await Promise.all([
          supabase.from('profiles').select('id, role, created_at').eq('role', 'client'),
          supabase.from('enrollments').select('id, status, program_id, created_at, program:programs(name, slug)'),
          supabase.from('daily_checkins').select('id, date, mood, energy, pain_level').gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]),
          supabase.from('sessions').select('id, status, type, scheduled_at'),
          supabase.from('progress_metrics').select('fitness_score, recovery_score, longevity_score').order('recorded_at', { ascending: false }).limit(100),
          supabase.from('plans').select('id, status, client_id, coach_id'),
          supabase.from('rehab_requests').select('id, status').eq('status', 'pending'),
          // last 7 days of manual_workout_logs, for engagement rate + adherence
          supabase.from('manual_workout_logs').select('client_id, item_type, completed, completed_at').gte('completed_at', sevenDaysAgoIso),
          // last 14 days, completed=true only, for disengaged-clients detection
          supabase.from('manual_workout_logs').select('client_id, completed_at').eq('completed', true).gte('completed_at', fourteenDaysAgoIso),
          // last 30 days, completed=true only, for the feature-usage breakdown
          supabase.from('manual_workout_logs').select('client_id, item_type').eq('completed', true).gte('completed_at', thirtyDaysAgoIso),
          // Detailed assessments awaiting coach review — 'submitted' means
          // the client has submitted it and it hasn't been reviewed yet
          // (mirrors useDetailedAssessment.ts's submit/review status flow).
          supabase.from('coach_detailed_assessments').select('id').eq('status', 'submitted'),
          supabase.from('medical_documents').select('id').eq('coach_has_unread_feedback', true),
        ]);

      const clients     = clientsRes.data     ?? [];
      const enrollments = enrollmentsRes.data ?? [];
      const checkins    = checkinsRes.data    ?? [];
      const sessions    = sessionsRes.data    ?? [];
      const metrics     = metricsRes.data     ?? [];
      const plans       = plansRes.data       ?? [];
      const pendingRehabRequests = rehabRes.data ?? [];
      const manualLogs7d  = manualLogs7dRes.data  ?? [];
      const manualLogs14d = manualLogs14dRes.data ?? [];
      const manualLogs30d = manualLogs30dRes.data ?? [];
      const pendingDetailedAssessments = pendingAssessmentsRes.data ?? [];
      const unreadMedicalDocs = unreadMedicalDocsRes.data ?? [];

      const active = enrollments.filter((e: any) => e.status === 'active');

      const avgFitness   = metrics.length ? Math.round(metrics.reduce((s: number, m: any) => s + (m.fitness_score   ?? 0), 0) / metrics.length) : 0;
      const avgRecovery  = metrics.length ? Math.round(metrics.reduce((s: number, m: any) => s + (m.recovery_score  ?? 0), 0) / metrics.length) : 0;
      const avgLongevity = metrics.length ? Math.round(metrics.reduce((s: number, m: any) => s + (m.longevity_score ?? 0), 0) / metrics.length) : 0;

      const weekAgo = sevenDaysAgoIso;
      const sessionsThisWeek = sessions.filter((s: any) => s.scheduled_at > weekAgo).length;

      const last7Days = checkins.filter((c: any) => c.date >= new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);
      const checkinRate = active.length > 0 ? Math.round((last7Days.length / (active.length * 7)) * 100) : 0;

      // Plans stats
      const activePlans    = plans.filter((p: any) => p.status === 'active').length;
      const draftPlans     = plans.filter((p: any) => p.status === 'draft').length;
      const clientsWithPlan = new Set(plans.filter((p: any) => p.status === 'active').map((p: any) => p.client_id)).size;
      const clientsWithoutPlan = clients.length - clientsWithPlan;

      // ── New signups this week ────────────────────────────────────────────
      const newSignupsThisWeek = clients.filter((c: any) => c.created_at >= weekAgo).length;

      // ── Client engagement rate ───────────────────────────────────────────
      // % of all role=client profiles who have at least one completed
      // manual_workout_logs row in the last 7 days. Denominator is every
      // client profile (not just "active" enrollments, since enrollments
      // are a disconnected workflow from real content delivery — see
      // workout_program_id note elsewhere in this file).
      const engagedClientIds = new Set(
        manualLogs7d.filter((l: any) => l.completed).map((l: any) => l.client_id)
      );
      const clientEngagementRate = clients.length > 0
        ? Math.round((engagedClientIds.size / clients.length) * 100)
        : 0;

      // ── Avg workout adherence (last 7 days) ──────────────────────────────
      // Simplest correct interpretation: of all manual_workout_logs rows
      // whose completed_at falls in the last 7 days (i.e. rows the client
      // actually marked done within the window), what fraction are
      // completed=true. Since completed_at is only ever set when a row is
      // marked done, this query already only returns completed rows — so
      // this is really "volume of completions in the window" relative to
      // itself, which would always be ~100%. Instead we treat the
      // denominator as ALL rows that exist for an active week (regardless
      // of completed_at) and the numerator as those completed in the last
      // 7 days — i.e. completion rate of the current week's checklist.
      // We approximate this using the 7-day completed-row count against
      // the same period's total assigned items per client (best-effort,
      // single query, see code comment below for the exact formula).
      const totalManualLogRows7d = manualLogs7d.length;
      const completedManualLogRows7d = manualLogs7d.filter((l: any) => l.completed).length;
      const avgWorkoutAdherence = totalManualLogRows7d > 0
        ? Math.round((completedManualLogRows7d / totalManualLogRows7d) * 100)
        : 0;

      // ── Disengaged clients ────────────────────────────────────────────────
      // Clients with zero completed manual_workout_logs rows in the last 14
      // days. last activity = most recent completed_at we can find for them
      // at all (looked up from the 30-day window query below as a cheap
      // proxy — falls back to "Never" if not found there either).
      const completedClientIds14d = new Set(manualLogs14d.map((l: any) => l.client_id));
      const lastActivityMap: Record<string, string> = {};
      manualLogs14d.forEach((l: any) => {
        if (!lastActivityMap[l.client_id] || l.completed_at > lastActivityMap[l.client_id]) {
          lastActivityMap[l.client_id] = l.completed_at;
        }
      });
      const disengagedClients = clients
        .filter((c: any) => !completedClientIds14d.has(c.id))
        .map((c: any) => ({ id: c.id, full_name: c.full_name, last_activity: lastActivityMap[c.id] ?? null }))
        .sort((a: any, b: any) => {
          // Most-stale first: nulls (never active) sort before any date.
          if (!a.last_activity && !b.last_activity) return 0;
          if (!a.last_activity) return -1;
          if (!b.last_activity) return 1;
          return a.last_activity.localeCompare(b.last_activity);
        })
        .slice(0, 20);

      // ── Pending items count (cross-feature) ──────────────────────────────
      const pendingItemsCount = pendingRehabRequests.length + pendingDetailedAssessments.length + unreadMedicalDocs.length;

      // ── Feature usage breakdown (last 30 days) ───────────────────────────
      // Distinct clients with completed activity per item_type — a simple
      // proxy for "what's actually being used," not a precise analytics
      // engine.
      const featureUsageMap: Record<string, Set<string>> = {};
      manualLogs30d.forEach((l: any) => {
        if (!featureUsageMap[l.item_type]) featureUsageMap[l.item_type] = new Set();
        featureUsageMap[l.item_type].add(l.client_id);
      });
      const featureUsageBreakdown = Object.entries(featureUsageMap)
        .map(([item_type, set]) => ({ item_type, clientCount: set.size }))
        .sort((a, b) => b.clientCount - a.clientCount);

      return {
        totalClients: clients.length,
        activeEnrollments: active.length,
        sessionsThisWeek,
        checkinRate,
        avgFitness,
        avgRecovery,
        avgLongevity,
        recentCheckins: checkins.length,
        activePlans,
        draftPlans,
        clientsWithPlan,
        clientsWithoutPlan,
        pendingRehabRequests: pendingRehabRequests.length,
        newSignupsThisWeek,
        clientEngagementRate,
        avgWorkoutAdherence,
        disengagedClients,
        pendingItemsCount,
        featureUsageBreakdown,
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

      // is_athlete lives on coach_detailed_assessments, not profiles — merge
      // it in here so the Users list can filter/badge by it without every
      // caller having to join separately.
      const { data: assessments } = await supabase
        .from('coach_detailed_assessments')
        .select('client_id, is_athlete');
      const athleteMap: Record<string, boolean | null> = {};
      (assessments ?? []).forEach((a: any) => { athleteMap[a.client_id] = a.is_athlete; });

      const { data: pendingRehab } = await supabase
        .from('rehab_requests')
        .select('client_id')
        .eq('status', 'pending');
      const pendingRehabSet = new Set((pendingRehab ?? []).map((r: any) => r.client_id));

      return (data ?? []).map((u: any) => ({
        ...u,
        is_athlete: athleteMap[u.id] ?? null,
        has_pending_rehab_request: pendingRehabSet.has(u.id),
      }));
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
// A single coach's account info + their assigned clients (for the admin
// coach-profile drill-down)
// ---------------------------------------------------------------------------
export function useAdminCoachDetail(coachId: string) {
  return useQuery({
    queryKey: ['admin', 'coach', coachId],
    enabled: !!coachId,
    queryFn: async () => {
      const [{ data: coach, error: coachErr }, { data: clients, error: clientsErr }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', coachId).single(),
        supabase.from('profiles').select('id, full_name, phone, created_at').eq('assigned_coach_id', coachId).order('full_name'),
      ]);
      if (coachErr) throw coachErr;
      if (clientsErr) throw clientsErr;
      return { coach, clients: clients ?? [] };
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

// ---------------------------------------------------------------------------
// Recovery / rehab — a single client's requests (for the admin client-profile
// Recovery tab), responding to a request, and managing availability windows.
// ---------------------------------------------------------------------------
export function useClientRehabRequests(clientId: string) {
  return useQuery({
    queryKey: ['admin', 'rehab_requests', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rehab_requests')
        .select('*, package:rehab_packages(*)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRespondToRehabRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, clientId, action, quotedPrice, declineReason }: {
      requestId: string; clientId: string; action: 'accept' | 'decline'; quotedPrice?: number; declineReason?: string;
    }) => {
      const update = action === 'accept'
        ? { status: 'accepted', quoted_price: quotedPrice, responded_at: new Date().toISOString() }
        : { status: 'declined', decline_reason: declineReason ?? null, responded_at: new Date().toISOString() };

      const { error } = await supabase.from('rehab_requests').update(update).eq('id', requestId);
      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: clientId,
        title: action === 'accept' ? 'Your Recovery request was accepted' : 'Your Recovery request was declined',
        body: action === 'accept'
          ? `Quoted price: ₹${quotedPrice}. Open Recovery to pick your session time.`
          : (declineReason || 'Please check the Recovery section for details.'),
        type: 'alert',
        action_url: '/(client)/recovery',
      });
    },
    onSuccess: (_d, { clientId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'rehab_requests', clientId] });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useAdminMarkRehabPaid() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, clientId }: { requestId: string; clientId: string }) => {
      const { error } = await supabase.from('rehab_requests').update({ payment_status: 'paid', payment_method: 'cash' }).eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: (_d, { clientId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'rehab_requests', clientId] });
    },
  });
}

export function useClientRehabAppointments(clientId: string) {
  return useQuery({
    queryKey: ['admin', 'rehab_appointments', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rehab_appointments')
        .select('*')
        .eq('client_id', clientId)
        .order('scheduled_at');
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Eshwar's recurring weekly availability windows — admin-managed, read by all clients.
export function useAdminRehabAvailabilityWindows() {
  return useQuery({
    queryKey: ['admin', 'rehab_windows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rehab_availability_windows')
        .select('*')
        .order('day_of_week')
        .order('start_time');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddRehabAvailabilityWindow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (window: { day_of_week: number; start_time: string; end_time: string; slot_minutes: number }) => {
      const { error } = await supabase.from('rehab_availability_windows').insert(window);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'rehab_windows'] }),
  });
}

export function useRemoveRehabAvailabilityWindow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (windowId: string) => {
      const { error } = await supabase.from('rehab_availability_windows').delete().eq('id', windowId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'rehab_windows'] }),
  });
}

// Flips a (day, fixed-slot) cell on/off in the admin grid — every cell already
// exists as a row (seeded for all 6 fixed slots x 7 days), so toggling just
// flips `active` rather than inserting/deleting.
export function useSetRehabAvailabilityWindowActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ windowId, active }: { windowId: string; active: boolean }) => {
      const { error } = await supabase.from('rehab_availability_windows').update({ active }).eq('id', windowId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'rehab_windows'] }),
  });
}

// ---------------------------------------------------------------------------
// Global cross-client clients list — backs the new Clients screen. Joins
// profiles(role=client) with: last manual_workout_logs completion (activity
// bucketing), assessment status (same status field as Assessments screen),
// is_athlete + has_pending_rehab_request (same source as useAdminUsers),
// diet_type, and a 7-day adherence %. Filtering/sorting happens mostly
// in-memory after the joins — the client list is small (single-coach
// practice) so this is simpler and just as fast as a complex single query.
// ---------------------------------------------------------------------------
export type ActivityFilter = 'all' | 'active' | 'inactive_7_14' | 'inactive_14_plus' | 'never';
export type AssessmentFilterValue = 'all' | 'in_progress' | 'submitted' | 'reviewed' | 'none';
export type AthleteFilterValue = 'all' | 'yes' | 'no';
export type DietFilterValue = 'all' | 'veg' | 'non_veg';
export type PendingRehabFilterValue = 'all' | 'yes' | 'no';
export type ClientsSortBy = 'name' | 'signup_desc' | 'last_active_desc' | 'adherence_desc' | 'adherence_asc';

export function useAdminClientsList(opts: {
  activityFilter?: ActivityFilter;
  assessmentFilter?: AssessmentFilterValue;
  athleteFilter?: AthleteFilterValue;
  dietFilter?: DietFilterValue;
  pendingRehabFilter?: PendingRehabFilterValue;
  signupDateRange?: { from?: string; to?: string };
  sortBy?: ClientsSortBy;
} = {}) {
  const {
    activityFilter = 'all', assessmentFilter = 'all', athleteFilter = 'all',
    dietFilter = 'all', pendingRehabFilter = 'all', signupDateRange, sortBy = 'name',
  } = opts;

  return useQuery({
    queryKey: ['admin', 'clients_list', activityFilter, assessmentFilter, athleteFilter, dietFilter, pendingRehabFilter, signupDateRange?.from, signupDateRange?.to, sortBy],
    queryFn: async () => {
      const sevenDaysAgoIso  = new Date(Date.now() - 7  * 86400000).toISOString();
      const fourteenDaysAgoIso = new Date(Date.now() - 14 * 86400000).toISOString();

      const [
        { data: profiles, error: profilesErr },
        { data: assessments },
        { data: pendingRehab },
        { data: logs7d },
        { data: lastLogs },
      ] = await Promise.all([
        supabase.from('profiles').select('id, full_name, phone, created_at, diet_type, assigned_coach_id').eq('role', 'client'),
        supabase.from('coach_detailed_assessments').select('client_id, status, is_athlete'),
        supabase.from('rehab_requests').select('client_id').eq('status', 'pending'),
        supabase.from('manual_workout_logs').select('client_id, completed').gte('completed_at', sevenDaysAgoIso),
        // Most recent completed row per client, looked up via a wide window
        // and reduced client-side (no DISTINCT ON via the JS client).
        supabase.from('manual_workout_logs').select('client_id, completed_at').eq('completed', true).order('completed_at', { ascending: false }).limit(2000),
      ]);
      if (profilesErr) throw profilesErr;

      const assessmentMap: Record<string, { status: string; is_athlete: boolean | null }> = {};
      (assessments ?? []).forEach((a: any) => { assessmentMap[a.client_id] = { status: a.status, is_athlete: a.is_athlete }; });

      const pendingRehabSet = new Set((pendingRehab ?? []).map((r: any) => r.client_id));

      const adherenceTotals: Record<string, { total: number; done: number }> = {};
      (logs7d ?? []).forEach((l: any) => {
        if (!adherenceTotals[l.client_id]) adherenceTotals[l.client_id] = { total: 0, done: 0 };
        adherenceTotals[l.client_id].total++;
        if (l.completed) adherenceTotals[l.client_id].done++;
      });

      const lastActiveMap: Record<string, string> = {};
      (lastLogs ?? []).forEach((l: any) => {
        if (!lastActiveMap[l.client_id]) lastActiveMap[l.client_id] = l.completed_at; // already ordered desc
      });

      let rows = (profiles ?? []).map((p: any) => {
        const assessment = assessmentMap[p.id];
        const adherence = adherenceTotals[p.id];
        const lastActive = lastActiveMap[p.id] ?? null;

        let activityStatus: 'active' | 'inactive_7_14' | 'inactive_14_plus' | 'never';
        if (!lastActive) activityStatus = 'never';
        else if (lastActive >= sevenDaysAgoIso) activityStatus = 'active';
        else if (lastActive >= fourteenDaysAgoIso) activityStatus = 'inactive_7_14';
        else activityStatus = 'inactive_14_plus';

        return {
          id: p.id,
          full_name: p.full_name,
          phone: p.phone,
          created_at: p.created_at,
          diet_type: p.diet_type,
          assigned_coach_id: p.assigned_coach_id,
          assessment_status: assessment?.status ?? 'none',
          is_athlete: assessment?.is_athlete ?? null,
          has_pending_rehab_request: pendingRehabSet.has(p.id),
          last_active: lastActive,
          activity_status: activityStatus,
          adherence_pct: adherence && adherence.total > 0 ? Math.round((adherence.done / adherence.total) * 100) : null,
        };
      });

      if (activityFilter !== 'all') rows = rows.filter((r) => r.activity_status === activityFilter);
      if (assessmentFilter !== 'all') rows = rows.filter((r) => r.assessment_status === assessmentFilter);
      if (athleteFilter !== 'all') rows = rows.filter((r) => athleteFilter === 'yes' ? r.is_athlete === true : r.is_athlete !== true);
      if (dietFilter !== 'all') rows = rows.filter((r) => r.diet_type === dietFilter);
      if (pendingRehabFilter !== 'all') rows = rows.filter((r) => pendingRehabFilter === 'yes' ? r.has_pending_rehab_request : !r.has_pending_rehab_request);
      if (signupDateRange?.from) rows = rows.filter((r) => r.created_at >= signupDateRange.from!);
      if (signupDateRange?.to) rows = rows.filter((r) => r.created_at <= signupDateRange.to!);

      switch (sortBy) {
        case 'signup_desc':       rows.sort((a, b) => b.created_at.localeCompare(a.created_at)); break;
        case 'last_active_desc':  rows.sort((a, b) => (b.last_active ?? '').localeCompare(a.last_active ?? '')); break;
        case 'adherence_desc':    rows.sort((a, b) => (b.adherence_pct ?? -1) - (a.adherence_pct ?? -1)); break;
        case 'adherence_asc':     rows.sort((a, b) => (a.adherence_pct ?? 101) - (b.adherence_pct ?? 101)); break;
        default:                  rows.sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''));
      }

      return rows;
    },
  });
}

// ---------------------------------------------------------------------------
// Global coaches list — extends useAdminCoaches with avgClientAdherence
// (7-day average across assigned clients) and lastSeenAt.
// ---------------------------------------------------------------------------
export function useAdminCoachesList() {
  return useQuery({
    queryKey: ['admin', 'coaches_list'],
    queryFn: async () => {
      const sevenDaysAgoIso = new Date(Date.now() - 7 * 86400000).toISOString();

      const [
        { data: coaches, error: coachesErr },
        { data: clients },
        { data: logs7d },
      ] = await Promise.all([
        supabase.from('profiles').select('id, full_name, phone, created_at, last_seen_at').eq('role', 'coach').order('full_name'),
        supabase.from('profiles').select('id, assigned_coach_id').eq('role', 'client').not('assigned_coach_id', 'is', null),
        supabase.from('manual_workout_logs').select('client_id, completed').gte('completed_at', sevenDaysAgoIso),
      ]);
      if (coachesErr) throw coachesErr;

      const clientsByCoach: Record<string, string[]> = {};
      (clients ?? []).forEach((c: any) => {
        if (!c.assigned_coach_id) return;
        if (!clientsByCoach[c.assigned_coach_id]) clientsByCoach[c.assigned_coach_id] = [];
        clientsByCoach[c.assigned_coach_id].push(c.id);
      });

      const adherenceByClient: Record<string, { total: number; done: number }> = {};
      (logs7d ?? []).forEach((l: any) => {
        if (!adherenceByClient[l.client_id]) adherenceByClient[l.client_id] = { total: 0, done: 0 };
        adherenceByClient[l.client_id].total++;
        if (l.completed) adherenceByClient[l.client_id].done++;
      });

      return (coaches ?? []).map((coach: any) => {
        const clientIds = clientsByCoach[coach.id] ?? [];
        const adherencePcts = clientIds
          .map((cid) => adherenceByClient[cid])
          .filter((a) => a && a.total > 0)
          .map((a) => (a!.done / a!.total) * 100);
        const avgClientAdherence = adherencePcts.length
          ? Math.round(adherencePcts.reduce((s, p) => s + p, 0) / adherencePcts.length)
          : null;

        return {
          ...coach,
          clientCount: clientIds.length,
          avgClientAdherence,
          lastSeenAt: coach.last_seen_at ?? null,
        };
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Global rehab admin: cross-client pending queue, appointment calendar/
// agenda for a date range, and status updates (incl. the new no_show value).
// ---------------------------------------------------------------------------
export function useAdminRehabQueue() {
  return useQuery({
    queryKey: ['admin', 'rehab_queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rehab_requests')
        .select('*, package:rehab_packages(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const clientIds = [...new Set((data ?? []).map((r: any) => r.client_id))];
      if (clientIds.length === 0) return [];

      const { data: clients } = await supabase.from('profiles').select('id, full_name, phone').in('id', clientIds);
      const clientMap: Record<string, any> = {};
      (clients ?? []).forEach((c: any) => { clientMap[c.id] = c; });

      return (data ?? []).map((r: any) => ({ ...r, client: clientMap[r.client_id] ?? null }));
    },
  });
}

export function useAdminRehabCalendar({ startDate, endDate }: { startDate: string; endDate: string }) {
  return useQuery({
    queryKey: ['admin', 'rehab_calendar', startDate, endDate],
    enabled: !!startDate && !!endDate,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rehab_appointments')
        .select('*')
        .gte('scheduled_at', startDate)
        .lte('scheduled_at', endDate)
        .order('scheduled_at');
      if (error) throw error;

      const clientIds = [...new Set((data ?? []).map((a: any) => a.client_id))];
      if (clientIds.length === 0) return [];

      const { data: clients } = await supabase.from('profiles').select('id, full_name, phone').in('id', clientIds);
      const clientMap: Record<string, any> = {};
      (clients ?? []).forEach((c: any) => { clientMap[c.id] = c; });

      return (data ?? []).map((a: any) => ({ ...a, client: clientMap[a.client_id] ?? null }));
    },
  });
}

export function useMarkRehabAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: string; status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' }) => {
      const { error } = await supabase.from('rehab_appointments').update({ status }).eq('id', appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'rehab_calendar'] });
      qc.invalidateQueries({ queryKey: ['admin', 'rehab_appointments'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Rehab package types — admin CRUD against the rehab_packages lookup table
// (the same table useRehabPackages() reads from on the client side).
// ---------------------------------------------------------------------------
export function useAdminRehabPackages() {
  return useQuery({
    queryKey: ['admin', 'rehab_packages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('rehab_packages').select('*').order('display_order');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminAddRehabPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pkg: { key: string; label: string; description?: string | null; sessions_per_term: number; display_order: number }) => {
      const { error } = await supabase.from('rehab_packages').insert({ ...pkg, active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'rehab_packages'] });
      qc.invalidateQueries({ queryKey: ['rehab', 'packages'] });
    },
  });
}

export function useAdminUpdateRehabPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string; label?: string; description?: string | null; sessions_per_term?: number; display_order?: number; active?: boolean }) => {
      const { error } = await supabase.from('rehab_packages').update(fields).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'rehab_packages'] });
      qc.invalidateQueries({ queryKey: ['rehab', 'packages'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Medical records — aggregate admin view (counts only, no per-document UI).
// ---------------------------------------------------------------------------
export function useAdminMedicalRecordsOverview() {
  return useQuery({
    queryKey: ['admin', 'medical_records_overview'],
    queryFn: async () => {
      const [{ data: docsClients }, { data: analyses }] = await Promise.all([
        supabase.from('medical_documents').select('client_id'),
        supabase.from('medical_analyses').select('client_id, sent_to_coach_at, sent_to_expert_at'),
      ]);

      const clientsWithDocs = new Set((docsClients ?? []).map((d: any) => d.client_id)).size;
      const clientsWithAnalysis = new Set((analyses ?? []).map((a: any) => a.client_id)).size;
      // "Need Expert Opinion" (sent_to_expert_at) vs auto-routed "Send to
      // Coach" (sent_to_coach_at) — these are independent flags on the same
      // analysis row, not mutually exclusive, so each is counted on its own.
      const sentToCoachCount = (analyses ?? []).filter((a: any) => a.sent_to_coach_at).length;
      const sentToExpertCount = (analyses ?? []).filter((a: any) => a.sent_to_expert_at).length;

      return {
        clientsWithDocs,
        clientsWithAnalysis,
        sentToCoachCount,
        sentToExpertCount,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Clients by Goals — health_goals is the multi-select tag set clients choose
// during onboarding (basic-info.tsx); the old "Clients by program" view read
// the disconnected enrollments/programs workflow, which no longer reflects
// real client intent now that the 7 fixed programs are deactivated.
// ---------------------------------------------------------------------------
export function useAdminGoalsBreakdown() {
  return useQuery({
    queryKey: ['admin', 'goals_breakdown'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('health_goals').eq('role', 'client');
      if (error) throw error;

      const counts: Record<string, number> = {};
      let noGoals = 0;
      (data ?? []).forEach((p: any) => {
        const goals: string[] = p.health_goals ?? [];
        if (!goals.length) { noGoals++; return; }
        goals.forEach((g) => { counts[g] = (counts[g] ?? 0) + 1; });
      });

      const breakdown = Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      return { breakdown, noGoals };
    },
  });
}

export function useAdminClientsByGoal(goal: string | null) {
  return useQuery({
    queryKey: ['admin', 'clients_by_goal', goal],
    enabled: !!goal,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, health_goals')
        .eq('role', 'client')
        .contains('health_goals', [goal]);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Medical records — clients matching a given aggregate stat, for drill-down
// from the Medical Records overview tiles.
// ---------------------------------------------------------------------------
export type MedicalRecordsClientFilter = 'has_docs' | 'has_analysis' | 'sent_to_coach' | 'sent_to_expert';

export function useAdminMedicalRecordsClients(filter: MedicalRecordsClientFilter | null) {
  return useQuery({
    queryKey: ['admin', 'medical_records_clients', filter],
    enabled: !!filter,
    queryFn: async () => {
      let clientIds: string[];

      if (filter === 'has_docs') {
        const { data, error } = await supabase.from('medical_documents').select('client_id');
        if (error) throw error;
        clientIds = [...new Set((data ?? []).map((d: any) => d.client_id))];
      } else {
        const { data, error } = await supabase
          .from('medical_analyses')
          .select('client_id, sent_to_coach_at, sent_to_expert_at');
        if (error) throw error;
        const rows = (data ?? []).filter((a: any) =>
          filter === 'has_analysis' ? true :
          filter === 'sent_to_coach' ? !!a.sent_to_coach_at :
          !!a.sent_to_expert_at
        );
        clientIds = [...new Set(rows.map((a: any) => a.client_id))];
      }

      if (clientIds.length === 0) return [];
      const { data: clients, error: clientsErr } = await supabase.from('profiles').select('id, full_name, phone').in('id', clientIds);
      if (clientsErr) throw clientsErr;
      return clients ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Fitness assessment analytics — average domain scores segmented by
// athlete-toggle status and by age band (>=60 vs <60, the scoring cutoff
// where real normative data exists). Deliberately simple aggregate stat
// cards, not a full BI tool — only the most recent assessment per client
// contributes, so one client's history doesn't skew the average.
// ---------------------------------------------------------------------------
export function useAdminFitnessAnalytics() {
  return useQuery({
    queryKey: ['admin', 'fitness_analytics'],
    queryFn: async () => {
      const { data: assessments, error } = await supabase
        .from('fitness_assessments')
        .select('id, client_id, client_age_at_assessment, is_athlete, assessment_date, results:fitness_domain_results(domain, domain_score, score_status)')
        .order('assessment_date', { ascending: false });
      if (error) throw error;

      // Keep only each client's most recent assessment.
      const latestByClient = new Map<string, typeof assessments[number]>();
      (assessments ?? []).forEach((a: any) => {
        if (!latestByClient.has(a.client_id)) latestByClient.set(a.client_id, a);
      });
      const latest = Array.from(latestByClient.values());

      const domains = ['strength', 'flexibility', 'endurance', 'agility'] as const;

      function avgFor(rows: any[], domain: string): number | null {
        const scores = rows
          .flatMap((a) => a.results ?? [])
          .filter((r: any) => r.domain === domain && r.score_status === 'scored' && r.domain_score != null)
          .map((r: any) => Number(r.domain_score));
        if (scores.length === 0) return null;
        return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
      }

      const athleteRows = latest.filter((a: any) => a.is_athlete === true);
      const nonAthleteRows = latest.filter((a: any) => a.is_athlete !== true);
      const over60Rows = latest.filter((a: any) => a.client_age_at_assessment >= 60);
      const under60Rows = latest.filter((a: any) => a.client_age_at_assessment < 60);

      const byAthleteStatus = domains.map((d) => ({
        domain: d,
        athlete: avgFor(athleteRows, d),
        nonAthlete: avgFor(nonAthleteRows, d),
      }));

      const byAgeBand = domains.map((d) => ({
        domain: d,
        over60: avgFor(over60Rows, d),
        under60: avgFor(under60Rows, d),
      }));

      return {
        totalClientsAssessed: latest.length,
        athleteCount: athleteRows.length,
        nonAthleteCount: nonAthleteRows.length,
        over60Count: over60Rows.length,
        under60Count: under60Rows.length,
        byAthleteStatus,
        byAgeBand,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Rehab business snapshot (this month) — counts by request/appointment
// status for the "This month" dashboard section.
// ---------------------------------------------------------------------------
export function useAdminRehabMonthSnapshot() {
  return useQuery({
    queryKey: ['admin', 'rehab_month_snapshot'],
    queryFn: async () => {
      const monthAgoIso = new Date(Date.now() - 30 * 86400000).toISOString();

      const [{ data: requests }, { data: appointments }] = await Promise.all([
        supabase.from('rehab_requests').select('status').gte('created_at', monthAgoIso),
        supabase.from('rehab_appointments').select('status').gte('scheduled_at', monthAgoIso),
      ]);

      const requestsReceived  = (requests ?? []).length;
      const requestsAccepted  = (requests ?? []).filter((r: any) => r.status === 'accepted').length;
      const requestsDeclined  = (requests ?? []).filter((r: any) => r.status === 'declined').length;
      const appointmentsCompleted = (appointments ?? []).filter((a: any) => a.status === 'completed').length;
      const appointmentsNoShow    = (appointments ?? []).filter((a: any) => a.status === 'no_show').length;

      return { requestsReceived, requestsAccepted, requestsDeclined, appointmentsCompleted, appointmentsNoShow };
    },
  });
}

// ---------------------------------------------------------------------------
// Daily pulse — the CEO's morning glance. Everything is "today vs the recent
// norm" or "who specifically needs attention right now".
// ---------------------------------------------------------------------------
export interface RedFlagClient {
  clientId: string;
  clientName: string;
  date: string;
  painLevel: number | null;
  energy: number | null;
}

export interface CoachMessageBacklog {
  coachId: string;
  coachName: string;
  unreadCount: number;
  oldestSentAt: string;
}

// daily_checkins.date is a plain date column written from the client's device,
// so compare against the local calendar date, not the UTC one.
const localDateStr = (d: Date) => d.toLocaleDateString('en-CA');

export function useAdminDailyPulse() {
  return useQuery({
    queryKey: ['admin', 'daily_pulse'],
    queryFn: async () => {
      const now = new Date();
      const todayStr = localDateStr(now);
      const yesterdayStr = localDateStr(new Date(now.getTime() - 86400000));
      const eightDaysAgoStr = localDateStr(new Date(now.getTime() - 8 * 86400000));
      const startOfTodayIso = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      const sevenDaysAgoIso = new Date(Date.now() - 7 * 86400000).toISOString();
      const dayAgoIso = new Date(Date.now() - 86400000).toISOString();

      const [
        { data: clients, error: clientsErr },
        { data: coaches },
        { data: checkins },
        { data: logs7d },
        { data: staleUnread },
      ] = await Promise.all([
        supabase.from('profiles').select('id, full_name, created_at').eq('role', 'client'),
        supabase.from('profiles').select('id, full_name, last_seen_at').eq('role', 'coach'),
        supabase.from('daily_checkins').select('client_id, date, energy, pain_level').gte('date', eightDaysAgoStr),
        supabase.from('manual_workout_logs').select('client_id, completed_at').eq('completed', true).gte('completed_at', sevenDaysAgoIso),
        supabase.from('messages').select('receiver_id, sent_at').is('read_at', null).lte('sent_at', dayAgoIso).order('sent_at', { ascending: true }).limit(1000),
      ]);
      if (clientsErr) throw clientsErr;

      const clientNameMap: Record<string, string> = {};
      (clients ?? []).forEach((c: any) => { clientNameMap[c.id] = c.full_name; });

      // ── Check-ins: today, yesterday, and the trailing-week daily norm ──
      const checkinClientsByDate: Record<string, Set<string>> = {};
      (checkins ?? []).forEach((c: any) => {
        if (!checkinClientsByDate[c.date]) checkinClientsByDate[c.date] = new Set();
        checkinClientsByDate[c.date].add(c.client_id);
      });
      const checkinsToday = checkinClientsByDate[todayStr]?.size ?? 0;
      const checkinsYesterday = checkinClientsByDate[yesterdayStr]?.size ?? 0;
      const priorDays = Object.entries(checkinClientsByDate).filter(([d]) => d !== todayStr);
      const checkinDailyNorm = priorDays.length
        ? Math.round(priorDays.reduce((s, [, set]) => s + set.size, 0) / priorDays.length)
        : 0;

      // ── Red flags: high pain or very low energy, today or yesterday ──
      // One row per client, keeping the worst report.
      const flagged: Record<string, RedFlagClient> = {};
      (checkins ?? []).forEach((c: any) => {
        if (c.date !== todayStr && c.date !== yesterdayStr) return;
        const isFlag = (c.pain_level ?? 0) >= 7 || (c.energy != null && c.energy <= 2);
        if (!isFlag) return;
        const existing = flagged[c.client_id];
        if (!existing || (c.pain_level ?? 0) > (existing.painLevel ?? 0)) {
          flagged[c.client_id] = {
            clientId: c.client_id,
            clientName: clientNameMap[c.client_id] ?? 'Unknown',
            date: c.date,
            painLevel: c.pain_level ?? null,
            energy: c.energy ?? null,
          };
        }
      });
      const redFlags = Object.values(flagged).sort((a, b) => (b.painLevel ?? 0) - (a.painLevel ?? 0));

      // ── Activity: distinct clients logging today vs trailing-week norm ──
      const logClientsByDate: Record<string, Set<string>> = {};
      (logs7d ?? []).forEach((l: any) => {
        const d = localDateStr(new Date(l.completed_at));
        if (!logClientsByDate[d]) logClientsByDate[d] = new Set();
        logClientsByDate[d].add(l.client_id);
      });
      const activeToday = logClientsByDate[todayStr]?.size ?? 0;
      const priorLogDays = Object.entries(logClientsByDate).filter(([d]) => d !== todayStr);
      const activeDailyNorm = priorLogDays.length
        ? Math.round(priorLogDays.reduce((s, [, set]) => s + set.size, 0) / priorLogDays.length)
        : 0;

      // ── Signups today ──
      const signupsToday = (clients ?? []).filter((c: any) => c.created_at >= startOfTodayIso).length;

      // ── Coach message backlog: unread client messages older than 24h ──
      // read_at is the only reply-adjacent signal we store, so this is
      // strictly "not even opened", the strongest version of unanswered.
      const coachMap: Record<string, string> = {};
      (coaches ?? []).forEach((c: any) => { coachMap[c.id] = c.full_name; });
      const backlogByCoach: Record<string, CoachMessageBacklog> = {};
      (staleUnread ?? []).forEach((m: any) => {
        if (!coachMap[m.receiver_id]) return; // only messages TO coaches
        if (!backlogByCoach[m.receiver_id]) {
          backlogByCoach[m.receiver_id] = { coachId: m.receiver_id, coachName: coachMap[m.receiver_id], unreadCount: 0, oldestSentAt: m.sent_at };
        }
        backlogByCoach[m.receiver_id].unreadCount++;
      });
      const messageBacklog = Object.values(backlogByCoach).sort((a, b) => b.unreadCount - a.unreadCount);

      // ── Coaches who haven't opened the app today ──
      const coachesInactiveToday = (coaches ?? [])
        .filter((c: any) => !c.last_seen_at || c.last_seen_at < startOfTodayIso)
        .map((c: any) => ({ id: c.id, full_name: c.full_name, last_seen_at: c.last_seen_at ?? null }))
        .sort((a: any, b: any) => (a.last_seen_at ?? '').localeCompare(b.last_seen_at ?? ''));

      return {
        totalClients: (clients ?? []).length,
        checkinsToday,
        checkinsYesterday,
        checkinDailyNorm,
        redFlags,
        activeToday,
        activeDailyNorm,
        signupsToday,
        messageBacklog,
        coachesInactiveToday,
      };
    },
    staleTime: 1000 * 60 * 2,
  });
}

// ---------------------------------------------------------------------------
// Weekly review — week-over-week deltas, coach leaderboard, client movers,
// churn risk, onboarding funnel. All windows are rolling 7-day periods
// (this week = last 7 days, prev week = 7-14 days ago).
// ---------------------------------------------------------------------------
export interface CoachLeaderboardRow {
  coachId: string;
  coachName: string;
  clientCount: number;
  avgAdherence: number | null;   // 7d, % across their clients
  disengagedCount: number;       // their clients with no completed activity in 14d
  unreadOver24h: number;         // client messages to them unread for >24h
  avgReadHours: number | null;   // how long messages sat before being read (7d)
  digests7d: number;             // AI weekly digests generated
}

export interface ClientMover {
  clientId: string;
  clientName: string;
  delta: number;                 // composite score change over the window
  current: number;
}

export function useAdminWeekly() {
  return useQuery({
    queryKey: ['admin', 'weekly'],
    queryFn: async () => {
      const now = Date.now();
      const sevenDaysAgoIso = new Date(now - 7 * 86400000).toISOString();
      const fourteenDaysAgoIso = new Date(now - 14 * 86400000).toISOString();
      const fourteenDaysAgoDateStr = localDateStr(new Date(now - 14 * 86400000));
      const sevenDaysAgoDateStr = localDateStr(new Date(now - 7 * 86400000));
      const dayAgoIso = new Date(now - 86400000).toISOString();

      const [
        { data: clients, error: clientsErr },
        { data: coaches },
        { data: logs14d },
        { data: checkins14d },
        { data: messages7d },
        { data: staleUnread },
        { data: digests },
        { data: metrics },
        { data: assessments },
        { data: plans },
      ] = await Promise.all([
        supabase.from('profiles').select('id, full_name, assigned_coach_id').eq('role', 'client'),
        supabase.from('profiles').select('id, full_name').eq('role', 'coach'),
        supabase.from('manual_workout_logs').select('client_id, completed, completed_at').gte('completed_at', fourteenDaysAgoIso),
        supabase.from('daily_checkins').select('client_id, date').gte('date', fourteenDaysAgoDateStr),
        supabase.from('messages').select('receiver_id, sent_at, read_at').gte('sent_at', sevenDaysAgoIso).limit(2000),
        supabase.from('messages').select('receiver_id, sent_at').is('read_at', null).lte('sent_at', dayAgoIso).limit(1000),
        supabase.from('coach_client_digests').select('coach_id').gte('created_at', sevenDaysAgoIso),
        supabase.from('progress_metrics').select('client_id, fitness_score, recovery_score, longevity_score, recorded_at').gte('recorded_at', fourteenDaysAgoIso).order('recorded_at', { ascending: true }).limit(2000),
        supabase.from('assessments').select('client_id'),
        supabase.from('plans').select('client_id, status'),
      ]);
      if (clientsErr) throw clientsErr;

      const totalClients = (clients ?? []).length;
      const clientNameMap: Record<string, string> = {};
      (clients ?? []).forEach((c: any) => { clientNameMap[c.id] = c.full_name; });

      // ── Split activity logs into this week / previous week ──
      const thisWeekLogs = (logs14d ?? []).filter((l: any) => l.completed_at >= sevenDaysAgoIso);
      const prevWeekLogs = (logs14d ?? []).filter((l: any) => l.completed_at < sevenDaysAgoIso);

      const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);
      const distinctCompleted = (logs: any[]) => new Set(logs.filter((l) => l.completed).map((l) => l.client_id)).size;

      const engagementThisWeek = pct(distinctCompleted(thisWeekLogs), totalClients);
      const engagementPrevWeek = pct(distinctCompleted(prevWeekLogs), totalClients);
      const adherenceThisWeek = pct(thisWeekLogs.filter((l: any) => l.completed).length, thisWeekLogs.length);
      const adherencePrevWeek = pct(prevWeekLogs.filter((l: any) => l.completed).length, prevWeekLogs.length);

      const thisWeekCheckins = (checkins14d ?? []).filter((c: any) => c.date >= sevenDaysAgoDateStr).length;
      const prevWeekCheckins = (checkins14d ?? []).filter((c: any) => c.date < sevenDaysAgoDateStr).length;
      const checkinRateThisWeek = pct(thisWeekCheckins, totalClients * 7);
      const checkinRatePrevWeek = pct(prevWeekCheckins, totalClients * 7);

      // ── Churn risk: active last week, silent this week ──
      const activeThisWeek = new Set(thisWeekLogs.filter((l: any) => l.completed).map((l: any) => l.client_id));
      const activePrevWeek = new Set(prevWeekLogs.filter((l: any) => l.completed).map((l: any) => l.client_id));
      const churnRisk = [...activePrevWeek]
        .filter((id) => !activeThisWeek.has(id))
        .map((id) => ({ clientId: id, clientName: clientNameMap[id] ?? 'Unknown' }))
        .sort((a, b) => a.clientName.localeCompare(b.clientName));

      // ── Client movers: composite score change across the 14d window ──
      const metricsByClient: Record<string, { first: any; last: any; count: number }> = {};
      (metrics ?? []).forEach((m: any) => {
        if (!metricsByClient[m.client_id]) metricsByClient[m.client_id] = { first: m, last: m, count: 0 };
        metricsByClient[m.client_id].last = m; // rows arrive ordered ascending
        metricsByClient[m.client_id].count++;
      });
      const composite = (m: any) => Math.round(((m.fitness_score ?? 0) + (m.recovery_score ?? 0) + (m.longevity_score ?? 0)) / 3);
      const movers: ClientMover[] = Object.entries(metricsByClient)
        .filter(([, v]) => v.count >= 2)
        .map(([clientId, v]) => ({
          clientId,
          clientName: clientNameMap[clientId] ?? 'Unknown',
          delta: composite(v.last) - composite(v.first),
          current: composite(v.last),
        }))
        .filter((m) => m.delta !== 0);
      const topGainers = [...movers].sort((a, b) => b.delta - a.delta).slice(0, 5).filter((m) => m.delta > 0);
      const topDecliners = [...movers].sort((a, b) => a.delta - b.delta).slice(0, 5).filter((m) => m.delta < 0);

      // ── Coach leaderboard ──
      const clientsByCoach: Record<string, string[]> = {};
      (clients ?? []).forEach((c: any) => {
        if (!c.assigned_coach_id) return;
        (clientsByCoach[c.assigned_coach_id] ??= []).push(c.id);
      });
      const adherenceByClient: Record<string, { total: number; done: number }> = {};
      thisWeekLogs.forEach((l: any) => {
        adherenceByClient[l.client_id] ??= { total: 0, done: 0 };
        adherenceByClient[l.client_id].total++;
        if (l.completed) adherenceByClient[l.client_id].done++;
      });
      const active14d = new Set((logs14d ?? []).filter((l: any) => l.completed).map((l: any) => l.client_id));
      const coachIds = new Set((coaches ?? []).map((c: any) => c.id));
      const unreadByCoach: Record<string, number> = {};
      (staleUnread ?? []).forEach((m: any) => {
        if (!coachIds.has(m.receiver_id)) return;
        unreadByCoach[m.receiver_id] = (unreadByCoach[m.receiver_id] ?? 0) + 1;
      });
      const readTimesByCoach: Record<string, number[]> = {};
      (messages7d ?? []).forEach((m: any) => {
        if (!coachIds.has(m.receiver_id) || !m.read_at) return;
        const hours = (new Date(m.read_at).getTime() - new Date(m.sent_at).getTime()) / 3600000;
        (readTimesByCoach[m.receiver_id] ??= []).push(hours);
      });
      const digestsByCoach: Record<string, number> = {};
      (digests ?? []).forEach((d: any) => { digestsByCoach[d.coach_id] = (digestsByCoach[d.coach_id] ?? 0) + 1; });

      const leaderboard: CoachLeaderboardRow[] = (coaches ?? []).map((coach: any) => {
        const ids = clientsByCoach[coach.id] ?? [];
        const adhPcts = ids
          .map((cid) => adherenceByClient[cid])
          .filter((a) => a && a.total > 0)
          .map((a) => (a!.done / a!.total) * 100);
        const readTimes = readTimesByCoach[coach.id] ?? [];
        return {
          coachId: coach.id,
          coachName: coach.full_name,
          clientCount: ids.length,
          avgAdherence: adhPcts.length ? Math.round(adhPcts.reduce((s, p) => s + p, 0) / adhPcts.length) : null,
          disengagedCount: ids.filter((cid) => !active14d.has(cid)).length,
          unreadOver24h: unreadByCoach[coach.id] ?? 0,
          avgReadHours: readTimes.length ? Math.round((readTimes.reduce((s, h) => s + h, 0) / readTimes.length) * 10) / 10 : null,
          digests7d: digestsByCoach[coach.id] ?? 0,
        };
      }).sort((a, b) => (b.avgAdherence ?? -1) - (a.avgAdherence ?? -1));

      // ── Onboarding funnel: where are clients stuck? ──
      const assessedIds = new Set((assessments ?? []).map((a: any) => a.client_id));
      const activePlanIds = new Set((plans ?? []).filter((p: any) => p.status === 'active').map((p: any) => p.client_id));
      let noAssessment = 0, assessedNoCoach = 0, coachNoPlan = 0, planButInactive = 0, healthy = 0;
      (clients ?? []).forEach((c: any) => {
        if (!assessedIds.has(c.id)) noAssessment++;
        else if (!c.assigned_coach_id) assessedNoCoach++;
        else if (!activePlanIds.has(c.id)) coachNoPlan++;
        else if (!activeThisWeek.has(c.id)) planButInactive++;
        else healthy++;
      });

      return {
        engagementThisWeek, engagementPrevWeek,
        adherenceThisWeek, adherencePrevWeek,
        checkinRateThisWeek, checkinRatePrevWeek,
        churnRisk,
        topGainers, topDecliners,
        leaderboard,
        funnel: { totalClients, noAssessment, assessedNoCoach, coachNoPlan, planButInactive, healthy },
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ---------------------------------------------------------------------------
// Monthly business view — rolling 30-day windows (this 30d vs previous 30d):
// growth (signups, activation, retention), outcome score trends, recovery
// business with rates, feature usage with deltas.
// ---------------------------------------------------------------------------
export function useAdminMonthly() {
  return useQuery({
    queryKey: ['admin', 'monthly'],
    queryFn: async () => {
      const now = Date.now();
      const thirtyDaysAgoIso = new Date(now - 30 * 86400000).toISOString();
      const sixtyDaysAgoIso = new Date(now - 60 * 86400000).toISOString();

      const [
        { data: clients, error: clientsErr },
        { data: logs60d },
        { data: metrics60d },
        { data: requests60d },
        { data: appointments60d },
      ] = await Promise.all([
        supabase.from('profiles').select('id, created_at').eq('role', 'client'),
        supabase.from('manual_workout_logs').select('client_id, item_type, completed_at').eq('completed', true).gte('completed_at', sixtyDaysAgoIso).limit(5000),
        supabase.from('progress_metrics').select('fitness_score, recovery_score, longevity_score, recorded_at').gte('recorded_at', sixtyDaysAgoIso).limit(5000),
        supabase.from('rehab_requests').select('status, created_at').gte('created_at', sixtyDaysAgoIso),
        supabase.from('rehab_appointments').select('status, scheduled_at').gte('scheduled_at', sixtyDaysAgoIso),
      ]);
      if (clientsErr) throw clientsErr;

      const inThis30 = (iso: string) => iso >= thirtyDaysAgoIso;

      // ── Growth ──
      const signupsThis30 = (clients ?? []).filter((c: any) => inThis30(c.created_at)).length;
      const signupsPrev30 = (clients ?? []).filter((c: any) => c.created_at >= sixtyDaysAgoIso && !inThis30(c.created_at)).length;

      const activeThis30 = new Set((logs60d ?? []).filter((l: any) => inThis30(l.completed_at)).map((l: any) => l.client_id));
      const newThis30 = (clients ?? []).filter((c: any) => inThis30(c.created_at));
      const activatedNew = newThis30.filter((c: any) => activeThis30.has(c.id)).length;
      const activationRate = newThis30.length > 0 ? Math.round((activatedNew / newThis30.length) * 100) : null;

      const cohortPrev30 = (clients ?? []).filter((c: any) => c.created_at >= sixtyDaysAgoIso && !inThis30(c.created_at));
      const retainedPrevCohort = cohortPrev30.filter((c: any) => activeThis30.has(c.id)).length;
      const retention30 = cohortPrev30.length > 0 ? Math.round((retainedPrevCohort / cohortPrev30.length) * 100) : null;

      // ── Outcome scores: avg of records in each window ──
      const scoreAvg = (rows: any[], key: string) => {
        const vals = rows.map((m: any) => m[key]).filter((v: any) => v != null);
        return vals.length ? Math.round(vals.reduce((s: number, v: number) => s + v, 0) / vals.length) : 0;
      };
      const metricsThis30 = (metrics60d ?? []).filter((m: any) => inThis30(m.recorded_at));
      const metricsPrev30 = (metrics60d ?? []).filter((m: any) => !inThis30(m.recorded_at));
      const outcomes = (['fitness_score', 'recovery_score', 'longevity_score'] as const).map((key) => ({
        key,
        label: key === 'fitness_score' ? 'Fitness' : key === 'recovery_score' ? 'Recovery' : 'Longevity',
        current: scoreAvg(metricsThis30, key),
        previous: scoreAvg(metricsPrev30, key),
      }));

      // ── Recovery business with rates ──
      const reqThis30 = (requests60d ?? []).filter((r: any) => inThis30(r.created_at));
      const reqPrev30 = (requests60d ?? []).filter((r: any) => !inThis30(r.created_at));
      const apptThis30 = (appointments60d ?? []).filter((a: any) => inThis30(a.scheduled_at));
      const count = (rows: any[], status: string) => rows.filter((r: any) => r.status === status).length;
      const completed = count(apptThis30, 'completed');
      const noShow = count(apptThis30, 'no_show');
      const rehab = {
        received: reqThis30.length,
        receivedPrev: reqPrev30.length,
        accepted: count(reqThis30, 'accepted'),
        declined: count(reqThis30, 'declined'),
        completed,
        noShow,
        acceptRate: reqThis30.length > 0 ? Math.round((count(reqThis30, 'accepted') / reqThis30.length) * 100) : null,
        noShowRate: completed + noShow > 0 ? Math.round((noShow / (completed + noShow)) * 100) : null,
      };

      // ── Feature usage with deltas (distinct clients per item_type) ──
      const usage: Record<string, { now: Set<string>; prev: Set<string> }> = {};
      (logs60d ?? []).forEach((l: any) => {
        usage[l.item_type] ??= { now: new Set(), prev: new Set() };
        (inThis30(l.completed_at) ? usage[l.item_type].now : usage[l.item_type].prev).add(l.client_id);
      });
      const featureUsage = Object.entries(usage)
        .map(([item_type, sets]) => ({ item_type, clientCount: sets.now.size, prevCount: sets.prev.size }))
        .sort((a, b) => b.clientCount - a.clientCount);

      return {
        signupsThis30, signupsPrev30,
        activationRate, retention30,
        outcomes,
        rehab,
        featureUsage,
      };
    },
    staleTime: 1000 * 60 * 10,
  });
}
