import React from 'react';
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image, Modal,
  KeyboardAvoidingView, Platform, Animated, Dimensions,
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useActiveEnrollment, useProgressHistory } from '@/hooks/useClient';
import { useBodyMetrics, useLatestBodyMetric, useSaveBodyMetrics, useWeekBodyMetric, useProgressPhotos, useUploadProgressPhoto, useDeleteProgressPhoto } from '@/hooks/useProgress';
import { useWeeklyAlignment, useAlignmentHistory, DayScore } from '@/hooks/useAlignmentScore';
import { LineChart } from '@/components/ui/LineChart';
import { THEME } from '@/constants/theme';
import { TAB_BAR_CLEARANCE } from '@/components/ui/SlidingTabBar';
import { getWeekStart } from '@/hooks/useManualLog';
import { CalendarGrid } from '@/components/ui/CalendarGrid';
import { WeekStatusStrip } from '@/components/ui/WeekStatusStrip';

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'measurements' | 'photos';

// ── Helpers ───────────────────────────────────────────────────────────────────
function delta(current: number | null, previous: number | null, invert = false) {
  if (current == null || previous == null) return null;
  const d = current - previous;
  return invert ? -d : d;
}

function deltaColor(d: number | null, invert = false) {
  if (d == null) return THEME.colors.textMuted;
  if (d > 0) return invert ? (THEME.colors.error ?? '#F87171') : (THEME.colors.success ?? '#34D399');
  if (d < 0) return invert ? (THEME.colors.success ?? '#34D399') : (THEME.colors.error ?? '#F87171');
  return THEME.colors.textMuted;
}

// ── Score delta card ──────────────────────────────────────────────────────────
function ScoreCard({ label, current, previous, color }: {
  label: string; current: number | null; previous: number | null; color: string;
}) {
  const val = current ?? 0;
  const d = delta(current, previous);
  return (
    <View style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 11 }}>{label}</Text>
      </View>
      <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 28 }}>{val}</Text>
      {d != null && (
        <Text style={{ fontFamily: THEME.fonts.sansMedium, fontSize: 12, marginTop: 4, color: deltaColor(d) }}>
          {d > 0 ? `+${d}` : d < 0 ? `${d}` : '—'} vs prev
        </Text>
      )}
    </View>
  );
}

// ── Metric input row ──────────────────────────────────────────────────────────
function MetricRow({ label, value, onChange, unit, hint }: {
  label: string; value: string; onChange: (v: string) => void; unit: string; hint?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: THEME.colors.border }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{label}</Text>
        {hint && <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 1 }}>{hint}</Text>}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <TextInput
          style={{ backgroundColor: '#1A1A1E', borderRadius: 8, borderWidth: 1, borderColor: THEME.colors.border, paddingHorizontal: 12, paddingVertical: 8, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 15, minWidth: 70, textAlign: 'right' }}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="—"
          placeholderTextColor={THEME.colors.textMuted}
        />
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, width: 30 }}>{unit}</Text>
      </View>
    </View>
  );
}


// ── Animated Alignment Trend Line (last 14 days) ─────────────────────────────
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SCREEN_W = Dimensions.get('window').width;

