import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { THEME } from '@/constants/theme';

const SUCCESS = THEME.colors.success ?? '#4CC986';

// "1st", "2nd", "3rd", "4th", "5th"...
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// A horizontal strip of week chips, color-coded so it's obvious at a glance
// which weeks have data saved and which don't — used for body measurements
// on both client and coach sides. Green = saved, outlined grey = missing.
// Labeled as "Apr / (1st week)" rather than a raw date ("20 Apr") — a bare
// date reads like a single day, not "the Monday-start week containing this
// date", which was confusing next to the "6 Jul – 12 Jul" range above it.
export function WeekStatusStrip({
  weeks, loggedWeeks, selectedWeek, onSelect, accentColor,
}: {
  weeks: string[]; // week-start (Monday) date strings, any order
  loggedWeeks: Set<string>;
  selectedWeek?: string;
  onSelect: (weekStart: string) => void;
  accentColor?: string;
}) {
  const accent = accentColor ?? THEME.colors.teal;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {weeks.map((wk) => {
        const isLogged = loggedWeeks.has(wk);
        const isSelected = wk === selectedWeek;
        const d = new Date(wk + 'T00:00:00');
        const monthLabel = d.toLocaleDateString('en-IN', { month: 'short' });
        const weekOfMonth = Math.ceil(d.getDate() / 7);
        const textColor = isSelected ? THEME.colors.background : isLogged ? SUCCESS : THEME.colors.textMuted;
        return (
          <TouchableOpacity
            key={wk}
            onPress={() => onSelect(wk)}
            activeOpacity={0.8}
            style={{
              alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11, minWidth: 64,
              backgroundColor: isSelected ? accent : isLogged ? `${SUCCESS}15` : THEME.colors.surface2,
              borderWidth: isSelected ? 0 : 1,
              borderColor: isSelected ? accent : isLogged ? `${SUCCESS}40` : THEME.colors.border,
            }}
          >
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: textColor }}>
              {monthLabel}
            </Text>
            <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sans, color: textColor, opacity: 0.75, marginTop: 1 }}>
              ({ordinal(weekOfMonth)} week)
            </Text>
            <View style={{ width: 5, height: 5, borderRadius: 2.5, marginTop: 4, backgroundColor: isSelected ? THEME.colors.background : isLogged ? SUCCESS : THEME.colors.surface3 }} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
