import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
const AnimatedArc = Animated.createAnimatedComponent(Circle);
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  useActiveEnrollment,
  useTodayCheckin,
} from '@/hooks/useClient';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { AlignmentRing } from '@/components/ui/AlignmentRing';
import { THEME } from '@/constants/theme';
import { TAB_BAR_CLEARANCE } from '@/components/ui/SlidingTabBar';
import { PROGRAMS } from '@/constants/programs';
import { PROGRAMS_ENABLED } from '@/constants/featureFlags';
import { useAlignmentForDate, useWeeklyAlignment, computeDay, useAlignmentHistory, scoreToTier, TIER_META } from '@/hooks/useAlignmentScore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRebuildStreak } from '@/hooks/useStreakSystem';
import { getWeekStart } from '@/hooks/useManualLog';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';

// ── Local date string helper (YYYY-MM-DD in local time) ───────────────────────
function localDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ── Check-in + scores for a specific date ─────────────────────────────────────
function useScoreForDate(dateStr: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['client', user?.id, 'score_for_date', dateStr],
    enabled: !!user?.id && !!dateStr,
    queryFn: async () => {
      const { data: checkin } = await supabase
        .from('daily_checkins')
        .select('mood, energy, sleep_hrs, pain_level')
        .eq('client_id', user!.id)
        .eq('date', dateStr)
        .maybeSingle();

      if (!checkin) return { fitnessScore: 0, recoveryScore: 0, longevityScore: 0, energyPct: 0, hasCheckin: false };

      const moodNorm     = ((checkin.mood - 1) / 9) * 10;
      const energyNorm   = (checkin.energy / 12) * 10;
      const sleepNorm    = Math.min((checkin.sleep_hrs / 8) * 10, 10);
      const painInvert   = 10 - Math.min((checkin.pain_level / 12) * 10, 10);
      const recoveryScore = Math.round(
        (moodNorm * 0.25 + energyNorm * 0.25 + sleepNorm * 0.35 + painInvert * 0.15) * 10
      );
      const fitnessScore = Math.round((energyNorm * 0.6 + moodNorm * 0.4) * 10);
      const longevityScore = Math.round(fitnessScore * 0.4 + recoveryScore * 0.6);
      const energyPct = Math.round((checkin.energy / 12) * 100);
      return { fitnessScore, recoveryScore, longevityScore, energyPct, hasCheckin: true };
    },
  });
}

// ── Total distinct days logged with alignment score ≥ 45% (amber or better) ──
// Two corrections applied beyond simple (week_start_date, day_number) counting:
// 1. Map to actual calendar date and deduplicate — the IST timezone bug sometimes
//    seeds the same physical day under two different week_start_dates (e.g. the
//    same Monday appears as day 3 of a "Saturday" week AND day 2 of a "Sunday"
//    week). Deduplicating by calendar date merges these.
// 2. Exclude Sundays — Sunday is a rest day; no workout plan runs on Sunday, so
//    any data that lands on a Sunday is a timezone artifact and must not count.
function useTotalDaysLogged(clientId: string | undefined, planStartDate: string | null) {
  return useQuery({
    queryKey: ['client', clientId, 'total_days_logged'],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manual_workout_logs')
        .select('week_start_date, day_number, item_type, completed')
        .eq('client_id', clientId!)
        .not('day_number', 'is', null);

      if (error) throw error;

      const rows = (data ?? []) as {
        week_start_date: string;
        day_number: number;
        item_type: string;
        completed: boolean;
      }[];

      // Group items by the actual calendar date they represent
      const dateMap = new Map<string, { item_type: string; completed: boolean }[]>();
      for (const row of rows) {
        if (row.day_number < 1 || row.day_number > 6) continue;
        const [wsY, wsM, wsD] = row.week_start_date.split('-').map(Number);
        const d = new Date(wsY, wsM - 1, wsD + row.day_number - 1);
        if (d.getDay() === 0) continue; // skip Sundays — rest day, timezone artifact
        const dateKey = localDateStr(d);
        if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
        dateMap.get(dateKey)!.push({ item_type: row.item_type, completed: row.completed });
      }

      // Count only dates where computed alignment score ≥ 45 (amber or green)
      let count = 0;
      for (const logs of dateMap.values()) {
        const { score } = computeDay(logs);
        if (score !== null && score >= 45) count++;
      }
      return count;
    },
    staleTime: 60_000,
  });
}

// ── Week activity: count active Mon-Sat days in any week ─────────────────────
function useWeekActivity(clientId: string | undefined, weekStart: string) {
  return useQuery({
    queryKey: ['client', clientId, 'week_activity', weekStart],
    enabled: !!clientId && !!weekStart,
    queryFn: async () => {
      // Count daily_checkins in this week's Mon-Sat
      const [wsY, wsM, wsD] = weekStart.split('-').map(Number);
      const weekEndDate = new Date(wsY, wsM - 1, wsD + 5); // +5 = Sat (day 6)
      const weekEnd = localDateStr(weekEndDate);

      const { data: checkins } = await supabase
        .from('daily_checkins')
        .select('date')
        .eq('client_id', clientId!)
        .gte('date', weekStart)
        .lte('date', weekEnd);

      // Count days with any completed workout/water/food tasks (active days)
      const { data: logs } = await supabase
        .from('manual_workout_logs')
        .select('week_start_date, day_number')
        .eq('client_id', clientId!)
        .eq('week_start_date', weekStart)
        .eq('completed', true);

      const activeDays = new Set((logs ?? []).map(r => r.day_number)).size;
      const checkinCount = (checkins ?? []).length;

      return { activeDays, checkinCount, totalDays: 6 };
    },
    staleTime: 30_000,
  });
}

