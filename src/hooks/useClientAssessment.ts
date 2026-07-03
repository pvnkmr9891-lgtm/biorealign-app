import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// For coaches viewing a client
export function useClientAssessment(clientId: string) {
  return useQuery({
    queryKey: ['coach', 'assessment', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('client_id', clientId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

// Coach/admin correction of a client's general assessment row. Only the flat
// typed columns (occupation_type, height_cm, etc. — see ClientProfileView's
// GeneralAssessmentSection) are ever passed in `payload`; the original
// `answers`/`program_key` jsonb blob from onboarding is left untouched.
export function useUpdateClientAssessment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, payload }: { clientId: string; payload: Record<string, any> }) => {
      const { error } = await supabase
        .from('assessments')
        .update(payload)
        .eq('client_id', clientId);
      if (error) throw error;
    },
    onSuccess: (_d, { clientId }) => {
      qc.invalidateQueries({ queryKey: ['coach', 'assessment', clientId] });
      qc.invalidateQueries({ queryKey: ['my_assessment', clientId] });
    },
  });
}

// For clients viewing their own assessment
export function useMyAssessment() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my_assessment', user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('client_id', user!.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Record<string, any> | null;
    },
  });
}
