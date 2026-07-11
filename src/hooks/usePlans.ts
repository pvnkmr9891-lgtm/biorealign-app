import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Plan, PlanTrack, PlanItem } from '@/types';
import { toLocalDateStr } from '@/lib/dateHelpers';

export const planKeys = {
  all:           ['plans'] as const,
  clientPlan:    (clientId: string) => ['plans', 'client', clientId] as const,
  coachPlans:    (coachId: string)  => ['plans', 'coach', coachId] as const,
  planDetail:    (planId: string)   => ['plans', 'detail', planId] as const,
  todayItems:    (clientId: string) => ['plans', 'today', clientId] as const,
};

export function useClientPlan() {
  const { user } = useAuth();

  return useQuery({
    queryKey: planKeys.clientPlan(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: plans, error } = await supabase
        .from('plans')
        .select(`
          *,
          plan_tracks (
            *,
            plan_items ( * )
          )
        `)
        .eq('client_id', user!.id)
        .eq('status', 'active')
        .order('published_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      console.log('[ClientPlan] count:', plans?.length, 'title:', plans?.[0]?.title);

      const plan = plans?.[0] ?? null;
      return plan as (Plan & { plan_tracks: (PlanTrack & { plan_items: PlanItem[] })[] }) | null;
    },
  });
}

export function useTodayPlanItems() {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return useQuery({
    queryKey: planKeys.todayItems(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: todayPlans } = await supabase
        .from('plans')
        .select('id, current_phase')
        .eq('client_id', user!.id)
        .eq('status', 'active')
        .order('published_at', { ascending: false })
        .limit(1);

      const plan = todayPlans?.[0] ?? null;
      if (!plan) return [];

      const { data: tracks } = await supabase
        .from('plan_tracks')
        .select('id, track_type, title')
        .eq('plan_id', plan.id)
        .eq('is_active', true);

      if (!tracks?.length) return [];

      const trackIds = tracks.map(t => t.id);

      const { data: items, error } = await supabase
        .from('plan_items')
        .select('*')
        .in('track_id', trackIds)
        .eq('phase', plan.current_phase)
        .contains('day_of_week', [today])
        .order('sort_order');

      if (error) throw error;

      const todayStr = toLocalDateStr(new Date());
      const { data: completions } = await supabase
        .from('plan_item_completions')
        .select('plan_item_id')
        .eq('client_id', user!.id)
        .eq('completed_date', todayStr);

      const completedIds = new Set(completions?.map(c => c.plan_item_id) ?? []);

      return (items ?? []).map(item => ({
        ...item,
        is_completed: completedIds.has(item.id),
        track: tracks.find(t => t.id === item.track_id),
      }));
    },
  });
}

export function useToggleItemComplete() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) => {
      const todayStr = toLocalDateStr(new Date());
      if (isCompleted) {
        await supabase.from('plan_item_completions').delete()
          .eq('plan_item_id', itemId).eq('client_id', user!.id).eq('completed_date', todayStr);
      } else {
        await supabase.from('plan_item_completions').upsert({
          plan_item_id: itemId, client_id: user!.id, completed_date: todayStr,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: planKeys.todayItems(user?.id ?? '') });
    },
  });
}

export function useClientPlansForCoach(clientId: string) {
  return useQuery({
    queryKey: planKeys.clientPlan(clientId),
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans').select('*').eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Plan[];
    },
  });
}

export function usePlanDetail(planId: string) {
  return useQuery({
    queryKey: planKeys.planDetail(planId),
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select(`*, plan_tracks (*, plan_items ( * ))`)
        .eq('id', planId)
        .single();
      if (error) throw error;
      if (data?.plan_tracks) {
        data.plan_tracks.sort((a: any, b: any) => a.sort_order - b.sort_order);
        data.plan_tracks.forEach((track: any) => {
          if (track.plan_items) {
            track.plan_items.sort((a: any, b: any) => a.sort_order - b.sort_order);
          }
        });
      }
      return data;
    },
  });
}

export function useCreatePlan() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      client_id: string; title: string; coach_overview?: string;
      total_phases?: number; phase_duration_weeks?: number; start_date?: string;
    }) => {
      const { data, error } = await supabase.from('plans')
        .insert({ ...payload, coach_id: user!.id, status: 'draft' })
        .select().single();
      if (error) throw error;
      return data as Plan;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: planKeys.clientPlan(vars.client_id) });
    },
  });
}

export function useAddTrack() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      plan_id: string; track_type: string; title: string;
      description?: string; sort_order: number;
    }) => {
      const { data, error } = await supabase.from('plan_tracks').insert(payload).select().single();
      if (error) throw error;
      return data as PlanTrack;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: planKeys.planDetail(data.plan_id) });
    },
  });
}

export function useAddPlanItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      track_id: string; plan_id: string; title: string; item_type: string;
      phase: number; week_number: number; day_of_week: string[];
      description?: string; duration_minutes?: number; sets?: number;
      reps?: string; rest_seconds?: number; coach_note?: string; sort_order: number;
    }) => {
      const { plan_id, ...insertPayload } = payload;
      const { data, error } = await supabase.from('plan_items').insert(insertPayload).select().single();
      if (error) throw error;
      return { ...data, plan_id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: planKeys.planDetail(data.plan_id) });
    },
  });
}

export function useDeletePlanItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, planId }: { itemId: string; planId: string }) => {
      const { error } = await supabase.from('plan_items').delete().eq('id', itemId);
      if (error) throw error;
      return planId;
    },
    onSuccess: (planId) => {
      qc.invalidateQueries({ queryKey: planKeys.planDetail(planId) });
    },
  });
}

export function usePublishPlan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, clientId }: { planId: string; clientId: string }) => {
      const { error } = await supabase.from('plans')
        .update({ status: 'active', published_at: new Date().toISOString() })
        .eq('id', planId);
      if (error) throw error;

      // A client has exactly one live plan — retire any other still-active
      // plan, otherwise stale "active" rows accumulate and pollute the admin
      // funnel / coach views (the client screen only ever reads the latest
      // published one, so the older row would just rot silently).
      const { error: archiveErr } = await supabase.from('plans')
        .update({ status: 'archived' })
        .eq('client_id', clientId)
        .eq('status', 'active')
        .neq('id', planId);
      if (archiveErr) throw archiveErr;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: planKeys.planDetail(vars.planId) });
      qc.invalidateQueries({ queryKey: planKeys.clientPlan(vars.clientId) });
    },
  });
}

export function useDeleteTrack() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ trackId, planId }: { trackId: string; planId: string }) => {
      const { error } = await supabase.from('plan_tracks').delete().eq('id', trackId);
      if (error) throw error;
      return planId;
    },
    onSuccess: (planId) => {
      qc.invalidateQueries({ queryKey: planKeys.planDetail(planId) });
    },
  });
}
