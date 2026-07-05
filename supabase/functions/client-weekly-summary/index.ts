// supabase/functions/client-weekly-summary/index.ts
// Deploy: supabase functions deploy client-weekly-summary --no-verify-jwt
//
// Sunday-evening recap — invoked by pg_cron at 6:00 PM IST every Sunday.
// Each client with a push token gets their week: items completed, current
// streak, and composite score movement.
//
// Requires secrets: CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function sendPushes(messages: { to: string; title: string; body: string }[]): Promise<number> {
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100).map((m) => ({ ...m, sound: 'default' }));
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk),
    });
    const result = await res.json();
    const tickets = Array.isArray(result.data) ? result.data : [result.data];
    sent += tickets.filter((t: any) => t?.status === 'ok').length;
  }
  return sent;
}

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get('CRON_SECRET');
    if (!secret || req.headers.get('x-cron-secret') !== secret) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const sevenDaysAgoIso = new Date(Date.now() - 7 * 86400000).toISOString();
    const fourteenDaysAgoIso = new Date(Date.now() - 14 * 86400000).toISOString();

    const [{ data: clients }, { data: logs7d }, { data: streaks }, { data: metrics }] = await Promise.all([
      supabase.from('profiles').select('id, push_token').eq('role', 'client').not('push_token', 'is', null),
      supabase.from('manual_workout_logs').select('client_id').eq('completed', true).gte('completed_at', sevenDaysAgoIso),
      supabase.from('client_streaks').select('client_id, current_streak'),
      supabase.from('progress_metrics').select('client_id, fitness_score, recovery_score, longevity_score, recorded_at').gte('recorded_at', fourteenDaysAgoIso).order('recorded_at', { ascending: true }).limit(5000),
    ]);

    const doneByClient: Record<string, number> = {};
    (logs7d ?? []).forEach((l: any) => { doneByClient[l.client_id] = (doneByClient[l.client_id] ?? 0) + 1; });

    const streakByClient: Record<string, number> = {};
    (streaks ?? []).forEach((s: any) => { streakByClient[s.client_id] = s.current_streak ?? 0; });

    const composite = (m: any) => Math.round(((m.fitness_score ?? 0) + (m.recovery_score ?? 0) + (m.longevity_score ?? 0)) / 3);
    const metricsByClient: Record<string, { first: any; last: any; count: number }> = {};
    (metrics ?? []).forEach((m: any) => {
      metricsByClient[m.client_id] ??= { first: m, last: m, count: 0 };
      metricsByClient[m.client_id].last = m;
      metricsByClient[m.client_id].count++;
    });

    const messages = (clients ?? []).map((c: any) => {
      const done = doneByClient[c.id] ?? 0;
      const streak = streakByClient[c.id] ?? 0;
      const mv = metricsByClient[c.id];
      const delta = mv && mv.count >= 2 ? composite(mv.last) - composite(mv.first) : null;

      let body: string;
      if (done === 0) {
        body = 'A fresh week starts tomorrow — jump back in with one small win 💪';
      } else {
        const parts = [`${done} item${done > 1 ? 's' : ''} completed`];
        if (streak > 0) parts.push(`🔥 ${streak}-day streak`);
        if (delta != null && delta !== 0) parts.push(`score ${delta > 0 ? '▲' : '▼'}${Math.abs(delta)}`);
        body = parts.join(' · ');
      }
      return { to: c.push_token, title: '📈 Your week at BioRealign', body };
    });

    const sent = await sendPushes(messages);

    return new Response(JSON.stringify({ success: true, targeted: messages.length, sent }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[client-weekly-summary] error', (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
