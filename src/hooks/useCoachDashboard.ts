import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getSupplementInteractionWarning } from '@/constants/supplementItems';
import { getWeekStart, toLocalDateStr, addDaysToDateStr } from '@/lib/dateHelpers';
import { THEME } from '@/constants/theme';

export const coachDashboardKeys = {
  attentionItems:       (uid: string) => ['coach', uid, 'attention_items'] as const,
  clientPulse:          (uid: string) => ['coach', uid, 'client_pulse'] as const,
  medicalOpinionReqs:   (uid: string) => ['coach', uid, 'medical_opinion_requests'] as const,
  todayCheckins:        (uid: string) => ['coach', uid, 'today_checkins'] as const,
  clientWins:           (uid: string) => ['coach', uid, 'client_wins'] as const,
  weekCheckinGrid:      (uid: string) => ['coach', uid, 'week_checkin_grid'] as const,
};

// ---------------------------------------------------------------------------
// Needs-attention panel — supplement interaction flags, unviewed AI
// analyses sent to the coach, no-log streaks, and declining adherence.
// Ranked by severity; caller decides how many to display.
// ---------------------------------------------------------------------------
export type AttentionItemType = 'supplement_flag' | 'unviewed_analysis' | 'no_log' | 'declining_adherence' | 'assessment_due';

export interface AttentionItem {
  id: string;
  type: AttentionItemType;
  severity: number; // lower = more urgent
  clientId: string;
  clientName: string;
  title: string;
  subtitle: string;
  analysisId?: string;
}

const SEVERITY_RANK: Record<AttentionItemType, number> = {
  supplement_flag:     0,
  unviewed_analysis:   1,
  no_log:              2,
  declining_adherence: 3,
  assessment_due:      4,
};

// Shared by the home "Needs attention" panel and the full attention-items
// screen so both render and route identically.
export const ATTENTION_META: Record<AttentionItemType, { icon: string; color: string; groupLabel: string }> = {
  supplement_flag:     { icon: '⚠️', color: THEME.colors.error,  groupLabel: 'Supplement flags' },
  unviewed_analysis:   { icon: '🩺', color: THEME.colors.amber,  groupLabel: 'Unviewed AI analyses' },
  no_log:              { icon: '📅', color: THEME.colors.teal,   groupLabel: 'Inactive clients' },
  declining_adherence: { icon: '📉', color: THEME.colors.amber,  groupLabel: 'Adherence dropping' },
  assessment_due:      { icon: '🏋️', color: '#34D399',           groupLabel: 'Assessments due' },
};

export function attentionItemRoute(item: AttentionItem, coachId: string | undefined) {
  switch (item.type) {
    case 'supplement_flag':
      return { pathname: '/(coach)/client-workouts', params: { clientId: item.clientId, clientName: item.clientName } } as const;
    case 'unviewed_analysis':
      return { pathname: '/(coach)/client-overview', params: { clientId: item.clientId, clientName: item.clientName, tab: 'medical' } } as const;
    case 'no_log':
      return { pathname: '/(coach)/messaging', params: { coachId, clientId: item.clientId, clientName: item.clientName } } as const;
    case 'declining_adherence':
      return { pathname: '/(coach)/client-overview', params: { clientId: item.clientId, clientName: item.clientName } } as const;
    case 'assessment_due':
      return { pathname: '/(coach)/client-overview', params: { clientId: item.clientId, clientName: item.clientName, tab: 'fitness' } } as const;
  }
}

// Re-assess every ~8-12 weeks; nudge at 60 days so the coach books it in time.
const REASSESSMENT_DUE_DAYS = 60;

