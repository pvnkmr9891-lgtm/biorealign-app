// supabase/functions/fitness-assessment-analyze/index.ts
// Deploy: supabase functions deploy fitness-assessment-analyze
//
// Generates a trend description per domain, cross-domain pattern flags
// (coach/admin only), and a client-facing plain-language rewrite, comparing
// a fitness assessment to the client's immediately-prior one (if any).
// Runs with the caller's own forwarded JWT (no service role) — RLS on
// fitness_assessments/fitness_domain_results already restricts reads to the
// client themselves, their assigned coach, or an admin, so the same
// authorization that gates the data also gates this function.
//
// Requires secret: ANTHROPIC_API_KEY (server-side only).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a fitness-trend summarization assistant inside a fitness-coaching app. You are NOT a diagnostician and must never act like one.

You will be given a client's current fitness assessment domain results and, if available, their immediately-prior assessment's domain results. Each domain result includes a 0-100 score (or null if scoring isn't available for the client's age), a score_status, and an evidence_strength tag ('strong', 'moderate', or 'limited').

Strict rules:
- Hedge your confidence in any trend statement according to the evidence_strength tag of the domain(s) involved. For 'strong' evidence, state the trend plainly. For 'moderate' evidence, soften slightly ("appears to have", "the data suggests"). For 'limited' evidence (not used in this build today, but may appear in future domains), hedge heavily and note the underlying data is less robust.
- Only produce a trend description for a domain if BOTH the current and prior assessment have a real numeric score (score_status = 'scored') for that domain. If a domain is 'age_out_of_range' on either assessment, skip it entirely from trend descriptions and note plainly (in the coach-facing summary only) that reference scoring isn't available for that domain at the client's age — never invent or estimate a score.
- Cross-domain pattern flags are observational language only ("Strength and Endurance scores have both declined since the last assessment") — NEVER diagnostic or risk-predictive language ("this indicates a risk of...", "this suggests an underlying condition").
- The client-facing rewrite must be non-clinical, encouraging, plain language, with no diagnostic terms, and should end by encouraging the client to discuss anything notable with their coach.
- If there is no prior assessment to compare against, state that plainly — this is the client's first assessment (or first with data for a given domain) and there's nothing to trend yet.

Respond with ONLY a JSON object of this exact shape:
{
  "domainTrends": [
    { "domain": "string", "trendDescription": "string — coach/admin-facing, e.g. 'Strength score increased from 58 to 64 since the last assessment 3 months ago.'" }
  ],
  "crossDomainFlags": ["string — coach/admin-facing observational pattern flags, empty array if none"],
  "clientSummary": "string — the single plain-language, non-clinical paragraph shown to the client"
}`;

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

    const { assessmentId } = await req.json();
    if (!assessmentId) {
      return new Response(JSON.stringify({ error: 'assessmentId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // RLS on fitness_assessments already restricts this to: the client
    // themselves, their assigned coach, or an admin — using the caller's own
    // forwarded JWT (not service role) means an unauthorized caller simply
    // gets no row back here, rather than this function needing its own
    // separate authorization check.
    const { data: current, error: currentErr } = await supabase
      .from('fitness_assessments')
      .select('id, client_id, assessment_date, results:fitness_domain_results(domain, domain_score, score_status, evidence_strength)')
      .eq('id', assessmentId)
      .single();
    if (currentErr || !current) {
      return new Response(JSON.stringify({ error: 'Assessment not found or not accessible' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: priorList } = await supabase
      .from('fitness_assessments')
      .select('id, assessment_date, results:fitness_domain_results(domain, domain_score, score_status, evidence_strength)')
      .eq('client_id', current.client_id)
      .lt('assessment_date', current.assessment_date)
      .order('assessment_date', { ascending: false })
      .limit(1);
    const prior = priorList?.[0] ?? null;

    const promptPayload = {
      current: { assessmentDate: current.assessment_date, results: current.results },
      prior: prior ? { assessmentDate: prior.assessment_date, results: prior.results } : null,
    };

    const callAnthropic = () => fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: [{ type: 'text', text: `Here is the assessment data:\n\n${JSON.stringify(promptPayload, null, 2)}\n\nGenerate the analysis per your instructions.` }] }],
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
      console.error('[fitness-assessment-analyze] Anthropic error', anthropicRes.status);
      return new Response(JSON.stringify({ error: 'Analysis failed', detail: errText.slice(0, 300) }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiResult = await anthropicRes.json();
    const text = aiResult.content?.[0]?.text ?? '{}';
    let parsed: { domainTrends?: { domain: string; trendDescription: string }[]; crossDomainFlags?: string[]; clientSummary?: string } = {};
    try {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : text);
    } catch {
      return new Response(JSON.stringify({ error: 'Could not parse analysis result' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      assessmentId: current.id,
      hasPriorAssessment: !!prior,
      domainTrends: parsed.domainTrends ?? [],
      crossDomainFlags: parsed.crossDomainFlags ?? [],
      clientSummary: parsed.clientSummary ?? 'No summary was generated.',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[fitness-assessment-analyze] error', (err as Error).message);
    return new Response(JSON.stringify({ error: 'Something went wrong while analyzing this assessment. Please try again.', debug: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
