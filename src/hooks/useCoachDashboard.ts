import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getSupplementInteractionWarning } from '@/constants/supplementItems';

export const coachDashboardKeys = {
  attentionItems:       (uid: string) => ['coach', uid, 'attention_items'] as const,
  clientPulse:          (uid: string) => ['coach', uid, 'client_pulse'] as const,
  medicalOpinionReqs:   (uid: string) => ['coach', uid, 'medical_opinion_requests'] as const,
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
// Client pulse — 7-day adherence per assigned client, worst-first.
// ---------------------------------------------------------------------------
export interface ClientPulseRow {
  clientId: string;
  clientName: string;
  adherencePct: number | null;
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
      const sevenDaysAgoIso = new Date(Date.now() - 7 * 86400000).toISOString();

      const { data: logs7d } = await supabase
        .from('manual_workout_logs')
        .select('client_id, completed')
        .in('client_id', clientIds)
        .gte('completed_at', sevenDaysAgoIso);

      const adherenceTotals: Record<string, { total: number; done: number }> = {};
      (logs7d ?? []).forEach((l: any) => {
        if (!adherenceTotals[l.client_id]) adherenceTotals[l.client_id] = { total: 0, done: 0 };
        adherenceTotals[l.client_id].total++;
        if (l.completed) adherenceTotals[l.client_id].done++;
      });

      return clients
        .map((c) => {
          const adherence = adherenceTotals[c.id];
          return {
            clientId: c.id,
            clientName: c.full_name ?? 'Client',
            adherencePct: adherence && adherence.total > 0 ? Math.round((adherence.done / adherence.total) * 100) : null,
          };
        })
        .sort((a, b) => (a.adherencePct ?? 101) - (b.adherencePct ?? 101));
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
