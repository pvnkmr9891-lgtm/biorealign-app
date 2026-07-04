import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { THEME } from '@/constants/theme';
import {
  SupplementSchedule,
  getDayState,
  DayState,
  useAdherenceMarks,
  useToggleAdherenceMark,
} from '@/hooks/useSupplementSchedule';

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOSE_UNIT_LABELS: Record<string, string> = {
  grams: 'g', scoops: 'scoop(s)', pills: 'pill(s)', capsules: 'capsule(s)',
  mg: 'mg', ml: 'ml', tbsp: 'tbsp',
};

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthStr(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

function padDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// â”€â”€ Day cell â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DayCell({
  dateStr,
  state,
  isToday,
  onPress,
}: {
  dateStr: string;
  state: DayState;
  isToday: boolean;
  onPress: () => void;
}) {
  const day = Number(dateStr.split('-')[2]);

  const bg =
    state === 'taken'  ? THEME.colors.teal :
    state === 'missed' ? '#EF4444' :
    'transparent';

  const borderColor =
    isToday            ? (THEME.colors.teal) :
    state === 'missed' ? '#EF444430' :
    THEME.colors.border;

  const textColor =
    state === 'taken'  ? '#fff' :
    state === 'missed' ? '#EF4444' :
    THEME.colors.textSecondary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        width: '14.28%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
      }}
    >
      <View style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        borderWidth: state === 'taken' ? 0 : isToday ? 1.5 : state === 'missed' ? 1 : 0,
        borderColor,
      }}>
        {state === 'taken' ? (
          <Text style={{ color: '#fff', fontSize: 13, fontFamily: THEME.fonts.sansMedium }}>âœ“</Text>
        ) : (
          <Text style={{ color: textColor, fontSize: 13, fontFamily: THEME.fonts.sans }}>{day}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// â”€â”€ Calendar grid for a single supplement schedule â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface SupplementCalendarProps {
  schedule: SupplementSchedule;
  /** If provided (coach/admin context), pass pre-fetched marks rather than
   *  fetching inside this component. Self-scoped client view omits this. */
  externalMarks?: Record<string, boolean>;
  /** clientId needed when toggle is called from coach/admin context */
  clientId?: string;
  readOnly?: boolean;
}

export function SupplementCalendar({
  schedule,
  externalMarks,
  clientId,
  readOnly = false,
}: SupplementCalendarProps) {
  const today = todayStr();
  const [year, setYear]   = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());

  const mStr = monthStr(year, month);
  const { data: fetchedMarks, isLoading } = useAdherenceMarks(
    externalMarks !== undefined ? '' : schedule.id,
    mStr
  );
  const marks = externalMarks ?? (fetchedMarks ?? {});

  const toggle = useToggleAdherenceMark();

  // Build calendar grid: leading empty slots + day cells
  const { leadingBlanks, days } = useMemo(() => {
    const leading = firstDayOfWeek(year, month);
    const total   = daysInMonth(year, month);
    return { leadingBlanks: leading, days: total };
  }, [year, month]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function handleDayPress(dateStr: string) {
    if (readOnly) return;
    const state = getDayState(schedule, dateStr, today, marks);
    // Only allow toggling past + today, not future
    if (dateStr > today) return;
    toggle.mutate({
      scheduleId: schedule.id,
      clientId,
      date: dateStr,
      currentlyTaken: state === 'taken',
    });
  }

  // Summary stats for this month
  const { taken, missed, scheduled } = useMemo(() => {
    let t = 0, ms = 0, sc = 0;
    for (let d = 1; d <= days; d++) {
      const ds = padDate(year, month, d);
      const state = getDayState(schedule, ds, today, marks);
      if (state === 'taken')  { t++;  sc++; }
      if (state === 'missed') { ms++; sc++; }
    }
    return { taken: t, missed: ms, scheduled: sc };
  }, [days, year, month, schedule, today, marks]);

  const doseLabel = schedule.dose_amount
    ? `${schedule.dose_amount} ${DOSE_UNIT_LABELS[schedule.dose_unit ?? ''] ?? schedule.dose_unit ?? ''} per day`
    : null;

  return (
    <View>
      {/* Month nav */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <TouchableOpacity onPress={prevMonth} hitSlop={12} style={{ padding: 6 }}>
          <Text style={{ color: THEME.colors.teal, fontSize: 18, fontFamily: THEME.fonts.sansMedium }}>â€¹</Text>
        </TouchableOpacity>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 15 }}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <TouchableOpacity onPress={nextMonth} hitSlop={12} style={{ padding: 6 }}>
          <Text style={{ color: THEME.colors.teal, fontSize: 18, fontFamily: THEME.fonts.sansMedium }}>â€º</Text>
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {DAY_LABELS.map(dl => (
          <Text key={dl} style={{
            width: '14.28%', textAlign: 'center',
            fontSize: 11, fontFamily: THEME.fonts.sansMedium,
            color: THEME.colors.textMuted, paddingVertical: 4,
          }}>{dl}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      {isLoading && externalMarks === undefined ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginVertical: 40 }} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {/* Leading blank cells */}
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <View key={`blank-${i}`} style={{ width: '14.28%', aspectRatio: 1 }} />
          ))}
          {/* Day cells */}
          {Array.from({ length: days }).map((_, i) => {
            const dayNum = i + 1;
            const ds = padDate(year, month, dayNum);
            const state = getDayState(schedule, ds, today, marks);
            return (
              <DayCell
                key={ds}
                dateStr={ds}
                state={state}
                isToday={ds === today}
                onPress={() => handleDayPress(ds)}
              />
            );
          })}
        </View>
      )}

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 14, flexWrap: 'wrap' }}>
        {[
          { color: THEME.colors.teal, label: 'Taken' },
          { color: '#EF4444', label: 'Missed' },
          { color: THEME.colors.border, label: 'Not scheduled', border: true },
        ].map(l => (
          <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{
              width: 12, height: 12, borderRadius: 6,
              backgroundColor: l.border ? 'transparent' : l.color,
              borderWidth: l.border ? 1 : 0,
              borderColor: l.color,
            }} />
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{l.label}</Text>
          </View>
        ))}
      </View>

      {/* Stats row */}
      <View style={{
        flexDirection: 'row', marginTop: 16,
        backgroundColor: THEME.colors.background,
        borderRadius: 12, overflow: 'hidden',
        borderWidth: 0.5, borderColor: THEME.colors.border,
      }}>
        {[
          { label: 'Taken',     value: taken,                         color: THEME.colors.teal },
          { label: 'Missed',    value: missed,                        color: '#EF4444' },
          { label: 'Rate',      value: scheduled ? `${Math.round((taken / scheduled) * 100)}%` : 'â€”', color: THEME.colors.textPrimary },
        ].map((s, i) => (
          <View key={s.label} style={{
            flex: 1, alignItems: 'center', paddingVertical: 12,
            borderLeftWidth: i > 0 ? 0.5 : 0, borderColor: THEME.colors.border,
          }}>
            <Text style={{ fontSize: 20, fontFamily: THEME.fonts.sansMedium, color: s.color }}>{s.value}</Text>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Active dose */}
      {doseLabel && (
        <View style={{
          marginTop: 12, paddingVertical: 10, paddingHorizontal: 14,
          backgroundColor: `${THEME.colors.teal}15`,
          borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8,
        }}>
          <Text style={{ fontSize: 12, color: THEME.colors.teal }}>ðŸ’Š</Text>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary }}>
            Active dose: <Text style={{ fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{doseLabel}</Text>
          </Text>
        </View>
      )}

      {!readOnly && (
        <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', marginTop: 10 }}>
          Tap a past or today's date to toggle it as taken
        </Text>
      )}
    </View>
  );
}

