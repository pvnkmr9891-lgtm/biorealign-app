import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ScheduleType = 'daily' | 'weekdays' | 'date_range';
export type DoseUnit = 'grams' | 'scoops' | 'pills' | 'capsules' | 'mg' | 'ml' | 'tbsp';

export interface SupplementSchedule {
  id: string;
  client_id: string;
  supplement_name: string;
  supplement_catalog_id: string | null;
  schedule_type: ScheduleType;
  weekdays: number[];      // 0=Sun â€¦ 6=Sat
  dose_amount: number | null;
  dose_unit: DoseUnit | null;
  start_date: string;      // yyyy-mm-dd
  end_date: string | null; // yyyy-mm-dd, null = ongoing
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface AdherenceMark {
  id: string;
  schedule_id: string;
  client_id: string;
  date: string;            // yyyy-mm-dd
  marked_taken: boolean;
  marked_at: string;
  source: 'manual_tick' | 'detailed_log_entry';
}

// â”€â”€ Keys â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const scheduleKeys = {
  list:   (clientId: string) => ['supplement_schedules', clientId] as const,
  marks:  (scheduleId: string, month: string) => ['adherence_marks', scheduleId, month] as const,
  allMarksForClient: (clientId: string, month: string) => ['adherence_marks_client', clientId, month] as const,
};

// â”€â”€ Helper: is a given date expected for this schedule? â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns true if `dateStr` (yyyy-mm-dd) falls within the schedule's active
// date range AND matches its recurrence pattern (daily / specific weekdays).
export function isScheduledDate(schedule: SupplementSchedule, dateStr: string): boolean {
  if (dateStr < schedule.start_date) return false;
  if (schedule.end_date && dateStr > schedule.end_date) return false;
  if (schedule.schedule_type === 'weekdays' && schedule.weekdays.length > 0) {
    // getDay() on a local-midnight date parsed from yyyy-mm-dd
    const [y, m, d] = dateStr.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay(); // 0=Sun â€¦ 6=Sat
    return schedule.weekdays.includes(dow);
  }
  return true; // 'daily' or 'date_range' with no weekday filter
}

// â”€â”€ Day state (the core three-state logic) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type DayState = 'taken' | 'missed' | 'na';

export function getDayState(
  schedule: SupplementSchedule,
  dateStr: string,       // yyyy-mm-dd
  today: string,         // yyyy-mm-dd â€” caller passes this so the component can control "now"
  marks: Record<string, boolean> // date â†’ marked_taken
): DayState {
  const expected = isScheduledDate(schedule, dateStr);
  if (!expected) return 'na';

  const taken = marks[dateStr] === true;
  if (taken) return 'taken';

  // Only mark as missed once the day has fully passed (strictly before today)
  if (dateStr < today) return 'missed';

  return 'na'; // today or future scheduled day â€” pending, not red
}

// â”€â”€ Fetch schedules for a client â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function useSupplementSchedules(clientId?: string) {
  const { user } = useAuth();
  const id = clientId ?? user?.id ?? '';

  return useQuery({
    queryKey: scheduleKeys.list(id),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplement_schedules')
        .select('*')
        .eq('client_id', id)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SupplementSchedule[];
    },
  });
}

// â”€â”€ Fetch adherence marks for a schedule within a month â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function useAdherenceMarks(scheduleId: string, monthStr: string) {
  // monthStr: 'yyyy-mm' â€” we query the whole calendar month
  const monthStart = `${monthStr}-01`;
  const [y, m] = monthStr.split('-').map(Number);
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  const monthEnd = `${nextMonth}-01`;

  return useQuery({
    queryKey: scheduleKeys.marks(scheduleId, monthStr),
    enabled: !!scheduleId && !!monthStr,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplement_adherence_marks')
        .select('date, marked_taken')
        .eq('schedule_id', scheduleId)
        .gte('date', monthStart)
        .lt('date', monthEnd);
      if (error) throw error;
      const map: Record<string, boolean> = {};
      (data ?? []).forEach((r: any) => { map[r.date] = r.marked_taken; });
      return map;
    },
  });
}

