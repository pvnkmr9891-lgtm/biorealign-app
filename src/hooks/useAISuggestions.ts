import { useState } from 'react';
import { supabase } from '@/lib/supabase';

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
      const { data, error: invokeError } = await supabase.functions.invoke('ai-plan-suggestions', {
        body: { clientId, clientName },
      });

      if (invokeError) {
        // Edge functions return their JSON error body inside the FunctionsHttpError context
        let message = invokeError.message;
        try {
          const body = await (invokeError as any).context?.json?.();
          if (body?.error) message = body.error;
        } catch {}
        throw new Error(message);
      }

      setSuggestion(data.suggestion as AISuggestion);
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
