// supabase/functions/measurement-reminder/index.ts
// Deploy: supabase functions deploy measurement-reminder --no-verify-jwt
//
// Weekly nudge — invoked by pg_cron every Wednesday at 6:00 PM IST (12:30 UTC).
// Pushes a reminder to every client with a push token who hasn't logged a
// body_metrics entry for the current week yet (Monday-start, IST).
//
// Requires secrets: CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const IST_OFFSET_MS = 5.5 * 3600000;

// Monday of the current IST week, as YYYY-MM-DD (matches body_metrics.recorded_date,
// which is keyed by week-start Monday, not the day actually measured).
function currentWeekStartIst(): string {
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const day = nowIst.getUTCDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  nowIst.setUTCDate(nowIst.getUTCDate() + diffToMonday);
  return nowIst.toISOString().split('T')[0];
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

    const weekStart = currentWeekStartIst();

    const [{ data: clients }, { data: loggedThisWeek }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, push_token').eq('role', 'client').not('push_token', 'is', null),
      supabase.from('body_metrics').select('client_id').eq('recorded_date', weekStart),
    ]);

    const logged = new Set((loggedThisWeek ?? []).map((m: any) => m.client_id));
    const targets = (clients ?? []).filter((c: any) => !logged.has(c.id));

    let sent = 0;
    for (let i = 0; i < targets.length; i += 100) {
      const chunk = targets.slice(i, i + 100).map((c: any) => ({
        to: c.push_token,
        sound: 'default',
        title: '📏 Log this week\'s measurements',
        body: `${(c.full_name ?? '').split(' ')[0] || 'Hey'}, takes a minute and keeps your trend chart accurate.`,
      }));
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      });
      const result = await res.json();
      const tickets = Array.isArray(result.data) ? result.data : [result.data];
      sent += tickets.filter((t: any) => t?.status === 'ok').length;
    }

    return new Response(JSON.stringify({ success: true, eligible: targets.length, sent }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[measurement-reminder] error', (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
