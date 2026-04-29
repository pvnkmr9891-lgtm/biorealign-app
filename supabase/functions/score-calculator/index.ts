// supabase/functions/score-calculator/index.ts
// Deploy: supabase functions deploy score-calculator
//
// Called after a daily check-in is saved, or when coach logs a body metric.
// Computes composite scores and upserts into progress_metrics.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScoreInput {
  client_id: string;
  enrollment_id?: string;
  // Check-in inputs
  mood?: number;
  energy?: number;
  sleep_hrs?: number;
  pain_level?: number;
  // Body metrics
  weight_kg?: number;
  bmi?: number;
  posture_score?: number;
}

function computeRecoveryScore(mood: number, energy: number, sleep: number, pain: number): number {
  // Recovery = weighted blend of subjective metrics
  const sleepNorm  = Math.min((sleep / 8) * 10, 10);         // 8hrs = full score
  const painInvert = 10 - pain;                               // low pain = high score
  const weighted   = (mood * 0.25) + (energy * 0.25) + (sleepNorm * 0.35) + (painInvert * 0.15);
  return Math.round(weighted * 10);                            // 0–100
}

function computeFitnessScore(prevScore: number, energy: number, mood: number): number {
  // Fitness trends up slowly — nudged by energy & mood
  const trend = ((energy + mood) / 20) - 0.5;                // -0.5 to +0.5
  const delta = Math.round(trend * 3);                         // -1.5 to +1.5 pts
  return Math.max(0, Math.min(100, prevScore + delta));
}

function computeLongevityScore(fitness: number, recovery: number, posture?: number): number {
  const base = (fitness * 0.4) + (recovery * 0.4);
  const posturePart = posture != null ? posture * 0.2 : fitness * 0.2;
  return Math.round(base + posturePart);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body: ScoreInput = await req.json();
    const { client_id, enrollment_id } = body;

    if (!client_id) throw new Error('client_id is required');

    // Fetch last metric for delta calculations
    const { data: lastMetric } = await supabase
      .from('progress_metrics')
      .select('fitness_score, recovery_score, longevity_score, posture_score')
      .eq('client_id', client_id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    const prevFitness   = lastMetric?.fitness_score   ?? 50;
    const prevPosture   = lastMetric?.posture_score;

    // Compute new scores from today's check-in data
    let recoveryScore: number | undefined;
    let fitnessScore: number | undefined;
    let longevityScore: number | undefined;

    if (body.mood && body.energy && body.sleep_hrs != null && body.pain_level != null) {
      recoveryScore = computeRecoveryScore(body.mood, body.energy, body.sleep_hrs, body.pain_level);
      fitnessScore  = computeFitnessScore(prevFitness, body.energy, body.mood);
      longevityScore = computeLongevityScore(fitnessScore, recoveryScore, body.posture_score ?? prevPosture);
    }

    const { error } = await supabase.from('progress_metrics').insert({
      client_id,
      enrollment_id: enrollment_id ?? null,
      weight_kg:      body.weight_kg     ?? null,
      bmi:            body.bmi           ?? null,
      posture_score:  body.posture_score ?? null,
      fitness_score:  fitnessScore       ?? null,
      recovery_score: recoveryScore      ?? null,
      longevity_score: longevityScore    ?? null,
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, scores: { fitnessScore, recoveryScore, longevityScore } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
