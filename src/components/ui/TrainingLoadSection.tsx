// src/components/ui/TrainingLoadSection.tsx
// Daily Cardio / Strength / Mobility training load charts.
// Separate from the coach-administered 8-domain Fitness Assessment —
// this updates every workout log, that updates every few months.
//
// Each domain card shows:
//   - Latest score badge (0-100, self-relative: 50 = your typical day)
//   - Daily score dots connected by a thin line
//   - 7-day rolling average line (thicker, solid) over the same axes
//   - A dashed reference at 50 ("your baseline")

import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { THEME } from '@/constants/theme';
import { toLocalDateStr } from '@/lib/dateHelpers';
import type { TrainingLoadResult, DailyTrainingScore } from '@/hooks/useTrainingLoad';

// ── Domain definitions ────────────────────────────────────────────────────────
const DOMAINS = [
  { key: 'cardioScore'   as const, label: 'Cardio',   icon: '🏃', color: '#60A5FA' },
  { key: 'strengthScore' as const, label: 'Strength', icon: '💪', color: '#A78BFA' },
  { key: 'mobilityScore' as const, label: 'Mobility', icon: '🧘', color: '#4CC986' },
];

type DomainKey = 'cardioScore' | 'strengthScore' | 'mobilityScore';

// ── Time range toggle ─────────────────────────────────────────────────────────
const RANGES = [7, 30, 90] as const;
type Range = typeof RANGES[number];

// ── 7-day rolling average ─────────────────────────────────────────────────────
// Average computed only over actual workout days (no zero-padding for rest days)
function rollingAvg(scores: number[], window = 7): number[] {
  return scores.map((_, i) => {
    const slice = scores.slice(Math.max(0, i - window + 1), i + 1);
    return Math.round((slice.reduce((a, b) => a + b, 0) / slice.length) * 10) / 10;
  });
}

// ── Single domain chart ───────────────────────────────────────────────────────
function DomainLoadChart({ points, color }: {
  points: { date: string; score: number }[];
  color: string;
}) {
  const W = 300, H = 96, PX = 14, PY = 8;
  const chartW = W - PX * 2;
  const chartH = H - PY * 2;

  if (points.length < 2) return null;

  const xOf = (i: number) =>
    PX + (i / (points.length - 1)) * chartW;
  const yOf = (score: number) =>
    PY + chartH - (Math.max(0, Math.min(100, score)) / 100) * chartH;

  const rawVals  = points.map(p => p.score);
  const avgVals  = rollingAvg(rawVals);

  const rawPts = points.map((_, i) => `${xOf(i).toFixed(1)},${yOf(rawVals[i]).toFixed(1)}`).join(' ');
  const avgPts = points.map((_, i) => `${xOf(i).toFixed(1)},${yOf(avgVals[i]).toFixed(1)}`).join(' ');
  const refY   = yOf(50);

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* Top / bottom grid */}
      <Line x1={PX} y1={PY}     x2={W - PX} y2={PY}     stroke={THEME.colors.border} strokeWidth={0.5} />
      <Line x1={PX} y1={H - PY} x2={W - PX} y2={H - PY} stroke={THEME.colors.border} strokeWidth={0.5} />
      {/* Reference at 50 — "your typical day" */}
      <Line x1={PX} y1={refY} x2={W - PX} y2={refY}
        stroke={color} strokeWidth={0.7} strokeDasharray="3,3" strokeOpacity={0.45} />

      {/* Daily score polyline — thin, faded */}
      <Polyline points={rawPts} fill="none"
        stroke={color} strokeWidth={1} strokeOpacity={0.3}
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Daily score dots */}
      {points.map((_, i) => (
        <Circle key={i}
          cx={xOf(i)} cy={yOf(rawVals[i])}
          r={i === points.length - 1 ? 3.5 : 2}
          fill={color}
          fillOpacity={i === points.length - 1 ? 1 : 0.55}
        />
      ))}

      {/* 7-day rolling average — solid, thicker */}
      <Polyline points={avgPts} fill="none"
        stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Section — used in both progress screen and coach/admin body tab ───────────
// No outer marginHorizontal — caller provides the container.
export function TrainingLoadSection({ data }: { data: TrainingLoadResult }) {
  const [range, setRange] = useState<Range>(30);

  if (data.scores.length === 0) {
    return (
      <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 14 }}>
        <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
          Training Load
        </Text>
        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13, textAlign: 'center', paddingVertical: 20 }}>
          Log a workout to start tracking daily training load.
        </Text>
      </View>
    );
  }

  // Cut off to selected range (calendar days)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (range - 1));
  const cutoffStr = toLocalDateStr(cutoff);
  const rangeScores = data.scores.filter(s => s.date >= cutoffStr);

  // Latest score across full history (not limited to range)
  const latestAll = data.scores[data.scores.length - 1] ?? null;

  return (
    <View style={{ marginBottom: 4 }}>
      {/* Section header + range toggle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <View>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Training Load
          </Text>
          {data.calibrating && (
            <Text style={{ color: THEME.colors.amber, fontFamily: THEME.fonts.sans, fontSize: 9.5, marginTop: 2 }}>
              Calibrating — log 5+ workouts for full accuracy
            </Text>
          )}
        </View>
        {/* 7 / 30 / 90 day toggle */}
        <View style={{ flexDirection: 'row', backgroundColor: THEME.colors.surface3, borderRadius: 10, padding: 3, gap: 2 }}>
          {RANGES.map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => setRange(r)}
              style={{
                paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7,
                backgroundColor: range === r ? THEME.colors.teal : 'transparent',
              }}
            >
              <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: range === r ? '#fff' : THEME.colors.textMuted }}>
                {r}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* One card per domain */}
      {DOMAINS.map(({ key, label, icon, color }) => {
        const domainPoints: { date: string; score: number }[] = rangeScores
          .filter((d: DailyTrainingScore) => d[key] != null)
          .map((d: DailyTrainingScore) => ({ date: d.date, score: d[key]! }));

        const latestScore = latestAll?.[key] ?? null;

        return (
          <View key={key} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 13, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 10 }}>
            {/* Card header: domain label + latest score */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: domainPoints.length >= 2 ? 10 : 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
                  {icon} {label}
                </Text>
              </View>
              {latestScore != null ? (
                <Text style={{ fontSize: 22, fontFamily: THEME.fonts.sansMedium, color }}>{latestScore}</Text>
              ) : (
                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>—</Text>
              )}
            </View>

            {domainPoints.length < 2 ? (
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', paddingVertical: 10 }}>
                {domainPoints.length === 0
                  ? `No ${label.toLowerCase()} sessions in this period`
                  : 'Log more sessions to see a trend'}
              </Text>
            ) : (
              <>
                <DomainLoadChart points={domainPoints} color={color} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ fontSize: 9, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                    {new Date(domainPoints[0].date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
                  {/* Legend */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 10, height: 1.5, backgroundColor: color, opacity: 0.35 }} />
                      <Text style={{ fontSize: 8.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Daily</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 12, height: 2, backgroundColor: color }} />
                      <Text style={{ fontSize: 8.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>7d avg</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 9, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                    {new Date(domainPoints[domainPoints.length - 1].date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <Text style={{ fontSize: 8.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', marginTop: 5, opacity: 0.7 }}>
                  50 = your typical session · above = stronger · below = lighter
                </Text>
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}
