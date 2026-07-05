// supabase/functions/admin-daily-digest/index.ts
// Deploy: supabase functions deploy admin-daily-digest
//
// Morning pulse push for admins — invoked by pg_cron daily at 8:00 AM IST
// (02:30 UTC). Computes yesterday's headline numbers and sends an Expo push
// to every role=admin profile with a push token.
//
// Requires secrets: CRON_SECRET (shared with the pg_cron job's x-cron-secret
// header so only the scheduler can trigger it), SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const IST_OFFSET_MS = 5.5 * 3600000;

// Calendar date string (YYYY-MM-DD) in IST for a given instant.
function istDateStr(ms: number): string {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
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

    const now = Date.now();
    const yesterdayStr = istDateStr(now - 86400000);
    const dayAgoIso = new Date(now - 86400000).toISOString();
    const startOfYesterdayUtcIso = new Date(now - 2 * 86400000).toISOString();

    const [
      { data: clients },
      { data: coaches },
      { data: checkinsYesterday },
      { data: logsYesterday },
      { data: staleUnread },
      { data: admins },
    ] = await Promise.all([
      supabase.from('profiles').select('id, full_name, created_at').eq('role', 'client'),
      supabase.from('profiles').select('id, last_seen_at').eq('role', 'coach'),
      supabase.from('daily_checkins').select('client_id, pain_level, energy').eq('date', yesterdayStr),
      supabase.from('manual_workout_logs').select('client_id').eq('completed', true).gte('completed_at', startOfYesterdayUtcIso),
      supabase.from('messages').select('id, receiver_id').is('read_at', null).lte('sent_at', dayAgoIso).limit(1000),
      supabase.from('profiles').select('id, push_token').eq('role', 'admin').not('push_token', 'is', null),
    ]);

    const totalClients = (clients ?? []).length;
    const nameOf: Record<string, string> = {};
    (clients ?? []).forEach((c: any) => { nameOf[c.id] = c.full_name; });

    const checkedIn = new Set((checkinsYesterday ?? []).map((c: any) => c.client_id)).size;
    const active = new Set((logsYesterday ?? []).map((l: any) => l.client_id)).size;

    const redFlagIds = [...new Set(
      (checkinsYesterday ?? [])
        .filter((c: any) => (c.pain_level ?? 0) >= 7 || (c.energy != null && c.energy <= 2))
        .map((c: any) => c.client_id)
    )];
    const redFlagNames = redFlagIds.map((id) => (nameOf[id] ?? 'Unknown').split(' ')[0]);

    const coachIds = new Set((coaches ?? []).map((c: any) => c.id));
    const unreadToCoaches = (staleUnread ?? []).filter((m: any) => coachIds.has(m.receiver_id)).length;

    const coachesInactive = (coaches ?? []).filter((c: any) => !c.last_seen_at || c.last_seen_at < dayAgoIso).length;

    const signupsYesterday = (clients ?? []).filter((c: any) => istDateStr(new Date(c.created_at).getTime()) === yesterdayStr).length;

    const parts = [
      `✅ ${checkedIn}/${totalClients} checked in`,
      `🏋️ ${active} active`,
    ];
    if (redFlagIds.length > 0) parts.push(`🚨 ${redFlagIds.length} red flag${redFlagIds.length > 1 ? 's' : ''} (${redFlagNames.slice(0, 3).join(', ')})`);
    if (unreadToCoaches > 0) parts.push(`💬 ${unreadToCoaches} msgs unread >24h`);
    if (coachesInactive > 0) parts.push(`🧑‍🏫 ${coachesInactive} coach${coachesInactive > 1 ? 'es' : ''} inactive`);
    if (signupsYesterday > 0) parts.push(`✨ +${signupsYesterday} signup${signupsYesterday > 1 ? 's' : ''}`);
    const body = parts.join(' · ');

    const tokens = (admins ?? []).map((a: any) => a.push_token).filter(Boolean);
    let sent = 0;
    if (tokens.length > 0) {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokens.map((to: string) => ({
          to,
          sound: 'default',
          title: '☀️ BioRealign — yesterday at a glance',
          body,
        }))),
      });
      const result = await res.json();
      const tickets = Array.isArray(result.data) ? result.data : [result.data];
      sent = tickets.filter((t: any) => t?.status === 'ok').length;
    }

    return new Response(JSON.stringify({ success: true, sent, adminsWithToken: tokens.length, body }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[admin-daily-digest] error', (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