export function useCoachAttentionItems() {
  const { user } = useAuth();

  return useQuery({
    queryKey: coachDashboardKeys.attentionItems(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async (): Promise<AttentionItem[]> => {
      const { data: clients, error: clientsErr } = await supabase
        .from('profiles')
        .select('id, full_name, conditions, medications')
        .eq('assigned_coach_id', user!.id);
      if (clientsErr) throw clientsErr;
      if (!clients?.length) return [];

      const clientIds = clients.map((c) => c.id);
      const clientById = new Map(clients.map((c) => [c.id, c]));

      const sevenDaysAgoIso    = new Date(Date.now() - 7  * 86400000).toISOString();
      const fourteenDaysAgoIso = new Date(Date.now() - 14 * 86400000).toISOString();

      const [
        { data: recentLogs },
        { data: lastCompletedLogs },
        { data: supplementLogs },
        { data: analyses },
        { data: fitnessAssessments },
      ] = await Promise.all([
        supabase.from('manual_workout_logs')
          .select('client_id, completed, completed_at')
          .in('client_id', clientIds)
          .gte('completed_at', fourteenDaysAgoIso),
        supabase.from('manual_workout_logs')
          .select('client_id, completed_at')
          .in('client_id', clientIds)
          .eq('completed', true)
          .order('completed_at', { ascending: false })
          .limit(2000),
        supabase.from('manual_workout_logs')
          .select('client_id, item_name')
          .in('client_id', clientIds)
          .eq('item_type', 'supplement')
          .gte('created_at', fourteenDaysAgoIso),
        supabase.from('medical_analyses')
          .select('id, client_id, summary_text, sent_to_coach_at')
          .in('client_id', clientIds)
          .not('sent_to_coach_at', 'is', null)
          .is('coach_viewed_at', null),
        supabase.from('fitness_assessments')
          .select('client_id, assessment_date')
          .in('client_id', clientIds)
          .order('assessment_date', { ascending: false }),
      ]);

      const items: AttentionItem[] = [];

      // ── Supplement interaction flags ──
      const seenSupplementFlags = new Set<string>();
      (supplementLogs ?? []).forEach((log: any) => {
        const client = clientById.get(log.client_id);
        const warning = getSupplementInteractionWarning(log.item_name, client);
        const key = `${log.client_id}:${log.item_name}`;
        if (warning && !seenSupplementFlags.has(key)) {
          seenSupplementFlags.add(key);
          items.push({
            id: `supplement_flag:${key}`,
            type: 'supplement_flag',
            severity: SEVERITY_RANK.supplement_flag,
            clientId: log.client_id,
            clientName: client?.full_name ?? 'Client',
            title: `${client?.full_name ?? 'Client'} — supplement flag`,
            subtitle: warning,
          });
        }
      });

      // ── Unviewed AI analyses sent to coach ──
      (analyses ?? []).forEach((a: any) => {
        const client = clientById.get(a.client_id);
        items.push({
          id: `unviewed_analysis:${a.id}`,
          type: 'unviewed_analysis',
          severity: SEVERITY_RANK.unviewed_analysis,
          clientId: a.client_id,
          clientName: client?.full_name ?? 'Client',
          title: `${client?.full_name ?? 'Client'} — new AI analysis`,
          subtitle: 'Sent to you, not yet viewed',
          analysisId: a.id,
        });
      });

      // ── No log in 7+ days ──
      const lastActiveMap: Record<string, string> = {};
      (lastCompletedLogs ?? []).forEach((l: any) => {
        if (!lastActiveMap[l.client_id]) lastActiveMap[l.client_id] = l.completed_at; // already ordered desc
      });
      clients.forEach((client) => {
        const lastActive = lastActiveMap[client.id] ?? null;
        if (lastActive && lastActive >= sevenDaysAgoIso) return; // active recently
        const days = lastActive ? Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000) : null;
        items.push({
          id: `no_log:${client.id}`,
          type: 'no_log',
          severity: SEVERITY_RANK.no_log,
          clientId: client.id,
          clientName: client.full_name ?? 'Client',
          title: days != null ? `${client.full_name} — ${days} days no log` : `${client.full_name} — no activity logged`,
          subtitle: lastActive
            ? `Last logged ${new Date(lastActive).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · tap to message`
            : 'No logs yet · tap to message',
        });
      });

      // ── Declining adherence (this 7d vs prior 7d) ──
      const adherenceBucket: Record<string, { curTotal: number; curDone: number; prevTotal: number; prevDone: number }> = {};
      (recentLogs ?? []).forEach((l: any) => {
        if (!adherenceBucket[l.client_id]) adherenceBucket[l.client_id] = { curTotal: 0, curDone: 0, prevTotal: 0, prevDone: 0 };
        const bucket = adherenceBucket[l.client_id];
        const isCurrent = l.completed_at >= sevenDaysAgoIso;
        if (isCurrent) {
          bucket.curTotal++;
          if (l.completed) bucket.curDone++;
        } else {
          bucket.prevTotal++;
          if (l.completed) bucket.prevDone++;
        }
      });
      Object.entries(adherenceBucket).forEach(([clientId, b]) => {
        if (b.curTotal === 0 || b.prevTotal === 0) return;
        const curPct  = Math.round((b.curDone  / b.curTotal)  * 100);
        const prevPct = Math.round((b.prevDone / b.prevTotal) * 100);
        const drop = prevPct - curPct;
        if (drop >= 20) {
          const client = clientById.get(clientId);
          items.push({
            id: `declining_adherence:${clientId}`,
            type: 'declining_adherence',
            severity: SEVERITY_RANK.declining_adherence,
            clientId,
            clientName: client?.full_name ?? 'Client',
            title: `${client?.full_name ?? 'Client'} — adherence dropping`,
            subtitle: `${prevPct}% last week → ${curPct}% this week`,
          });
        }
      });

      // ── Fitness assessment due (none yet, or last one older than the cadence) ──
      const latestAssessmentMap: Record<string, string> = {};
      (fitnessAssessments ?? []).forEach((a: any) => {
        if (!latestAssessmentMap[a.client_id]) latestAssessmentMap[a.client_id] = a.assessment_date; // ordered desc
      });
      clients.forEach((client) => {
        const last = latestAssessmentMap[client.id] ?? null;
        const daysSince = last ? Math.floor((Date.now() - new Date(last + 'T00:00:00').getTime()) / 86400000) : null;
        if (daysSince != null && daysSince < REASSESSMENT_DUE_DAYS) return;
        items.push({
          id: `assessment_due:${client.id}`,
          type: 'assessment_due',
          severity: SEVERITY_RANK.assessment_due,
          clientId: client.id,
          clientName: client.full_name ?? 'Client',
          title: last
            ? `${client.full_name} — re-assessment due`
            : `${client.full_name} — baseline assessment needed`,
          subtitle: last
            ? `Last assessed ${new Date(last + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} (${Math.floor(daysSince! / 7)} wks ago)`
            : 'No fitness assessment on record yet',
        });
      });

      return items.sort((a, b) => a.severity - b.severity);
    },
  });
}