// ── Week task stats for any given weekStart ───────────────────────────────────
function useWeekStats(clientId: string | undefined, weekStart: string) {
  return useQuery({
    queryKey: ['client', clientId, 'week_stats', weekStart],
    enabled: !!clientId && !!weekStart,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manual_workout_logs')
        .select('day_number, item_type, completed')
        .eq('client_id', clientId!)
        .eq('week_start_date', weekStart)
        .not('day_number', 'is', null);
      if (error) throw error;
      const rows = (data ?? []).filter((r: any) => r.day_number >= 1 && r.day_number <= 6);
      const total = rows.length;
      const done  = rows.filter((r: any) => r.completed).length;
      const pct   = total ? Math.round((done / total) * 100) : 0;
      return { done, total, pct };
    },
    staleTime: 30_000,
  });
}

// Contextual messages keyed by performance tier
const WEEK_MESSAGES = {
  perfect: [
    { emoji: '🏆', text: 'Flawless week. You showed up every single day.' },
    { emoji: '🔥', text: 'Perfect execution. This is what discipline looks like.' },
    { emoji: '⚡', text: 'Outstanding. Your consistency is your superpower.' },
  ],
  high: [
    { emoji: '💪', text: 'Strong week — you\'re building something real here.' },
    { emoji: '🌟', text: 'Almost perfect. The effort is clearly there.' },
    { emoji: '🚀', text: 'Great momentum. You\'re ahead of where most people stop.' },
  ],
  mid: [
    { emoji: '🌱', text: 'Solid foundation. Small steps stack into big results.' },
    { emoji: '🎯', text: 'Progress over perfection — you\'re moving forward.' },
    { emoji: '💡', text: 'Every task you finish is a vote for who you\'re becoming.' },
  ],
  low: [
    { emoji: '🌄', text: 'A fresh start is always one decision away.' },
    { emoji: '🧱', text: 'Walls are there to show how badly you want it.' },
    { emoji: '⏰', text: 'The best time to start was last week. The second best is now.' },
  ],
};

function weekMessage(pct: number, weekOffset: number): { emoji: string; text: string } | null {
  if (pct === 0 && weekOffset === 0) return null; // no message for a brand-new empty current week
  const pool =
    pct === 100 ? WEEK_MESSAGES.perfect :
    pct >= 70   ? WEEK_MESSAGES.high :
    pct >= 40   ? WEEK_MESSAGES.mid :
                  WEEK_MESSAGES.low;
  // deterministic pick based on weekOffset so it doesn't jump on re-render
  return pool[Math.abs(weekOffset) % pool.length];
}

