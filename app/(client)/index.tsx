import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, Modal, Pressable, Image } from 'react-native';
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
import { useClientUnreadCount, useClientCoachInfo } from '@/hooks/useCoach';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { AlignmentRing } from '@/components/ui/AlignmentRing';
import { THEME } from '@/constants/theme';
import { TAB_BAR_CLEARANCE } from '@/components/ui/SlidingTabBar';
import { PROGRAMS } from '@/constants/programs';
import { PROGRAMS_ENABLED } from '@/constants/featureFlags';
import { useAlignmentForDate, useWeeklyAlignment, useAlignmentHistory, scoreToTier, TIER_META, useTotalDaysLogged } from '@/hooks/useAlignmentScore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRebuildStreak, useStreak } from '@/hooks/useStreakSystem';
import { useRecordAchievement } from '@/hooks/useAchievements';
import { useBadgeProgress } from '@/hooks/useBadgeProgress';
import { getWeekStart } from '@/hooks/useManualLog';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { MonthlyConsistencyHeatmap } from '@/components/ui/MonthlyConsistencyHeatmap';

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

      // Count days with any completed workout/water/food tasks (active days).
      // Restrict to day_number 1-6 like useWeekStats does — rows with a null
      // or out-of-range day_number would otherwise inflate the count.
      const { data: logs } = await supabase
        .from('manual_workout_logs')
        .select('week_start_date, day_number')
        .eq('client_id', clientId!)
        .eq('week_start_date', weekStart)
        .eq('completed', true)
        .not('day_number', 'is', null);

      const activeDays = new Set(
        (logs ?? []).filter(r => r.day_number >= 1 && r.day_number <= 6).map(r => r.day_number)
      ).size;
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

// (WeekStatsCard, WeeklyActivityCard, and Perfect Days used to be 3 separate
// week-summary cards here. Consolidated into ThisWeekCard, defined further
// down, right where WeekPerfectCard used to be.)

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


// ── Streak hero pill + detail modal ───────────────────────────────────────────
function StreakDetailModal({ visible, onClose, streak }: { visible: boolean; onClose: () => void; streak: import('@/hooks/useStreakSystem').StreakData | null | undefined }) {
  const current = streak?.current_streak ?? 0;
  const longest = streak?.longest_streak ?? 0;
  const freezeBanked = streak?.freeze_banked ?? false;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' }} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ width: '84%', backgroundColor: THEME.colors.surface2, borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,140,0,0.35)' }}>
          <Text style={{ fontSize: 52, marginBottom: 6 }}>🔥</Text>
          <Text style={{ color: '#FF8C00', fontFamily: THEME.fonts.sansMedium, fontSize: 36 }}>{current}</Text>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 13, marginTop: 2, marginBottom: 20 }}>
            day streak {current === 0 ? '— log a strong day to start one' : ''}
          </Text>

          <View style={{ width: '100%', gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: THEME.colors.surface3, borderRadius: 12, padding: 14 }}>
              <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 13 }}>🏆 Longest streak</Text>
              <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 15 }}>{longest} {longest === 1 ? 'day' : 'days'}</Text>
            </View>
            <View style={{ backgroundColor: THEME.colors.surface3, borderRadius: 12, padding: 14 }}>
              <Text style={{ color: freezeBanked ? '#60A5FA' : THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12.5, lineHeight: 18 }}>
                {freezeBanked
                  ? '❄️ Freeze banked — one missed day won\'t break your streak.'
                  : 'Score a perfect day (100%) to bank a freeze that protects your streak through one off day.'}
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={onClose} style={{ marginTop: 20, paddingVertical: 10, paddingHorizontal: 24 }}>
            <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>Got it</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function StreakPill({ streak, onPress }: { streak: import('@/hooks/useStreakSystem').StreakData | null | undefined; onPress: () => void }) {
  const current = streak?.current_streak ?? 0;
  if (current === 0) return null;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,140,0,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 0.5, borderColor: 'rgba(255,140,0,0.4)' }}
    >
      <Text style={{ fontSize: 15 }}>🔥</Text>
      <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: '#FF8C00' }}>
        {current}-day streak
      </Text>
    </TouchableOpacity>
  );
}

