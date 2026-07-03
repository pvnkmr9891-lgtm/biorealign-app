import { View, Text } from 'react-native';
import Svg, { Rect, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { THEME } from '@/constants/theme';
import { SupplementAdherencePoint } from '@/hooks/useProgress';

const COLOR = '#A78BFA';
const W = 300, H = 140, PAD = 20;

// Weekly bar chart of % supplements completed vs logged — deliberately a bar
// chart rather than a line, since adherence is a per-week ratio (not a
// continuously-varying quantity like calories), and bars read "did I hit
// the week's supplement plan" more directly than a connected line would.
export function SupplementAdherenceChart({ points }: { points: SupplementAdherencePoint[] }) {
  if (points.length === 0) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>No logged supplements yet to chart.</Text>
      </View>
    );
  }

  const latest = points[points.length - 1];
  const barAreaW = W - PAD * 2;
  const barGap = 4;
  const barW = Math.max(4, barAreaW / points.length - barGap);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLOR }} />
        <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Adherence</Text>
        <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{latest.pct}%</Text>
      </View>

      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="suppBarGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={COLOR} stopOpacity={1} />
            <Stop offset="1" stopColor={COLOR} stopOpacity={0.45} />
          </LinearGradient>
        </Defs>

        <Line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={THEME.colors.border} strokeWidth={0.5} />
        {[25, 50, 75].map((pct) => (
          <Line key={pct} x1={PAD} y1={PAD + (1 - pct / 100) * (H - PAD * 2)} x2={W - PAD} y2={PAD + (1 - pct / 100) * (H - PAD * 2)} stroke={THEME.colors.border} strokeWidth={0.4} strokeDasharray="2,3" />
        ))}

        {points.map((p, i) => {
          const x = PAD + i * (barW + barGap);
          const barH = (p.pct / 100) * (H - PAD * 2);
          const y = H - PAD - barH;
          const isLatest = i === points.length - 1;
          return (
            <Rect
              key={p.weekStart}
              x={x} y={y} width={barW} height={Math.max(barH, 2)}
              rx={3}
              fill="url(#suppBarGradient)"
              opacity={isLatest ? 1 : 0.85}
            />
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
        % of logged supplements checked off, per week
      </Text>
    </View>
  );
}
