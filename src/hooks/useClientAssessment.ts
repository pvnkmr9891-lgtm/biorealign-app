import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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
