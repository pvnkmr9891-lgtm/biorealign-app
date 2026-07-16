import React from 'react';
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image, Modal,
  KeyboardAvoidingView, Platform, Animated, Dimensions, Keyboard,
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useActiveEnrollment, useProgressHistory, useMyCheckinVitals } from '@/hooks/useClient';
import { useAuth } from '@/hooks/useAuth';
import { useBodyMetrics, useLatestBodyMetric, useSaveBodyMetrics, useDeleteBodyMetric, useWeekBodyMetric, useProgressPhotos, useUploadProgressPhoto, useDeleteProgressPhoto, useSetPhotoVisibility, useSetAllPhotosVisibility, useMyNutritionTrend, useMyOopsTrend } from '@/hooks/useProgress';
import { useMyTrainingLoadScores } from '@/hooks/useTrainingLoad';
import { useWeeklyAlignment, useAlignmentHistory, DayScore } from '@/hooks/useAlignmentScore';
import { LineChart } from '@/components/ui/LineChart';
import { MetricTrendChart } from '@/components/ui/MetricTrendChart';
import { NutritionTrendChart } from '@/components/coach/NutritionTrendChart';
import { TrainingLoadSection } from '@/components/ui/TrainingLoadSection';
import { SupplementCalendarTracker } from '@/components/supplements/SupplementCalendarTracker';
import { THEME } from '@/constants/theme';
import { getWeekStart } from '@/hooks/useManualLog';
import { CalendarGrid } from '@/components/ui/CalendarGrid';
import { WeekStatusStrip } from '@/components/ui/WeekStatusStrip';
import { ConsistencyHeatmap } from '@/components/ui/ConsistencyHeatmap';

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
      <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 36 }}>{val}</Text>
      {d != null && (
        <Text style={{ fontFamily: THEME.fonts.sansMedium, fontSize: 13, marginTop: 4, color: deltaColor(d) }}>
          {d > 0 ? `+${d}` : d < 0 ? `${d}` : '—'} vs prev
        </Text>
      )}
    </View>
  );
}

// ── Section header — groups related widgets under one clear label ────────────
function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 24, marginTop: 28, marginBottom: 12 }}>
      <Text style={{ fontSize: 17 }}>{icon}</Text>
      <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{title}</Text>
    </View>
  );
}

// ── Segmented control — small pill switcher used inside cards ────────────────
function SegmentedControl<T extends string>({ options, value, onChange }: {
  options: { key: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: THEME.colors.surface3, borderRadius: 20, padding: 3, gap: 2, marginBottom: 16, alignSelf: 'flex-start' }}>
      {options.map(opt => {
        const active = opt.key === value;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.8}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: active ? THEME.colors.teal : 'transparent' }}
          >
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: active ? '#000' : THEME.colors.textMuted }}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
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

function AlignmentTrendLine({ data, bare = false }: { data: DayScore[]; bare?: boolean }) {
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

  const content = (
    <>
      <View style={{ flexDirection: 'row', justifyContent: bare ? 'flex-end' : 'space-between', alignItems: 'center', marginBottom: 14 }}>
        {!bare && <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>14-Day Alignment Trend</Text>}
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
    </>
  );

  if (bare) return content;

  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
      {content}
    </View>
  );
}