// ── Weekly Progress Card with navigation, animation, contextual messages ───────
function WeekStatsCard({ clientId }: { clientId: string }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const isCurrentWeek = weekOffset === 0;

  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return getWeekStart(d);
  })();

  const { data } = useWeekStats(clientId, weekStart);
  const done  = data?.done  ?? 0;
  const total = data?.total ?? 0;
  const pct   = data?.pct   ?? 0;

  // Week label
  const [wsY, wsM, wsD] = weekStart.split('-').map(Number);
  const wStart = new Date(wsY, wsM - 1, wsD);
  const wEnd   = new Date(wsY, wsM - 1, wsD + 5);
  const fmt    = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const weekLabel = isCurrentWeek ? 'This week' : `${fmt(wStart)} – ${fmt(wEnd)}`;

  // Colors
  const isPerfect  = pct === 100 && total > 0;
  const ringColor  =
    isPerfect    ? '#FFD700' :
    pct >= 70    ? THEME.colors.teal :
    pct >= 40    ? THEME.colors.amber :
    pct > 0      ? '#F87171' :
                   THEME.colors.border;
  const cardBorder = isPerfect ? 'rgba(255,215,0,0.35)' : 'rgba(0,196,180,0.15)';

  // Glow pulse for perfect week
  const glowAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (isPerfect) {
      // Fade-in + scale the celebration text
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 180, friction: 8, useNativeDriver: true }),
      ]).start();
      // Looping glow pulse on the ring
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      glowAnim.setValue(0);
    }
  }, [isPerfect, weekOffset]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.85] });
  const msg = weekMessage(pct, weekOffset);

  return (
    <View style={{ marginHorizontal: 24, marginBottom: 24, backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 18, borderWidth: isPerfect ? 1 : 0.5, borderColor: cardBorder }}>

      {/* Header row: label + nav */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          {weekLabel}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <TouchableOpacity onPress={() => setWeekOffset(o => o - 1)} style={{ padding: 6 }}>
            <Text style={{ fontSize: 18, color: THEME.colors.teal }}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setWeekOffset(o => o + 1)}
            disabled={isCurrentWeek}
            style={{ padding: 6, opacity: isCurrentWeek ? 0.3 : 1 }}
          >
            <Text style={{ fontSize: 18, color: THEME.colors.teal }}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main content: stats left + ring right */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          {isPerfect && (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], marginBottom: 6 }}>
              <Text style={{ fontSize: 17, fontFamily: THEME.fonts.sansMedium, color: '#FFD700', letterSpacing: 0.2 }}>
                🏆 Perfect week!
              </Text>
            </Animated.View>
          )}
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 15, fontFamily: THEME.fonts.sansMedium }}>
            {total === 0 ? 'No tasks logged yet' : `${done} of ${total} tasks done`}
          </Text>
          {total > 0 && !isPerfect && (
            <Text style={{ color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.sans, marginTop: 3 }}>
              {pct}% complete
            </Text>
          )}
        </View>

        {/* % ring with optional glow */}
        <View style={{ alignItems: 'center', justifyContent: 'center', width: 64, height: 64 }}>
          {isPerfect && (
            <Animated.View style={{
              position: 'absolute',
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: '#FFD700',
              opacity: glowOpacity,
            }} />
          )}
          <View style={{
            width: 62, height: 62, borderRadius: 31, borderWidth: 2.5,
            borderColor: ringColor,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: `${ringColor}12`,
          }}>
            {total === 0 ? (
              <Text style={{ color: THEME.colors.textMuted, fontSize: 9, fontFamily: THEME.fonts.sans, textAlign: 'center' }}>no{'\n'}data</Text>
            ) : (
              <>
                <Text style={{ color: ringColor, fontSize: 15, fontFamily: THEME.fonts.sansMedium, lineHeight: 18 }}>{pct}%</Text>
                <Text style={{ color: THEME.colors.textMuted, fontSize: 8, fontFamily: THEME.fonts.sans }}>done</Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Progress bar */}
      {total > 0 && (
        <View style={{ marginTop: 14 }}>
          <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${pct}%`, backgroundColor: ringColor, borderRadius: 3 }} />
          </View>
        </View>
      )}

      {/* Contextual message */}
      {msg && total > 0 && (
        <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: `${ringColor}0A`, borderRadius: 10, padding: 12 }}>
          <Text style={{ fontSize: 16, lineHeight: 20 }}>{msg.emoji}</Text>
          <Text style={{ flex: 1, fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 18 }}>
            {msg.text}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Animated ring arc helper ──────────────────────────────────────────────────
function RingArc({ pct, cx, cy, r, sw, color }: { pct: number; cx: number; cy: number; r: number; sw: number; color: string }) {
  const circ = 2 * Math.PI * r;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: pct / 100, duration: 950, useNativeDriver: false }).start();
  }, [pct]);

  const offset = anim.interpolate({ inputRange: [0, 1], outputRange: [circ, 0] });

  return (
    <>
      <Circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.07)" strokeWidth={sw} fill="none" />
      <AnimatedArc
        cx={cx} cy={cy} r={r}
        stroke={color}
        strokeWidth={sw}
        fill="none"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </>
  );
}

// Sparkle positions for AlignmentTracker complete state
const AT_SPARKLE_POS = [
  { top: 0,   left: 49 },
  { top: 17,  left: 88 },
  { top: 72,  left: 90 },
  { top: 100, left: 49 },
  { top: 72,  left: 8  },
  { top: 17,  left: 8  },
];

function AlignmentTracker({ workoutPct, foodPct, waterPct }: { workoutPct: number; foodPct: number; waterPct: number }) {
  const SIZE = 110;
  const CX = 55;
  const CY = 55;
  const isComplete = workoutPct >= 100 && foodPct >= 100 && waterPct >= 100;
  const composite = Math.round((workoutPct + foodPct + waterPct) / 3);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;
  const sparkleAnims = useRef(AT_SPARKLE_POS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (isComplete) {
      const scaleLoop = Animated.loop(Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.04, duration: 1800, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.0,  duration: 1800, useNativeDriver: true }),
      ]));
      const glowLoop = Animated.loop(Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
      ]));
      const sparkleLoops = sparkleAnims.map((a, i) =>
        Animated.loop(Animated.sequence([
          Animated.delay(i * 320),
          Animated.timing(a, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]))
      );
      scaleLoop.start();
      glowLoop.start();
      sparkleLoops.forEach(l => l.start());
      return () => {
        scaleLoop.stop();
        glowLoop.stop();
        sparkleLoops.forEach(l => l.stop());
      };
    } else {
      scaleAnim.setValue(1);
      glowAnim.setValue(0);
      sparkleAnims.forEach(a => a.setValue(0));
    }
  }, [isComplete]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.85] });

  return (
    <View style={{ alignItems: 'center' }}>
      {/* Outer: JS-driver shadow only (cannot share node with native-driver transform) */}
      <Animated.View style={{
        shadowColor: THEME.colors.teal,
        shadowOpacity: isComplete ? glowOpacity : 0,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
      }}>
      {/* Inner: native-driver scale transform only */}
      <Animated.View style={{
        width: SIZE, height: SIZE,
        transform: [{ scale: scaleAnim }],
      }}>
        {isComplete ? (
          <View style={{ width: SIZE, height: SIZE, position: 'relative' }}>
            <Svg width={SIZE} height={SIZE}>
              <Circle cx={CX} cy={CY} r={47} fill={THEME.colors.teal} />
              <Circle cx={CX} cy={CY} r={38} fill={THEME.colors.background} />
              <Circle cx={CX} cy={CY} r={29} fill={THEME.colors.teal} />
              <Circle cx={CX} cy={CY} r={20} fill={THEME.colors.background} />
              <Circle cx={CX} cy={CY} r={11} fill="#FFD700" />
              <Circle cx={CX} cy={CY} r={4}  fill="#fff" />
            </Svg>
            {/* Center arrow */}
            <View style={{ position: 'absolute', top: 0, left: 0, width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16, color: 'white', transform: [{ rotate: '-45deg' }] }}>➤</Text>
            </View>
            {/* Sparkles */}
            {AT_SPARKLE_POS.map((pos, i) => (
              <Animated.Text key={i} style={{
                position: 'absolute',
                ...pos,
                fontSize: 10,
                color: THEME.colors.teal,
                opacity: sparkleAnims[i],
              }}>✦</Animated.Text>
            ))}
          </View>
        ) : (
          <View style={{ width: SIZE, height: SIZE, position: 'relative' }}>
            <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
              <RingArc pct={workoutPct} cx={CX} cy={CY} r={47} sw={8} color={THEME.colors.teal} />
              <RingArc pct={foodPct}    cx={CX} cy={CY} r={34} sw={8} color={THEME.colors.amber} />
              <RingArc pct={waterPct}   cx={CX} cy={CY} r={21} sw={8} color="#60A5FA" />
            </Svg>
            {/* Center overlay */}
            <View style={{ position: 'absolute', top: 0, left: 0, width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 18, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, lineHeight: 22 }}>{composite}</Text>
              <Text style={{ fontSize: 8, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>%</Text>
            </View>
          </View>
        )}
      </Animated.View>
      </Animated.View>

      {/* Labels */}
      <View style={{ marginTop: 8, gap: 2 }}>
        {[
          { emoji: '💪', name: 'Workout', pct: workoutPct, color: THEME.colors.teal },
          { emoji: '🥗', name: 'Food',    pct: foodPct,    color: THEME.colors.amber },
          { emoji: '💧', name: 'Water',   pct: waterPct,   color: '#60A5FA' },
        ].map(item => (
          <View key={item.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ width: 10, fontSize: 9 }}>{item.emoji}</Text>
            <Text style={{ width: 44, fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{item.name}</Text>
            <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: item.color }}>{item.pct}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Leaf, firefly, dew positions for VitalityTracker complete state
const LEAF_POS = [
  { top: 2,    left: 6  },
  { top: 2,    right: 6 },
  { bottom: 2, right: 6 },
  { bottom: 2, left: 6  },
];
const FIREFLY_POS = [
  { top: 14,    left: 18  },
  { top: 28,    right: 10 },
  { top: 62,    right: 6  },
  { bottom: 16, left: 14  },
  { bottom: 30, right: 18 },
];
const DEW_POS = [
  { top: 22,    left: 36  },
  { top: 38,    right: 18 },
  { bottom: 28, left: 22  },
  { bottom: 14, right: 36 },
];
const LIME = '#39FF14';

function VitalityTracker({ energyPct, recovery, longevity }: { energyPct: number; recovery: number; longevity: number }) {
  const SIZE = 110;
  const CX = 55;
  const CY = 55;
  const isComplete = energyPct >= 100 && recovery >= 100 && longevity >= 100;
  const composite = Math.round((energyPct + recovery + longevity) / 3);

  const glowAnim  = useRef(new Animated.Value(0)).current;
  const vineAnim  = useRef(new Animated.Value(0)).current;
  const leafAnims = useRef(LEAF_POS.map(() => ({ opacity: new Animated.Value(0), translateY: new Animated.Value(8) }))).current;
  const fireflyAnims = useRef(FIREFLY_POS.map(() => new Animated.Value(0))).current;
  const dewAnims = useRef(DEW_POS.map(() => new Animated.Value(0))).current;

  const outerCirc = 2 * Math.PI * 47;

  useEffect(() => {
    if (isComplete) {
      const glowLoop = Animated.loop(Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2500, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2500, useNativeDriver: false }),
      ]));
      Animated.timing(vineAnim, { toValue: 1, duration: 4000, useNativeDriver: false }).start();

      const leafLoops = leafAnims.map(({ opacity, translateY }, i) =>
        Animated.loop(Animated.sequence([
          Animated.delay(i * 600 + 200),
          Animated.parallel([
            Animated.timing(opacity,     { toValue: 1, duration: 800,  useNativeDriver: true }),
            Animated.timing(translateY,  { toValue: 0, duration: 800,  useNativeDriver: true }),
          ]),
          Animated.delay(3000),
          Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]))
      );
      const fireflyLoops = fireflyAnims.map((a, i) =>
        Animated.loop(Animated.sequence([
          Animated.delay(i * 400),
          Animated.timing(a, { toValue: 1,   duration: 400, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0.1, duration: 300, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0.8, duration: 400, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0,   duration: 400, useNativeDriver: true }),
        ]))
      );
      const dewLoops = dewAnims.map((a, i) =>
        Animated.loop(Animated.sequence([
          Animated.delay(i * 700 + 500),
          Animated.timing(a, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]))
      );

      glowLoop.start();
      leafLoops.forEach(l => l.start());
      fireflyLoops.forEach(l => l.start());
      dewLoops.forEach(l => l.start());

      return () => {
        glowLoop.stop();
        leafLoops.forEach(l => l.stop());
        fireflyLoops.forEach(l => l.stop());
        dewLoops.forEach(l => l.stop());
      };
    } else {
      glowAnim.setValue(0);
      vineAnim.setValue(0);
      leafAnims.forEach(({ opacity, translateY }) => { opacity.setValue(0); translateY.setValue(8); });
      fireflyAnims.forEach(a => a.setValue(0));
      dewAnims.forEach(a => a.setValue(0));
    }
  }, [isComplete]);

  const shadowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.8] });
  const vineOffset = vineAnim.interpolate({ inputRange: [0, 1], outputRange: [outerCirc, outerCirc * 0.28] });

  const ringColors = isComplete
    ? { energy: LIME, recovery: LIME, longevity: LIME }
    : { energy: '#34D399', recovery: '#A78BFA', longevity: THEME.colors.amber };

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={{
        width: SIZE, height: SIZE,
        shadowColor: isComplete ? LIME : 'transparent',
        shadowOpacity: isComplete ? shadowOpacity : 0,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 0 },
      }}>
        <View style={{ width: SIZE, height: SIZE, position: 'relative' }}>
          <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
            <RingArc pct={energyPct} cx={CX} cy={CY} r={47} sw={8} color={ringColors.energy} />
            <RingArc pct={recovery}  cx={CX} cy={CY} r={34} sw={8} color={ringColors.recovery} />
            <RingArc pct={longevity} cx={CX} cy={CY} r={21} sw={8} color={ringColors.longevity} />
            {isComplete && (
              <AnimatedArc
                cx={CX} cy={CY} r={47}
                stroke="#22C55E"
                strokeWidth={3}
                fill="none"
                strokeDasharray={outerCirc}
                strokeDashoffset={vineOffset}
                strokeLinecap="round"
              />
            )}
          </Svg>

          {/* Center overlay */}
          <View style={{ position: 'absolute', top: 0, left: 0, width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 18, fontFamily: THEME.fonts.sansMedium, color: '#34D399', lineHeight: 22 }}>{composite}</Text>
            <Text style={{ fontSize: 8, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>score</Text>
          </View>

          {/* Leaves */}
          {isComplete && LEAF_POS.map((pos, i) => (
            <Animated.Text key={i} style={{
              position: 'absolute',
              ...pos,
              fontSize: 10,
              opacity: leafAnims[i].opacity,
              transform: [{ translateY: leafAnims[i].translateY }],
            }}>🍃</Animated.Text>
          ))}

          {/* Fireflies */}
          {isComplete && FIREFLY_POS.map((pos, i) => (
            <Animated.View key={i} style={{
              position: 'absolute',
              ...pos,
              width: 5, height: 5, borderRadius: 2.5,
              backgroundColor: LIME,
              opacity: fireflyAnims[i],
            }} />
          ))}

          {/* Dew sparkles */}
          {isComplete && DEW_POS.map((pos, i) => (
            <Animated.Text key={i} style={{
              position: 'absolute',
              ...pos,
              fontSize: 8,
              color: 'white',
              opacity: dewAnims[i],
            }}>✦</Animated.Text>
          ))}
        </View>
      </Animated.View>

      {/* Labels */}
      <View style={{ marginTop: 8, gap: 2 }}>
        {[
          { emoji: '⚡', name: 'Energy',    value: energyPct, color: '#34D399' },
          { emoji: '🔄', name: 'Recovery',  value: recovery,  color: '#A78BFA' },
          { emoji: '🌿', name: 'Longevity', value: longevity, color: THEME.colors.amber },
        ].map(item => (
          <View key={item.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ width: 10, fontSize: 9 }}>{item.emoji}</Text>
            <Text style={{ width: 44, fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{item.name}</Text>
            <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: item.color }}>{item.value}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}


// ── Tier badge ────────────────────────────────────────────────────────────────
function TierBadge({ avg }: { avg: number }) {
  const tier = scoreToTier(avg);
  const meta = TIER_META[tier];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${meta.color}18`, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 0.5, borderColor: `${meta.color}40` }}>
      <Text style={{ fontSize: 13 }}>{meta.icon}</Text>
      <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: meta.color }}>
        {meta.label}
      </Text>
    </View>
  );
}

