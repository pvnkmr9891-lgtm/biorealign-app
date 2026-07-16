import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Animated, Modal, Pressable,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  useActiveEnrollment, useTodayCheckin, useSaveCheckin,
  useCheckinByDate, useCheckinAllDates,
} from '@/hooks/useClient';
import { THEME } from '@/constants/theme';

// ── Types ─────────────────────────────────────────────────────────────────────
type MetricKey = 'mood' | 'energy' | 'sleep_hrs' | 'pain_level';
type Scores = Record<MetricKey, number>;
const DEFAULTS: Scores = { mood: 6, energy: 6, sleep_hrs: 7, pain_level: 0 };

// ── Helpers ───────────────────────────────────────────────────────────────────
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS  = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// ── Metric config ─────────────────────────────────────────────────────────────
const METRICS = [
  {
    key: 'mood' as MetricKey,
    label: 'Mood',
    hint: 'How are you feeling overall?',
    max: 10,
    lowLabel: 'Struggling',
    highLabel: 'Amazing',
    emoji: ['😔','😔','😟','😕','😐','🙂','😊','😄','😁','🤩'],
    color: '#00C4B4',
  },
  {
    key: 'energy' as MetricKey,
    label: 'Energy',
    hint: 'Physical energy right now',
    max: 12,
    lowLabel: 'Exhausted',
    highLabel: 'Fully Energized',
    color: '#E8A44A',
  },
  {
    key: 'sleep_hrs' as MetricKey,
    label: 'Sleep',
    hint: 'Hours slept last night',
    max: 12,
    lowLabel: '0 hrs',
    highLabel: '12 hrs',
    unit: 'hrs',
    color: '#A78BFA',
  },
  {
    key: 'pain_level' as MetricKey,
    label: 'Pain / Discomfort',
    hint: '0 = none  ·  12 = extreme',
    max: 12,
    lowLabel: 'No pain',
    highLabel: 'Extreme',
    isPain: true,
    color: '#F87171',
  },
] as const;

// ── Score computation ─────────────────────────────────────────────────────────
// All inputs normalised to 0–10 before weighting so max inputs → 100.
//   mood:     1–10  → (mood-1)/9 × 10
//   energy:   1–12  → energy/12 × 10
//   sleep:    0–12h → min(sleep/8 × 10, 10)  (8 h = optimal ceiling)
//   pain:     0–12  → inverted: 10 − min(pain/12 × 10, 10)
function computeScores(scores: Scores) {
  const moodNorm   = ((scores.mood - 1) / 9) * 10;
  const energyNorm = (scores.energy / 12) * 10;
  const sleepNorm  = Math.min((scores.sleep_hrs / 8) * 10, 10);
  const painInvert = 10 - Math.min((scores.pain_level / 12) * 10, 10);
  const recovery   = Math.round((moodNorm * 0.25 + energyNorm * 0.25 + sleepNorm * 0.35 + painInvert * 0.15) * 10);
  const fitness    = Math.round((energyNorm * 0.6 + moodNorm * 0.4) * 10);
  const longevity  = Math.round(fitness * 0.4 + recovery * 0.6);
  return { recovery, fitness, longevity };
}

// ── Mini score ring ───────────────────────────────────────────────────────────
function MiniScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 5, borderColor: `${color}30`, alignItems: 'center', justifyContent: 'center', backgroundColor: `${color}10` }}>
        <Text style={{ fontSize: 20, fontFamily: THEME.fonts.sansMedium, color }}>{score}</Text>
      </View>
      <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}

// ── Pain color gradient: 0=green → 4=amber → 7=orange → 10=red → 12=maroon ───
function painColor(v: number): string {
  if (v === 0)  return '#34D399'; // no pain — green
  if (v <= 2)   return '#52C97E'; // minimal — light green
  if (v <= 4)   return '#E8A44A'; // mild — amber
  if (v <= 6)   return '#F97316'; // moderate — orange
  if (v <= 9)   return '#EF4444'; // severe — red
  return '#8B1A1A';               // extreme — maroon
}

// ── Animated medical cross (grows + recolors with pain level) ─────────────────
function PainCross({ value }: { value: number }) {
  const color     = painColor(value);
  // Scale: 0.28 at pain=0 → 1.0 at pain=12
  const targetScale = 0.28 + (value / 12) * 0.72;
  const scaleAnim   = useRef(new Animated.Value(targetScale)).current;
  const colorAnim   = useRef(new Animated.Value(value)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: targetScale,
      tension: 220,
      friction: 9,
      useNativeDriver: true,
    }).start();
  }, [value]);

  // Fixed cross dimensions — scale handles the size change
  const CROSS = 52;
  const THICK = 14;

  return (
    <View style={{ width: CROSS, height: CROSS, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{
        width: CROSS, height: CROSS,
        alignItems: 'center', justifyContent: 'center',
        transform: [{ scale: scaleAnim }],
      }}>
        {/* Vertical arm */}
        <View style={{
          position: 'absolute',
          width: THICK, height: CROSS,
          backgroundColor: color,
          borderRadius: THICK / 2,
        }} />
        {/* Horizontal arm */}
        <View style={{
          position: 'absolute',
          height: THICK, width: CROSS,
          backgroundColor: color,
          borderRadius: THICK / 2,
        }} />
        {/* Centre square (slightly lighter) */}
        <View style={{
          position: 'absolute',
          width: THICK, height: THICK,
          backgroundColor: color,
          opacity: 0.6,
        }} />
      </Animated.View>
    </View>
  );
}