// ── Weekly Alignment Card ─────────────────────────────────────────────────────
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function WeeklyAlignmentCard({
  days, weekStart, onPrev, onNext, isCurrentWeek, bare = false,
}: {
  days: { day: number; score: number | null; workoutPct: number; waterPct: number; foodPct: number }[];
  weekStart: string;
  onPrev: () => void;
  onNext: () => void;
  isCurrentWeek: boolean;
  bare?: boolean;
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

  const content = (
    <>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: bare ? 'flex-end' : 'space-between', alignItems: 'center', marginBottom: 6 }}>
        {!bare && (
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Weekly Alignment
          </Text>
        )}
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
                <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sansMedium, color: barColor, marginTop: 3 }}>
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
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
                {c.icon} {c.label}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: c.color }}>{c.pct}%</Text>
            </View>
            <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${c.pct}%`, backgroundColor: c.color, borderRadius: 3 }} />
            </View>
          </View>
        ))}
      </View>
    </>
  );

  if (bare) return content;

  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
      {content}
    </View>
  );
}

// ── Consistency section — one card, one "did I show up" question, answered at
//    3 zoom levels via a segmented switch instead of 3 permanently-stacked cards ─
type ConsistencyView = 'week' | '14day' | '12week';

function ConsistencySection({
  weekAlignment, selectedWeekStart, onPrevWeek, onNextWeek, isCurrentWeek, alignHistory14, alignHistory84,
}: {
  weekAlignment: { day: number; score: number | null; workoutPct: number; waterPct: number; foodPct: number }[];
  selectedWeekStart: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  isCurrentWeek: boolean;
  alignHistory14: DayScore[];
  alignHistory84: DayScore[];
}) {
  const [view, setView] = useState<ConsistencyView>('week');
  const has14Day = alignHistory14.filter(d => d.score !== null).length >= 2;

  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
      <SegmentedControl
        options={[
          { key: 'week' as const, label: 'This Week' },
          { key: '14day' as const, label: '14 Days' },
          { key: '12week' as const, label: '12 Weeks' },
        ]}
        value={view}
        onChange={setView}
      />
      {view === 'week' && (
        <WeeklyAlignmentCard
          bare
          days={weekAlignment}
          weekStart={selectedWeekStart}
          onPrev={onPrevWeek}
          onNext={onNextWeek}
          isCurrentWeek={isCurrentWeek}
        />
      )}
      {view === '14day' && (
        has14Day
          ? <AlignmentTrendLine bare data={alignHistory14} />
          : <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13, textAlign: 'center', paddingVertical: 24 }}>Not enough logged days yet for a 14-day trend.</Text>
      )}
      {view === '12week' && <ConsistencyHeatmap bare data={alignHistory84} />}
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
function OverviewTab({ onGoToMeasurements }: { onGoToMeasurements: () => void }) {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week…

  const { user } = useAuth();
  const { data: enrollment } = useActiveEnrollment();
  const { data: history = [], isLoading } = useProgressHistory(20);
  const { data: checkinVitals = [] } = useMyCheckinVitals();
  const { data: bodyHistory = [] } = useBodyMetrics(10);
  const { data: nutritionTrend = [] } = useMyNutritionTrend();
  const { data: oopsTrend = [] }      = useMyOopsTrend();
  const { data: trainingLoad } = useMyTrainingLoadScores();
  const [nutritionView, setNutritionView] = useState<'total' | 'oops'>('total');
  // Score Trend toggle — 'scores' = computed Fitness/Recovery/Longevity
  // (0-100), 'raw' = the actual Mood/Energy/Sleep/Pain numbers the client
  // entered at check-in. Raw values are normalized to 0-100 for the shared
  // chart's fixed y-axis (LineChart only ever renders a 0-100 scale), with
  // each metric's real scale noted in its legend label and the latest day's
  // actual figures shown as a stat row underneath.
  const [scoreView, setScoreView] = useState<'scores' | 'raw'>('scores');

  const selectedWeekStart = getOffsetWeekStart(weekOffset);
  const { data: weekAlignment = [] } = useWeeklyAlignment(selectedWeekStart);
  const { data: alignHistory84 = [] } = useAlignmentHistory(84);
  const alignHistory14 = alignHistory84.slice(-14);

  const isCurrentWeek = weekOffset === 0;

  const latest   = history[history.length - 1] ?? null;
  const previous = history[history.length - 2] ?? null;
  const latestBody   = bodyHistory[bodyHistory.length - 1] ?? null;
  const previousBody = bodyHistory[bodyHistory.length - 2] ?? null;

  // Filter to the selected week (Mon-Sat, same boundary used everywhere else
  // in the app) for the Score Trend chart — always, including the current
  // week. Used to dump the client's ENTIRE history (up to 20 points) onto
  // this one chart whenever weekOffset was 0, which crammed that many date
  // labels onto the x-axis until they overlapped and became illegible. Now
  // every week (reachable via the ‹ › arrows) shows at most 6 cleanly
  // spaced points, same as any other week.
  const weekEnd = (() => {
    const d = new Date(selectedWeekStart + 'T00:00:00');
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  })();
  const weekHistory = history.filter(m => {
    const d = m.recorded_at?.split('T')[0];
    return d >= selectedWeekStart && d <= weekEnd;
  });
  const weekVitals = checkinVitals.filter(v => v.date >= selectedWeekStart && v.date <= weekEnd);

  // Week range label for trend chart header
  const wStart = new Date(selectedWeekStart + 'T00:00:00');
  const wEnd2  = new Date(selectedWeekStart + 'T00:00:00'); wEnd2.setDate(wStart.getDate() + 5);
  const fmt    = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const weekLabel = isCurrentWeek ? 'This week' : `${fmt(wStart)} – ${fmt(wEnd2)}`;

  const displayHistory = weekHistory;

  const labels = displayHistory.map(m =>
    new Date(m.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  );
  const rawLabels = weekVitals.map(v =>
    new Date(v.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  );

  const SERIES = [
    { key: 'fitness_score',   label: 'Fitness',   color: THEME.scoreColors.fitness,   data: displayHistory.map(m => m.fitness_score   ?? 0) },
    { key: 'recovery_score',  label: 'Recovery',  color: THEME.scoreColors.recovery,  data: displayHistory.map(m => m.recovery_score  ?? 0) },
    { key: 'longevity_score', label: 'Longevity', color: THEME.scoreColors.longevity, data: displayHistory.map(m => m.longevity_score ?? 0) },
  ];

  const RAW_SERIES = [
    { key: 'mood',   label: 'Mood (/10)',   color: THEME.scoreColors.fitness,   data: weekVitals.map(v => Math.round(((v.mood ?? 0) / 10) * 100)) },
    { key: 'energy', label: 'Energy (/12)', color: THEME.colors.amber,          data: weekVitals.map(v => Math.round(((v.energy ?? 0) / 12) * 100)) },
    { key: 'sleep',  label: 'Sleep (hrs)',  color: THEME.scoreColors.recovery,  data: weekVitals.map(v => Math.round((Math.min(v.sleep_hrs ?? 0, 12) / 12) * 100)) },
    { key: 'pain',   label: 'Pain (/12)',   color: '#F87171',                   data: weekVitals.map(v => Math.round(((v.pain_level ?? 0) / 12) * 100)) },
  ];
  const latestVital = weekVitals[weekVitals.length - 1] ?? null;

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

      {/* Your Scores — the 3 headline numbers, plus their trend over time */}
      <SectionHeader icon="🎯" title="Your Scores" />
      <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 24, marginBottom: 20 }}>
        <ScoreCard label="Fitness"   current={latest?.fitness_score   ?? null} previous={previous?.fitness_score   ?? null} color={THEME.scoreColors.fitness} />
        <ScoreCard label="Recovery"  current={latest?.recovery_score  ?? null} previous={previous?.recovery_score  ?? null} color={THEME.scoreColors.recovery} />
        <ScoreCard label="Longevity" current={latest?.longevity_score ?? null} previous={previous?.longevity_score ?? null} color={THEME.scoreColors.longevity} />
      </View>

      {/* Score trend chart */}
      <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
        {/* Score trend header + Scores/Raw toggle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Score trend
          </Text>
          <View style={{ flexDirection: 'row', backgroundColor: THEME.colors.surface3, borderRadius: 20, padding: 3, gap: 2 }}>
            {(['scores', 'raw'] as const).map(v => (
              <TouchableOpacity
                key={v}
                onPress={() => setScoreView(v)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16,
                  backgroundColor: scoreView === v ? THEME.colors.teal : 'transparent',
                }}
                activeOpacity={0.8}
              >
                <Text style={{
                  fontSize: 11, fontFamily: THEME.fonts.sansMedium,
                  color: scoreView === v ? '#000' : THEME.colors.textMuted,
                }}>
                  {v === 'scores' ? 'Scores' : 'Raw'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Week nav — same ‹ › pair drives both views */}
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

        {scoreView === 'scores' ? (
          <>
            {isLoading || displayHistory.length < 2 ? (
              <View style={{ height: 160, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13 }}>
                  {isLoading ? 'Loading…' : 'No check-in data for this week'}
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
          </>
        ) : (
          <>
            {weekVitals.length < 2 ? (
              <View style={{ height: 160, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13 }}>
                  No check-in data for this week
                </Text>
              </View>
            ) : (
              <LineChart series={RAW_SERIES} labels={rawLabels} height={180} showDots={weekVitals.length <= 8} />
            )}
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
              {RAW_SERIES.map(s => (
                <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 16, height: 2.5, borderRadius: 1.5, backgroundColor: s.color }} />
                  <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12 }}>{s.label}</Text>
                </View>
              ))}
            </View>
            {/* Lines above are normalized to fit the shared 0-100 chart scale
                (each metric has its own real range — see legend) — actual
                figures from the most recent logged day in this week: */}
            {latestVital && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, paddingTop: 14, borderTopWidth: 0.5, borderTopColor: THEME.colors.border }}>
                <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11 }}>
                  Latest ({new Date(latestVital.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}):{'  '}
                  Mood {latestVital.mood ?? '–'}/10 · Energy {latestVital.energy ?? '–'}/12 · Sleep {latestVital.sleep_hrs ?? '–'}h · Pain {latestVital.pain_level ?? '–'}/12
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Training Load — daily Cardio / Strength / Mobility scores derived from workout logs.
          Distinct from the coach-administered 8-domain Fitness Assessment — this updates
          automatically every time a workout is logged. */}
      {trainingLoad && (
        <>
          <SectionHeader icon="💪" title="Training Load" />
          <View style={{ marginHorizontal: 24, marginBottom: 6 }}>
            <TrainingLoadSection data={trainingLoad} />
          </View>
        </>
      )}

      {/* Consistency — "did I show up" at 3 zoom levels (week / 14-day / 12-week),
          one card with a switch instead of 3 permanently-stacked charts */}
      <SectionHeader icon="🔥" title="Consistency" />
      <ConsistencySection
        weekAlignment={weekAlignment}
        selectedWeekStart={selectedWeekStart}
        onPrevWeek={() => setWeekOffset(o => o - 1)}
        onNextWeek={() => setWeekOffset(o => o + 1)}
        isCurrentWeek={isCurrentWeek}
        alignHistory14={alignHistory14}
        alignHistory84={alignHistory84}
      />

      {/* Nutrition & Supplements */}
      <SectionHeader icon="🥗" title="Nutrition & Supplements" />

      {/* Nutrition Trend — toggles between Total and Oops (confession booth) */}
      <View style={{
        marginHorizontal: 24, borderRadius: 14, padding: 20, marginBottom: 16,
        borderWidth: nutritionView === 'oops' ? 1 : 0.5,
        borderColor: nutritionView === 'oops' ? 'rgba(249,115,22,0.4)' : THEME.colors.border,
        backgroundColor: nutritionView === 'oops' ? 'rgba(249,115,22,0.05)' : THEME.colors.surface2,
      }}>
        {/* Header row with toggle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ color: nutritionView === 'oops' ? '#F97316' : THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', flex: 1 }}>
            {nutritionView === 'oops' ? 'Oops Trend 🙈' : 'Nutrition Trend'}
          </Text>
          {/* Toggle pill */}
          <View style={{ flexDirection: 'row', backgroundColor: THEME.colors.surface3, borderRadius: 20, padding: 3, gap: 2 }}>
            {(['total', 'oops'] as const).map(v => (
              <TouchableOpacity
                key={v}
                onPress={() => setNutritionView(v)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16,
                  backgroundColor: nutritionView === v
                    ? (v === 'oops' ? '#F97316' : THEME.colors.teal)
                    : 'transparent',
                }}
                activeOpacity={0.8}
              >
                <Text style={{
                  fontSize: 11, fontFamily: THEME.fonts.sansMedium,
                  color: nutritionView === v ? '#000' : THEME.colors.textMuted,
                }}>
                  {v === 'total' ? 'Total' : 'Oops 🙈'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {nutritionView === 'total' ? (
          <NutritionTrendChart points={nutritionTrend} />
        ) : oopsTrend.length === 0 ? (
          <View style={{ paddingVertical: 32, alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 36 }}>🥗</Text>
            <Text style={{ color: '#F97316', fontFamily: THEME.fonts.sansMedium, fontSize: 14, textAlign: 'center' }}>
              Clean as a whistle.
            </Text>
            <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 }}>
              No confession booth entries this period.{'\n'}Either you're eating perfectly or hiding it very well.
            </Text>
          </View>
        ) : (
          <NutritionTrendChart points={oopsTrend} accentColor="#F97316" />
        )}
      </View>

      {/* Supplement calendar — one full-month calendar per supplement,
          green = completed, red = assigned but not checked off. */}
      {user?.id && (
        <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 }}>
            Supplement Tracker
          </Text>
          <SupplementCalendarTracker clientId={user.id} />
        </View>
      )}

      {/* Body — posture score here since it's a computed score like Fitness/Recovery/
          Longevity; detailed body metrics (weight, waist, etc.) live in Measurements —
          this teaser just points there instead of repeating the same numbers a 3rd time */}
      {(latest?.posture_score != null || latestBody) && (
        <SectionHeader icon="📐" title="Body" />
      )}

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

      {/* Lightweight current-weight teaser — full body metrics (weight, waist, hips,
          chest, push-ups, plank, squats) and their trend already live in Measurements;
          this just surfaces the latest weight + a direct link instead of repeating the
          full picker/chart and body-snapshot grid a 2nd and 3rd time */}
      {latestBody?.weight_kg != null && (
        <TouchableOpacity
          onPress={onGoToMeasurements}
          activeOpacity={0.8}
          style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View>
            <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Current weight</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 32 }}>{latestBody.weight_kg}</Text>
              <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 14 }}>kg</Text>
              {(() => {
                const d = delta(latestBody.weight_kg, previousBody?.weight_kg ?? null, true);
                return d != null && d !== 0 ? (
                  <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: deltaColor(d, true), marginLeft: 4 }}>
                    {d > 0 ? '+' : ''}{Math.round(d * 10) / 10} vs prev
                  </Text>
                ) : null;
              })()}
            </View>
          </View>
          <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>Measurements ›</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ── Trend Analysis — metric picker + chart across all logged weeks ──────────
// Mirrors the coach/admin profile's Measurements tab (ClientProfileView.tsx)
// so clients get the same "pick a metric, see it charted" view of their own data.
const TREND_METRIC_FIELDS: { key: string; label: string; icon: string; suffix: string; color: string }[] = [
  { key: 'weight_kg', label: 'Weight', icon: '⚖️', suffix: 'kg', color: '#60A5FA' },
  { key: 'body_fat_pct', label: 'Body fat', icon: '🔥', suffix: '%', color: THEME.colors.amber },
  { key: 'waist_cm', label: 'Waist', icon: '📐', suffix: 'cm', color: '#C084FC' },
  { key: 'hips_cm', label: 'Hips', icon: '📐', suffix: 'cm', color: '#F472B6' },
  { key: 'chest_cm', label: 'Chest', icon: '📐', suffix: 'cm', color: THEME.colors.teal },
  { key: 'pushup_count', label: 'Push-ups', icon: '🤸', suffix: '', color: THEME.colors.success ?? '#4CC986' },
  { key: 'plank_seconds', label: 'Plank', icon: '⏱️', suffix: 's', color: '#FB923C' },
  { key: 'squat_reps', label: 'Squats', icon: '🦵', suffix: '', color: '#818CF8' },
];

function TrendAnalysisCard({ history }: { history: any[] }) {
  const [selectedMetric, setSelectedMetric] = useState('weight_kg');
  // `history` from useBodyMetrics is already ascending (oldest → newest) —
  // do NOT reverse here, that would plot current dates on the left.
  const availableMetrics = TREND_METRIC_FIELDS.filter((f) => history.some((m) => m[f.key] != null));
  const activeField = availableMetrics.find((f) => f.key === selectedMetric) ?? availableMetrics[0];

  if (!availableMetrics.length) return null;

  const trendPoints = history
    .filter((m) => m[activeField.key] != null)
    .map((m) => ({ date: m.recorded_date, value: Number(m[activeField.key]) }));

  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
      <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 }}>
        Trend Analysis
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 6 }}>
        {availableMetrics.map((f) => {
          const active = f.key === activeField.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setSelectedMetric(f.key)}
              style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9, backgroundColor: active ? f.color : '#1A1A1E' }}
            >
              <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: active ? THEME.colors.background : THEME.colors.textSecondary }}>{f.icon} {f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <MetricTrendChart points={trendPoints} color={activeField.color} unit={activeField.suffix} />
    </View>
  );
}

// ── Since-you-started summary — first-ever entry vs latest, per metric ───────
function SinceStartSummary({ history }: { history: any[] }) {
  if (history.length < 2) return null;
  const first = history[0];
  const latest = history[history.length - 1];

  const rows = TREND_METRIC_FIELDS
    .map((f) => {
      const startVal = first[f.key];
      const nowVal = latest[f.key];
      if (startVal == null || nowVal == null) return null;
      const delta = Number(nowVal) - Number(startVal);
      if (delta === 0) return null;
      return { ...f, delta };
    })
    .filter(Boolean) as (typeof TREND_METRIC_FIELDS[number] & { delta: number })[];

  if (rows.length === 0) return null;
  const daysSince = Math.round((new Date(latest.recorded_date).getTime() - new Date(first.recorded_date).getTime()) / 86400000);

  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
      <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
        Since you started · {daysSince}d ago
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {rows.map((r) => {
          // For most body-composition metrics a decrease is the goal; for
          // strength benchmarks (reps/seconds) an increase is the goal.
          const isStrength = ['pushup_count', 'plank_seconds', 'squat_reps'].includes(r.key);
          const isGood = isStrength ? r.delta > 0 : r.delta < 0;
          return (
            <View key={r.key} style={{ flexBasis: '47%', backgroundColor: THEME.colors.surface3, borderRadius: 10, padding: 10 }}>
              <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{r.icon} {r.label}</Text>
              <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: isGood ? (THEME.colors.success ?? '#4CC986') : THEME.colors.amber, marginTop: 3 }}>
                {r.delta > 0 ? '+' : ''}{Math.round(r.delta * 10) / 10}{r.suffix}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Weekly Log — full history list, tap to expand each week's full readout ──
function WeeklyLogSection({ history }: { history: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  if (!history.length) return null;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>Weekly Log</Text>
      {history.map((m, idx) => {
        const prev = history[idx + 1];
        const isOpen = expandedId === m.id || (expandedId === null && idx === 0);
        return (
          <View key={m.id} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 10, overflow: 'hidden' }}>
            <TouchableOpacity onPress={() => setExpandedId(isOpen ? '' : m.id)} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 13.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
                  {new Date(m.recorded_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
                {idx === 0 && (
                  <View style={{ backgroundColor: `${THEME.colors.teal}20`, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>LATEST</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                {m.weight_kg ? `${m.weight_kg}kg` : '—'} {isOpen ? '▾' : '▸'}
              </Text>
            </TouchableOpacity>

            {isOpen && (
              <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {TREND_METRIC_FIELDS.filter((f) => m[f.key] != null).map((f) => {
                    const d = prev?.[f.key] != null ? Number(m[f.key]) - Number(prev[f.key]) : null;
                    return (
                      <View key={f.key} style={{ flexBasis: '47%', backgroundColor: '#1A1A1E', borderRadius: 10, padding: 10 }}>
                        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{f.icon} {f.label}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 3 }}>
                          <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{m[f.key]}{f.suffix}</Text>
                          {d != null && d !== 0 && (
                            <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: d > 0 ? THEME.colors.amber : (THEME.colors.success ?? '#4CC986') }}>
                              {d > 0 ? '▲' : '▼'} {Math.abs(Math.round(d * 10) / 10)}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
                {m.notes && <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 10, fontStyle: 'italic' }}>"{m.notes}"</Text>}
              </View>
            )}
          </View>
        );
      })}
    </View>
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
  // High limit so "since you started" reaches the true first-ever entry, not
  // just the last 20 weeks — body_metrics is one row/week so this is cheap.
  const { data: history = [] } = useBodyMetrics(260);
  const saveMetrics = useSaveBodyMetrics();
  const deleteMetrics = useDeleteBodyMetric();

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

  // Snapshot of what pre-fill just set, so Save can detect "nothing was
  // edited" and confirm before recording last week's numbers as if they
  // were freshly measured this week.
  const [prefillSnapshot, setPrefillSnapshot] = useState<Record<string, string> | null>(null);

  // Populate fields whenever the selected week changes or data loads/changes.
  // Must depend on selectedWeekStart AND both data IDs — if user is on week N-1
  // then navigates to current week N (no entry yet), source becomes prevWeekData
  // which has the same .id as before; only selectedWeekStart is different there,
  // but we also need prevWeekData?.id so the pre-fill fires after data loads.
  useEffect(() => {
    const next = {
      weight:     String(source?.weight_kg         ?? ''),
      bodyFat:    String(source?.body_fat_pct     ?? ''),
      waist:      String(source?.waist_cm           ?? ''),
      hips:       String(source?.hips_cm             ?? ''),
      chest:      String(source?.chest_cm           ?? ''),
      leftArm:    String(source?.left_arm_cm      ?? ''),
      rightArm:   String(source?.right_arm_cm    ?? ''),
      leftThigh:  String(source?.left_thigh_cm  ?? ''),
      rightThigh: String(source?.right_thigh_cm ?? ''),
      pushups:    String(source?.pushup_count     ?? ''),
      plank:      String(source?.plank_seconds      ?? ''),
      squats:     String(source?.squat_reps        ?? ''),
      notes:      source?.notes ?? '',
    };
    setWeight(next.weight);
    setBodyFat(next.bodyFat);
    setWaist(next.waist);
    setHips(next.hips);
    setChest(next.chest);
    setLeftArm(next.leftArm);
    setRightArm(next.rightArm);
    setLeftThigh(next.leftThigh);
    setRightThigh(next.rightThigh);
    setPushups(next.pushups);
    setPlank(next.plank);
    setSquats(next.squats);
    setNotes(next.notes);
    setSaved(false);
    setPrefillSnapshot(isPrefilled ? next : null);
  }, [selectedWeekStart, thisWeekData?.id, prevWeekData?.id]);

  const p = (v: string) => parseFloat(v) || undefined;
  const n = (v: string) => parseInt(v)   || undefined;

  // Body-composition fields only — strength benchmarks (reps/seconds) can
  // legitimately jump a lot week to week and shouldn't trigger a warning.
  const OUTLIER_CHECKS: { field: string; label: string; value: string; prev: number | null | undefined; kind: 'abs' | 'pct'; threshold: number }[] = [
    { field: 'weight_kg',      label: 'Weight',     value: weight,     prev: prevWeekData?.weight_kg,      kind: 'abs', threshold: 8 },
    { field: 'body_fat_pct',   label: 'Body fat',   value: bodyFat,    prev: prevWeekData?.body_fat_pct,    kind: 'abs', threshold: 8 },
    { field: 'waist_cm',       label: 'Waist',      value: waist,      prev: prevWeekData?.waist_cm,        kind: 'pct', threshold: 20 },
    { field: 'hips_cm',        label: 'Hips',       value: hips,       prev: prevWeekData?.hips_cm,         kind: 'pct', threshold: 20 },
    { field: 'chest_cm',       label: 'Chest',      value: chest,      prev: prevWeekData?.chest_cm,        kind: 'pct', threshold: 20 },
    { field: 'left_arm_cm',    label: 'Left arm',   value: leftArm,    prev: prevWeekData?.left_arm_cm,     kind: 'pct', threshold: 20 },
    { field: 'right_arm_cm',   label: 'Right arm',  value: rightArm,   prev: prevWeekData?.right_arm_cm,    kind: 'pct', threshold: 20 },
    { field: 'left_thigh_cm',  label: 'Left thigh', value: leftThigh,  prev: prevWeekData?.left_thigh_cm,   kind: 'pct', threshold: 20 },
    { field: 'right_thigh_cm', label: 'Right thigh',value: rightThigh, prev: prevWeekData?.right_thigh_cm,  kind: 'pct', threshold: 20 },
  ];

  function findOutliers(): string[] {
    const warnings: string[] = [];
    for (const c of OUTLIER_CHECKS) {
      const val = parseFloat(c.value);
      if (isNaN(val) || c.prev == null) continue;
      const delta = val - c.prev;
      const flagged = c.kind === 'abs' ? Math.abs(delta) > c.threshold : Math.abs(delta) / c.prev * 100 > c.threshold;
      if (flagged) warnings.push(`${c.label}: ${c.prev} → ${val} (${delta > 0 ? '+' : ''}${Math.round(delta * 10) / 10})`);
    }
    return warnings;
  }

  const isUnchangedFromPrefill = !!prefillSnapshot && (
    prefillSnapshot.weight === weight && prefillSnapshot.bodyFat === bodyFat &&
    prefillSnapshot.waist === waist && prefillSnapshot.hips === hips && prefillSnapshot.chest === chest &&
    prefillSnapshot.leftArm === leftArm && prefillSnapshot.rightArm === rightArm &&
    prefillSnapshot.leftThigh === leftThigh && prefillSnapshot.rightThigh === rightThigh &&
    prefillSnapshot.pushups === pushups && prefillSnapshot.plank === plank && prefillSnapshot.squats === squats &&
    prefillSnapshot.notes === notes
  );

  const doSave = async () => {
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

  const handleSave = () => {
    if (isUnchangedFromPrefill) {
      Alert.alert(
        "Same as last week",
        "These numbers match last week's entry unchanged — save anyway?",
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Save anyway', onPress: doSave }]
      );
      return;
    }
    const outliers = findOutliers();
    if (outliers.length > 0) {
      Alert.alert(
        'Big jump vs last week',
        `${outliers.join('\n')}\n\nDouble-check these aren't typos.`,
        [{ text: 'Fix it', style: 'cancel' }, { text: 'Save anyway', onPress: doSave }]
      );
      return;
    }
    doSave();
  };

  const handleClearWeek = () => {
    Alert.alert(
      'Clear this week\'s entry?',
      'This removes everything logged for this week. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear', style: 'destructive',
          onPress: async () => {
            await deleteMetrics.mutateAsync(selectedWeekStart);
          },
        },
      ]
    );
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
          <TouchableOpacity onPress={() => { Keyboard.dismiss(); setWeekOffset(w => w - 1); }} activeOpacity={0.7}
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
            onPress={() => { Keyboard.dismiss(); setWeekOffset(w => w + 1); }}
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
            onSelect={(wk) => { Keyboard.dismiss(); onSelectWeek(wk); }}
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
            <TouchableOpacity onPress={handleClearWeek} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: '#F87171' }}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {loadingThis ? (
          <View style={{ height: 200, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={THEME.colors.teal} />
          </View>
        ) : (
          // Keyed by week so every TextInput below fully remounts on
          // navigation instead of reusing its native EditText — Android's
          // controlled TextInput can silently stop syncing to a new `value`
          // prop while still focused, which is what made the fields look
          // "stuck" when navigating weeks with the keyboard still up.
          <React.Fragment key={selectedWeekStart}>
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
          </React.Fragment>
        )}

        {/* Trends — since-you-started, the metric-picker chart, and the full
            weekly log. Moved below the entry form: the week picker up top
            signals "you're editing this week", so the form for that week
            should be the very next thing, not an all-time chart unrelated
            to whichever week you just navigated to. */}
        {!loadingThis && (
          <>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 8, marginBottom: 12 }}>Trends</Text>
            <SinceStartSummary history={history} />
            <TrendAnalysisCard history={history} />
            <WeeklyLogSection history={history} />
          </>
        )}

      </ScrollView>

      {/* Save button — this screen's route already reserves ~100px of bottom
          clearance for the floating dock (see the default Stack.Screen
          contentStyle in _layout.tsx), so `bottom: 0` here already sits just
          above the dock. Adding TAB_BAR_CLEARANCE (~104-116px) again on top
          of that double-reserved the gap, pushing the button much higher
          than needed — this is just a small aesthetic gap now. */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: THEME.colors.background, borderTopWidth: 0.5, borderTopColor: THEME.colors.border, paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 20 }}>
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
  const setVisibility = useSetPhotoVisibility();
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

        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 44, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => setVisibility.mutate({ id: photo.id, visible: !photo.visible_to_coach })}
            disabled={setVisibility.isPending}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 }}
          >
            <Text style={{ color: photo.visible_to_coach ? THEME.colors.teal : 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: THEME.fonts.sansMedium }}>
              {photo.visible_to_coach ? '👁  Coach can see' : '🙈  Hidden from coach'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 }}>
            <Text style={{ color: '#F87171', fontSize: 13, fontFamily: THEME.fonts.sansMedium }}>🗑  Delete</Text>
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