// ── Tier celebration overlay ───────────────────────────────────────────────────
function TierCelebration({ tier, onDone }: { tier: string; onDone: () => void }) {
  const meta    = TIER_META[tier as keyof typeof TIER_META];
  const opacity = React.useRef(new Animated.Value(0)).current;
  const scale   = React.useRef(new Animated.Value(0.6)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(scale,   { toValue: 1, tension: 160, friction: 7, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(onDone);
      }, 1800);
    });
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center', justifyContent: 'center',
        opacity, zIndex: 99,
      }}
      pointerEvents="none"
    >
      <Animated.View style={{
        backgroundColor: THEME.colors.surface2,
        borderRadius: 24, padding: 32, alignItems: 'center',
        borderWidth: 1.5, borderColor: meta.color,
        transform: [{ scale }],
        shadowColor: meta.color, shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 0 },
      }}>
        <Text style={{ fontSize: 48, marginBottom: 10 }}>{meta.icon}</Text>
        <Text style={{ color: meta.color, fontFamily: THEME.fonts.sansMedium, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>New Tier Unlocked</Text>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 26 }}>{meta.label}</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ── Daily Tracker Card ─────────────────────────────────────────────────────────
function DailyTrackerCard({ planStartDate }: { planStartDate: string | null }) {
  const [dayOffset, setDayOffset] = useState(0);
  const today = localDateStr(new Date());
  const selectedDate = localDateStr(addDays(new Date(), dayOffset));
  const isToday = dayOffset === 0;

  const minOffset = planStartDate
    ? Math.ceil((new Date(planStartDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000)
    : -90;

  const dateLabel = (() => {
    if (dayOffset === 0) return 'Today';
    if (dayOffset === -1) return 'Yesterday';
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  })();

  const { data: scores }    = useScoreForDate(selectedDate);
  const { data: alignment } = useAlignmentForDate(selectedDate);

  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
      {/* Header: label + nav */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          Daily Scores
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity
            onPress={() => setDayOffset(o => o - 1)}
            disabled={dayOffset <= minOffset}
            style={{ padding: 6, opacity: dayOffset <= minOffset ? 0.3 : 1 }}
          >
            <Text style={{ fontSize: 18, color: THEME.colors.teal }}>‹</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: isToday ? THEME.colors.teal : THEME.colors.textPrimary, minWidth: 80, textAlign: 'center' }}>
            {dateLabel}
          </Text>
          <TouchableOpacity
            onPress={() => setDayOffset(o => o + 1)}
            disabled={isToday}
            style={{ padding: 6, opacity: isToday ? 0.3 : 1 }}
          >
            <Text style={{ fontSize: 18, color: THEME.colors.teal }}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Body: alignment left | vitality right */}
      <View style={{ flexDirection: 'row' }}>
        {/* Alignment */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 9, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
            Alignment
          </Text>
          <AlignmentTracker
            workoutPct={alignment?.workoutPct ?? 0}
            foodPct={alignment?.foodPct ?? 0}
            waterPct={alignment?.waterPct ?? 0}
          />
        </View>

        {/* Divider */}
        <View style={{ width: 0.5, backgroundColor: THEME.colors.border, marginVertical: 4 }} />

        {/* Vitality */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 9, fontFamily: THEME.fonts.sansMedium, color: '#34D399', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
            Vitality
          </Text>
          <VitalityTracker
            energyPct={scores?.energyPct ?? 0}
            recovery={scores?.recoveryScore ?? 0}
            longevity={scores?.longevityScore ?? 0}
          />
        </View>
      </View>
    </View>
  );
}

// ── This Week card with concentric ring progress ──────────────────────────────
function WeeklyActivityCard({ clientId }: { clientId: string }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const isCurrentWeek = weekOffset === 0;

  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return getWeekStart(d);
  })();

  const { data: activity } = useWeekActivity(clientId, weekStart);

  const activeDays  = activity?.activeDays  ?? 0;
  const checkinDays = activity?.checkinCount ?? 0;
  const MAX = 6;

  const [wsY, wsM, wsD] = weekStart.split('-').map(Number);
  const wStartDate = new Date(wsY, wsM - 1, wsD);
  const wEndDate   = new Date(wsY, wsM - 1, wsD + 5);
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const weekLabel = isCurrentWeek ? 'This week' : `${fmt(wStartDate)} – ${fmt(wEndDate)}`;

  // Ring geometry
  const SIZE    = 130;
  const CENTER  = SIZE / 2;
  const OUTER_R = 54;
  const INNER_R = 36;
  const SW      = 11;
  const outerCirc = 2 * Math.PI * OUTER_R;
  const innerCirc = 2 * Math.PI * INNER_R;

  const outerAnim = useRef(new Animated.Value(0)).current;
  const innerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    outerAnim.setValue(0);
    innerAnim.setValue(0);
    Animated.parallel([
      Animated.timing(outerAnim, { toValue: activeDays / MAX,  duration: 900, useNativeDriver: false }),
      Animated.timing(innerAnim, { toValue: checkinDays / MAX, duration: 900, delay: 200, useNativeDriver: false }),
    ]).start();
  }, [activeDays, checkinDays, weekStart]);

  const outerOffset = outerAnim.interpolate({ inputRange: [0, 1], outputRange: [outerCirc, 0] });
  const innerOffset = innerAnim.interpolate({ inputRange: [0, 1], outputRange: [innerCirc, 0] });

  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>

      {/* Header + nav */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          {weekLabel}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <TouchableOpacity onPress={() => setWeekOffset(o => o - 1)} style={{ padding: 6 }}>
            <Text style={{ fontSize: 18, color: THEME.colors.teal }}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setWeekOffset(o => o + 1)} disabled={isCurrentWeek} style={{ padding: 6, opacity: isCurrentWeek ? 0.3 : 1 }}>
            <Text style={{ fontSize: 18, color: THEME.colors.teal }}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Body: legend left, rings right */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>

        {/* Legend */}
        <View style={{ flex: 1, gap: 20 }}>
          {/* Active days */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.colors.teal }} />
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary }}>Active days</Text>
            </View>
            <Text style={{ fontSize: 22, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, marginLeft: 15 }}>
              {activeDays}
              <Text style={{ fontSize: 13, color: THEME.colors.textMuted }}> / {MAX}</Text>
            </Text>
          </View>

          {/* Daily Pulse */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.colors.amber }} />
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary }}>Daily Pulse</Text>
            </View>
            <Text style={{ fontSize: 22, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber, marginLeft: 15 }}>
              {checkinDays}
              <Text style={{ fontSize: 13, color: THEME.colors.textMuted }}> / {MAX}</Text>
            </Text>
          </View>
        </View>

        {/* Concentric rings */}
        <Svg
          width={SIZE}
          height={SIZE}
          style={{ transform: [{ rotate: '-90deg' }] }}
        >
          {/* Outer track (Active days) */}
          <Circle
            cx={CENTER} cy={CENTER} r={OUTER_R}
            stroke={THEME.colors.border}
            strokeWidth={SW}
            fill="none"
            opacity={0.35}
          />
          <AnimatedArc
            cx={CENTER} cy={CENTER} r={OUTER_R}
            stroke={THEME.colors.teal}
            strokeWidth={SW}
            fill="none"
            strokeDasharray={outerCirc}
            strokeDashoffset={outerOffset}
            strokeLinecap="round"
          />

          {/* Inner track (Daily Pulse) */}
          <Circle
            cx={CENTER} cy={CENTER} r={INNER_R}
            stroke={THEME.colors.border}
            strokeWidth={SW}
            fill="none"
            opacity={0.35}
          />
          <AnimatedArc
            cx={CENTER} cy={CENTER} r={INNER_R}
            stroke={THEME.colors.amber}
            strokeWidth={SW}
            fill="none"
            strokeDasharray={innerCirc}
            strokeDashoffset={innerOffset}
            strokeLinecap="round"
          />
        </Svg>
      </View>
    </View>
  );
}