// Pain level labels
function painLabel(v: number): string {
  if (v === 0)  return 'No pain';
  if (v <= 2)   return 'Minimal';
  if (v <= 4)   return 'Mild';
  if (v <= 6)   return 'Moderate';
  if (v <= 9)   return 'Severe';
  return 'Extreme';
}

// ── Custom pain selector (0–12 scale, cross icon, gradient fill) ──────────────
function PainSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const color    = painColor(value);
  const fillPct  = (value / 12) * 100;

  return (
    <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>

      {/* Header row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 16 }}>
            Pain / Discomfort
          </Text>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>
            0 = none  ·  12 = extreme
          </Text>
        </View>

        {/* Animated cross + current level */}
        <View style={{ alignItems: 'center', gap: 4, minWidth: 64 }}>
          <PainCross value={value} />
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color, textAlign: 'center' }}>
            {value === 0 ? '✓  ' : `${value}  `}{painLabel(value)}
          </Text>
        </View>
      </View>

      {/* Gradient fill bar */}
      <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${fillPct}%`, backgroundColor: color, borderRadius: 3 }} />
      </View>

      {/* 0–12 tap grid */}
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {Array.from({ length: 13 }, (_, i) => i).map((v) => {
          const active   = v <= value;
          const btnColor = painColor(v);
          const isZero   = v === 0;
          return (
            <TouchableOpacity
              key={v}
              onPress={() => onChange(v)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
              style={{
                flex: 1, height: 36, borderRadius: 6,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: active ? `${btnColor}CC` : '#1A1A1E',
                borderWidth: isZero && value === 0 ? 1.5 : 1,
                borderColor: active
                  ? btnColor
                  : (isZero && value === 0 ? '#34D399' : THEME.colors.border),
              }}
            >
              <Text style={{
                fontSize: 9,
                fontFamily: THEME.fonts.sansMedium,
                color: active ? '#fff' : THEME.colors.textMuted,
              }}>
                {v}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Range labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ color: '#34D399', fontFamily: THEME.fonts.sans, fontSize: 10 }}>No pain</Text>
        <Text style={{ color: '#8B1A1A', fontFamily: THEME.fonts.sans, fontSize: 10 }}>Extreme</Text>
      </View>
    </View>
  );
}

// ── Energy color gradient: 1–2 = red → 3–4 = orange → 5–7 = amber → 8–12 = green ───
function energyColor(v: number): string {
  if (v <= 2)  return '#EF4444'; // red — exhausted
  if (v <= 4)  return '#F97316'; // orange — low
  if (v <= 7)  return '#E8A44A'; // amber — moderate
  if (v <= 10) return '#4ADE80'; // light green — good
  return '#34D399';               // teal green — fully energized
}

function energyLabel(v: number): string {
  if (v <= 2)  return 'Exhausted';
  if (v <= 4)  return 'Low';
  if (v <= 6)  return 'Moderate';
  if (v <= 9)  return 'Good';
  if (v <= 11) return 'High';
  return 'Fully Energized';
}

// ── Animated battery indicator (smartphone-style, fills from bottom) ──────────
function BatteryIndicator({ value }: { value: number }) {
  const MAX      = 12;
  const color    = energyColor(value);
  const isFull   = value === MAX;

  const BODY_H   = 56; // inner fill area height
  const targetH  = Math.round((value / MAX) * BODY_H);

  const fillH     = useRef(new Animated.Value(targetH)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(fillH, {
      toValue: targetH,
      tension: 160,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [value]);

  useEffect(() => {
    if (isFull) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    pulseAnim.setValue(0);
  }, [isFull]);

  return (
    <View style={{ alignItems: 'center' }}>
      {/* Top nub */}
      <View style={{
        width: 14, height: 5,
        backgroundColor: color,
        borderTopLeftRadius: 3, borderTopRightRadius: 3,
        zIndex: 2,
      }} />

      {/* Battery shell */}
      <View style={{
        width: 32, height: 60,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: color,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.03)',
        justifyContent: 'flex-end',
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isFull ? 0.65 : 0.15,
        shadowRadius: isFull ? 16 : 4,
        elevation: isFull ? 10 : 2,
      }}>
        <Animated.View style={{
          width: '100%',
          height: fillH,
          backgroundColor: color,
          opacity: isFull ? 1 : 0.82,
        }} />
      </View>

      {/* Pulsing "⚡ FULL" badge at max charge */}
      {isFull && (
        <Animated.Text style={{
          fontSize: 10,
          fontFamily: THEME.fonts.sansMedium,
          color: '#34D399',
          letterSpacing: 0.5,
          marginTop: 4,
          opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
        }}>
          ⚡ FULL
        </Animated.Text>
      )}
    </View>
  );
}

// ── Custom energy selector (1–12 scale, battery icon, gradient fill) ──────────
function EnergySelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const color  = energyColor(value);
  const isFull = value === 12;
  const label  = energyLabel(value);

  return (
    <View style={{
      backgroundColor: THEME.colors.surface2,
      borderRadius: 16,
      padding: 16,
      borderWidth: 0.5,
      borderColor: isFull ? `${color}50` : THEME.colors.border,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 16 }}>
            Energy
          </Text>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>
            Physical energy right now
          </Text>
          <Text style={{ color, fontFamily: THEME.fonts.sansMedium, fontSize: 13, marginTop: 6 }}>
            {value}/12 — {label}
          </Text>
          {isFull && (
            <Text style={{ color: '#34D399', fontFamily: THEME.fonts.sans, fontSize: 11, marginTop: 3, fontStyle: 'italic' }}>
              ⚡ Fully Energized — peak performance mode
            </Text>
          )}
        </View>

        <BatteryIndicator value={value} />
      </View>

      {/* Progress bar */}
      <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${(value / 12) * 100}%`, backgroundColor: color, borderRadius: 3 }} />
      </View>

      {/* 1–12 tap grid */}
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((v) => {
          const active   = v <= value;
          const btnColor = energyColor(v);
          return (
            <TouchableOpacity
              key={v}
              onPress={() => onChange(v)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
              style={{
                flex: 1, height: 36, borderRadius: 6,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: active ? `${btnColor}CC` : '#1A1A1E',
                borderWidth: 1,
                borderColor: active ? btnColor : THEME.colors.border,
              }}
            >
              <Text style={{
                fontSize: 9,
                fontFamily: THEME.fonts.sansMedium,
                color: active ? '#fff' : THEME.colors.textMuted,
              }}>
                {v}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Range labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ color: '#EF4444', fontFamily: THEME.fonts.sans, fontSize: 10 }}>Exhausted</Text>
        <Text style={{ color: '#34D399', fontFamily: THEME.fonts.sans, fontSize: 10 }}>Fully Energized</Text>
      </View>
    </View>
  );
}