// ── Check-in nudge — shown only when today's check-in hasn't been done ───────
function CheckInNudge() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push('/(client)/checkin')}
      activeOpacity={0.85}
      style={{ marginHorizontal: 24, marginBottom: 16, backgroundColor: `${THEME.colors.teal}15`, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: `${THEME.colors.teal}40`, flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      <Text style={{ fontSize: 24 }}>📝</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>Complete today's check-in</Text>
        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>Takes 30 seconds — mood, energy, sleep, pain</Text>
      </View>
      <Text style={{ color: THEME.colors.teal, fontSize: 20 }}>›</Text>
    </TouchableOpacity>
  );
}

// ── Coach message banner — shown when the assigned coach has an unread reply ─
function CoachMessageBanner() {
  const router = useRouter();
  const { data: coachInfo } = useClientCoachInfo();
  const { data: unreadCount = 0 } = useClientUnreadCount();
  if (!coachInfo || unreadCount === 0) return null;
  const coachName = (coachInfo as any)?.coach?.full_name ?? 'Your coach';
  return (
    <TouchableOpacity
      onPress={() => router.push('/(client)/messages')}
      activeOpacity={0.85}
      style={{ marginHorizontal: 24, marginBottom: 16, backgroundColor: `${THEME.colors.amber}15`, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: `${THEME.colors.amber}40`, flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      <Text style={{ fontSize: 20 }}>💬</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 13.5 }}>
          {unreadCount > 1 ? `${unreadCount} new messages from ${coachName}` : `New message from ${coachName}`}
        </Text>
      </View>
      <Text style={{ color: THEME.colors.amber, fontSize: 18 }}>›</Text>
    </TouchableOpacity>
  );
}

