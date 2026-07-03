import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getWeekStart } from '@/hooks/useManualLog';
import type { NutritionTrendPoint } from '@/hooks/useCoachClientOverview';

// ── Keys ─────────────────────────────────────────────────────────────────────
export const progressKeys = {
  bodyMetrics:   (uid: string) => ['progress', uid, 'body_metrics'] as const,
  latestMetrics: (uid: string) => ['progress', uid, 'body_metrics', 'latest'] as const,
  photos:        (uid: string) => ['progress', uid, 'photos'] as const,
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface BodyMetric {
  id: string;
  client_id: string;
  recorded_date: string;
  recorded_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  chest_cm: number | null;
  left_arm_cm: number | null;
  right_arm_cm: number | null;
  left_thigh_cm: number | null;
  right_thigh_cm: number | null;
  pushup_count: number | null;
  plank_seconds: number | null;
  squat_reps: number | null;
  notes: string | null;
}

export interface ProgressPhoto {
  id: string;
  client_id: string;
  uploaded_at: string;
  photo_date: string;
  photo_type: 'front' | 'side' | 'back' | 'custom';
  storage_path: string;
  week_number: number;
  phase: number;
  coach_reviewed: boolean;
  notes: string | null;
  // Runtime only — signed URL
  url?: string;
}

// ── Fetch body metrics history ─────────────────────────────────────────────
export function useBodyMetrics(limit = 12) {
  const { user } = useAuth();

  return useQuery({
    queryKey: progressKeys.bodyMetrics(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      // Fetch the most recent `limit` rows (descending), then flip to
      // ascending — otherwise ordering ascending-then-limiting would return
      // the OLDEST rows once a client has logged more weeks than `limit`,
      // silently dropping their current data from any chart built on this.
      const { data, error } = await supabase
        .from('body_metrics')
        .select('*')
        .eq('client_id', user!.id)
        .order('recorded_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return ((data ?? []) as BodyMetric[]).reverse();
    },
  });
}

// ── Self-scoped nutrition trend (calories/protein/fat, weekly avg) ──────────
// Same aggregation as the coach-side useClientNutritionTrend, just scoped to
// the logged-in client instead of taking a clientId param — feeds the same
// NutritionTrendChart component so the client sees the identical 3-line
// (calories/protein/fat) chart their coach already sees for them.
export function useMyNutritionTrend() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['progress', user?.id ?? '', 'nutrition_trend'],
    enabled: !!user?.id,
    queryFn: async () => {
      const currentWeek = getWeekStart();
      const cutoff = (() => {
        const d = new Date(currentWeek + 'T00:00:00');
        d.setDate(d.getDate() - 11 * 7);
        const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), da = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${da}`;
      })();

      const { data, error } = await supabase
        .from('manual_workout_logs')
        .select('week_start_date, calories, protein_g, fat_g')
        .eq('client_id', user!.id)
        .eq('item_type', 'food')
        .eq('completed', true)
        .gte('week_start_date', cutoff)
        .lte('week_start_date', currentWeek);
      if (error) throw error;

      const byWeek = new Map<string, { calories: number; protein: number; fat: number }>();
      (data ?? []).forEach((r: any) => {
        const wk = r.week_start_date;
        if (!byWeek.has(wk)) byWeek.set(wk, { calories: 0, protein: 0, fat: 0 });
        const agg = byWeek.get(wk)!;
        agg.calories += r.calories ?? 0;
        agg.protein  += r.protein_g ?? 0;
        agg.fat      += r.fat_g ?? 0;
      });

      return Array.from(byWeek.entries())
        .map(([weekStart, agg]) => ({
          weekStart,
          calories: Math.round(agg.calories / 6),
          protein: Math.round(agg.protein / 6),
          fat: Math.round(agg.fat / 6),
        }))
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart)) as NutritionTrendPoint[];
    },
  });
}

// ── Self-scoped "Oops" trend — only confession booth (meal_slot='craving') ──
export function useMyOopsTrend() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['progress', user?.id ?? '', 'oops_trend'],
    enabled: !!user?.id,
    queryFn: async () => {
      const currentWeek = getWeekStart();
      const cutoff = (() => {
        const d = new Date(currentWeek + 'T00:00:00');
        d.setDate(d.getDate() - 11 * 7);
        const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), da = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${da}`;
      })();

      const { data, error } = await supabase
        .from('manual_workout_logs')
        .select('week_start_date, calories, protein_g, fat_g')
        .eq('client_id', user!.id)
        .eq('item_type', 'food')
        .eq('meal_slot', 'craving')
        .gte('week_start_date', cutoff)
        .lte('week_start_date', currentWeek);
      if (error) throw error;

      const byWeek = new Map<string, { calories: number; protein: number; fat: number }>();
      (data ?? []).forEach((r: any) => {
        const wk = r.week_start_date;
        if (!byWeek.has(wk)) byWeek.set(wk, { calories: 0, protein: 0, fat: 0 });
        const agg = byWeek.get(wk)!;
        agg.calories += r.calories ?? 0;
        agg.protein  += r.protein_g ?? 0;
        agg.fat      += r.fat_g ?? 0;
      });

      return Array.from(byWeek.entries())
        .map(([weekStart, agg]) => ({
          weekStart,
          calories: Math.round(agg.calories / 6),
          protein:  Math.round(agg.protein / 6),
          fat:      Math.round(agg.fat / 6),
        }))
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart)) as NutritionTrendPoint[];
    },
  });
}

// ── Self-scoped supplement adherence (weekly % completed, for a bar chart) ─
export interface SupplementAdherencePoint { weekStart: string; pct: number; logged: number; completed: number }

