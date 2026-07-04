import { Fragment } from 'react';
import { View, Text } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { THEME } from '@/constants/theme';
import { NutritionTrendPoint } from '@/hooks/useCoachClientOverview';

const DEFAULT_SERIES = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: '#F59E0B' },
  { key: 'protein',  label: 'Protein',  unit: 'g',    color: '#4CC986' },
  { key: 'fat',      label: 'Fat',      unit: 'g',    color: '#A78BFA' },
] as const;

// Oops palette — warm orange tones so the craving chart looks distinct
const OOPS_SERIES = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: '#F97316' },
  { key: 'protein',  label: 'Protein',  unit: 'g',    color: '#FB923C' },
  { key: 'fat',      label: 'Fat',      unit: 'g',    color: '#FBBF24' },
] as const;

const W = 300, H = 160, PAD_X = 20, PAD_Y = 16;

// Each series is normalized independently to its own min–max so shape is
// visible regardless of scale (calories ~1500 vs protein ~80g).
// Guard: if all values are identical, spread them to ±10% so the line
// renders in the middle of the lane rather than collapsing to the bottom.
function seriesToCoords(values: number[], laneTop: number, laneH: number) {
  let min = Math.min(...values), max = Math.max(...values);
  if (min === max) { min = min * 0.9; max = max * 1.1 || 1; }
  const range = max - min;
  return values.map((v, i) => ({
    x: values.length === 1 ? W / 2 : PAD_X + (i / (values.length - 1)) * (W - PAD_X * 2),
    y: laneTop + (1 - (v - min) / range) * laneH,
  }));
}

export function NutritionTrendChart({ points, accentColor }: { points: NutritionTrendPoint[]; accentColor?: string }) {
  const SERIES = accentColor ? OOPS_SERIES : DEFAULT_SERIES;

  if (points.length === 0) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>No logged meals yet to chart.</Text>
      </View>
    );
  }

  const latest = points[points.length - 1];
  // Split chart into 3 horizontal lanes — one per metric.
  const laneH = (H - PAD_Y * 2) / 3;

  return (
    <View>
      {/* Latest-week stat chips */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 }}>
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

      {/* Stacked lane chart — each metric occupies its own horizontal band */}
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {SERIES.map((s, si) => {
          const laneTop = PAD_Y + si * laneH;
          const values = points.map((p) => p[s.key]);
          const coords = seriesToCoords(values, laneTop, laneH - 4);

          return (
            <Fragment key={s.key}>
              {/* Lane divider */}
              <Line
                x1={PAD_X} y1={laneTop + laneH}
                x2={W - PAD_X} y2={laneTop + laneH}
                stroke={THEME.colors.border} strokeWidth={0.5}
              />
              {/* Label */}

              {/* Trend line */}
              {coords.length > 1 && (
                <Polyline
                  points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {/* Data points */}
              {coords.map((c, i) => (
                <Circle
                  key={i}
                  cx={c.x} cy={c.y}
                  r={i === coords.length - 1 ? 3.5 : 2.5}
                  fill={i === coords.length - 1 ? s.color : THEME.colors.background}
                  stroke={s.color}
                  strokeWidth={1.5}
                />
              ))}
            </Fragment>
          );
        })}
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
          {new Date(points[0].weekStart + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </Text>
        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
          {new Date(points[points.length - 1].weekStart + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </Text>
      </View>
      <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', marginTop: 6 }}>
        Daily average per week · each row independently scaled
      </Text>
    </View>
  );
}
