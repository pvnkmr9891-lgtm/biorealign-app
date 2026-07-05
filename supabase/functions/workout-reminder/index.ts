// supabase/functions/workout-reminder/index.ts
// Deploy: supabase functions deploy workout-reminder --no-verify-jwt
//
// Daily nudge — invoked by pg_cron at 6:00 PM IST (12:30 UTC). Pushes a
// reminder to every client with a push token who hasn't completed a single
// checklist item today (IST calendar day).
//
// Requires secrets: CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const IST_OFFSET_MS = 5.5 * 3600000;

// Start of the current IST calendar day, as a UTC ISO string.
function startOfTodayIstIso(): string {
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  nowIst.setUTCHours(0, 0, 0, 0);
  return new Date(nowIst.getTime() - IST_OFFSET_MS).toISOString();
}

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

    const todayStartIso = startOfTodayIstIso();

    const [{ data: clients }, { data: logsToday }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, push_token').eq('role', 'client').not('push_token', 'is', null),
      supabase.from('manual_workout_logs').select('client_id').eq('completed', true).gte('completed_at', todayStartIso),
    ]);

    const loggedToday = new Set((logsToday ?? []).map((l: any) => l.client_id));
    const targets = (clients ?? []).filter((c: any) => !loggedToday.has(c.id));

    const messages = targets.map((c: any) => ({
      to: c.push_token,
      title: 'Your plan is waiting 💪',
      body: `${(c.full_name ?? '').split(' ')[0] || 'Hey'}, nothing logged yet today — even one exercise keeps the streak alive.`,
    }));

    const sent = await sendPushes(messages);

    return new Response(JSON.stringify({ success: true, eligible: targets.length, sent }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[workout-reminder] error', (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
