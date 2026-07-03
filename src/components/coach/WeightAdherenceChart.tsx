import { View, Text } from 'react-native';
import Svg, { Polyline, Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { THEME } from '@/constants/theme';
import type { WeightAdherencePoint } from '@/hooks/useCoachClientOverview';

// Dual-axis weekly overlay: adherence % as background bars (right axis,
// 0-100), recorded weight as a line (left axis, auto-scaled). Answers the
// "why isn't my weight moving" conversation with one picture.

const W = 320;
const H = 150;
const PAD_L = 34;
const PAD_R = 10;
const PAD_T = 10;
const PAD_B = 22;

export function WeightAdherenceChart({ points }: { points: WeightAdherencePoint[] }) {
  const weightPts = points.filter((p): p is WeightAdherencePoint & { weightKg: number } => p.weightKg != null);
  if (points.length < 2 || weightPts.length < 2) {
    return (
      <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, paddingVertical: 12 }}>
        Needs at least two weeks of recorded weight to chart.
      </Text>
    );
  }

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const n = points.length;
  const xFor = (i: number) => PAD_L + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const barW = Math.min(18, (plotW / n) * 0.55);

  // weight axis: pad range slightly so the line isn't glued to the edges
  const weights = weightPts.map((p) => p.weightKg);
  const wMin = Math.min(...weights) - 0.5;
  const wMax = Math.max(...weights) + 0.5;
  const yForWeight = (kg: number) => PAD_T + (1 - (kg - wMin) / (wMax - wMin)) * plotH;
  const yForPct = (pct: number) => PAD_T + (1 - pct / 100) * plotH;

  const weightCoords = points
    .map((p, i) => (p.weightKg != null ? { x: xFor(i), y: yForWeight(p.weightKg) } : null))
    .filter((c): c is { x: number; y: number } => c !== null);

  const fmtWeek = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <View>
      <Svg width={W} height={H} style={{ alignSelf: 'center' }}>
        {/* adherence bars (background) */}
        {points.map((p, i) =>
          p.adherencePct != null ? (
            <Rect
              key={`bar-${p.weekStart}`}
              x={xFor(i) - barW / 2}
              y={yForPct(p.adherencePct)}
              width={barW}
              height={PAD_T + plotH - yForPct(p.adherencePct)}
              fill={`${'#A78BFA'}30`}
              rx={3}
            />
          ) : null
        )}

        {/* weight axis labels */}
        <SvgText x={2} y={PAD_T + 8} fontSize={9} fill={THEME.colors.textMuted}>{wMax.toFixed(1)}</SvgText>
        <SvgText x={2} y={PAD_T + plotH} fontSize={9} fill={THEME.colors.textMuted}>{wMin.toFixed(1)}</SvgText>

        {/* baseline */}
        <Line x1={PAD_L} y1={PAD_T + plotH} x2={W - PAD_R} y2={PAD_T + plotH} stroke={THEME.colors.border} strokeWidth={0.5} />

        {/* weight line */}
        <Polyline
          points={weightCoords.map((c) => `${c.x},${c.y}`).join(' ')}
          fill="none"
          stroke={THEME.colors.teal}
          strokeWidth={2}
        />
        {weightCoords.map((c, i) => (
          <Circle key={i} cx={c.x} cy={c.y} r={2.5} fill={THEME.colors.teal} />
        ))}

        {/* first/last week labels */}
        <SvgText x={xFor(0)} y={H - 6} fontSize={9} fill={THEME.colors.textMuted} textAnchor="start">{fmtWeek(points[0].weekStart)}</SvgText>
        <SvgText x={xFor(n - 1)} y={H - 6} fontSize={9} fill={THEME.colors.textMuted} textAnchor="end">{fmtWeek(points[n - 1].weekStart)}</SvgText>
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 14, height: 3, backgroundColor: THEME.colors.teal, borderRadius: 2 }} />
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary }}>Weight (kg)</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 10, height: 10, backgroundColor: '#A78BFA30', borderRadius: 2, borderWidth: 0.5, borderColor: '#A78BFA' }} />
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary }}>Adherence %</Text>
        </View>
      </View>
    </View>
  );
}
