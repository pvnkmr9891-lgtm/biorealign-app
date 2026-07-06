import { View, Text } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import { THEME } from '@/constants/theme';
import type { FitnessDomain } from '@/hooks/useFitnessAssessment';
import { scoreBand } from '@/lib/fitnessScoring';

export { scoreBand };

// Radar (spider) chart of the 4 fitness domain scores, optionally overlaying
// a baseline assessment against the latest one. Scores are 0–100 normalized
// against age/sex norm bands (see fitness_norm_reference_tables) — label them
// "vs norms", never "percentile".

export interface RadarPoint {
  domain: FitnessDomain;
  score: number | null; // null = age_out_of_range / not tested
}

const DOMAIN_ORDER: FitnessDomain[] = ['strength', 'flexibility', 'endurance', 'agility'];

const DOMAIN_META: Record<FitnessDomain, { label: string; color: string }> = {
  strength:    { label: 'Strength',    color: '#8b78e8' },
  flexibility: { label: 'Flexibility', color: THEME.colors.amber },
  endurance:   { label: 'Endurance',   color: '#60A5FA' },
  agility:     { label: 'Agility',     color: '#34D399' },
};

const SIZE = 260;
const CX = SIZE / 2;
const CY = SIZE / 2 - 4;
const R = 86; // radius at score 100

function pointFor(index: number, score: number): { x: number; y: number } {
  // 4 axes: start at top, go clockwise (strength top, flexibility right, ...)
  const angle = (-90 + index * 90) * (Math.PI / 180);
  const r = (Math.max(0, Math.min(100, score)) / 100) * R;
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

function polygonPoints(points: RadarPoint[]): string {
  return DOMAIN_ORDER
    .map((d, i) => pointFor(i, points.find((p) => p.domain === d)?.score ?? 0))
    .map((p) => `${p.x},${p.y}`)
    .join(' ');
}

export function DomainRadarChart({
  latest, latestDate, baseline, baselineDate,
}: {
  latest: RadarPoint[];
  latestDate: string;      // YYYY-MM-DD
  baseline?: RadarPoint[]; // earliest assessment, only when different from latest
  baselineDate?: string;
}) {
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });

  const scoreOf = (pts: RadarPoint[] | undefined, d: FitnessDomain) =>
    pts?.find((p) => p.domain === d)?.score ?? null;

  return (
    <View>
      <Svg width={SIZE} height={SIZE} style={{ alignSelf: 'center' }}>
        {/* grid rings at 25/50/75/100 */}
        {[25, 50, 75, 100].map((ring) => (
          <Polygon
            key={ring}
            points={DOMAIN_ORDER.map((_, i) => pointFor(i, ring)).map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={THEME.colors.border}
            strokeWidth={ring === 100 ? 1 : 0.5}
          />
        ))}
        {/* axes */}
        {DOMAIN_ORDER.map((_, i) => {
          const tip = pointFor(i, 100);
          return <Line key={i} x1={CX} y1={CY} x2={tip.x} y2={tip.y} stroke={THEME.colors.border} strokeWidth={0.5} />;
        })}

        {/* baseline polygon (dashed, muted) */}
        {baseline && (
          <Polygon
            points={polygonPoints(baseline)}
            fill={`${THEME.colors.textMuted}14`}
            stroke={THEME.colors.textMuted}
            strokeWidth={1.5}
            strokeDasharray="5,4"
          />
        )}

        {/* latest polygon */}
        <Polygon
          points={polygonPoints(latest)}
          fill={`${THEME.colors.teal}2A`}
          stroke={THEME.colors.teal}
          strokeWidth={2}
        />
        {DOMAIN_ORDER.map((d, i) => {
          const s = scoreOf(latest, d);
          if (s == null) return null;
          const p = pointFor(i, s);
          return <Circle key={d} cx={p.x} cy={p.y} r={3.5} fill={THEME.colors.teal} />;
        })}

        {/* axis labels: name + latest score */}
        {DOMAIN_ORDER.map((d, i) => {
          const tip = pointFor(i, 100);
          const s = scoreOf(latest, d);
          const meta = DOMAIN_META[d];
          // nudge labels outward per axis: top, right, bottom, left
          const dx = i === 1 ? 8 : i === 3 ? -8 : 0;
          const dy = i === 0 ? -18 : i === 2 ? 16 : 0;
          const anchor = i === 1 ? 'start' : i === 3 ? 'end' : 'middle';
          return (
            <SvgText key={`${d}-label`} x={tip.x + dx} y={tip.y + dy} fontSize={11} fill={meta.color} textAnchor={anchor} fontWeight="600">
              {`${meta.label} ${s != null ? Math.round(s) : '—'}`}
            </SvgText>
          );
        })}
      </Svg>

      {/* legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 14, height: 3, backgroundColor: THEME.colors.teal, borderRadius: 2 }} />
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary }}>Latest · {fmt(latestDate)}</Text>
        </View>
        {baseline && baselineDate && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 14, height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: THEME.colors.textMuted }} />
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>First · {fmt(baselineDate)}</Text>
          </View>
        )}
      </View>

      {/* per-domain band + change chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        {DOMAIN_ORDER.map((d) => {
          const s = scoreOf(latest, d);
          if (s == null) return null;
          const band = scoreBand(s);
          const base = scoreOf(baseline, d);
          const delta = base != null ? Math.round(s) - Math.round(base) : null;
          return (
            <View key={d} style={{ flexGrow: 1, minWidth: '46%', backgroundColor: THEME.colors.surface3, borderRadius: 10, padding: 10 }}>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: DOMAIN_META[d].color }}>{DOMAIN_META[d].label}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 3 }}>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: band.color }}>{band.label}</Text>
                {delta != null && delta !== 0 && (
                  <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: delta > 0 ? '#34D399' : THEME.colors.error }}>
                    {delta > 0 ? '▲' : '▼'} {Math.abs(delta)} pts
                  </Text>
                )}
                {delta === 0 && (
                  <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>no change</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