// ── Week Perfect Days card ────────────────────────────────────────────────────
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S'];

// Sparkle star positions evenly spaced on a circle (degrees → x/y offsets)
const SPARKLE = Array.from({ length: 6 }, (_, i) => {
  const rad = ((i / 6) * 2 * Math.PI) - Math.PI / 2;
  return { x: Math.cos(rad), y: Math.sin(rad) };
});

function WeekPerfectCard({ planStartDate }: { planStartDate: string | null }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const isCurrentWeek = weekOffset === 0;

  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return getWeekStart(d);
  })();

  // Fetch per-day alignment data for this week
  const { data: weekDays = [] } = useWeeklyAlignment(weekStart);
  const perfectCount = weekDays.filter(d => d.score !== null && d.score >= 100).length;
  const isPerfect    = perfectCount === 6;

  // Week label
  const [wsY, wsM, wsD] = weekStart.split('-').map(Number);
  const wStart = new Date(wsY, wsM - 1, wsD);
  const wEnd   = new Date(wsY, wsM - 1, wsD + 5);
  const fmt    = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const weekLabel = isCurrentWeek ? 'This week' : `${fmt(wStart)} – ${fmt(wEnd)}`;

  // Plan start guard — don't go before plan start
  const minOffset = planStartDate
    ? Math.ceil((new Date(planStartDate + 'T00:00:00').getTime() - new Date().getTime()) / (86400000 * 7))
    : -52;

  // Fire visual params (scale with perfectCount)
  const t          = perfectCount / 6;
  const fireSize   = isPerfect ? 64 : Math.round(28 + t * 28); // 28→56, 64 for perfect
  const fireOpacity = perfectCount === 0 ? 0.25 : 0.4 + t * 0.6;
  const fireColor  = perfectCount === 0 ? '#666'
    : perfectCount <= 2 ? '#E8A44A'
    : perfectCount <= 4 ? '#FF8C00'
    : perfectCount === 5 ? '#FF5500'
    : '#FFD700'; // gold for 6/6

  // Pulse animation
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pulseAnim.stopAnimation();
    if (perfectCount === 0) { pulseAnim.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: isPerfect ? 1.22 : 1.08, duration: 700, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [perfectCount]);

  useEffect(() => {
    sparkleAnim.stopAnimation();
    if (!isPerfect) { sparkleAnim.setValue(0); return; }
    const loop = Animated.loop(
      Animated.timing(sparkleAnim, { toValue: 1, duration: 3000, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [isPerfect]);

  const sparkleRotate = sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // Container for the fire glyph + sparkle ring
  const RING_SIZE = 140;
  const SPARKLE_R = RING_SIZE / 2 - 8;

  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: isPerfect ? `${fireColor}40` : THEME.colors.border, marginBottom: 16 }}>

      {/* Header + week nav */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <View>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Perfect Days
          </Text>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11, marginTop: 2 }}>
            {weekLabel}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <TouchableOpacity onPress={() => setWeekOffset(o => o - 1)} disabled={weekOffset <= minOffset} style={{ padding: 6, opacity: weekOffset <= minOffset ? 0.3 : 1 }}>
            <Text style={{ fontSize: 20, color: THEME.colors.teal }}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setWeekOffset(o => o + 1)} disabled={isCurrentWeek} style={{ padding: 6, opacity: isCurrentWeek ? 0.3 : 1 }}>
            <Text style={{ fontSize: 20, color: THEME.colors.teal }}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Fire + count centred */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        {/* Fire + sparkle ring */}
        <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          {/* Rotating sparkle ring — only when 6/6 */}
          {isPerfect && (
            <Animated.View style={{
              position: 'absolute',
              width: RING_SIZE, height: RING_SIZE,
              transform: [{ rotate: sparkleRotate }],
            }}>
              {SPARKLE.map((s, i) => (
                <Text key={i} style={{
                  position: 'absolute',
                  fontSize: 14,
                  left: RING_SIZE / 2 + s.x * SPARKLE_R - 9,
                  top:  RING_SIZE / 2 + s.y * SPARKLE_R - 9,
                }}>⭐</Text>
              ))}
            </Animated.View>
          )}

          {/* Fire emoji — pulsing */}
          <Animated.Text style={{
            fontSize: fireSize,
            opacity: fireOpacity,
            transform: [{ scale: pulseAnim }],
          }}>🔥</Animated.Text>
        </View>

        {/* Count */}
        <Text style={{ fontSize: 40, fontFamily: THEME.fonts.sansMedium, color: fireColor, lineHeight: 44 }}>
          {perfectCount}/6
        </Text>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
          {perfectCount === 6
            ? '🏆 Perfect week!'
            : perfectCount === 0
            ? 'No perfect days yet'
            : `${6 - perfectCount} more for a perfect week`}
        </Text>
      </View>

      {/* Day dots row */}
      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
        {weekDays.map((d, i) => {
          const dotColor = d.score === null
            ? 'rgba(255,255,255,0.07)'
            : d.score >= 100 ? fireColor
            : d.score >= 70  ? THEME.colors.teal
            : d.score > 0    ? THEME.colors.amber
            : 'rgba(255,255,255,0.07)';
          const isToday = isCurrentWeek && (() => {
            const [y, m, dd] = weekStart.split('-').map(Number);
            const today = new Date();
            const candidate = new Date(y, m - 1, dd + i);
            return candidate.getDate() === today.getDate() &&
                   candidate.getMonth() === today.getMonth() &&
                   candidate.getFullYear() === today.getFullYear();
          })();
          return (
            <View key={i} style={{ alignItems: 'center', gap: 5 }}>
              <View style={{
                width: 30, height: 30, borderRadius: 15,
                backgroundColor: dotColor,
                borderWidth: isToday ? 1.5 : 0,
                borderColor: THEME.colors.teal,
                alignItems: 'center', justifyContent: 'center',
              }}>
                {d.score !== null && d.score > 0 && (
                  <Text style={{ fontSize: 9, fontFamily: THEME.fonts.sansMedium, color: d.score >= 100 ? '#000' : '#fff' }}>
                    {d.score}
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: 10, fontFamily: isToday ? THEME.fonts.sansMedium : THEME.fonts.sans, color: isToday ? THEME.colors.teal : THEME.colors.textMuted }}>
                {DAY_LABELS[i]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function ClientDashboard() {
  const router   = useRouter();
  const { profile, user } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  const normalizedProgramId = profile?.workout_program_id === '3-PRP'
    ? 'postural_realignment'
    : profile?.workout_program_id;
  const enrolledProgram = PROGRAMS.find(p => p.id === normalizedProgramId);

  const { data: enrollment }   = useActiveEnrollment();
  const { data: todayCheckin } = useTodayCheckin();
  const { mutate: rebuildStreak } = useRebuildStreak();

  // Plan start date from enrollment
  const planStartDate: string | null = (enrollment as any)?.started_at?.split('T')[0] ?? null;

  const { data: totalDaysLogged = 0 } = useTotalDaysLogged(user?.id, planStartDate);

  // Tier system – rolling 4-week average
  const { data: alignHistory = [] } = useAlignmentHistory(28);
  const rolling4wAvg = React.useMemo(() => {
    const scored = alignHistory.filter((d: any) => d.score !== null);
    if (!scored.length) return 0;
    return Math.round(scored.reduce((s: number, d: any) => s + (d.score ?? 0), 0) / scored.length);
  }, [alignHistory]);
  const currentTier = scoreToTier(rolling4wAvg);
  const [celebrateTier, setCelebrateTier] = React.useState<string | null>(null);
  useEffect(() => {
    if (!user?.id || alignHistory.length === 0) return;
    const key = `tier_${user.id}`;
    AsyncStorage.getItem(key).then(prev => {
      if (prev && prev !== currentTier) {
        const order = ['foundation', 'momentum', 'locked_in', 'unbreakable'];
        if (order.indexOf(currentTier) > order.indexOf(prev)) setCelebrateTier(currentTier);
      }
      AsyncStorage.setItem(key, currentTier);
    });
  }, [currentTier, user?.id, alignHistory.length]);

  // Rebuild streak from full log history on every home screen mount
  useEffect(() => { rebuildStreak(); }, []);

  const queryClient = useQueryClient();
  // Re-invalidate all alignment data every time the home tab comes into focus.
  // Expo Router keeps tabs persistently mounted, so switching from the workout
  // tab back to home does NOT remount this component. Without this, stale
  // alignment data from before the workout save would remain visible.
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      queryClient.invalidateQueries({ queryKey: ['alignment', user.id] });
      queryClient.invalidateQueries({ queryKey: ['client', user.id, 'week_stats'] });
      queryClient.invalidateQueries({ queryKey: ['client', user.id, 'week_activity'] });
      queryClient.invalidateQueries({ queryKey: ['client', user.id, 'total_days_logged'] });
    }, [user?.id, queryClient])
  );

  const checkinDone = !!todayCheckin;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      {celebrateTier && (
        <TierCelebration tier={celebrateTier} onDone={() => setCelebrateTier(null)} />
      )}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 }}>

          {/* Top row: greeting + name on left, profile avatar on right */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 14 }}>
                {greeting},
              </Text>
              <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 32, marginTop: 2 }}>
                {firstName}
              </Text>

              {/* Program pill */}
              {PROGRAMS_ENABLED && enrolledProgram ? (
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/(client)/programs', params: { openProgramId: enrolledProgram.id } })}
                  activeOpacity={0.75}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, alignSelf: 'flex-start', backgroundColor: `${enrolledProgram.color}20`, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: `${enrolledProgram.color}50` }}
                >
                  <Text style={{ fontSize: 14 }}>{enrolledProgram.icon}</Text>
                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: enrolledProgram.color, letterSpacing: 0.2 }}>
                    {enrolledProgram.name}
                  </Text>
                </TouchableOpacity>
              ) : PROGRAMS_ENABLED && (enrollment as any)?.program?.name ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, alignSelf: 'flex-start', backgroundColor: `${THEME.colors.teal}20`, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: `${THEME.colors.teal}50` }}>
                  <Text style={{ fontSize: 14 }}>🏋️</Text>
                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, letterSpacing: 0.2 }}>
                    {(enrollment as any).program.name}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Profile avatar */}
            <TouchableOpacity onPress={() => router.push('/(client)/profile')} activeOpacity={0.8} style={{ marginTop: 6 }}>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: `${THEME.colors.teal}18`, borderWidth: 1.5, borderColor: `${THEME.colors.teal}45`, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: THEME.colors.teal, fontSize: 20, fontFamily: THEME.fonts.sansMedium, lineHeight: 24 }}>
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Pills row */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Days logged badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${THEME.colors.teal}15`, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 0.5, borderColor: `${THEME.colors.teal}35` }}>
              <Text style={{ fontSize: 15 }}>🗓️</Text>
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>
                {totalDaysLogged} {totalDaysLogged === 1 ? 'day' : 'days'} logged
              </Text>
            </View>

            {enrollment && (
              <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 12 }}>
                  {enrollment.program?.name ?? 'Active Program'} · Wk {enrollment.current_week}
                </Text>
              </View>
            )}

            {checkinDone && (
              <View style={{ backgroundColor: '#34D39920', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 0.5, borderColor: '#34D39930' }}>
                <Text style={{ color: '#34D399', fontFamily: THEME.fonts.sansMedium, fontSize: 12 }}>
                  ✓ Checked in today
                </Text>
              </View>
            )}
            {rolling4wAvg > 0 && <TierBadge avg={rolling4wAvg} />}
          </View>
        </View>

        {/* Daily tracker: alignment + vitality */}
        <DailyTrackerCard planStartDate={planStartDate} />

        {/* Weekly perfect days card */}
        <WeekPerfectCard planStartDate={planStartDate} />

        {/* This week activity card */}
        {user?.id && <WeeklyActivityCard clientId={user.id} />}

        {/* This week task stats */}
        {user?.id && <WeekStatsCard clientId={user.id} />}

      </ScrollView>
    </SafeAreaView>
  );
}
