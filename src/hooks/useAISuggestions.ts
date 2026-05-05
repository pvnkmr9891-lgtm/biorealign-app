import { useState } from 'react';
import { supabase } from '@/lib/supabase';
const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
console.log('[AI] API key present:', apiKey.length > 0, 'starts with:', apiKey.slice(0, 10));
// ── Types ─────────────────────────────────────────────────────────────────────
export interface AISuggestedItem {
  title: string;
  item_type: 'exercise' | 'meal_guide' | 'protocol' | 'habit' | 'note';
  description: string;
  sets?: number;
  reps?: string;
  duration_minutes?: number;
  day_of_week: string[];
  coach_note: string;
}

export interface AISuggestedTrack {
  track_type: 'workout' | 'nutrition' | 'recovery' | 'lifestyle' | 'posture_rehab' | 'mindset';
  title: string;
  rationale: string;
  items: AISuggestedItem[];
}

export interface AISuggestion {
  plan_title: string;
  plan_overview: string;
  red_flags: string[];
  priority_focus: string;
  tracks: AISuggestedTrack[];
  nutrition_notes: string;
  phase_1_goal: string;
}



// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAISuggestions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);

  const generate = async (clientId: string, clientName: string) => {
    setIsLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      // 1. Fetch client assessment
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('client_id', clientId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (assessmentError) throw assessmentError;

      if (!assessment) {
        setError('No assessment found for this client. Ask them to complete the onboarding assessment first.');
        setIsLoading(false);
        return;
      }

      // 2. Build a focused prompt from assessment data
      const prompt = buildPrompt(clientName, assessment);

      // 3. Call Anthropic API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
          'anthropic-version': '2023-06-01',
          },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 4000,
          system: `You are an elite health and body transformation coach building personalised plans for BioRealign clients. 
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
Suggest 2-4 tracks maximum. Each track should have 2-4 items. Be specific and practical.`,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API error: ${response.status} — ${errText}`);
      }

      const data = await response.json();
      const rawText = data.content?.[0]?.text ?? '';

      console.log('[AI] Raw response:', rawText.slice(0, 200));

      // Extract JSON from response — find first { to last }
      const firstBrace = rawText.indexOf('{');
      const lastBrace  = rawText.lastIndexOf('}');

      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error('No JSON found in AI response');
      }

      const jsonStr = rawText.slice(firstBrace, lastBrace + 1);
      const parsed: AISuggestion = JSON.parse(jsonStr);
      setSuggestion(parsed);

    } catch (err: any) {
      console.error('[AI Suggestions] error:', err);
      setError(err?.message ?? 'Failed to generate suggestions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setSuggestion(null);
    setError(null);
  };

  return { generate, isLoading, error, suggestion, reset };
}

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(clientName: string, a: any): string {
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