// ---------------------------------------------------------------------------
// Today's check-ins — each assigned client's daily readiness (mood / energy /
// sleep / pain from today's check-in), plus who hasn't checked in yet.
// ---------------------------------------------------------------------------
export interface TodayCheckinRow {
  clientId: string;
  clientName: string;
  checkin: { mood: number; energy: number; sleep_hrs: number; pain_level: number; created_at: string } | null;
}

function todayLocalDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useCoachTodayCheckins() {
  const { user } = useAuth();

  return useQuery({
    queryKey: coachDashboardKeys.todayCheckins(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async (): Promise<TodayCheckinRow[]> => {
      const { data: clients, error: clientsErr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('assigned_coach_id', user!.id)
        .order('full_name');
      if (clientsErr) throw clientsErr;
      if (!clients?.length) return [];

      const clientIds = clients.map((c) => c.id);
      const { data: checkins, error: checkinsErr } = await supabase
        .from('daily_checkins')
        .select('client_id, mood, energy, sleep_hrs, pain_level, created_at')
        .in('client_id', clientIds)
        .eq('date', todayLocalDateStr());
      if (checkinsErr) throw checkinsErr;

      const checkinByClient = new Map((checkins ?? []).map((c: any) => [c.client_id, c]));

      return clients
        .map((c) => {
          const ci = checkinByClient.get(c.id);
          return {
            clientId: c.id,
            clientName: c.full_name ?? 'Client',
            checkin: ci ? { mood: ci.mood, energy: ci.energy, sleep_hrs: ci.sleep_hrs, pain_level: ci.pain_level, created_at: ci.created_at } : null,
          };
        })
        // checked-in first, then alphabetical within each group
        .sort((a, b) => Number(!!b.checkin) - Number(!!a.checkin) || a.clientName.localeCompare(b.clientName));
    },
  });
}

// ---------------------------------------------------------------------------
// Client wins — achievements earned by assigned clients in the last 7 days
// (streak milestones, perfect weeks, tier promotions). Coaches can read these
// via the coach_read_assigned_client_achievements RLS policy.
// ---------------------------------------------------------------------------
export interface ClientWin {
  id: string;
  clientId: string;
  clientName: string;
  kind: string;
  label: string;
  icon: string;
  achievedOn: string;
}

export function useCoachClientWins() {
  const { user } = useAuth();

  return useQuery({
    queryKey: coachDashboardKeys.clientWins(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async (): Promise<ClientWin[]> => {
      const { data: clients, error: clientsErr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('assigned_coach_id', user!.id);
      if (clientsErr) throw clientsErr;
      if (!clients?.length) return [];

      const clientById = new Map(clients.map((c) => [c.id, c]));
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
      const sinceDateStr = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysAgo.getDate()).padStart(2, '0')}`;

      const { data: wins, error } = await supabase
        .from('client_achievements')
        .select('id, client_id, kind, label, icon, achieved_on')
        .in('client_id', clients.map((c) => c.id))
        .gte('achieved_on', sinceDateStr)
        .order('achieved_on', { ascending: false })
        .limit(20);
      if (error) throw error;

      return (wins ?? []).map((w: any) => ({
        id: w.id,
        clientId: w.client_id,
        clientName: clientById.get(w.client_id)?.full_name ?? 'Client',
        kind: w.kind,
        label: w.label,
        icon: w.icon,
        achievedOn: w.achieved_on,
      }));
    },
  });
}

// ---------------------------------------------------------------------------
// Client pulse — 7-day adherence per assigned client, worst-first, plus a
// per-day completed-items series for sparklines.
//
// Adherence is computed against the client's PLAN days (week_start_date +
// day_number identify the calendar day each item belongs to), not against
// completed_at. The old completed_at-window approach silently excluded every
// unchecked item (completed_at is null until checked), so the denominator
// only ever contained completed items — adherence read ~100% or "No data"
// and nothing in between.
// ---------------------------------------------------------------------------
export interface ClientPulseRow {
  clientId: string;
  clientName: string;
  adherencePct: number | null;
  lastActiveAt: string | null;
  /** Completed items per calendar day, last 7 days, oldest → newest */
  dailyDone: number[];
}

export function useCoachClientPulse() {
  const { user } = useAuth();

  return useQuery({
    queryKey: coachDashboardKeys.clientPulse(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async (): Promise<ClientPulseRow[]> => {
      const { data: clients, error: clientsErr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('assigned_coach_id', user!.id);
      if (clientsErr) throw clientsErr;
      if (!clients?.length) return [];

      const clientIds = clients.map((c) => c.id);
      const todayStr   = toLocalDateStr(new Date());
      const windowFrom = addDaysToDateStr(todayStr, -6); // 7-day window incl. today
      const curWs  = getWeekStart(new Date());
      const prevWs = getWeekStart(new Date(Date.now() - 7 * 86400000));

      const [{ data: planRows }, { data: lastCompleted }] = await Promise.all([
        supabase
          .from('manual_workout_logs')
          .select('client_id, week_start_date, day_number, completed')
          .in('client_id', clientIds)
          .in('week_start_date', [prevWs, curWs]),
        supabase
          .from('manual_workout_logs')
          .select('client_id, completed_at')
          .in('client_id', clientIds)
          .eq('completed', true)
          .order('completed_at', { ascending: false })
          .limit(2000),
      ]);

      const buckets: Record<string, { total: number; done: number; daily: number[] }> = {};
      (planRows ?? []).forEach((l: any) => {
        // day_number 1=Mon … 6=Sat; week_start_date is that week's Monday
        const rowDate = addDaysToDateStr(l.week_start_date, l.day_number - 1);
        if (rowDate < windowFrom || rowDate > todayStr) return; // outside window / future plan days
        if (!buckets[l.client_id]) buckets[l.client_id] = { total: 0, done: 0, daily: [0, 0, 0, 0, 0, 0, 0] };
        const b = buckets[l.client_id];
        b.total++;
        if (l.completed) {
          b.done++;
          const daysAgo = Math.round((new Date(todayStr + 'T00:00:00').getTime() - new Date(rowDate + 'T00:00:00').getTime()) / 86400000);
          b.daily[6 - daysAgo]++;
        }
      });

      const lastActiveMap: Record<string, string> = {};
      (lastCompleted ?? []).forEach((l: any) => {
        if (!lastActiveMap[l.client_id]) lastActiveMap[l.client_id] = l.completed_at; // ordered desc
      });

      return clients
        .map((c) => {
          const b = buckets[c.id];
          return {
            clientId: c.id,
            clientName: c.full_name ?? 'Client',
            adherencePct: b && b.total > 0 ? Math.round((b.done / b.total) * 100) : null,
            lastActiveAt: lastActiveMap[c.id] ?? null,
            dailyDone: b?.daily ?? [0, 0, 0, 0, 0, 0, 0],
          };
        })
        .sort((a, b) => (a.adherencePct ?? 101) - (b.adherencePct ?? 101));
    },
  });
}

// ---------------------------------------------------------------------------
// Week check-in grid — which days this week (Mon–Sun) each client checked
// in. Cells: 1 = checked in, 0 = missed, null = future day.
// ---------------------------------------------------------------------------
export interface WeekCheckinGridRow {
  clientId: string;
  clientName: string;
  days: (number | null)[]; // 7 cells, Mon → Sun
}

export function useCoachWeekCheckinGrid() {
  const { user } = useAuth();

  return useQuery({
    queryKey: coachDashboardKeys.weekCheckinGrid(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async (): Promise<WeekCheckinGridRow[]> => {
      const { data: clients, error: clientsErr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('assigned_coach_id', user!.id)
        .order('full_name');
      if (clientsErr) throw clientsErr;
      if (!clients?.length) return [];

      const weekStart = getWeekStart(new Date());
      const todayStr  = toLocalDateStr(new Date());
      const { data: checkins, error } = await supabase
        .from('daily_checkins')
        .select('client_id, date')
        .in('client_id', clients.map((c) => c.id))
        .gte('date', weekStart)
        .lte('date', todayStr);
      if (error) throw error;

      const byClient: Record<string, Set<string>> = {};
      (checkins ?? []).forEach((c: any) => {
        (byClient[c.client_id] ??= new Set()).add(c.date);
      });

      return clients.map((c) => ({
        clientId: c.id,
        clientName: c.full_name ?? 'Client',
        days: Array.from({ length: 7 }, (_, i) => {
          const d = addDaysToDateStr(weekStart, i);
          if (d > todayStr) return null;
          return byClient[c.id]?.has(d) ? 1 : 0;
        }),
      }));
    },
  });
}

// ---------------------------------------------------------------------------
// Medical opinion requests — all sent-to-coach analyses across assigned
// clients, unviewed first.
// ---------------------------------------------------------------------------
export interface MedicalOpinionRequest {
  analysisId: string;
  clientId: string;
  clientName: string;
  summaryText: string;
  sentToCoachAt: string;
  viewed: boolean;
}

export function useCoachMedicalOpinionRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: coachDashboardKeys.medicalOpinionReqs(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async (): Promise<MedicalOpinionRequest[]> => {
      const { data: clients, error: clientsErr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('assigned_coach_id', user!.id);
      if (clientsErr) throw clientsErr;
      if (!clients?.length) return [];

      const clientById = new Map(clients.map((c) => [c.id, c]));
      const clientIds = clients.map((c) => c.id);

      const { data: analyses, error } = await supabase
        .from('medical_analyses')
        .select('id, client_id, summary_text, sent_to_coach_at, coach_viewed_at')
        .in('client_id', clientIds)
        .not('sent_to_coach_at', 'is', null)
        .order('sent_to_coach_at', { ascending: false });
      if (error) throw error;

      return (analyses ?? [])
        .map((a: any) => ({
          analysisId: a.id,
          clientId: a.client_id,
          clientName: clientById.get(a.client_id)?.full_name ?? 'Client',
          summaryText: a.summary_text,
          sentToCoachAt: a.sent_to_coach_at,
          viewed: !!a.coach_viewed_at,
        }))
        .sort((a, b) => {
          if (a.viewed !== b.viewed) return a.viewed ? 1 : -1;
          return b.sentToCoachAt.localeCompare(a.sentToCoachAt);
        });
    },
  });
}

// ---------------------------------------------------------------------------
// Mark an analysis as viewed by the coach
// ---------------------------------------------------------------------------
export function useMarkAnalysisViewedByCoach() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (analysisId: string) => {
      const { error } = await supabase
        .from('medical_analyses')
        .update({ coach_viewed_at: new Date().toISOString() })
        .eq('id', analysisId)
        .is('coach_viewed_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      if (user?.id) {
        qc.invalidateQueries({ queryKey: coachDashboardKeys.attentionItems(user.id) });
        qc.invalidateQueries({ queryKey: coachDashboardKeys.medicalOpinionReqs(user.id) });
      }
    },
  });
}
