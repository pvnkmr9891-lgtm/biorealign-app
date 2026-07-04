// supabase/functions/ai-plan-suggestions/index.ts
// Deploy: supabase functions deploy ai-plan-suggestions
//
// Generates an AI-suggested transformation plan for a client from their
// latest assessment. Runs with the coach's forwarded JWT (no service role) —
// the assessment fetch goes through RLS, so callers can only generate
// suggestions for clients whose assessments they're allowed to read.
//
// Requires secret: ANTHROPIC_API_KEY (server-side only).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an elite health and body transformation coach building personalised plans for BioRealign clients.
You have deep expertise in posture correction, movement training, nutrition, recovery, and lifestyle coaching.
You must respond ONLY with a valid JSON object — no markdown, no backticks, no preamble.
The JSON must match this exact structure:
{
  "plan_title": "string",
  "plan_overview": "string (2-3 sentences)",
  "red_flags": ["string"],
  "priority_focus": "string (1 sentence)",
  "nutrition_notes": "string",
  "phase_1_goal": "string",
  "tracks": [
    {
      "track_type": "workout|nutrition|recovery|lifestyle|posture_rehab|mindset",
      "title": "string",
      "rationale": "string (1 sentence why this track)",
      "items": [
        {
          "title": "string",
          "item_type": "exercise|meal_guide|protocol|habit|note",
          "description": "string",
          "sets": number or null,
          "reps": "string or null",
          "duration_minutes": number or null,
          "day_of_week": ["Monday","Wednesday","Friday"],
          "coach_note": "string"
        }
      ]
    }
  ]
}
Suggest 2-4 tracks maximum. Each track should have 2-4 items. Be specific and practical.`;

function buildPrompt(clientName: string, a: Record<string, any>): string {
  return `Build a personalised transformation plan for ${clientName}.

PERSONAL CONTEXT:
- Occupation: ${a.occupation_type ?? 'unknown'}, ${a.work_hours_daily ?? '?'} hrs/day
- Daily activity: ${a.daily_activity_level ?? 'unknown'}
- Available time: ${a.available_minutes_per_day ?? 30} min/day
- Primary stressor: ${a.primary_stressor ?? 'unknown'}
- Previous coaching: ${a.previous_coaching ?? 'none'}

BODY & HEALTH:
- Height: ${a.height_cm ?? '?'}cm, Weight: ${a.weight_kg ?? '?'}kg
- Complaints: ${(a.complaints ?? []).join(', ') || 'none'}
- Pain locations: ${JSON.stringify(a.pain_locations ?? [])}
- Medical conditions: ${(a.conditions ?? []).join(', ') || 'none'}
- Injuries: ${(a.injuries ?? []).join(', ') || 'none'}
- Medications: ${a.medications || 'none'}
- Energy: Morning ${a.energy_morning}/10, Afternoon ${a.energy_afternoon}/10, Evening ${a.energy_evening}/10
- Breathing: ${a.breathing_quality ?? 'unknown'}

MOVEMENT & FITNESS:
- Last exercised: ${a.last_exercise_period ?? 'unknown'}
- Exercise history: ${(a.exercise_history ?? []).join(', ') || 'none'}
- Weekly frequency: ${a.weekly_frequency ?? 0}x/week
- Environment: ${a.workout_environment ?? 'unknown'}
- Equipment: ${(a.available_equipment ?? []).join(', ') || 'none'}
- Posture issues: ${(a.posture_issues ?? []).join(', ') || 'none'}
- Movement pain: ${(a.pain_during_movement ?? []).join(', ') || 'none'}
- Flexibility: ${a.flexibility_score ?? 5}/10
- Balance: ${a.balance_score ?? 5}/10

NUTRITION & RECOVERY:
- Diet: ${a.diet_type ?? 'unknown'}
- Food allergies: ${(a.food_allergies ?? []).join(', ') || 'none'}
- Meals/day: ${a.meals_per_day ?? 3}
- Hydration: ${a.hydration_glasses ?? '?'} glasses/day
- Sleep: ${a.sleep_hours_avg ?? '?'} hrs, quality ${a.sleep_quality_avg ?? 5}/10
- Stress: ${a.stress_level ?? 5}/10
- Recovery tools: ${(a.recovery_tools ?? []).join(', ') || 'none'}

GOALS:
- Primary goal: ${a.primary_goal ?? 'unknown'}
- Secondary goals: ${(a.secondary_goals ?? []).join(', ') || 'none'}
- Timeline: ${a.timeline ?? 'unknown'}
- Daily commitment: ${a.commitment_level ?? 30} min/day
- Past blockers: ${(a.past_blockers ?? []).join(', ') || 'none'}
- In their words: "${a.ideal_outcome ?? ''}"
- Note to coach: "${a.coach_notes_from_client ?? ''}"

Based on this data, create a personalised Phase 1 plan. Prioritise their primary goal, respect their time availability and equipment, flag any medical red flags, and make exercises appropriate for their fitness level.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!Deno.env.get('ANTHROPIC_API_KEY')) {
      return new Response(JSON.stringify({ error: 'Server is missing its AI configuration. Please contact support.', debug: 'ANTHROPIC_API_KEY secret is not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const jwt = authHeader.replace('Bearer ', '');
    const { data: userRes, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { clientId, clientName } = await req.json();
    if (!clientId || typeof clientId !== 'string') {
      return new Response(JSON.stringify({ error: 'clientId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // RLS on assessments enforces that the caller may read this client's data.
    const { data: assessment, error: assessmentErr } = await supabase
      .from('assessments')
      .select('*')
      .eq('client_id', clientId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (assessmentErr) throw assessmentErr;
    if (!assessment) {
      return new Response(JSON.stringify({ error: 'No assessment found for this client. Ask them to complete the onboarding assessment first.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const callAnthropic = () => fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildPrompt(String(clientName ?? 'this client'), assessment) }],
      }),
    });

    let anthropicRes = await callAnthropic();
    // Anthropic's edge occasionally returns a transient 5xx (Cloudflare 502) —
    // one quick retry clears the vast majority of these.
    if (!anthropicRes.ok && anthropicRes.status >= 500) {
      anthropicRes = await callAnthropic();
    }

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('[ai-plan-suggestions] Anthropic error', anthropicRes.status);
      return new Response(JSON.stringify({ error: 'AI generation failed', detail: errText.slice(0, 300) }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiResult = await anthropicRes.json();
    const text = aiResult.content?.[0]?.text ?? '';
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      return new Response(JSON.stringify({ error: 'No JSON found in AI response' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let suggestion: unknown;
    try {
      suggestion = JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch {
      return new Response(JSON.stringify({ error: 'Could not parse AI response' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ suggestion }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[ai-plan-suggestions] error', (err as Error).message);
    return new Response(JSON.stringify({ error: 'Something went wrong while generating suggestions. Please try again.', debug: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
