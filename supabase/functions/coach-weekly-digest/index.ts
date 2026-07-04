// supabase/functions/coach-weekly-digest/index.ts
// Deploy: supabase functions deploy coach-weekly-digest
//
// Generates (and caches, one per coach+client+week) a short AI digest of a
// client's week for the coach: 2-3 sentence summary, wins, concerns, and a
// suggested check-in message the coach can edit and send.
//
// Runs with the caller's forwarded JWT — RLS scopes every read to clients
// this coach is actually allowed to see. Requires secret: ANTHROPIC_API_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const DIGEST_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: '2-3 sentences on how the week went overall, plain language, addressed to the coach' },
    wins: { type: 'array', items: { type: 'string' }, description: '0-3 short bullet wins worth celebrating' },
    concerns: { type: 'array', items: { type: 'string' }, description: '0-3 short bullet concerns the coach should look at' },
    suggested_message: { type: 'string', description: 'A warm, specific 2-3 sentence message the coach could send the client, referencing real data from the week. First person, no greeting line needed.' },
  },
  required: ['summary', 'wins', 'concerns', 'suggested_message'],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You write weekly client digests for a fitness coach inside a coaching app. You receive one client's week of raw adherence data (workout/nutrition/supplement completion, daily check-ins with mood/energy/sleep/pain, streak info).

Rules:
- Be concrete: cite the actual numbers ("completed 14 of 18 exercises", "pain dropped from 6 to 3").
- Never invent data. If a category has no logs, say so neutrally — an empty week is a finding, not a failure to analyze.
- Concerns are observations for the coach, not medical advice. Pain/sleep patterns may be flagged as "worth asking about", never diagnosed.
- The suggested message is from coach to client: encouraging, specific to this week, one clear call to action. No emojis unless the week was genuinely great (max one).`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!Deno.env.get('ANTHROPIC_API_KEY')) {
      return json({ error: 'Server is missing its AI configuration. Please contact support.' }, 500);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userRes, error: userErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userErr || !userRes.user) return json({ error: 'Not authenticated' }, 401);
    const coachId = userRes.user.id;

    const { clientId, weekStart, force } = await req.json();
    if (!clientId || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart ?? '')) {
      return json({ error: 'clientId and weekStart (YYYY-MM-DD) are required' }, 400);
    }

    // Authorization: caller must actually have access to this client
    const { data: allowed } = await supabase.rpc('can_access_client', { p_client_id: clientId });
    if (!allowed) return json({ error: 'Not authorized for this client' }, 403);

    // Cache hit?
    if (!force) {
      const { data: cached } = await supabase
        .from('coach_client_digests')
        .select('*')
        .eq('coach_id', coachId).eq('client_id', clientId).eq('week_start', weekStart)
        .maybeSingle();
      if (cached) return json({ digest: cached, cached: true });
    }

    // ── Gather the week's data (all RLS-scoped to this coach's access) ──
    const weekEnd = (() => {
      const [y, m, d] = weekStart.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d + 6));
      return dt.toISOString().slice(0, 10);
    })();

    const [{ data: profile }, { data: logs }, { data: checkins }, { data: streak }] = await Promise.all([
      supabase.from('profiles').select('full_name, health_goals').eq('id', clientId).single(),
      supabase.from('manual_workout_logs')
        .select('day_number, item_type, item_name, completed, meal_slot, calories, protein_g')
        .eq('client_id', clientId).eq('week_start_date', weekStart),
      supabase.from('daily_checkins')
        .select('date, mood, energy, sleep_hrs, pain_level, notes')
        .eq('client_id', clientId).gte('date', weekStart).lte('date', weekEnd)
        .order('date', { ascending: true }),
      supabase.from('client_streaks').select('current_streak, longest_streak').eq('client_id', clientId).maybeSingle(),
    ]);

    if (!profile) return json({ error: 'Client not found or not accessible' }, 404);

    // Compact adherence rollup so the prompt stays small and cheap
    const rollup: Record<string, { done: number; total: number }> = {};
    for (const l of logs ?? []) {
      const key = ['warmup', 'workout', 'cooldown'].includes(l.item_type) ? 'exercise' : l.item_type;
      rollup[key] = rollup[key] ?? { done: 0, total: 0 };
      rollup[key].total++;
      if (l.completed) rollup[key].done++;
    }
    const cravings = (logs ?? []).filter((l) => l.meal_slot === 'craving' && l.completed).length;

    const weekData = {
      client_first_name: (profile.full_name ?? 'Client').split(' ')[0],
      goals: profile.health_goals ?? null,
      week_start: weekStart,
      adherence: rollup,
      craving_items_logged: cravings,
      daily_checkins: checkins ?? [],
      streak: streak ?? null,
    };

    const callAnthropic = () => fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        output_config: { format: { type: 'json_schema', schema: DIGEST_SCHEMA } },
        messages: [{
          role: 'user',
          content: `Here is the client's week as JSON:\n${JSON.stringify(weekData)}\n\nWrite the weekly digest.`,
        }],
      }),
    });

    let res = await callAnthropic();
    if (!res.ok && res.status >= 500) res = await callAnthropic(); // one retry on transient 5xx
    if (!res.ok) {
      console.error('[coach-weekly-digest] Anthropic error', res.status, await res.text());
      return json({ error: 'AI generation failed, please try again' }, 502);
    }

    const aiBody = await res.json();
    if (aiBody.stop_reason === 'refusal') return json({ error: 'AI declined to generate this digest' }, 502);
    const text = (aiBody.content ?? []).find((b: { type: string }) => b.type === 'text')?.text;
    if (!text) return json({ error: 'Empty AI response' }, 502);
    const digest = JSON.parse(text);

    const { data: saved, error: saveErr } = await supabase
      .from('coach_client_digests')
      .upsert({
        coach_id: coachId,
        client_id: clientId,
        week_start: weekStart,
        summary: digest.summary,
        wins: digest.wins,
        concerns: digest.concerns,
        suggested_message: digest.suggested_message,
        model: aiBody.model,
        created_at: new Date().toISOString(),
      }, { onConflict: 'coach_id,client_id,week_start' })
      .select('*')
      .single();
    if (saveErr) throw saveErr;

    return json({ digest: saved, cached: false });
  } catch (e) {
    console.error('[coach-weekly-digest]', e);
    return json({ error: 'Unexpected error generating digest' }, 500);
  }
});