// ── Sleep phase colors: deprived→red, poor→orange, fair→purple, good→cyan, excellent→gold ──
function sleepPhaseColor(v: number): string {
  if (v <= 3)  return '#EF4444'; // red — severely deprived
  if (v <= 5)  return '#F97316'; // orange — poor
  if (v <= 7)  return '#A78BFA'; // purple — fair
  if (v <= 9)  return '#67E8F9'; // cyan — good
  return '#F5E6A3';               // warm gold — excellent / full moon
}

function sleepLabel(v: number): string {
  if (v <= 2)  return 'Sleep Deprived';
  if (v <= 4)  return 'Poor';
  if (v <= 6)  return 'Fair';
  if (v <= 8)  return 'Adequate';
  if (v <= 10) return 'Good';
  return 'Excellent';
}

// ── Single twinkling star ─────────────────────────────────────────────────────
function StarTwinkle({ style, delay, visible }: { style: any; delay: number; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.15, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.85, duration: 400, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
  }, [visible]);

  return (
    <Animated.View style={[style, { position: 'absolute', opacity }]}>
      <Text style={{ fontSize: 9, color: '#F5E6A3' }}>✦</Text>
    </Animated.View>
  );
}

// ── Animated moon phase (new moon → full moon as sleep hours increase) ────────
function MoonPhase({ value }: { value: number }) {
  const MAX    = 12;
  const MOON_D = 52;
  const phase  = value / MAX; // 0 → 1

  // Shadow disc translateX: 0 = new moon (fully covering), MOON_D = full moon (off screen)
  const shadowX   = useRef(new Animated.Value(phase * MOON_D)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(shadowX, {
      toValue: phase * MOON_D,
      tension: 140,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [value]);

  useEffect(() => {
    if (value >= 10) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.35, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, { toValue: -4, duration: 2000, useNativeDriver: true }),
          Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
      return () => { glowAnim.stopAnimation(); floatAnim.stopAnimation(); };
    }
    glowAnim.setValue(0);
    floatAnim.setValue(0);
  }, [value >= 10]);

  const moonBgColor = '#F5E6A3'; // warm gold for lit portion
  const moonOpacity = 0.15 + phase * 0.85; // dim at low sleep, bright at full

  const starsVisible = value >= 5;
  const haloVisible  = value >= 8;

  return (
    <View style={{ width: 78, height: 78, alignItems: 'center', justifyContent: 'center' }}>

      {/* Twinkling stars around the moon */}
      <StarTwinkle style={{ top: 4,  left: 14 }} delay={0}   visible={starsVisible} />
      <StarTwinkle style={{ top: 6,  right: 10 }} delay={380} visible={starsVisible} />
      <StarTwinkle style={{ bottom: 10, left: 8 }} delay={720} visible={starsVisible} />
      <StarTwinkle style={{ bottom: 5,  right: 12 }} delay={170} visible={starsVisible} />
      <StarTwinkle style={{ top: 16,   right: 2 }} delay={520} visible={value >= 8} />

      {/* Soft halo ring at good sleep */}
      {haloVisible && (
        <Animated.View style={{
          position: 'absolute',
          width: MOON_D + 18,
          height: MOON_D + 18,
          borderRadius: (MOON_D + 18) / 2,
          borderWidth: 1,
          borderColor: '#F5E6A3',
          opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.45] }),
        }} />
      )}

      {/* Moon disc with phase shadow */}
      <Animated.View style={{
        transform: [{ translateY: floatAnim }],
        shadowColor: '#F5E6A3',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: value >= 10 ? 0.7 : value >= 7 ? 0.25 : 0.1,
        shadowRadius:  value >= 10 ? 14 : 5,
        elevation:     value >= 10 ? 8  : 2,
      }}>
        <View style={{
          width: MOON_D,
          height: MOON_D,
          borderRadius: MOON_D / 2,
          overflow: 'hidden',
          backgroundColor: THEME.colors.background,
        }}>
          {/* Lit moon surface */}
          <View style={{
            position: 'absolute',
            top: 0, left: 0,
            width: MOON_D, height: MOON_D,
            borderRadius: MOON_D / 2,
            backgroundColor: moonBgColor,
            opacity: moonOpacity,
          }} />

          {/* Moon surface craters (visible at higher values) */}
          {value >= 7 && (
            <>
              <View style={{ position: 'absolute', top: 13, left: 8,  width: 9, height: 7, borderRadius: 5, backgroundColor: 'rgba(200,175,70,0.28)' }} />
              <View style={{ position: 'absolute', top: 28, left: 20, width: 5, height: 4, borderRadius: 3, backgroundColor: 'rgba(200,175,70,0.22)' }} />
              <View style={{ position: 'absolute', top: 18, right: 10, width: 7, height: 5, borderRadius: 4, backgroundColor: 'rgba(200,175,70,0.2)' }} />
            </>
          )}

          {/* Shadow disc that slides right to reveal the moon phase */}
          <Animated.View style={{
            position: 'absolute',
            top: 0, left: 0,
            width: MOON_D, height: MOON_D,
            borderRadius: MOON_D / 2,
            backgroundColor: THEME.colors.background,
            transform: [{ translateX: shadowX }],
          }} />
        </View>
      </Animated.View>

      {/* 💤 floating Zzz at max sleep */}
      {value >= 11 && (
        <Animated.Text style={{
          position: 'absolute',
          top: 0, right: 4,
          fontSize: 13,
          opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
          transform: [{ translateY: floatAnim }],
        }}>
          💤
        </Animated.Text>
      )}
    </View>
  );
}

