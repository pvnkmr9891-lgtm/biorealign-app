import { View, Text } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { THEME } from '@/constants/theme';
import type { CheckinVitalRow } from '@/hooks/useCoachClientOverview';

// 30-day sparkline row per check-in vital (pain, sleep, mood, energy) with a
// 7-day-vs-prior trend arrow. Trend direction is colored by whether the move
// is *clinically* good: pain trending down is good; everything else up is good.

type VitalKey = 'pain_level' | 'sleep_hrs' | 'mood' | 'energy';

const VITALS: { key: VitalKey; label: string; icon: string; max: number; unit: string; downIsGood: boolean }[] = [
  { key: 'pain_level', label: 'Pain',   icon: '🩹', max: 10, unit: '/10', downIsGood: true },
  { key: 'sleep_hrs',  label: 'Sleep',  icon: '😴', max: 12, unit: 'h',   downIsGood: false },
  { key: 'mood',       label: 'Mood',   icon: '🙂', max: 10, unit: '/10', downIsGood: false },
  { key: 'energy',     label: 'Energy', icon: '⚡', max: 10, unit: '/10', downIsGood: false },
];

const W = 110;
const H = 26;
const PAD = 2;

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr + 'T00:00:00').getTime()) / 86400000);
}

// Pain ≥7 on 3+ consecutive check-in days (calendar-consecutive) — the
// simplest defensible red flag; surfaced as a chip on the card header.
export function hasSustainedHighPain(rows: CheckinVitalRow[]): boolean {
  let run = 0;
  let prevDate: string | null = null;
  for (const r of rows) {
    const high = (r.pain_level ?? 0) >= 7;
    const consecutive =
      prevDate != null &&
      new Date(r.date + 'T00:00:00').getTime() - new Date(prevDate + 'T00:00:00').getTime() === 86400000;
    run = high ? (consecutive ? run + 1 : 1) : 0;
    if (run >= 3) return true;
    prevDate = r.date;
  }
  return false;
}

function SparkRow({ rows, vital }: { rows: CheckinVitalRow[]; vital: (typeof VITALS)[number] }) {
  const points = rows
    .map((r) => ({ date: r.date, value: r[vital.key] as number | null }))
    .filter((p): p is { date: string; value: number } => p.value != null);

  const latest = points.length ? points[points.length - 1] : null;

  // x by calendar position within the 30-day window, y by value scale
  const coords = points.map((p) => {
    const x = PAD + ((29 - Math.min(29, daysAgo(p.date))) / 29) * (W - PAD * 2);
    const y = H - PAD - (Math.max(0, Math.min(vital.max, p.value)) / vital.max) * (H - PAD * 2);
    return { x, y };
  });

  // trend: mean of last 7 days vs mean of the 7 before that
  const recent = points.filter((p) => daysAgo(p.date) < 7).map((p) => p.value);
  const prior = points.filter((p) => daysAgo(p.date) >= 7 && p.value != null && daysAgo(p.date) < 14).map((p) => p.value);
  const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
  const recentMean = mean(recent);
  const priorMean = mean(prior);
  const delta = recentMean != null && priorMean != null ? recentMean - priorMean : null;
  const meaningful = delta != null && Math.abs(delta) >= (vital.key === 'sleep_hrs' ? 0.5 : 0.8);
  const improving = delta != null && (vital.downIsGood ? delta < 0 : delta > 0);
  const trendColor = !meaningful ? THEME.colors.textMuted : improving ? '#34D399' : THEME.colors.error;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: THEME.colors.border, gap: 10 }}>
      <View style={{ width: 78, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 13 }}>{vital.icon}</Text>
        <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary }}>{vital.label}</Text>
      </View>

      <View style={{ flex: 1, alignItems: 'center' }}>
        {coords.length >= 2 ? (
          <Svg width={W} height={H}>
            <Polyline
              points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
              fill="none"
              stroke={THEME.colors.teal}
              strokeWidth={1.5}
            />
            <Circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r={2.5} fill={THEME.colors.teal} />
          </Svg>
        ) : (
          <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
            {coords.length === 1 ? '1 check-in' : 'no data'}
          </Text>
        )}
      </View>

      <View style={{ width: 72, alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
          {latest ? `${latest.value}${vital.unit}` : '—'}
        </Text>
        {meaningful && delta != null && (
          <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sansMedium, color: trendColor }}>
            {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)} vs prior wk
          </Text>
        )}
      </View>
    </View>
  );
}

export function VitalsSparklines({ rows }: { rows: CheckinVitalRow[] }) {
  const painFlag = hasSustainedHighPain(rows);
  const anyData = rows.length > 0;

  return (
    <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginTop: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <View>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Check-in vitals</Text>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Last 30 days · from daily check-ins</Text>
        </View>
        {painFlag && (
          <View style={{ backgroundColor: `${THEME.colors.error}18`, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 0.5, borderColor: `${THEME.colors.error}40` }}>
            <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.error }}>⚠️ Pain ≥7, 3+ days</Text>
          </View>
        )}
      </View>

      {anyData ? (
        VITALS.map((v) => <SparkRow key={v.key} rows={rows} vital={v} />)
      ) : (
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 8 }}>
          No check-ins in the last 30 days.
        </Text>
      )}
    </View>
  );
}