// ── Simple pill switch — matches the app's custom-toggle look rather than
//    the OS-default <Switch/>, which clashes with the dark themed UI ────────
function PillSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity
      onPress={() => onChange(!value)}
      activeOpacity={0.8}
      style={{
        width: 46, height: 26, borderRadius: 13, padding: 3,
        backgroundColor: value ? THEME.colors.teal : 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
      }}
    >
      <View style={{
        width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
        alignSelf: value ? 'flex-end' : 'flex-start',
      }} />
    </TouchableOpacity>
  );
}

function PhotosTab() {
  const { data: photos = [], isLoading } = useProgressPhotos();
  const setAllVisibility = useSetAllPhotosVisibility();
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

      {/* Privacy Mode — bulk switch. ON when every photo is currently hidden
          from the coach; flipping it bulk-sets all photos at once. Individual
          photos can still be toggled one by one afterward (see the "Coach can
          see / Hidden from coach" control on each photo below), which is why
          this reflects live data instead of being a separately stored flag. */}
      {photos.length > 0 && (() => {
        const allHidden = photos.every((p) => !p.visible_to_coach);
        return (
          <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 18 }}>{allHidden ? '🔒' : '🔓'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Privacy Mode</Text>
              <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2, lineHeight: 16 }}>
                {allHidden
                  ? 'All photos hidden from your coach.'
                  : 'Your coach can see photos you haven\'t hidden individually.'}
              </Text>
            </View>
            <PillSwitch
              value={allHidden}
              onChange={(turningPrivacyOn) => setAllVisibility.mutate(!turningPrivacyOn)}
            />
          </View>
        );
      })()}

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
                      {!photo.visible_to_coach && (
                        <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10 }}>🙈</Text>
                        </View>
                      )}
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
                  {!photo.visible_to_coach && (
                    <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10 }}>🙈</Text>
                    </View>
                  )}
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
        {activeTab === 'overview'     && <OverviewTab onGoToMeasurements={() => setActiveTab('measurements')} />}
        {activeTab === 'measurements' && <MeasurementsTab />}
        {activeTab === 'photos'       && <PhotosTab />}
      </View>

    </SafeAreaView>
  );
}
