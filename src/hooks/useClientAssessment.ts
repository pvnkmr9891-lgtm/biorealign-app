import { useQuery } from '@tanstack/react-query';
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
