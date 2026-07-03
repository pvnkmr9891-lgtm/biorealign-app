import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { THEME } from '@/constants/theme';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Given a week_start_date (yyyy-mm-dd, a Monday) and day_number (1=Mon…6=Sat),
// return the actual calendar date as yyyy-mm-dd.
function logDateStr(weekStart: string, dayNumber: number): string {
  const [y, m, d] = weekStart.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + dayNumber - 1);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDowOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }

// ── Data hook ────────────────────────────────────────────────────────────────
// Returns, per supplement name: a map of date-string → 'green'|'red'
// green = completed, red = assigned but not completed

interface DayMark { completed: boolean }
interface SupplementCalendarData {
  name: string;
  dates: Record<string, DayMark>; // yyyy-mm-dd → {completed}
}

function useSupplementCalendarData(clientId: string) {
  return useQuery({
    queryKey: ['supplement_calendar', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      // Fetch all supplement logs for this client (no date range — covers all history)
      const { data, error } = await supabase
        .from('manual_workout_logs')
        .select('item_name, week_start_date, day_number, completed')
        .eq('client_id', clientId)
        .eq('item_type', 'supplement')
        .order('week_start_date', { ascending: true });
      if (error) throw error;

      // Group by supplement name
      const byName = new Map<string, Record<string, DayMark>>();
      for (const row of (data ?? []) as any[]) {
        if (!row.item_name || !row.week_start_date || row.day_number == null) continue;
        const name = row.item_name as string;
        const dateStr = logDateStr(row.week_start_date, row.day_number);
        if (!byName.has(name)) byName.set(name, {});
        const existing = byName.get(name)![dateStr];
        // A date is green if ANY log entry for that supplement+date is completed
        byName.get(name)![dateStr] = { completed: (existing?.completed || row.completed) };
      }

      return Array.from(byName.entries()).map(([name, dates]) => ({ name, dates })) as SupplementCalendarData[];
    },
    staleTime: 30_000,
  });
}

// ── Day cell ─────────────────────────────────────────────────────────────────

function DayCell({ date, mark, isToday }: {
  date: string;
  mark: DayMark | undefined;
  isToday: boolean;
}) {
  const day = Number(date.split('-')[2]);

  // No log for this date → gray (neutral / not scheduled)
  if (!mark) {
    return (
      <View style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
          borderWidth: isToday ? 1.5 : 0,
          borderColor: isToday ? THEME.colors.teal : 'transparent',
        }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{day}</Text>
        </View>
      </View>
    );
  }

  const bg = mark.completed ? '#22C55E' : '#EF4444';
  return (
    <View style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
        backgroundColor: bg,
        borderWidth: isToday ? 2 : 0,
        borderColor: isToday ? '#fff' : 'transparent',
      }}>
        <Text style={{ fontSize: 12, fontFamily: mark.completed ? THEME.fonts.sansMedium : THEME.fonts.sans, color: '#fff' }}>
          {mark.completed ? '✓' : day}
        </Text>
      </View>
    </View>
  );
}

// ── Single supplement calendar ────────────────────────────────────────────────

