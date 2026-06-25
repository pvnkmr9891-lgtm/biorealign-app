import { Fragment } from 'react';
import { View, Text } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { THEME } from '@/constants/theme';
import { NutritionTrendPoint } from '@/hooks/useCoachClientOverview';

// Same color scheme as the calorie/protein/fat ring elsewhere in the coach
// portal, so the two visuals read as the same metric system.
const SERIES = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: '#F59E0B' },
  { key: 'protein',  label: 'Protein',  unit: 'g',    color: '#4CC986' },
  { key: 'fat',      label: 'Fat',      unit: 'g',    color: '#A78BFA' },
] as const;

const W = 300, H = 140, PAD = 20;

// Each series is normalized to its own min–max range — calories (~1500-2200)
// and protein/fat (~40-90g) would otherwise be on wildly different scales.
// The chart is about each metric's trend shape, not absolute overlay.
function seriesToCoords(values: number[]) {
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v, i) => {
    const x = values.length === 1 ? W / 2 : PAD + (i / (values.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2);
    return { x, y };
  });
}

export function NutritionTrendChart({ points }: { points: NutritionTrendPoint[] }) {
  if (points.length === 0) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>No logged meals yet to chart.</Text>
      </View>
    );
  }

  const latest = points[points.length - 1];

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
        {SERIES.map((s) => (
          <View key={s.key} style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: s.color }} />
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{s.label}</Text>
            </View>
            <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginTop: 2 }}>
              {latest[s.key]}{s.unit}
            </Text>
          </View>
        ))}
      </View>

      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Line x1={PAD} y1={PAD} x2={W - PAD} y2={PAD} stroke={THEME.colors.border} strokeWidth={0.5} />
        <Line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={THEME.colors.border} strokeWidth={0.5} />

        {SERIES.map((s) => {
          const values = points.map((p) => p[s.key]);
          const coords = seriesToCoords(values);
          return (
            <Fragment key={s.key}>
              {coords.length > 1 && (
                <Polyline
                  points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {coords.map((c, i) => (
                <Circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 3.5 : 2.5} fill={i === coords.length - 1 ? s.color : THEME.colors.background} stroke={s.color} strokeWidth={1.5} />
              ))}
            </Fragment>
          );
        })}
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
          {new Date(points[0].weekStart + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </Text>
        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
          {new Date(points[points.length - 1].weekStart + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </Text>
      </View>
      <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', marginTop: 8 }}>
        Daily average per week, from logged meals
      </Text>
    </View>
  );
}
