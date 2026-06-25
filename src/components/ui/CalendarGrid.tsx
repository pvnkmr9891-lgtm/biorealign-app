import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { THEME } from '@/constants/theme';

function toDateStr(d: Date) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const WEEKDAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// A dependency-free month calendar — no native date-picker is installed in
// this project, and adding one mid-build would need a native rebuild.
// Plain Views/Text only.
export function CalendarGrid({
  selectedDate, onSelect, markedDates, accentColor,
}: {
  selectedDate?: string | null;
  onSelect: (date: string) => void;
  markedDates?: Set<string>; // dates (yyyy-mm-dd) to show a dot under, e.g. "has a photo"
  accentColor?: string;
}) {
  const color = accentColor ?? THEME.colors.teal;
  const todayStr = toDateStr(new Date());
  const initial = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
  const [visibleMonth, setVisibleMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const shiftMonth = (delta: number) => setVisibleMonth(new Date(year, month + delta, 1));
  const isFutureMonth = year > new Date().getFullYear() || (year === new Date().getFullYear() && month >= new Date().getMonth() + 1);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <TouchableOpacity onPress={() => shiftMonth(-1)} style={{ padding: 8 }}>
          <Text style={{ fontSize: 18, color: THEME.colors.textMuted }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
          {visibleMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => shiftMonth(1)} disabled={isFutureMonth} style={{ padding: 8, opacity: isFutureMonth ? 0.3 : 1 }}>
          <Text style={{ fontSize: 18, color: THEME.colors.textMuted }}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {WEEKDAY_HEADERS.map((w, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>{w}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day, i) => {
          if (day == null) return <View key={i} style={{ width: '14.28%', aspectRatio: 1 }} />;
          const dateStr = toDateStr(new Date(year, month, day));
          const isFuture = dateStr > todayStr;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const isMarked = markedDates?.has(dateStr);

          return (
            <TouchableOpacity
              key={i}
              disabled={isFuture}
              onPress={() => onSelect(dateStr)}
              style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <View style={{
                width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                backgroundColor: isSelected ? color : 'transparent',
                borderWidth: isToday && !isSelected ? 1 : 0, borderColor: color,
              }}>
                <Text style={{
                  fontSize: 12.5, fontFamily: isSelected ? THEME.fonts.sansMedium : THEME.fonts.sans,
                  color: isSelected ? THEME.colors.background : isFuture ? THEME.colors.textMuted : THEME.colors.textPrimary,
                  opacity: isFuture ? 0.35 : 1,
                }}>
                  {day}
                </Text>
              </View>
              {isMarked && !isSelected && (
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, position: 'absolute', bottom: 2 }} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