// ── Custom sleep selector (1–12 hrs, moon phase visual, star effects) ─────────
function SleepSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const color    = sleepPhaseColor(value);
  const label    = sleepLabel(value);
  const isMax    = value >= 10;
  const fillPct  = (value / 12) * 100;

  return (
    <View style={{
      backgroundColor: THEME.colors.surface2,
      borderRadius: 16,
      padding: 16,
      borderWidth: 0.5,
      borderColor: isMax ? 'rgba(245,230,163,0.4)' : THEME.colors.border,
    }}>

      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 16 }}>
            Sleep
          </Text>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>
            Hours slept last night
          </Text>
          <Text style={{ color, fontFamily: THEME.fonts.sansMedium, fontSize: 13, marginTop: 6 }}>
            {value} hrs — {label}
          </Text>
          {isMax && (
            <Text style={{ color: '#F5E6A3', fontFamily: THEME.fonts.sans, fontSize: 11, marginTop: 3, fontStyle: 'italic' }}>
              🌕 Full moon rest — peak recovery
            </Text>
          )}
        </View>

        <MoonPhase value={value} />
      </View>

      {/* Progress bar */}
      <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${fillPct}%`, backgroundColor: color, borderRadius: 3 }} />
      </View>

      {/* 1–12 tap grid */}
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((v) => {
          const active   = v <= value;
          const btnColor = sleepPhaseColor(v);
          return (
            <TouchableOpacity
              key={v}
              onPress={() => onChange(v)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
              style={{
                flex: 1, height: 36, borderRadius: 6,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: active ? `${btnColor}CC` : '#1A1A1E',
                borderWidth: 1,
                borderColor: active ? btnColor : THEME.colors.border,
              }}
            >
              <Text style={{
                fontSize: 9,
                fontFamily: THEME.fonts.sansMedium,
                color: active ? '#fff' : THEME.colors.textMuted,
              }}>
                {v}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Range labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ color: '#EF4444', fontFamily: THEME.fonts.sans, fontSize: 10 }}>1 hr</Text>
        <Text style={{ color: '#F5E6A3', fontFamily: THEME.fonts.sans, fontSize: 10 }}>12 hrs 🌕</Text>
      </View>
    </View>
  );
}

// ── Tap-grid selector ─────────────────────────────────────────────────────────
function MetricSelector({
  metric, value, onChange,
}: {
  metric: typeof METRICS[number];
  value: number;
  onChange: (v: number) => void;
}) {
  const isPain  = 'isPain' in metric && metric.isPain;
  const hasEmoji = 'emoji' in metric;

  const getColor = (v: number) => {
    if (isPain) {
      if (v <= 2) return THEME.colors.success ?? '#34D399';
      if (v <= 5) return THEME.colors.amber;
      return '#F87171';
    }
    return metric.color;
  };

  const fillColor = getColor(value);

  return (
    <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <View>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 16 }}>
            {metric.label}
          </Text>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>
            {metric.hint}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          {hasEmoji && metric.key === 'mood' ? (
            <Text style={{ fontSize: 28 }}>{metric.emoji[value - 1] ?? '😊'}</Text>
          ) : (
            <Text style={{ fontSize: 28, fontFamily: THEME.fonts.sansMedium, color: fillColor }}>
              {value}{'unit' in metric && metric.unit ? ` ${metric.unit}` : ''}
            </Text>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: metric.max }, (_, i) => i + 1).map((v) => {
          const active   = v <= value;
          const btnColor = getColor(v);
          return (
            <TouchableOpacity
              key={v}
              onPress={() => onChange(v)}
              activeOpacity={0.7}
              style={{
                flex: 1, height: 38, borderRadius: 8,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: active ? btnColor : '#1A1A1E',
                borderWidth: 1,
                borderColor: active ? btnColor : THEME.colors.border,
              }}
            >
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: active ? THEME.colors.background : THEME.colors.textMuted }}>
                {v}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 10 }}>{metric.lowLabel}</Text>
        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 10 }}>{metric.highLabel}</Text>
      </View>
    </View>
  );
}

// ── Mini checkin calendar ─────────────────────────────────────────────────────
function CheckinCalendar({
  visible,
  onClose,
  onSelectDate,
  loggedDates,
}: {
  visible:      boolean;
  onClose:      () => void;
  onSelectDate: (dateStr: string) => void;
  loggedDates:  Set<string>;
}) {
  const today = useMemo(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d;
  }, []);

  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    const nowM = today.getMonth(), nowY = today.getFullYear();
    if (year > nowY || (year === nowY && month >= nowM)) return;
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const canGoNext = year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth());

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center' }} onPress={onClose}>
        <Pressable
          onPress={e => e.stopPropagation()}
          style={{
            width: 320,
            backgroundColor: THEME.colors.surface2,
            borderRadius: 20,
            padding: 20,
            borderWidth: 0.5,
            borderColor: THEME.colors.border,
          }}
        >
          {/* Month nav */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <TouchableOpacity onPress={prevMonth} style={{ padding: 6 }}>
              <Text style={{ fontSize: 20, color: THEME.colors.textPrimary }}>‹</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
              {MONTH_NAMES[month]} {year}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={{ padding: 6, opacity: canGoNext ? 1 : 0.3 }} disabled={!canGoNext}>
              <Text style={{ fontSize: 20, color: THEME.colors.textPrimary }}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day labels */}
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {DAY_LABELS.map(d => (
              <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cells.map((day, i) => {
              if (!day) return <View key={`e-${i}`} style={{ width: `${100/7}%`, aspectRatio: 1 }} />;

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isLogged = loggedDates.has(dateStr);
              const isToday  = dateStr === toDateStr(today);
              const isFuture = new Date(year, month, day) > today;

              return (
                <TouchableOpacity
                  key={dateStr}
                  disabled={isFuture}
                  onPress={() => { onSelectDate(dateStr); onClose(); }}
                  activeOpacity={0.7}
                  style={{ width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
                >
                  <View style={{
                    width: 34, height: 34, borderRadius: 17,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isLogged ? '#FFFFFF'
                                   : isToday  ? 'rgba(0,196,180,0.15)'
                                   : 'transparent',
                    borderWidth: isToday && !isLogged ? 1 : 0,
                    borderColor: THEME.colors.teal,
                  }}>
                    <Text style={{
                      fontSize: 14,
                      fontFamily: isLogged ? THEME.fonts.sansMedium : THEME.fonts.sans,
                      color: isLogged  ? '#000000'
                           : isFuture  ? THEME.colors.textMuted + '40'
                           : isToday   ? THEME.colors.teal
                           : THEME.colors.textSecondary,
                    }}>
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, justifyContent: 'center' }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFFFFF' }} />
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>= check-in logged</Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Success screen ────────────────────────────────────────────────────────────
function SuccessScreen({
  scores,
  isUpdate,
  selectedDate,
  missedCount,
  onUpdate,
  onDone,
  onLogMissed,
}: {
  scores:       Scores;
  isUpdate:     boolean;
  selectedDate: string;
  missedCount:  number;
  onUpdate:     () => void;
  onDone:       () => void;
  onLogMissed:  () => void;
}) {
  const computed  = computeScores(scores);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 6 }),
    ]).start();
  }, []);

  const displayDate = new Date(selectedDate + 'T00:00:00')
    .toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const message = scores.energy >= 9 && scores.mood >= 7
    ? "You're in great shape today. Make it count."
    : scores.pain_level >= 8
    ? "Pain noted. Your coach will review this. Rest and recover today."
    : scores.sleep_hrs < 6
    ? "Low sleep detected. Prioritise rest and recovery today."
    : "Consistency is the protocol. Keep showing up.";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 60 }}>

        {/* Update action — was a small muted underlined link at the very
            bottom of the page, easy to miss. Now a clearly visible pill in
            the top-right, where an edit affordance is expected. */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 24 }}>
          <TouchableOpacity
            onPress={onUpdate}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: THEME.colors.surface2, borderRadius: 20,
              paddingHorizontal: 14, paddingVertical: 9,
              borderWidth: 0.5, borderColor: THEME.colors.border,
            }}
          >
            <Text style={{ fontSize: 13 }}>✎</Text>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
              Update
            </Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>

          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: `${THEME.colors.teal}20`, borderWidth: 2, borderColor: `${THEME.colors.teal}60`, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: THEME.colors.teal, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 6 }}>
            <Text style={{ fontSize: 36, color: THEME.colors.teal }}>✓</Text>
          </View>

          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
            {isUpdate ? 'Check-in updated' : 'Check-in saved'}
          </Text>
          <Text style={{ fontSize: 30, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center', marginBottom: 12, lineHeight: 38 }}>
            {displayDate}
          </Text>

          <View style={{ backgroundColor: `${THEME.colors.amber}12`, borderRadius: 12, padding: 16, borderLeftWidth: 3, borderLeftColor: THEME.colors.amber, marginBottom: 32, width: '100%' }}>
            <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.amber, lineHeight: 22, fontStyle: 'italic' }}>
              "{message}"
            </Text>
          </View>

          <View style={{ width: '100%', backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 32 }}>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 20, textAlign: 'center' }}>
              Scores
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <MiniScoreRing score={computed.fitness}   label="Fitness"   color={THEME.colors.teal} />
              <MiniScoreRing score={computed.recovery}  label="Recovery"  color="#A78BFA" />
              <MiniScoreRing score={computed.longevity} label="Longevity" color={THEME.colors.amber} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginBottom: 36 }}>
            {[
              { label: 'Mood',   value: `${scores.mood}/10`,       color: THEME.colors.teal },
              { label: 'Energy', value: `${scores.energy}/12`,     color: energyColor(scores.energy) },
              { label: 'Sleep',  value: `${scores.sleep_hrs} hrs`, color: sleepPhaseColor(scores.sleep_hrs) },
              { label: 'Pain',   value: `${scores.pain_level}/12`, color: painColor(scores.pain_level) },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
                <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: s.color }}>{s.value}</Text>
                <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 3 }}>{s.label}</Text>
              </View>
            ))}
          </View>

          {missedCount > 0 ? (
            <>
              {/* Caught-up nudge — surfaces before letting them leave, rather
                  than silently losing the "you missed some days" moment once
                  they're back on the dashboard. */}
              <TouchableOpacity
                onPress={onLogMissed}
                activeOpacity={0.85}
                style={{ backgroundColor: THEME.colors.amber, borderRadius: 14, paddingVertical: 16, alignItems: 'center', width: '100%', marginBottom: 10, shadowColor: THEME.colors.amber, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 }}
              >
                <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>
                  📅 Log a missed day ({missedCount} in the last 2 weeks)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onDone}
                activeOpacity={0.8}
                style={{ borderRadius: 14, paddingVertical: 15, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: THEME.colors.border }}
              >
                <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary }}>
                  Back to Dashboard
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={onDone}
              activeOpacity={0.85}
              style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center', width: '100%', shadowColor: THEME.colors.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 4 }}
            >
              <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>
                Back to Dashboard
              </Text>
            </TouchableOpacity>
          )}

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CheckinScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const today    = useMemo(() => toDateStr(new Date()), []);

  const [selectedDate,  setSelectedDate]  = useState(today);
  const [calendarOpen,  setCalendarOpen]  = useState(false);
  const [scores,        setScores]        = useState<Scores>(DEFAULTS);
  const [notes,         setNotes]         = useState('');
  // 'summary' = the read-only saved-scores view (SuccessScreen); 'form' =
  // the editable selectors. Defaults to whichever makes sense for the
  // viewed date once it loads (see the effect below) — a day that's
  // already logged opens straight to its summary instead of silently
  // dropping back into the raw edit form and losing that view entirely.
  const [viewMode, setViewMode] = useState<'summary' | 'form'>('form');

  const { data: enrollment }                            = useActiveEnrollment();
  const { data: todayCheckin, isLoading: todayLoading } = useTodayCheckin();
  const { data: dateCheckin,  isLoading: dateLoading }  = useCheckinByDate(selectedDate);
  const { data: allDatesArr = [] }                      = useCheckinAllDates();
  const { mutateAsync: saveCheckin, isPending }         = useSaveCheckin();

  const loggedDates = useMemo(() => new Set(allDatesArr), [allDatesArr]);

  // Past days (last 14, excluding today) without a logged check-in — used to
  // nudge catching up instead of just exiting after saving. Gated on having
  // at least one logged check-in ever so a brand-new user's pre-signup days
  // don't get flagged as "missed" on their very first entry.
  const missedDates = useMemo(() => {
    if (loggedDates.size === 0) return [] as string[];
    const missed: string[] = [];
    const base = new Date(); base.setHours(0, 0, 0, 0);
    for (let i = 1; i <= 14; i++) {
      const d = new Date(base); d.setDate(d.getDate() - i);
      const ds = toDateStr(d);
      if (!loggedDates.has(ds)) missed.push(ds);
    }
    return missed;
  }, [loggedDates]);

  // Pulses the calendar icon when there are missed days to log, so it reads
  // as "something needs attention" rather than just a neutral nav button.
  const calendarPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (missedDates.length === 0) { calendarPulse.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(calendarPulse, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(calendarPulse, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [missedDates.length]);

  const isToday      = selectedDate === today;
  const activeCheckin = isToday ? todayCheckin : dateCheckin;
  const checkinLoading = isToday ? todayLoading : dateLoading;

  // Fill scores from existing check-in for the selected date, and default
  // the view to summary/form accordingly.
  useEffect(() => {
    if (activeCheckin) {
      setScores({
        mood:       activeCheckin.mood,
        energy:     activeCheckin.energy,
        sleep_hrs:  activeCheckin.sleep_hrs,
        pain_level: activeCheckin.pain_level,
      });
      setNotes(activeCheckin.notes ?? '');
      setViewMode('summary');
    } else {
      setScores(DEFAULTS);
      setNotes('');
      setViewMode('form');
    }
  }, [selectedDate, activeCheckin?.id]);

  const preview = computeScores(scores);

  const handleSave = async () => {
    await saveCheckin({
      ...scores,
      notes:         notes.trim() || undefined,
      enrollment_id: enrollment?.id,
      date:          selectedDate,
    });
    setViewMode('summary');
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
  };

  const displayDate = new Date(selectedDate + 'T00:00:00')
    .toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  if (checkinLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator color={THEME.colors.teal} />
      </SafeAreaView>
    );
  }

  if (viewMode === 'summary') {
    return (
      <>
        <SuccessScreen
          scores={scores}
          isUpdate={!!activeCheckin}
          selectedDate={selectedDate}
          missedCount={missedDates.length}
          onUpdate={() => setViewMode('form')}
          onDone={() => router.replace('/(client)')}
          onLogMissed={() => setCalendarOpen(true)}
        />
        {/* Mounted here too (not just in the form-view return below) so
            "Log a missed day" can open it straight from the success screen —
            picking an unlogged date flips viewMode back to 'form' via the
            selectedDate effect above. */}
        <CheckinCalendar
          visible={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          onSelectDate={handleSelectDate}
          loggedDates={loggedDates}
        />
      </>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <TouchableOpacity
              onPress={() => (activeCheckin ? setViewMode('summary') : router.back())}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border, marginTop: 2 }}
            >
              <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
            </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flex: 1 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                Daily Pulse
              </Text>
              <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 30 }}>
                {isToday ? 'How are you today?' : 'Past check-in'}
              </Text>
              <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 14, marginTop: 4 }}>
                {displayDate}
              </Text>
            </View>

            {/* Calendar icon — pulses + shows a badge when there are missed
                days in the last 2 weeks, nudging the client to catch up. */}
            <TouchableOpacity
              onPress={() => setCalendarOpen(true)}
              activeOpacity={0.75}
              style={{ marginTop: 2 }}
            >
              <Animated.View
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: 'rgba(0,196,180,0.1)',
                  borderWidth: 1, borderColor: 'rgba(0,196,180,0.25)',
                  alignItems: 'center', justifyContent: 'center',
                  transform: [{ scale: calendarPulse }],
                }}
              >
                <Text style={{ fontSize: 18 }}>📅</Text>
                {missedDates.length > 0 && (
                  <View style={{
                    position: 'absolute', top: -3, right: -3,
                    width: 16, height: 16, borderRadius: 8,
                    backgroundColor: THEME.colors.amber,
                    borderWidth: 2, borderColor: THEME.colors.background,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 9, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>
                      {missedDates.length > 9 ? '9+' : missedDates.length}
                    </Text>
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>
          </View>
          </View>

          {activeCheckin && (
            <View style={{ backgroundColor: THEME.colors.tealMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginTop: 10, alignSelf: 'flex-start', borderWidth: 0.5, borderColor: `${THEME.colors.teal}30` }}>
              <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 12 }}>
                {isToday ? '✓ Already logged today — updating' : '🤍 Logged — updating this entry'}
              </Text>
            </View>
          )}
          {!isToday && (
            <TouchableOpacity onPress={() => setSelectedDate(today)} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
              <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sans, fontSize: 12, textDecorationLine: 'underline' }}>
                ← Back to today
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Live score preview */}
        <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 24 }}>
          <Text style={{ fontSize: 10, color: THEME.colors.textMuted, fontFamily: THEME.fonts.sansMedium, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14, textAlign: 'center' }}>
            Live score preview
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {[
              { label: 'Fitness',   score: preview.fitness,   color: THEME.colors.teal },
              { label: 'Recovery',  score: preview.recovery,  color: '#A78BFA' },
              { label: 'Longevity', score: preview.longevity, color: THEME.colors.amber },
            ].map(s => (
              <View key={s.label} style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontFamily: THEME.fonts.sansMedium, color: s.color }}>{s.score}</Text>
                <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Metric selectors */}
        <View style={{ paddingHorizontal: 24, gap: 14 }}>
          {METRICS.map((m) =>
            m.key === 'pain_level' ? (
              <PainSelector
                key={m.key}
                value={scores.pain_level}
                onChange={(v) => setScores(s => ({ ...s, pain_level: v }))}
              />
            ) : m.key === 'energy' ? (
              <EnergySelector
                key={m.key}
                value={scores.energy}
                onChange={(v) => setScores(s => ({ ...s, energy: v }))}
              />
            ) : m.key === 'sleep_hrs' ? (
              <SleepSelector
                key={m.key}
                value={scores.sleep_hrs}
                onChange={(v) => setScores(s => ({ ...s, sleep_hrs: v }))}
              />
            ) : (
              <MetricSelector
                key={m.key}
                metric={m}
                value={scores[m.key]}
                onChange={(v) => setScores(s => ({ ...s, [m.key]: v }))}
              />
            )
          )}
        </View>

        {/* Notes */}
        <View style={{ marginHorizontal: 24, marginTop: 20 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
            Notes for your coach (optional)
          </Text>
          <TextInput
            style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 0.5, borderColor: THEME.colors.border, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, minHeight: 80, textAlignVertical: 'top' }}
            placeholder="How did you feel today? Any pain, progress, or observations..."
            placeholderTextColor={THEME.colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

      </ScrollView>

      {/* Fixed save button — inside the KeyboardAvoidingView so it rises
          above the keyboard along with the scroll content, instead of
          staying pinned to the true screen bottom and getting covered.
          The dock is hidden on this screen (see HIDDEN_SCREENS), so this
          only needs normal safe-area clearance now, not dock clearance. */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: THEME.colors.background, borderTopWidth: 0.5, borderTopColor: THEME.colors.border, paddingHorizontal: 24, paddingVertical: 16, paddingBottom: insets.bottom + 16 }}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending}
          activeOpacity={0.85}
          style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: THEME.colors.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 4 }}
        >
          {isPending ? (
            <ActivityIndicator color={THEME.colors.background} />
          ) : (
            <Text style={{ color: THEME.colors.background, fontFamily: THEME.fonts.sansMedium, fontSize: 16 }}>
              {activeCheckin ? 'Update check-in' : 'Save check-in'} →
            </Text>
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>

      {/* Checkin calendar */}
      <CheckinCalendar
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        onSelectDate={handleSelectDate}
        loggedDates={loggedDates}
      />
    </SafeAreaView>
  );
}