function OneSupplementCalendar({ data }: { data: SupplementCalendarData }) {
  const today = todayStr();
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const totalDays   = daysInMonth(year, month);
  const leadBlanks  = firstDowOfMonth(year, month);

  // Month stats
  const { assigned, completed } = useMemo(() => {
    const todayDate = new Date(today + 'T00:00:00');
    let a = 0, c = 0;
    for (let d = 1; d <= totalDays; d++) {
      const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const mark = data.dates[ds];
      const isPast = new Date(ds + 'T00:00:00') <= todayDate;
      if (mark && isPast) { a++; if (mark.completed) c++; }
    }
    return { assigned: a, completed: c };
  }, [data.dates, year, month, totalDays, today]);

  return (
    <View style={{
      backgroundColor: THEME.colors.surface2, borderRadius: 16,
      padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border,
    }}>
      {/* Month nav */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <TouchableOpacity onPress={prevMonth} hitSlop={12} style={{ padding: 6 }}>
          <Text style={{ fontSize: 20, color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <TouchableOpacity onPress={nextMonth} hitSlop={12} style={{ padding: 6 }}>
          <Text style={{ fontSize: 20, color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day-of-week header */}
      <View style={{ flexDirection: 'row', marginBottom: 2 }}>
        {DAY_LABELS.map(l => (
          <Text key={l} style={{
            width: '14.28%', textAlign: 'center',
            fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted,
            paddingVertical: 4,
          }}>{l}</Text>
        ))}
      </View>

      {/* Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: leadBlanks }).map((_, i) => (
          <View key={`b${i}`} style={{ width: '14.28%', aspectRatio: 1 }} />
        ))}
        {Array.from({ length: totalDays }).map((_, i) => {
          const day = i + 1;
          const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          return (
            <DayCell key={ds} date={ds} mark={data.dates[ds]} isToday={ds === today} />
          );
        })}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E' }} />
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Completed</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444' }} />
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Missed</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: THEME.colors.border }} />
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>No entry</Text>
        </View>
      </View>

      {/* Stats */}
      {assigned > 0 && (
        <View style={{
          flexDirection: 'row', marginTop: 14,
          backgroundColor: THEME.colors.background,
          borderRadius: 10, overflow: 'hidden',
          borderWidth: 0.5, borderColor: THEME.colors.border,
        }}>
          {[
            { label: 'Completed', value: completed,                                   color: '#22C55E' },
            { label: 'Missed',    value: assigned - completed,                        color: '#EF4444' },
            { label: 'Rate',      value: `${Math.round((completed/assigned)*100)}%`,  color: THEME.colors.textPrimary },
          ].map((s, i) => (
            <View key={s.label} style={{
              flex: 1, alignItems: 'center', paddingVertical: 10,
              borderLeftWidth: i > 0 ? 0.5 : 0, borderColor: THEME.colors.border,
            }}>
              <Text style={{ fontSize: 18, fontFamily: THEME.fonts.sansMedium, color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main component (exported) ─────────────────────────────────────────────────
// clientId: logged-in client's own ID (self-view) or a specific client's ID (coach/admin)

interface Props { clientId: string }

export function SupplementCalendarTracker({ clientId }: Props) {
  const { data: supplements = [], isLoading } = useSupplementCalendarData(clientId);
  const [idx, setIdx] = useState(0);

  if (isLoading) {
    return (
      <View style={{ paddingVertical: 32, alignItems: 'center' }}>
        <ActivityIndicator color={THEME.colors.teal} />
      </View>
    );
  }

  if (supplements.length === 0) {
    return (
      <View style={{ paddingVertical: 28, alignItems: 'center', paddingHorizontal: 8 }}>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center' }}>
          No supplement logs yet. Add supplements in the workout section to track them here.
        </Text>
      </View>
    );
  }

  const current = supplements[Math.min(idx, supplements.length - 1)];

  return (
    <View>
      {/* Supplement switcher — pill tabs if few, arrows if many */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        {/* Prev arrow */}
        <TouchableOpacity
          onPress={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}
          style={{ padding: 6, opacity: idx === 0 ? 0.3 : 1 }}
          hitSlop={10}
        >
          <Text style={{ fontSize: 22, color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium }}>‹</Text>
        </TouchableOpacity>

        {/* Name + counter */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }} numberOfLines={1}>
            {current.name}
          </Text>
          {supplements.length > 1 && (
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
              {idx + 1} of {supplements.length}
            </Text>
          )}
        </View>

        {/* Next arrow */}
        <TouchableOpacity
          onPress={() => setIdx(i => Math.min(supplements.length - 1, i + 1))}
          disabled={idx === supplements.length - 1}
          style={{ padding: 6, opacity: idx === supplements.length - 1 ? 0.3 : 1 }}
          hitSlop={10}
        >
          <Text style={{ fontSize: 22, color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium }}>›</Text>
        </TouchableOpacity>
      </View>

      <OneSupplementCalendar key={current.name} data={current} />

      {/* Dot navigation if multiple supplements */}
      {supplements.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14 }}>
          {supplements.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => setIdx(i)} hitSlop={6}>
              <View style={{
                width: i === idx ? 18 : 6, height: 6, borderRadius: 3,
                backgroundColor: i === idx ? THEME.colors.teal : THEME.colors.border,
              }} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