function AlignmentTrendLine({ data }: { data: DayScore[] }) {
  const valid = data.filter(d => d.score !== null);
  if (valid.length < 2) return null;

  const W = SCREEN_W - 80;  // card minus padding
  const H = 110;
  const PAD_LEFT = 28;
  const PAD_BOT  = 18;
  const chartW   = W - PAD_LEFT - 8;
  const chartH   = H - PAD_BOT - 8;

  const maxScore = 100;
  const n        = valid.length;

  const pts = valid.map((d, i) => ({
    x: PAD_LEFT + (i / (n - 1)) * chartW,
    y: 8 + (1 - (d.score ?? 0) / maxScore) * chartH,
    score: d.score ?? 0,
    date:  d.date,
  }));

  // Build SVG path string
  const d_attr = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  // Measure total path length (approximate: sum of segment lengths)
  let pathLen = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i-1].x;
    const dy = pts[i].y - pts[i-1].y;
    pathLen += Math.sqrt(dx*dx + dy*dy);
  }

  const dashAnim  = useRef(new Animated.Value(pathLen)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    dashAnim.setValue(pathLen);
    Animated.timing(dashAnim, {
      toValue: 0,
      duration: 600,
      useNativeDriver: false,
      easing: t => 1 - Math.pow(1 - t, 3), // ease-out cubic
    }).start();

    // Pulse the latest point
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.55, duration: 900, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1.0,  duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [JSON.stringify(valid.map(d => d.score))]);

  const last = pts[pts.length - 1];

  // Y-axis tick labels
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>14-Day Alignment Trend</Text>
        <View style={{ backgroundColor: 'rgba(0,196,180,0.12)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 12 }}>{last.score}  today</Text>
        </View>
      </View>

      <Svg width={W} height={H}>
        {/* Y-axis grid lines + labels */}
        {yTicks.map(tick => {
          const ty = 8 + (1 - tick / maxScore) * chartH;
          return (
            <React.Fragment key={tick}>
              <Line x1={PAD_LEFT} y1={ty} x2={W - 8} y2={ty} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
              <Text
                // SVG Text not available from rn-svg in this way, so we skip — handled by absolute overlay
              />
            </React.Fragment>
          );
        })}

        {/* The animated trend line */}
        <AnimatedPath
          d={d_attr}
          stroke={THEME.colors.teal}
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLen}
          strokeDashoffset={dashAnim}
        />

        {/* Data point dots (small, fixed) */}
        {pts.map((p, i) => (
          i < pts.length - 1 && (
            <Circle key={i} cx={p.x} cy={p.y} r={2.5}
              fill={THEME.colors.teal} opacity={0.55} />
          )
        ))}

        {/* Latest point — pulsing ring (JS driver) then dot */}
        <Circle cx={last.x} cy={last.y} r={7}
          fill="rgba(0,196,180,0.18)" stroke={THEME.colors.teal} strokeWidth={1} />
        <Circle cx={last.x} cy={last.y} r={3.5} fill={THEME.colors.teal} />
      </Svg>

      {/* Pulsing outer ring for latest point — native driver scale */}
      <Animated.View style={{
        position: 'absolute',
        left: 20 + last.x - 9,
        top:  20 + 14 + last.y - 9,
        width: 18, height: 18,
        borderRadius: 9,
        borderWidth: 1.5,
        borderColor: THEME.colors.teal,
        opacity: 0.55,
        transform: [{ scale: pulseAnim }],
      }} pointerEvents="none" />

      {/* Y-axis labels via absolute positioning */}
      <View style={{ position: 'absolute', left: 20, top: 54, bottom: 16 }}>
        {yTicks.map(tick => {
          const ty = 8 + (1 - tick / maxScore) * chartH;
          return (
            <Text key={tick} style={{
              position: 'absolute',
              top: ty - 6,
              left: 0,
              fontSize: 9,
              fontFamily: THEME.fonts.sans,
              color: 'rgba(255,255,255,0.25)',
              width: 22,
              textAlign: 'right',
            }}>{tick}</Text>
          );
        })}
      </View>

      {/* Date labels: first + last */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingLeft: PAD_LEFT, paddingRight: 8 }}>
        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
          {new Date(valid[0].date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </Text>
        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
          {new Date(valid[valid.length - 1].date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </Text>
      </View>
    </View>
  );
}

// ── Consistency Heatmap (12 weeks × 7 days) ───────────────────────────────────
const CELL = 13;
const CELL_GAP = 2;
const COL_W = CELL + CELL_GAP;
const DAY_ROW_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function ConsistencyHeatmap({ data }: { data: DayScore[] }) {
  // Build a date→score lookup
  const scoreMap = useMemo(() => {
    const m: Record<string, number | null> = {};
    data.forEach(d => { m[d.date] = d.score; });
    return m;
  }, [data]);

  // Build the 12-week grid ending today
  const cells = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Find last Saturday (or today if Saturday)
    const dow = today.getDay(); // 0=Sun, 6=Sat
    const daysToSat = dow === 6 ? 0 : 6 - dow;
    const gridEnd = new Date(today);
    gridEnd.setDate(today.getDate() + daysToSat);

    // Grid starts 12 weeks back from gridEnd, on Monday
    const gridStart = new Date(gridEnd);
    gridStart.setDate(gridEnd.getDate() - 84 + 1);

    const grid: { date: string | null; score: number | null; isFuture: boolean }[][] = [];
    let cur = new Date(gridStart);
    for (let week = 0; week < 12; week++) {
      const col: typeof grid[0] = [];
      for (let day = 0; day < 7; day++) {
        const isFuture = cur > today;
        const y = cur.getFullYear();
        const m = String(cur.getMonth()+1).padStart(2,'0');
        const d = String(cur.getDate()).padStart(2,'0');
        const dateStr = `${y}-${m}-${d}`;
        col.push({ date: dateStr, score: scoreMap[dateStr] ?? null, isFuture });
        cur.setDate(cur.getDate() + 1);
      }
      grid.push(col);
    }
    return grid;
  }, [scoreMap]);

  // Month labels: figure out which column is the first of each month
  const monthLabels = useMemo(() => {
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    cells.forEach((col, ci) => {
      const firstCell = col[0];
      if (!firstCell.date) return;
      const m = new Date(firstCell.date + 'T00:00:00').getMonth();
      if (m !== lastMonth) {
        labels.push({ col: ci, label: new Date(firstCell.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' }) });
        lastMonth = m;
      }
    });
    return labels;
  }, [cells]);

  const totalW = 12 * COL_W + 22; // 22px for day labels on left

  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
      <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
        12-Week Consistency
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: totalW }}>
          {/* Month labels row */}
          <View style={{ flexDirection: 'row', marginLeft: 22, marginBottom: 4, height: 12 }}>
            {monthLabels.map((ml, i) => (
              <Text key={i} style={{
                position: 'absolute',
                left: ml.col * COL_W,
                fontSize: 9,
                fontFamily: THEME.fonts.sansMedium,
                color: THEME.colors.textMuted,
                letterSpacing: 0.3,
              }}>{ml.label}</Text>
            ))}
          </View>

          {/* Grid: 7 rows (days) × 12 cols (weeks) */}
          <View style={{ flexDirection: 'row', gap: CELL_GAP }}>
            {/* Day-of-week labels column */}
            <View style={{ width: 18, gap: CELL_GAP }}>
              {DAY_ROW_LABELS.map((label, i) => (
                <View key={i} style={{ width: 18, height: CELL, alignItems: 'center', justifyContent: 'center' }}>
                  {(i % 2 === 0) && (
                    <Text style={{ fontSize: 8, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{label}</Text>
                  )}
                </View>
              ))}
            </View>

            {/* Week columns */}
            {cells.map((col, ci) => (
              <View key={ci} style={{ gap: CELL_GAP }}>
                {col.map((cell, di) => {
                  const isSunday = di === 6;
                  const opacity =
                    cell.isFuture ? 0
                    : isSunday    ? 0.06
                    : cell.score === null ? 0.06
                    : Math.max(0.12, (cell.score / 100) * 0.95);

                  return (
                    <View key={di} style={{
                      width: CELL, height: CELL, borderRadius: 2.5,
                      backgroundColor: isSunday
                        ? 'rgba(255,255,255,0.06)'
                        : `rgba(0,196,180,${opacity})`,
                    }} />
                  );
                })}
              </View>
            ))}
          </View>

          {/* Legend */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, marginLeft: 22, justifyContent: 'flex-end' }}>
            <Text style={{ fontSize: 9, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Less</Text>
            {[0.08, 0.25, 0.5, 0.75, 0.95].map((op, i) => (
              <View key={i} style={{ width: CELL, height: CELL, borderRadius: 2.5, backgroundColor: `rgba(0,196,180,${op})` }} />
            ))}
            <Text style={{ fontSize: 9, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>More</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Weekly Alignment Card ─────────────────────────────────────────────────────
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function WeeklyAlignmentCard({
  days, weekStart, onPrev, onNext, isCurrentWeek,
}: {
  days: { day: number; score: number | null; workoutPct: number; waterPct: number; foodPct: number }[];
  weekStart: string;
  onPrev: () => void;
  onNext: () => void;
  isCurrentWeek: boolean;
}) {
  // Compute today's day_number relative to weekStart (same logic as isToday in useManualLog.js)
  const todayDay = (() => {
    if (!isCurrentWeek) return -1;
    const [wsY, wsM, wsD] = weekStart.split('-').map(Number);
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let dn = 1; dn <= 6; dn++) {
      if (new Date(wsY, wsM - 1, wsD + dn - 1).getTime() === todayMidnight.getTime()) return dn;
    }
    return -1; // Sunday or out of range
  })();

  // Week label
  const wStart = new Date(weekStart + 'T00:00:00');
  const wEnd   = new Date(wStart); wEnd.setDate(wStart.getDate() + 5);
  const fmt    = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const weekLabel = `${fmt(wStart)} – ${fmt(wEnd)}`;

  // Overall week average (only over days that have data)
  const logged  = days.filter(d => d.score !== null);
  const weekAvg = logged.length === 0 ? null : Math.round(logged.reduce((s, d) => s + (d.score ?? 0), 0) / logged.length);

  // Category averages
  const avgOf = (key: 'workoutPct' | 'waterPct' | 'foodPct') =>
    logged.length === 0 ? 0 : Math.round(logged.reduce((s, d) => s + d[key], 0) / logged.length);

  const wkAvg = avgOf('workoutPct');
  const waAvg = avgOf('waterPct');
  const foAvg = avgOf('foodPct');

  const CATS = [
    { label: 'Workout', icon: '💪', pct: wkAvg, color: '#00C4B4' },
    { label: 'Water',   icon: '💧', pct: waAvg, color: '#60A5FA' },
    { label: 'Food',    icon: '🥗', pct: foAvg, color: '#E8A44A' },
  ];

  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          Weekly Alignment
        </Text>
        {weekAvg !== null && (
          <View style={{ backgroundColor: weekAvg >= 75 ? 'rgba(52,211,153,0.15)' : weekAvg >= 45 ? 'rgba(232,164,74,0.15)' : 'rgba(248,113,113,0.15)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontFamily: THEME.fonts.sansMedium, fontSize: 13, color: weekAvg >= 75 ? '#34D399' : weekAvg >= 45 ? '#E8A44A' : '#F87171' }}>
              {weekAvg} avg
            </Text>
          </View>
        )}
      </View>

      {/* Week navigator */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <TouchableOpacity onPress={onPrev} style={{ padding: 6 }}>
          <Text style={{ fontSize: 18, color: THEME.colors.teal }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary }}>
          {weekLabel}{isCurrentWeek ? '  (this week)' : ''}
        </Text>
        <TouchableOpacity onPress={onNext} disabled={isCurrentWeek} style={{ padding: 6, opacity: isCurrentWeek ? 0.3 : 1 }}>
          <Text style={{ fontSize: 18, color: THEME.colors.teal }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day bars */}
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-end', height: 80, marginBottom: 6 }}>
        {days.map((d) => {
          const isToday  = d.day === todayDay;
          const hasScore = d.score !== null;
          const barH     = hasScore ? Math.max(4, (d.score! / 100) * 72) : 4;
          const barColor = !hasScore ? 'rgba(255,255,255,0.07)'
                         : d.score! >= 75 ? '#34D399'
                         : d.score! >= 45 ? '#E8A44A'
                         : '#F87171';

          return (
            <View key={d.day} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <View style={{ width: '100%', height: barH, borderRadius: 5, backgroundColor: barColor, borderWidth: isToday ? 1 : 0, borderColor: '#FFFFFF40' }} />
              {hasScore && (
                <Text style={{ fontSize: 9, fontFamily: THEME.fonts.sansMedium, color: barColor, marginTop: 3 }}>
                  {d.score}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Day labels */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {days.map((d) => {
          const isToday = d.day === todayDay;
          return (
            <Text key={d.day} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontFamily: isToday ? THEME.fonts.sansMedium : THEME.fonts.sans, color: isToday ? THEME.colors.teal : THEME.colors.textMuted }}>
              {DAY_SHORT[d.day - 1]}
            </Text>
          );
        })}
      </View>

      {/* Category breakdown bars */}
      <View style={{ marginTop: 18, gap: 10 }}>
        {CATS.map(c => (
          <View key={c.label}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
                {c.icon} {c.label}
              </Text>
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: c.color }}>{c.pct}%</Text>
            </View>
            <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${c.pct}%`, backgroundColor: c.color, borderRadius: 3 }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Helper: get week start string for an offset ───────────────────────────────
function getOffsetWeekStart(offset: number): string {
  const base = new Date();
  base.setDate(base.getDate() + offset * 7);
  return getWeekStart(base);
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week…

  const { data: enrollment } = useActiveEnrollment();
  const { data: history = [], isLoading } = useProgressHistory(20);
  const { data: bodyHistory = [] } = useBodyMetrics(10);

  const selectedWeekStart = getOffsetWeekStart(weekOffset);
  const { data: weekAlignment = [] } = useWeeklyAlignment(selectedWeekStart);
  const { data: alignHistory84 = [] } = useAlignmentHistory(84);
  const alignHistory14 = alignHistory84.slice(-14);

  const isCurrentWeek = weekOffset === 0;

  const latest   = history[history.length - 1] ?? null;
  const previous = history[history.length - 2] ?? null;
  const latestBody   = bodyHistory[bodyHistory.length - 1] ?? null;
  const previousBody = bodyHistory[bodyHistory.length - 2] ?? null;

  // Filter history to selected week for Score Trend
  const weekEnd = (() => {
    const d = new Date(selectedWeekStart + 'T00:00:00');
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  })();
  const weekHistory = isCurrentWeek
    ? history // current week: show all history (provides context)
    : history.filter(m => {
        const d = m.recorded_at?.split('T')[0];
        return d >= selectedWeekStart && d <= weekEnd;
      });

  // Week range label for trend chart header
  const wStart = new Date(selectedWeekStart + 'T00:00:00');
  const wEnd2  = new Date(selectedWeekStart + 'T00:00:00'); wEnd2.setDate(wStart.getDate() + 5);
  const fmt    = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const weekLabel = isCurrentWeek ? 'All time' : `${fmt(wStart)} – ${fmt(wEnd2)}`;

  const displayHistory = weekHistory.length > 0 ? weekHistory : (isCurrentWeek ? history : []);

  const labels = displayHistory.map(m =>
    new Date(m.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  );

  const SERIES = [
    { key: 'fitness_score',   label: 'Fitness',   color: THEME.scoreColors.fitness,   data: displayHistory.map(m => m.fitness_score   ?? 0) },
    { key: 'recovery_score',  label: 'Recovery',  color: THEME.scoreColors.recovery,  data: displayHistory.map(m => m.recovery_score  ?? 0) },
    { key: 'longevity_score', label: 'Longevity', color: THEME.scoreColors.longevity, data: displayHistory.map(m => m.longevity_score ?? 0) },
  ];

  const weightLabels = bodyHistory.map(m =>
    new Date(m.recorded_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  );
  const weightData = bodyHistory.map(m => m.weight_kg ?? 0).filter(v => v > 0);
  const hasWeight  = weightData.length >= 2;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

      {/* Program pill */}
      {enrollment && (
        <View style={{ marginHorizontal: 24, marginBottom: 20 }}>
          <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 13 }}>
              {enrollment.program?.name}
            </Text>
            <Text style={{ color: THEME.colors.amber, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>
              Week {enrollment.current_week} / {enrollment.program?.duration_weeks}
            </Text>
          </View>
        </View>
      )}

      {/* Score cards */}
      <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 24, marginBottom: 20 }}>
        <ScoreCard label="Fitness"   current={latest?.fitness_score   ?? null} previous={previous?.fitness_score   ?? null} color={THEME.scoreColors.fitness} />
        <ScoreCard label="Recovery"  current={latest?.recovery_score  ?? null} previous={previous?.recovery_score  ?? null} color={THEME.scoreColors.recovery} />
        <ScoreCard label="Longevity" current={latest?.longevity_score ?? null} previous={previous?.longevity_score ?? null} color={THEME.scoreColors.longevity} />
      </View>

      {/* Score trend chart */}
      <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
        {/* Score trend header + week nav */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Score trend
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <TouchableOpacity onPress={() => setWeekOffset(o => o - 1)} style={{ padding: 6 }}>
            <Text style={{ fontSize: 18, color: THEME.colors.teal }}>‹</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary }}>
            {weekLabel}
          </Text>
          <TouchableOpacity onPress={() => setWeekOffset(o => o + 1)} disabled={isCurrentWeek} style={{ padding: 6, opacity: isCurrentWeek ? 0.3 : 1 }}>
            <Text style={{ fontSize: 18, color: THEME.colors.teal }}>›</Text>
          </TouchableOpacity>
        </View>

        {isLoading || displayHistory.length < 2 ? (
          <View style={{ height: 160, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13 }}>
              {isLoading ? 'Loading…' : 'No check-in data for this period'}
            </Text>
          </View>
        ) : (
          <LineChart series={SERIES} labels={labels} height={180} showDots={displayHistory.length <= 8} />
        )}
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
          {SERIES.map(s => (
            <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 16, height: 2.5, borderRadius: 1.5, backgroundColor: s.color }} />
              <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Weekly Alignment */}
      <WeeklyAlignmentCard
        days={weekAlignment}
        weekStart={selectedWeekStart}
        onPrev={() => setWeekOffset(o => o - 1)}
        onNext={() => setWeekOffset(o => o + 1)}
        isCurrentWeek={isCurrentWeek}
      />

      {/* 14-day Alignment Trend Line */}
      {alignHistory14.filter((d: DayScore) => d.score !== null).length >= 2 && (
        <AlignmentTrendLine data={alignHistory14} />
      )}

      {/* 12-week Consistency Heatmap */}
      <ConsistencyHeatmap data={alignHistory84} />

      {/* Weight chart */}
      {hasWeight && (
        <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>Weight</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: THEME.colors.amber, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>
                {latestBody?.weight_kg ?? '—'} kg
              </Text>
              {latestBody?.weight_kg && previousBody?.weight_kg && (
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: deltaColor(delta(latestBody.weight_kg, previousBody.weight_kg), true) }}>
                  {(latestBody.weight_kg - previousBody.weight_kg) >= 0 ? '+' : ''}{(latestBody.weight_kg - previousBody.weight_kg).toFixed(1)} kg
                </Text>
              )}
            </View>
          </View>
          <LineChart
            series={[{ key: 'weight', label: 'Weight (kg)', color: THEME.colors.amber, data: bodyHistory.map(m => m.weight_kg ?? 0) }]}
            labels={weightLabels}
            height={130}
            showDots
          />
        </View>
      )}

      {/* Posture score */}
      {latest?.posture_score != null && (
        <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>Posture score</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <Text style={{ color: '#C4B5FD', fontFamily: THEME.fonts.sansMedium, fontSize: 40 }}>{latest.posture_score}</Text>
            <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 14, marginBottom: 6 }}>/ 100</Text>
            {previous?.posture_score != null && (
              <Text style={{ color: deltaColor(delta(latest.posture_score, previous.posture_score)), fontFamily: THEME.fonts.sansMedium, fontSize: 14, marginBottom: 6 }}>
                {(latest.posture_score - previous.posture_score) >= 0 ? '+' : ''}{latest.posture_score - previous.posture_score} vs prev
              </Text>
            )}
          </View>
          <View style={{ height: 6, backgroundColor: THEME.colors.surface2, borderRadius: 3, marginTop: 10, overflow: 'hidden', borderWidth: 0.5, borderColor: THEME.colors.border }}>
            <View style={{ height: '100%', width: `${latest.posture_score}%`, backgroundColor: '#C4B5FD', borderRadius: 3 }} />
          </View>
        </View>
      )}

      {/* Body snapshot */}
      {latestBody && (
        <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 16 }}>Latest body snapshot</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {[
              { label: 'Waist', value: latestBody.waist_cm, unit: 'cm', prev: previousBody?.waist_cm, invert: true },
              { label: 'Hips',  value: latestBody.hips_cm,  unit: 'cm', prev: previousBody?.hips_cm,  invert: true },
              { label: 'Chest', value: latestBody.chest_cm, unit: 'cm', prev: previousBody?.chest_cm },
              { label: 'Push-ups', value: latestBody.pushup_count, unit: 'reps', prev: previousBody?.pushup_count },
              { label: 'Plank',    value: latestBody.plank_seconds, unit: 'sec', prev: previousBody?.plank_seconds },
            ].filter(m => m.value != null).map(m => {
              const d = delta(m.value!, m.prev ?? null, m.invert);
              return (
                <View key={m.label} style={{ backgroundColor: '#1A1A1E', borderRadius: 10, padding: 12, minWidth: 90 }}>
                  <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 4 }}>{m.label}</Text>
                  <Text style={{ fontSize: 18, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{m.value} <Text style={{ fontSize: 11, color: THEME.colors.textMuted }}>{m.unit}</Text></Text>
                  {d != null && d !== 0 && (
                    <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: deltaColor(d, m.invert), marginTop: 2 }}>
                      {d > 0 ? '+' : ''}{d}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ── Measurements tab ──────────────────────────────────────────────────────────
function MeasurementsTab() {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week

  const currentWeekStart = getWeekStart();
  const selectedWeekStart = useMemo(() => {
    const d = new Date(currentWeekStart + 'T00:00:00');
    d.setDate(d.getDate() + weekOffset * 7);
    const y = d.getFullYear(), mo = String(d.getMonth()+1).padStart(2,'0'), da = String(d.getDate()).padStart(2,'0');
    return `${y}-${mo}-${da}`;
  }, [currentWeekStart, weekOffset]);

  const prevWeekStart = useMemo(() => {
    const d = new Date(selectedWeekStart + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    const y = d.getFullYear(), mo = String(d.getMonth()+1).padStart(2,'0'), da = String(d.getDate()).padStart(2,'0');
    return `${y}-${mo}-${da}`;
  }, [selectedWeekStart]);

  const isCurrentWeek = weekOffset === 0;

  const { data: thisWeekData, isLoading: loadingThis } = useWeekBodyMetric(selectedWeekStart);
  const { data: prevWeekData } = useWeekBodyMetric(prevWeekStart);
  const { data: history = [] } = useBodyMetrics(20);
  const saveMetrics = useSaveBodyMetrics();

  const loggedWeeks = useMemo(() => new Set(history.map((h) => h.recorded_date)), [history]);
  const recentWeeks = useMemo(() => {
    const weeks: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentWeekStart + 'T00:00:00');
      d.setDate(d.getDate() - i * 7);
      const y = d.getFullYear(), mo = String(d.getMonth() + 1).padStart(2, '0'), da = String(d.getDate()).padStart(2, '0');
      weeks.push(`${y}-${mo}-${da}`);
    }
    return weeks;
  }, [currentWeekStart]);

  const onSelectWeek = (wk: string) => {
    const diffDays = Math.round((new Date(wk + 'T00:00:00').getTime() - new Date(currentWeekStart + 'T00:00:00').getTime()) / 86400000);
    setWeekOffset(Math.round(diffDays / 7));
  };

  // When current week has no entry yet, pre-fill from previous week
  const prefill = (!thisWeekData && isCurrentWeek) ? prevWeekData : null;
  const source   = thisWeekData ?? prefill ?? null;
  const isPrefilled = !thisWeekData && !!prefill;

  const [weight, setWeight]         = useState('');
  const [bodyFat, setBodyFat]       = useState('');
  const [waist, setWaist]           = useState('');
  const [hips, setHips]             = useState('');
  const [chest, setChest]           = useState('');
  const [leftArm, setLeftArm]       = useState('');
  const [rightArm, setRightArm]     = useState('');
  const [leftThigh, setLeftThigh]   = useState('');
  const [rightThigh, setRightThigh] = useState('');
  const [pushups, setPushups]       = useState('');
  const [plank, setPlank]           = useState('');
  const [squats, setSquats]         = useState('');
  const [notes, setNotes]           = useState('');
  const [saved, setSaved]           = useState(false);

  // Populate fields whenever the selected week changes or data loads/changes.
  // Must depend on selectedWeekStart AND both data IDs — if user is on week N-1
  // then navigates to current week N (no entry yet), source becomes prevWeekData
  // which has the same .id as before; only selectedWeekStart is different there,
  // but we also need prevWeekData?.id so the pre-fill fires after data loads.
  useEffect(() => {
    setWeight(String(source?.weight_kg         ?? ''));
    setBodyFat(String(source?.body_fat_pct     ?? ''));
    setWaist(String(source?.waist_cm           ?? ''));
    setHips(String(source?.hips_cm             ?? ''));
    setChest(String(source?.chest_cm           ?? ''));
    setLeftArm(String(source?.left_arm_cm      ?? ''));
    setRightArm(String(source?.right_arm_cm    ?? ''));
    setLeftThigh(String(source?.left_thigh_cm  ?? ''));
    setRightThigh(String(source?.right_thigh_cm ?? ''));
    setPushups(String(source?.pushup_count     ?? ''));
    setPlank(String(source?.plank_seconds      ?? ''));
    setSquats(String(source?.squat_reps        ?? ''));
    setNotes(source?.notes ?? '');
    setSaved(false);
  }, [selectedWeekStart, thisWeekData?.id, prevWeekData?.id]);

  const p = (v: string) => parseFloat(v) || undefined;
  const n = (v: string) => parseInt(v)   || undefined;

  const handleSave = async () => {
    await saveMetrics.mutateAsync({
      recorded_date:  selectedWeekStart,
      weight_kg:      p(weight),
      body_fat_pct:   p(bodyFat),
      waist_cm:       p(waist),
      hips_cm:        p(hips),
      chest_cm:       p(chest),
      left_arm_cm:    p(leftArm),
      right_arm_cm:   p(rightArm),
      left_thigh_cm:  p(leftThigh),
      right_thigh_cm: p(rightThigh),
      pushup_count:   n(pushups),
      plank_seconds:  n(plank),
      squat_reps:     n(squats),
      notes: notes.trim() || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Week label: "Jun 16 – Jun 22"
  const weekLabel = useMemo(() => {
    const start = new Date(selectedWeekStart + 'T00:00:00');
    const end   = new Date(selectedWeekStart + 'T00:00:00');
    end.setDate(end.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return `${fmt(start)} – ${fmt(end)}`;
  }, [selectedWeekStart]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Week navigator */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <TouchableOpacity onPress={() => setWeekOffset(w => w - 1)} activeOpacity={0.7}
            style={{ padding: 8, backgroundColor: THEME.colors.surface2, borderRadius: 10, borderWidth: 0.5, borderColor: THEME.colors.border }}>
            <Text style={{ fontSize: 18, color: THEME.colors.textSecondary }}>‹</Text>
          </TouchableOpacity>

          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontFamily: THEME.fonts.sansMedium, fontSize: 14, color: THEME.colors.textPrimary }}>{weekLabel}</Text>
            {isCurrentWeek && (
              <View style={{ backgroundColor: `${THEME.colors.teal}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 3 }}>
                <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Current Week</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setWeekOffset(w => w + 1)}
            disabled={isCurrentWeek}
            activeOpacity={isCurrentWeek ? 1 : 0.7}
            style={{ padding: 8, backgroundColor: THEME.colors.surface2, borderRadius: 10, borderWidth: 0.5, borderColor: THEME.colors.border, opacity: isCurrentWeek ? 0.3 : 1 }}>
            <Text style={{ fontSize: 18, color: THEME.colors.textSecondary }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Week status strip — green = logged, grey = not yet */}
        <View style={{ marginBottom: 16 }}>
          <WeekStatusStrip
            weeks={recentWeeks}
            loggedWeeks={loggedWeeks}
            selectedWeek={selectedWeekStart}
            onSelect={onSelectWeek}
          />
        </View>

        {/* Pre-fill notice */}
        {isPrefilled && (
          <View style={{ backgroundColor: `${THEME.colors.amber}15`, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: `${THEME.colors.amber}35`, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 15 }}>📋</Text>
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.amber, flex: 1 }}>
              Pre-filled from last week — update anything that has changed.
            </Text>
          </View>
        )}

        {/* Already logged notice */}
        {thisWeekData && (
          <View style={{ backgroundColor: `${THEME.colors.teal}12`, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: `${THEME.colors.teal}30`, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 15 }}>✅</Text>
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.teal, flex: 1 }}>
              {isCurrentWeek ? 'This week\'s measurements are logged. Edit and save to update.' : 'Measurements recorded for this week. You can still edit them.'}
            </Text>
          </View>
        )}

        {loadingThis ? (
          <View style={{ height: 200, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={THEME.colors.teal} />
          </View>
        ) : (
          <>
            {/* Weight & composition */}
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Weight & Composition</Text>
            <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 20 }}>
              <MetricRow label="Body weight" value={weight}  onChange={setWeight}  unit="kg" hint="Morning, before food" />
              <MetricRow label="Body fat"    value={bodyFat} onChange={setBodyFat} unit="%"  hint="Optional" />
            </View>

            {/* Measurements */}
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Measurements</Text>
            <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 20 }}>
              <MetricRow label="Waist"       value={waist}      onChange={setWaist}      unit="cm" />
              <MetricRow label="Hips"        value={hips}       onChange={setHips}       unit="cm" />
              <MetricRow label="Chest"       value={chest}      onChange={setChest}      unit="cm" />
              <MetricRow label="Left arm"    value={leftArm}    onChange={setLeftArm}    unit="cm" />
              <MetricRow label="Right arm"   value={rightArm}   onChange={setRightArm}   unit="cm" />
              <MetricRow label="Left thigh"  value={leftThigh}  onChange={setLeftThigh}  unit="cm" />
              <MetricRow label="Right thigh" value={rightThigh} onChange={setRightThigh} unit="cm" />
            </View>

            {/* Strength benchmarks */}
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Strength Benchmarks</Text>
            <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 20 }}>
              <MetricRow label="Push-ups"   value={pushups} onChange={setPushups} unit="reps" hint="Max reps to failure" />
              <MetricRow label="Plank hold" value={plank}   onChange={setPlank}   unit="sec"  hint="Duration in seconds" />
              <MetricRow label="Squats"     value={squats}  onChange={setSquats}  unit="reps" hint="Bodyweight, max reps" />
            </View>

            {/* Notes */}
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Notes</Text>
            <TextInput
              style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, borderWidth: 0.5, borderColor: THEME.colors.border, paddingHorizontal: 16, paddingVertical: 14, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, minHeight: 70, textAlignVertical: 'top', marginBottom: 32 }}
              value={notes}
              onChangeText={setNotes}
              placeholder="How are you feeling about your progress this week?"
              placeholderTextColor={THEME.colors.textMuted}
              multiline
            />
          </>
        )}

      </ScrollView>

      {/* Save button */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: THEME.colors.background, borderTopWidth: 0.5, borderTopColor: THEME.colors.border, paddingHorizontal: 24, paddingVertical: 16, paddingBottom: TAB_BAR_CLEARANCE }}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saveMetrics.isPending || loadingThis}
          activeOpacity={0.85}
          style={{ backgroundColor: saved ? (THEME.colors.success ?? '#34D399') : THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: THEME.colors.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 }}
        >
          {saveMetrics.isPending
            ? <ActivityIndicator color={THEME.colors.background} />
            : <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>
                {saved ? '✓ Saved!' : 'Save this week →'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Photos: shared types & helpers ─────────────────────────────────────────
const PHOTO_TYPES: { type: 'front' | 'side' | 'back' | 'custom'; label: string; emoji: string }[] = [
  { type: 'front',  label: 'Front',  emoji: '🧍' },
  { type: 'side',   label: 'Side',   emoji: '🚶' },
  { type: 'back',   label: 'Back',   emoji: '🪞' },
  { type: 'custom', label: 'Other',  emoji: '✨' },
];

function photoDateLabel(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Add Photos Modal ─────────────────────────────────────────────────────────
// Single entry point for adding photos: pick source (camera = 1 shot, gallery
// = multi-select), tag the batch with a pose, upload all sequentially.
function AddPhotosModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const uploadPhoto = useUploadProgressPhoto();
  const [step, setStep]       = useState<'source' | 'date' | 'tag' | 'uploading'>('source');
  const [uris, setUris]       = useState<string[]>([]);
  const [photoType, setPhotoType] = useState<'front' | 'side' | 'back' | 'custom'>('front');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  function reset() {
    setStep('source'); setUris([]); setPhotoType('front'); setProgress({ done: 0, total: 0 });
    setSelectedDate(todayStr);
  }
  function handleClose() { reset(); onClose(); }

  async function pickFromCamera() {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) { Alert.alert('Permission needed', 'Please allow camera access.'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [3, 4], quality: 0.7 });
    if (!result.canceled) {
      setUris(result.assets.map(a => a.uri));
      setStep('date');
    }
  }

  async function pickFromGallery() {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) { Alert.alert('Permission needed', 'Please allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true, selectionLimit: 10, quality: 0.7,
    });
    if (!result.canceled && result.assets.length) {
      setUris(result.assets.map(a => a.uri));
      setStep('date');
    }
  }

  async function handleUpload() {
    setStep('uploading');
    setProgress({ done: 0, total: uris.length });
    try {
      for (let i = 0; i < uris.length; i++) {
        await uploadPhoto.mutateAsync({ uri: uris[i], photoType, photoDate: selectedDate });
        setProgress({ done: i + 1, total: uris.length });
      }
      handleClose();
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message ?? 'Please check your connection and try again.');
      setStep('tag');
    }
  }

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
      <View style={ph.backdrop}>
        <View style={ph.sheet}>
          <View style={ph.handle} />
          <View style={ph.header}>
            <Text style={ph.title}>
              {step === 'source' ? 'Add progress photos'
                : step === 'date' ? 'Which day are these from?'
                : step === 'tag' ? `Tag ${uris.length} photo${uris.length > 1 ? 's' : ''}`
                : 'Uploading…'}
            </Text>
            {step !== 'uploading' && (
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={ph.closeX}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {step === 'source' && (
            <View style={{ gap: 12, paddingTop: 6 }}>
              <TouchableOpacity style={ph.choiceCard} onPress={pickFromCamera} activeOpacity={0.85}>
                <Text style={ph.choiceIcon}>📷</Text>
                <View style={{ flex: 1 }}>
                  <Text style={ph.choiceTitle}>Take a photo</Text>
                  <Text style={ph.choiceSub}>Use your camera right now</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={ph.choiceCard} onPress={pickFromGallery} activeOpacity={0.85}>
                <Text style={ph.choiceIcon}>🖼️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={ph.choiceTitle}>Choose from gallery</Text>
                  <Text style={ph.choiceSub}>Select multiple photos at once</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {step === 'date' && (
            <View>
              <CalendarGrid selectedDate={selectedDate} onSelect={setSelectedDate} />

              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginVertical: 18, textAlign: 'center' }}>
                Selected: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>

              <TouchableOpacity style={ph.submitBtn} onPress={() => setStep('tag')} activeOpacity={0.85}>
                <Text style={ph.submitBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'tag' && (
            <View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {uris.map((u, i) => (
                    <Image key={i} source={{ uri: u }} style={{ width: 64, height: 86, borderRadius: 8, backgroundColor: THEME.colors.surface2 }} />
                  ))}
                </View>
              </ScrollView>

              <Text style={ph.fieldLabel}>What pose is this?</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
                {PHOTO_TYPES.map(pt => (
                  <TouchableOpacity
                    key={pt.type}
                    onPress={() => setPhotoType(pt.type)}
                    style={[ph.typePill, photoType === pt.type && ph.typePillActive]}
                  >
                    <Text style={{ fontSize: 14 }}>{pt.emoji}</Text>
                    <Text style={[ph.typePillText, photoType === pt.type && ph.typePillTextActive]}>{pt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={ph.submitBtn} onPress={handleUpload} activeOpacity={0.85}>
                <Text style={ph.submitBtnText}>Upload {uris.length} photo{uris.length > 1 ? 's' : ''}</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'uploading' && (
            <View style={{ alignItems: 'center', paddingVertical: 30, gap: 14 }}>
              <ActivityIndicator color={THEME.colors.teal} size="large" />
              <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13 }}>
                Uploading {progress.done} of {progress.total}…
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Full-screen photo viewer — swipe through every photo, newest first ──────
function PhotoViewer({ photos, initialIndex, visible, onClose }: {
  photos: any[]; initialIndex: number; visible: boolean; onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const deletePhoto = useDeleteProgressPhoto();
  useEffect(() => { if (visible) setIndex(initialIndex); }, [visible, initialIndex]);

  const photo = photos[index];

  function handleDelete() {
    if (!photo) return;
    Alert.alert('Delete photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deletePhoto.mutateAsync({ id: photo.id, storage_path: photo.storage_path });
          if (photos.length <= 1) onClose();
          else setIndex(i => Math.min(i, photos.length - 2));
        },
      },
    ]);
  }

  if (!photo) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <ScrollView
          horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          contentOffset={{ x: index * SCREEN_W, y: 0 }}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
        >
          {photos.map((p, i) => (
            <View key={p.id} style={{ width: SCREEN_W, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              {p.url
                ? <Image source={{ uri: p.url }} style={{ width: SCREEN_W, height: '100%' }} resizeMode="contain" />
                : <Text style={{ fontSize: 40 }}>📷</Text>}
            </View>
          ))}
        </ScrollView>

        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 54, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: '#fff', fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>{photoDateLabel(photo.photo_date)}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontFamily: THEME.fonts.sans, fontSize: 12, textTransform: 'capitalize', marginTop: 2 }}>{photo.photo_type}</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 44, paddingHorizontal: 20, alignItems: 'center' }}>
          <TouchableOpacity onPress={handleDelete} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 }}>
            <Text style={{ color: '#F87171', fontSize: 13, fontFamily: THEME.fonts.sansMedium }}>🗑  Delete photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Compare mode — pick any two photos, view side-by-side ───────────────────
function ComparePicker({ photos, onPick }: { photos: any[]; onPick: (photo: any) => void }) {
  const grouped = photos.reduce((acc: Record<string, any[]>, p) => {
    (acc[p.photo_date] ??= []).push(p);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
      {dates.map(date => (
        <View key={date} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, marginBottom: 8 }}>
            {photoDateLabel(date)}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {grouped[date].map(p => (
              <TouchableOpacity key={p.id} onPress={() => onPick(p)} activeOpacity={0.8}>
                <View style={{ width: 72, height: 96, borderRadius: 10, overflow: 'hidden', backgroundColor: THEME.colors.surface2, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                  {p.url && <Image source={{ uri: p.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}
                  <View style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 8, fontFamily: THEME.fonts.sansMedium, color: '#fff', textTransform: 'capitalize' }}>{p.photo_type}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function CompareSlot({ photo, label, onPress }: { photo: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={{ flex: 1 }} onPress={onPress} activeOpacity={0.85}>
      <View style={{ aspectRatio: 3 / 4, borderRadius: 14, overflow: 'hidden', backgroundColor: THEME.colors.surface2, borderWidth: 1, borderColor: photo ? THEME.colors.teal : THEME.colors.border, borderStyle: photo ? 'solid' : 'dashed' }}>
        {photo?.url ? (
          <Image source={{ uri: photo.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Text style={{ fontSize: 24, color: THEME.colors.textMuted }}>+</Text>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>{label}</Text>
          </View>
        )}
      </View>
      {photo && (
        <View style={{ marginTop: 6, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{photoDateLabel(photo.photo_date)}</Text>
          <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textTransform: 'capitalize' }}>{photo.photo_type}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function CompareView({ photos }: { photos: any[] }) {
  const [photoA, setPhotoA] = useState<any>(null);
  const [photoB, setPhotoB] = useState<any>(null);
  const [pickingSlot, setPickingSlot] = useState<'A' | 'B' | null>(null);

  function handlePick(photo: any) {
    if (pickingSlot === 'A') setPhotoA(photo);
    else if (pickingSlot === 'B') setPhotoB(photo);
    setPickingSlot(null);
  }

  if (!photos.length) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 48 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>📊</Text>
        <Text style={{ fontSize: 16, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center' }}>
          Add a couple of photos first to compare them.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 16, lineHeight: 18 }}>
        Pick any two photos — any date, any pose — to see them side-by-side.
      </Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <CompareSlot photo={photoA} label="Photo A" onPress={() => setPickingSlot('A')} />
        <CompareSlot photo={photoB} label="Photo B" onPress={() => setPickingSlot('B')} />
      </View>
      {(photoA || photoB) && (
        <TouchableOpacity onPress={() => { setPhotoA(null); setPhotoB(null); }} style={{ alignSelf: 'center', marginTop: 16 }}>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sansMedium, fontSize: 12 }}>Clear selection</Text>
        </TouchableOpacity>
      )}

      <Modal transparent visible={!!pickingSlot} animationType="slide" onRequestClose={() => setPickingSlot(null)} statusBarTranslucent>
        <View style={ph.backdrop}>
          <View style={ph.sheet}>
            <View style={ph.handle} />
            <View style={ph.header}>
              <Text style={ph.title}>Choose Photo {pickingSlot}</Text>
              <TouchableOpacity onPress={() => setPickingSlot(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={ph.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <ComparePicker photos={photos} onPick={handlePick} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Photos tab ────────────────────────────────────────────────────────────────
function shiftPhotoWeek(weekStart: string, delta: number) {
  const d = new Date(weekStart + 'T00:00:00');
  d.setDate(d.getDate() + delta * 7);
  return getWeekStart(d);
}

function PhotosTab() {
  const { data: photos = [], isLoading } = useProgressPhotos();
  const [mode, setMode]           = useState<'timeline' | 'week' | 'compare'>('timeline');
  const [addVisible, setAddVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [browseWeekStart, setBrowseWeekStart] = useState(() => getWeekStart());
  const [jumpVisible, setJumpVisible] = useState(false);

  // Flattened, newest-first — used by the full-screen swipe viewer.
  const flat = useMemo(() => [...photos].sort((a, b) => b.photo_date.localeCompare(a.photo_date) || b.uploaded_at?.localeCompare(a.uploaded_at)), [photos]);

  // Group photos by date for the timeline grid
  const grouped = photos.reduce((acc: Record<string, typeof photos>, photo) => {
    const date = photo.photo_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(photo);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const markedDates = useMemo(() => new Set(Object.keys(grouped)), [photos]);

  // The 7 days (Mon-Sun) of the week currently being browsed
  const weekDays = useMemo(() => {
    const start = new Date(browseWeekStart + 'T00:00:00');
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    });
  }, [browseWeekStart]);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

      {/* Prominent add button */}
      <TouchableOpacity
        onPress={() => setAddVisible(true)}
        activeOpacity={0.85}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: THEME.colors.teal, borderRadius: 16, paddingVertical: 16, marginBottom: 18, shadowColor: THEME.colors.teal, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
      >
        <Text style={{ fontSize: 18, color: '#000' }}>＋</Text>
        <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: '#000' }}>Add Photos</Text>
      </TouchableOpacity>

      {/* Privacy note */}
      <View style={{ backgroundColor: `${THEME.colors.teal}10`, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: `${THEME.colors.teal}25`, marginBottom: 18, flexDirection: 'row', gap: 10 }}>
        <Text style={{ fontSize: 14 }}>🔒</Text>
        <Text style={{ flex: 1, fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 18 }}>
          Photos are private and only visible to you and your assigned coach.
        </Text>
      </View>

      {/* Mode toggle */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 4, borderWidth: 0.5, borderColor: THEME.colors.border }}>
          {([
            { key: 'timeline', label: 'Timeline' },
            { key: 'week',     label: 'By Week' },
            { key: 'compare',  label: 'Compare' },
          ] as const).map(t => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setMode(t.key)}
              activeOpacity={0.8}
              style={{ flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9, backgroundColor: mode === t.key ? THEME.colors.teal : 'transparent' }}
            >
              <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: mode === t.key ? '#000' : THEME.colors.textMuted }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {(mode === 'timeline' || mode === 'week') && (
          <TouchableOpacity
            onPress={() => setJumpVisible(true)}
            style={{ width: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.colors.surface2, borderRadius: 12, borderWidth: 0.5, borderColor: THEME.colors.border }}
          >
            <Text style={{ fontSize: 17 }}>📅</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />
      ) : mode === 'compare' ? (
        <CompareView photos={flat} />
      ) : mode === 'week' ? (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <TouchableOpacity onPress={() => setBrowseWeekStart(w => shiftPhotoWeek(w, -1))} style={{ padding: 8 }}>
              <Text style={{ fontSize: 18, color: THEME.colors.textMuted }}>‹</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
              Week of {new Date(browseWeekStart + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
            <TouchableOpacity
              onPress={() => setBrowseWeekStart(w => shiftPhotoWeek(w, 1))}
              disabled={browseWeekStart >= getWeekStart()}
              style={{ padding: 8, opacity: browseWeekStart >= getWeekStart() ? 0.3 : 1 }}
            >
              <Text style={{ fontSize: 18, color: THEME.colors.textMuted }}>›</Text>
            </TouchableOpacity>
          </View>

          {weekDays.every(d => !grouped[d]) ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>📸</Text>
              <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>No photos this week</Text>
            </View>
          ) : (
            weekDays.filter(d => grouped[d]).map(date => (
              <View key={date} style={{ marginBottom: 22 }}>
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, marginBottom: 10 }}>
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {grouped[date].map(photo => (
                    <TouchableOpacity
                      key={photo.id}
                      activeOpacity={0.85}
                      onPress={() => setViewerIndex(flat.findIndex(p => p.id === photo.id))}
                      style={{ width: '31.5%', aspectRatio: 3 / 4, borderRadius: 12, overflow: 'hidden', backgroundColor: THEME.colors.surface2, borderWidth: 0.5, borderColor: THEME.colors.border }}
                    >
                      {photo.url ? (
                        <Image source={{ uri: photo.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 24 }}>📷</Text>
                        </View>
                      )}
                      <View style={{ position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: '#fff', textTransform: 'capitalize' }}>{photo.photo_type}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      ) : dates.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>📸</Text>
          <Text style={{ fontSize: 18, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
            No photos yet
          </Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center' }}>
            Add your first progress photo above to start tracking your visual transformation.
          </Text>
        </View>
      ) : (
        dates.map(date => (
          <View key={date} style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, marginBottom: 10 }}>
              {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {grouped[date].map(photo => (
                <TouchableOpacity
                  key={photo.id}
                  activeOpacity={0.85}
                  onPress={() => setViewerIndex(flat.findIndex(p => p.id === photo.id))}
                  style={{ width: '31.5%', aspectRatio: 3 / 4, borderRadius: 12, overflow: 'hidden', backgroundColor: THEME.colors.surface2, borderWidth: 0.5, borderColor: THEME.colors.border }}
                >
                  {photo.url ? (
                    <Image source={{ uri: photo.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 24 }}>📷</Text>
                    </View>
                  )}
                  <View style={{ position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: '#fff', textTransform: 'capitalize' }}>
                      {photo.photo_type}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))
      )}

      <AddPhotosModal visible={addVisible} onClose={() => setAddVisible(false)} />
      <PhotoViewer
        photos={flat}
        initialIndex={viewerIndex ?? 0}
        visible={viewerIndex !== null}
        onClose={() => setViewerIndex(null)}
      />

      <Modal transparent visible={jumpVisible} animationType="slide" onRequestClose={() => setJumpVisible(false)} statusBarTranslucent>
        <View style={ph.backdrop}>
          <View style={ph.sheet}>
            <View style={ph.handle} />
            <View style={ph.header}>
              <Text style={ph.title}>Jump to a date</Text>
              <TouchableOpacity onPress={() => setJumpVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={ph.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 16 }}>
              Dates with a dot have photos
            </Text>
            <CalendarGrid
              markedDates={markedDates}
              onSelect={(date) => {
                setBrowseWeekStart(getWeekStart(new Date(date + 'T00:00:00')));
                setMode('week');
                setJumpVisible(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const ph = {
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' as const },
  sheet: {
    backgroundColor: '#0E1320', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, maxHeight: '85%' as const,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', alignSelf: 'center' as const, marginBottom: 14 },
  header: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: 16 },
  title: { color: THEME.colors.textPrimary, fontSize: 16, fontFamily: THEME.fonts.sansMedium, flex: 1, marginRight: 12 },
  closeX: { color: THEME.colors.textMuted, fontSize: 16 },
  choiceCard: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: THEME.colors.border, backgroundColor: 'rgba(255,255,255,0.03)',
  },
  choiceIcon: { fontSize: 24 },
  choiceTitle: { color: THEME.colors.textPrimary, fontSize: 14, fontFamily: THEME.fonts.sansMedium, marginBottom: 2 },
  choiceSub: { color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.sans },
  fieldLabel: { color: THEME.colors.textSecondary, fontSize: 11, fontFamily: THEME.fonts.sansMedium, letterSpacing: 0.4, textTransform: 'uppercase' as const, marginBottom: 10 },
  typePill: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 18, borderWidth: 1, borderColor: THEME.colors.border, backgroundColor: 'rgba(255,255,255,0.03)',
  },
  typePillActive: { backgroundColor: `${THEME.colors.teal}25`, borderColor: THEME.colors.teal },
  typePillText: { color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.sansMedium },
  typePillTextActive: { color: THEME.colors.teal },
  submitBtn: { backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 15, alignItems: 'center' as const, marginBottom: 6 },
  submitBtnText: { color: '#000', fontSize: 15, fontFamily: THEME.fonts.sansMedium },
};

// ── Main Progress Screen ───────────────────────────────────────────────────────
export default function ProgressScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',      label: 'Overview' },
    { key: 'measurements',  label: 'Measurements' },
    { key: 'photos',        label: 'Photos' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>

      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 32 }}>Progress</Text>
      </View>

      {/* Tab bar */}
      <View style={{ flexDirection: 'row', marginHorizontal: 24, marginBottom: 20, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 4, borderWidth: 0.5, borderColor: THEME.colors.border }}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: activeTab === tab.key ? THEME.colors.teal : 'transparent' }}
          >
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: activeTab === tab.key ? THEME.colors.background : THEME.colors.textMuted }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'overview'     && <OverviewTab />}
        {activeTab === 'measurements' && <MeasurementsTab />}
        {activeTab === 'photos'       && <PhotosTab />}
      </View>

    </SafeAreaView>
  );
}