export function useMySupplementAdherence() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['progress', user?.id ?? '', 'supplement_adherence'],
    enabled: !!user?.id,
    queryFn: async () => {
      const currentWeek = getWeekStart();
      const cutoff = (() => {
        const d = new Date(currentWeek + 'T00:00:00');
        d.setDate(d.getDate() - 11 * 7);
        const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), da = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${da}`;
      })();

      const { data, error } = await supabase
        .from('manual_workout_logs')
        .select('week_start_date, completed')
        .eq('client_id', user!.id)
        .eq('item_type', 'supplement')
        .gte('week_start_date', cutoff)
        .lte('week_start_date', currentWeek);
      if (error) throw error;

      const byWeek = new Map<string, { logged: number; completed: number }>();
      (data ?? []).forEach((r: any) => {
        const wk = r.week_start_date;
        if (!byWeek.has(wk)) byWeek.set(wk, { logged: 0, completed: 0 });
        const agg = byWeek.get(wk)!;
        agg.logged += 1;
        if (r.completed) agg.completed += 1;
      });

      return Array.from(byWeek.entries())
        .map(([weekStart, agg]) => ({
          weekStart,
          logged: agg.logged,
          completed: agg.completed,
          pct: agg.logged ? Math.round((agg.completed / agg.logged) * 100) : 0,
        }))
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart)) as SupplementAdherencePoint[];
    },
  });
}

// ── Fetch latest body metric ───────────────────────────────────────────────
export function useLatestBodyMetric() {
  const { user } = useAuth();

  return useQuery({
    queryKey: progressKeys.latestMetrics(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_metrics')
        .select('*')
        .eq('client_id', user!.id)
        .order('recorded_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as BodyMetric | null;
    },
  });
}

// ── Fetch body metric for a specific week (by week-start Monday date) ─────
export function useWeekBodyMetric(weekStart: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...progressKeys.bodyMetrics(user?.id ?? ''), 'week', weekStart],
    enabled: !!user?.id && !!weekStart,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_metrics')
        .select('*')
        .eq('client_id', user!.id)
        .eq('recorded_date', weekStart)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as BodyMetric | null;
    },
  });
}

// ── Save body metrics (upsert by date) ────────────────────────────────────
export function useSaveBodyMetrics() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<Omit<BodyMetric, 'id' | 'client_id' | 'recorded_at'>> & { recorded_date?: string }) => {
      const { recorded_date, ...rest } = payload;
      const date = recorded_date ?? new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('body_metrics')
        .upsert(
          { client_id: user!.id, recorded_date: date, ...rest },
          { onConflict: 'client_id,recorded_date' }
        )
        .select()
        .single();

      if (error) throw error;
      return data as BodyMetric;
    },
    onSuccess: () => {
      if (!user?.id) return;
      qc.invalidateQueries({ queryKey: progressKeys.bodyMetrics(user.id) });
      qc.invalidateQueries({ queryKey: progressKeys.latestMetrics(user.id) });
    },
  });
}

// ── Fetch progress photos ──────────────────────────────────────────────────
export function useProgressPhotos() {
  const { user } = useAuth();

  return useQuery({
    queryKey: progressKeys.photos(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('client_id', user!.id)
        .order('photo_date', { ascending: false });

      if (error) throw error;

      const photos = (data ?? []) as ProgressPhoto[];

      // Generate signed URLs for each photo
      const withUrls = await Promise.all(
        photos.map(async (photo) => {
          try {
            const { data: urlData } = await supabase.storage
              .from('progress-photos')
              .createSignedUrl(photo.storage_path, 3600); // 1 hour
            return { ...photo, url: urlData?.signedUrl };
          } catch {
            return photo;
          }
        })
      );

      return withUrls;
    },
  });
}

// ── Upload progress photo ──────────────────────────────────────────────────
export function useUploadProgressPhoto() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
  uri,
  photoType,
  weekNumber = 0,
  phase = 1,
  notes,
  photoDate,
}: {
  uri: string;
  photoType: 'front' | 'side' | 'back' | 'custom';
  weekNumber?: number;
  phase?: number;
  notes?: string;
  photoDate?: string; // yyyy-mm-dd — lets a client backfill a previous day/week, defaults to today
}) => {
  const today = photoDate ?? new Date().toISOString().split('T')[0];
  const ext = uri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const path = `${user!.id}/${today}_${photoType}_${Date.now()}.${ext}`;
  const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  // ✅ Use FormData — correct approach for React Native file uploads
  const formData = new FormData();
  formData.append('file', {
    uri,
    name: `photo.${ext}`,
    type: contentType,
  } as any);

  // Upload using fetch directly with Supabase storage URL
  const { data: { session } } = await supabase.auth.getSession();
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;

  const uploadResponse = await fetch(
    `${supabaseUrl}/storage/v1/object/progress-photos/${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        'x-upsert': 'true',
      },
      body: formData,
    }
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Upload failed: ${errorText}`);
  }

  // Save record to DB
  const { data, error: dbError } = await supabase
    .from('progress_photos')
    .insert({
      client_id: user!.id,
      photo_type: photoType,
      storage_path: path,
      photo_date: today,
      week_number: weekNumber,
      phase,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (dbError) throw dbError;
  return data as ProgressPhoto;
},
    onSuccess: () => {
      if (!user?.id) return;
      qc.invalidateQueries({ queryKey: progressKeys.photos(user.id) });
    },
  });
}

// ── Delete progress photo ───────────────────────────────────────────────────
export function useDeleteProgressPhoto() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (photo: { id: string; storage_path: string }) => {
      const { error: storageError } = await supabase.storage
        .from('progress-photos')
        .remove([photo.storage_path]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('progress_photos')
        .delete()
        .eq('id', photo.id);
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      if (!user?.id) return;
      qc.invalidateQueries({ queryKey: progressKeys.photos(user.id) });
    },
  });
}