// â”€â”€ Fetch ALL adherence marks for a client across all their schedules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Used by the coach/admin view so we can pass the right marks to the right schedule.
export function useClientAllAdherenceMarks(clientId: string, monthStr: string) {
  const monthStart = `${monthStr}-01`;
  const [y, m] = monthStr.split('-').map(Number);
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  const monthEnd = `${nextMonth}-01`;

  return useQuery({
    queryKey: scheduleKeys.allMarksForClient(clientId, monthStr),
    enabled: !!clientId && !!monthStr,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplement_adherence_marks')
        .select('schedule_id, date, marked_taken')
        .eq('client_id', clientId)
        .gte('date', monthStart)
        .lt('date', monthEnd);
      if (error) throw error;
      // Map: scheduleId â†’ date â†’ marked_taken
      const map: Record<string, Record<string, boolean>> = {};
      (data ?? []).forEach((r: any) => {
        if (!map[r.schedule_id]) map[r.schedule_id] = {};
        map[r.schedule_id][r.date] = r.marked_taken;
      });
      return map;
    },
  });
}

// â”€â”€ Toggle a day's taken state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function useToggleAdherenceMark() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scheduleId,
      clientId,
      date,
      currentlyTaken,
    }: {
      scheduleId: string;
      clientId?: string;
      date: string;
      currentlyTaken: boolean;
    }) => {
      const uid = clientId ?? user!.id;

      if (currentlyTaken) {
        // Un-mark: delete the row
        const { error } = await supabase
          .from('supplement_adherence_marks')
          .delete()
          .eq('schedule_id', scheduleId)
          .eq('date', date);
        if (error) throw error;
      } else {
        // Mark taken: upsert
        const { error } = await supabase
          .from('supplement_adherence_marks')
          .upsert(
            { schedule_id: scheduleId, client_id: uid, date, marked_taken: true, source: 'manual_tick' },
            { onConflict: 'schedule_id,date' }
          );
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      const month = vars.date.substring(0, 7);
      qc.invalidateQueries({ queryKey: scheduleKeys.marks(vars.scheduleId, month) });
      const uid = vars.clientId ?? user?.id ?? '';
      qc.invalidateQueries({ queryKey: scheduleKeys.allMarksForClient(uid, month) });
    },
  });
}

// â”€â”€ Create a new schedule â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function useCreateSupplementSchedule() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      clientId?: string;
      supplement_name: string;
      supplement_catalog_id?: string | null;
      schedule_type: ScheduleType;
      weekdays?: number[];
      dose_amount?: number | null;
      dose_unit?: DoseUnit | null;
      start_date: string;
      end_date?: string | null;
    }) => {
      const clientId = payload.clientId ?? user!.id;
      const { error, data } = await supabase
        .from('supplement_schedules')
        .insert({
          client_id: clientId,
          supplement_name: payload.supplement_name,
          supplement_catalog_id: payload.supplement_catalog_id ?? null,
          schedule_type: payload.schedule_type,
          weekdays: payload.weekdays ?? [],
          dose_amount: payload.dose_amount ?? null,
          dose_unit: payload.dose_unit ?? null,
          start_date: payload.start_date,
          end_date: payload.end_date ?? null,
          is_active: true,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as SupplementSchedule;
    },
    onSuccess: (_d, vars) => {
      const clientId = vars.clientId ?? user?.id ?? '';
      qc.invalidateQueries({ queryKey: scheduleKeys.list(clientId) });
    },
  });
}

// â”€â”€ Deactivate / end a schedule â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function useEndSupplementSchedule() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clientId, endDate }: { id: string; clientId?: string; endDate?: string }) => {
      const { error } = await supabase
        .from('supplement_schedules')
        .update({ is_active: false, end_date: endDate ?? new Date().toISOString().split('T')[0] })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      const clientId = vars.clientId ?? user?.id ?? '';
      qc.invalidateQueries({ queryKey: scheduleKeys.list(clientId) });
    },
  });
}

