import { View, Text } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { THEME } from '@/constants/theme';

const SUCCESS = THEME.colors.success ?? '#4CC986';

export interface TrendPoint { date: string; value: number; }

// A simple SVG line chart for analyzing a metric across many weeks at a
// glance — built so a coach can spot a trend instantly instead of having to
// mentally diff a stack of separate weekly cards.
export function MetricTrendChart({ points, color, unit }: { points: TrendPoint[]; color: string; unit: string }) {
  if (points.length === 0) return null;

  const W = 300, H = 140, PAD = 20;
  const values = points.map((p) => p.value);
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? W / 2 : PAD + (i / (points.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (p.value - min) / range) * (H - PAD * 2);
    return { x, y, ...p };
  });

  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;
  const deltaColor = delta === 0 ? THEME.colors.textMuted : delta < 0 ? SUCCESS : THEME.colors.amber;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ fontSize: 20, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{last}{unit}</Text>
        {points.length > 1 && (
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: deltaColor }}>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '–'} {Math.abs(Math.round(delta * 10) / 10)}{unit} since {new Date(points[0].date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </Text>
        )}
      </View>

      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Gridlines */}
        <Line x1={PAD} y1={PAD} x2={W - PAD} y2={PAD} stroke={THEME.colors.border} strokeWidth={0.5} />
        <Line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={THEME.colors.border} strokeWidth={0.5} />

        {coords.length > 1 && (
          <Polyline
            points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {coords.map((c, i) => (
          <Circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 4.5 : 3} fill={i === coords.length - 1 ? color : THEME.colors.background} stroke={color} strokeWidth={2} />
        ))}

        <SvgText x={PAD} y={H - 4} fontSize="9" fill={THEME.colors.textMuted}>{min}{unit}</SvgText>
        <SvgText x={W - PAD} y={H - 4} fontSize="9" fill={THEME.colors.textMuted} textAnchor="end">{max}{unit}</SvgText>
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
          {new Date(points[0].date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </Text>
        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
          {new Date(points[points.length - 1].date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </Text>
      </View>
    </View>
  );
}