// ── Milestones preview — last 3 achievements, tap through for full history ──
function MilestonesCard() {
  const router = useRouter();
  const { phases, totalEarned, totalBadges } = useBadgeProgress();
  if (totalEarned === 0) return null;

  // Most-advanced 3 earned badges, in catalog order (phase 1 → 4)
  const earnedBadges = phases.flatMap((p) => p.badges.filter((b) => b.earned)).slice(-3);

  return (
    <TouchableOpacity
      onPress={() => router.push('/(client)/achievements')}
      activeOpacity={0.85}
      style={{ marginHorizontal: 24, marginBottom: 16, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          🏆 Milestones
        </Text>
        <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 12 }}>{totalEarned}/{totalBadges} ›</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {earnedBadges.map((b) => (
          <View key={b.id} style={{ flex: 1, alignItems: 'center', backgroundColor: THEME.colors.surface3, borderRadius: 10, padding: 10 }}>
            <Text style={{ fontSize: 20, marginBottom: 4 }}>{b.icon}</Text>
            <Text numberOfLines={1} style={{ fontSize: 10.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, textAlign: 'center' }}>{b.label}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
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

// ── This Week card — perfect days + active days + task completion, merged into
//    one compact card (previously 3 separate cards each answering a version of
//    "how did my week go": Perfect Days, This Week Activity, Weekly Progress) ──
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S'];

function StatBlock({ icon, label, value, color, pulse }: {
  icon: string; label: string; value: string; color: string; pulse?: Animated.Value;
}) {
  // `transform` must never toggle between an array and undefined across
  // renders on an Animated component — React Native's Animated diffing
  // resolves that transition to a literal `transform: null` on the native
  // side, and processTransform.js crashes on `null.forEach`. Always keep a
  // stable Animated.Value here (this component's own static one when no
  // `pulse` prop is given) so `transform` is always present.
  const staticScale = useRef(new Animated.Value(1)).current;
  const scale = pulse ?? staticScale;
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Animated.Text style={{ fontSize: 18, marginBottom: 4, transform: [{ scale }] }}>{icon}</Animated.Text>
      <Text style={{ fontSize: 18, fontFamily: THEME.fonts.sansMedium, color }}>{value}</Text>
      <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 1 }}>{label}</Text>
    </View>
  );
}

function ThisWeekCard({ clientId, planStartDate }: { clientId: string; planStartDate: string | null }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const isCurrentWeek = weekOffset === 0;

  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return getWeekStart(d);
  })();

  const { data: weekDays = [] } = useWeeklyAlignment(weekStart);
  const { data: activity }      = useWeekActivity(clientId, weekStart);
  const { data: stats }         = useWeekStats(clientId, weekStart);

  const perfectCount = weekDays.filter(d => d.score !== null && d.score >= 100).length;
  const isPerfect     = perfectCount === 6;
  const activeDays    = activity?.activeDays ?? 0;
  const total         = stats?.total ?? 0;
  const pct           = stats?.pct   ?? 0;

  // Record the milestone once — upsert with ignoreDuplicates makes repeat
  // calls (re-renders, revisiting an already-perfect past week) safe no-ops.
  const { mutate: recordAchievement } = useRecordAchievement();
  useEffect(() => {
    if (isPerfect) recordAchievement({ kind: 'perfect_week', label: 'Perfect week', icon: '🏆', achievedOn: weekStart });
  }, [isPerfect, weekStart]);

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

  // Small pulse on the fire icon only, no giant animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    pulseAnim.stopAnimation();
    if (!isPerfect) { pulseAnim.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.2, duration: 700, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,   duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [isPerfect]);

  const fireColor = perfectCount === 0 ? THEME.colors.textMuted
    : perfectCount <= 2 ? '#E8A44A'
    : perfectCount <= 4 ? '#FF8C00'
    : perfectCount === 5 ? '#FF5500'
    : '#FFD700';

  const msg = weekMessage(pct, weekOffset);

  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 18, borderWidth: isPerfect ? 1 : 0.5, borderColor: isPerfect ? 'rgba(255,215,0,0.4)' : THEME.colors.border, marginBottom: 16 }}>

      {/* Header + nav */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          {weekLabel}{isPerfect ? '  🏆' : ''}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <TouchableOpacity onPress={() => setWeekOffset(o => o - 1)} disabled={weekOffset <= minOffset} style={{ padding: 6, opacity: weekOffset <= minOffset ? 0.3 : 1 }}>
            <Text style={{ fontSize: 18, color: THEME.colors.teal }}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setWeekOffset(o => o + 1)} disabled={isCurrentWeek} style={{ padding: 6, opacity: isCurrentWeek ? 0.3 : 1 }}>
            <Text style={{ fontSize: 18, color: THEME.colors.teal }}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stat row */}
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        <StatBlock icon="🔥" label="Perfect days" value={`${perfectCount}/6`} color={fireColor} pulse={pulseAnim} />
        <StatBlock icon="✅" label="Active days" value={`${activeDays}/6`} color={THEME.colors.teal} />
        <StatBlock icon="📋" label="Tasks" value={total > 0 ? `${pct}%` : '—'} color={THEME.colors.amber} />
      </View>

      {/* Day dots row */}
      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: msg && total > 0 ? 14 : 0 }}>
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
            <View key={i} style={{ alignItems: 'center', gap: 4 }}>
              <View style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: dotColor,
                borderWidth: isToday ? 1.5 : 0,
                borderColor: THEME.colors.teal,
                alignItems: 'center', justifyContent: 'center',
              }}>
                {d.score !== null && d.score > 0 && (
                  <Text style={{ fontSize: 8, fontFamily: THEME.fonts.sansMedium, color: d.score >= 100 ? '#000' : '#fff' }}>
                    {d.score}
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: 9, fontFamily: isToday ? THEME.fonts.sansMedium : THEME.fonts.sans, color: isToday ? THEME.colors.teal : THEME.colors.textMuted }}>
                {DAY_LABELS[i]}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Contextual message */}
      {msg && total > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: `${fireColor}0A`, borderRadius: 10, padding: 12 }}>
          <Text style={{ fontSize: 14, lineHeight: 18 }}>{msg.emoji}</Text>
          <Text style={{ flex: 1, fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 16 }}>
            {msg.text}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Consistency card — one calendar month at a time, bigger cells, with
//    prev/next month navigation. Replaces the old compact 12-week strip;
//    "Full view" still links to Progress → Consistency for the week/14-day
//    zoom levels, which this monthly calendar doesn't cover ─────────────────
const MONTH_NAV_MIN_OFFSET = -12; // don't browse back further than a year

function ConsistencyPreviewCard() {
  const router = useRouter();
  const [monthOffset, setMonthOffset] = useState(0); // offset of the LATER (rightmost) of the 2 shown months
  const { data: alignHistory = [] } = useAlignmentHistory(400);
  const hasData = alignHistory.some(d => d.score !== null);

  const laterDate = (() => {
    const d = new Date();
    d.setDate(1); // avoid month-length overflow when shifting months
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  })();
  const laterYear  = laterDate.getFullYear();
  const laterMonth = laterDate.getMonth();
  const isCurrentMonth = monthOffset === 0;

  if (!hasData) return null;

  return (
    <View style={{ marginHorizontal: 24, marginBottom: 16, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          🔥 Consistency
        </Text>
        <TouchableOpacity onPress={() => router.push('/(client)/progress')} activeOpacity={0.8}>
          <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 12 }}>Full view ›</Text>
        </TouchableOpacity>
      </View>

      <MonthlyConsistencyHeatmap
        data={alignHistory}
        laterYear={laterYear}
        laterMonth={laterMonth}
        onPrev={() => setMonthOffset(o => Math.max(MONTH_NAV_MIN_OFFSET, o - 1))}
        onNext={() => setMonthOffset(o => Math.min(0, o + 1))}
        canPrev={monthOffset > MONTH_NAV_MIN_OFFSET}
        canNext={!isCurrentMonth}
      />
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
  const { data: streak } = useStreak();
  const [streakModalVisible, setStreakModalVisible] = useState(false);

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
  const { mutate: recordAchievement } = useRecordAchievement();
  useEffect(() => {
    if (!user?.id || alignHistory.length === 0) return;
    const key = `tier_${user.id}`;
    AsyncStorage.getItem(key).then(prev => {
      if (prev && prev !== currentTier) {
        const order = ['foundation', 'momentum', 'locked_in', 'unbreakable'];
        if (order.indexOf(currentTier) > order.indexOf(prev)) {
          setCelebrateTier(currentTier);
          const meta = TIER_META[currentTier as keyof typeof TIER_META];
          recordAchievement({ kind: 'tier', label: meta.label, icon: meta.icon });
        }
      }
      AsyncStorage.setItem(key, currentTier);
    });
  }, [currentTier, user?.id, alignHistory.length]);

  // Rebuild streak from full log history on every home screen mount
  useEffect(() => { rebuildStreak(); }, []);

  // Streak milestone crossing — current_streak passes through each milestone
  // value exactly once per run, so this is naturally self-limiting (no need
  // to track "previous" like the tier check above).
  const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 90, 180, 365];
  useEffect(() => {
    const n = streak?.current_streak;
    if (n && STREAK_MILESTONES.includes(n)) {
      recordAchievement({ kind: 'streak', label: `${n}-day streak`, icon: '🔥' });
    }
  }, [streak?.current_streak]);

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
    <SafeAreaView testID="client-home-screen" style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      {celebrateTier && (
        <TierCelebration tier={celebrateTier} onDone={() => setCelebrateTier(null)} />
      )}
      <StreakDetailModal visible={streakModalVisible} onClose={() => setStreakModalVisible(false)} streak={streak} />
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

            {/* Profile avatar — uploaded photo when set, initial otherwise */}
            <TouchableOpacity onPress={() => router.push('/(client)/profile')} activeOpacity={0.8} style={{ marginTop: 6 }}>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: `${THEME.colors.teal}18`, borderWidth: 1.5, borderColor: `${THEME.colors.teal}45`, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <Text style={{ color: THEME.colors.teal, fontSize: 20, fontFamily: THEME.fonts.sansMedium, lineHeight: 24 }}>
                    {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </Text>
                )}
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
            <StreakPill streak={streak} onPress={() => setStreakModalVisible(true)} />
            {rolling4wAvg > 0 && <TierBadge avg={rolling4wAvg} />}
          </View>
        </View>

        {/* Daily tracker: alignment + vitality */}
        <DailyTrackerCard planStartDate={planStartDate} />

        {!checkinDone && <CheckInNudge />}
        <CoachMessageBanner />

        {/* This week: perfect days + active days + task completion, merged */}
        {user?.id && <ThisWeekCard clientId={user.id} planStartDate={planStartDate} />}

        {/* Consistency preview — compact heatmap, taps through to Progress */}
        <ConsistencyPreviewCard />

        {/* Milestones preview */}
        <MilestonesCard />

      </ScrollView>
    </SafeAreaView>
  );
}
