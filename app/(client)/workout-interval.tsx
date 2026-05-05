import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  Vibration, Dimensions, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { JoggingFigure, WalkingFigure, RestingFigure } from '@/components/workout/FigureAnimations';
import { initAudio, speakCountdown, speakPhase, stopAudio } from '@/utils/WorkoutAudio';
import { THEME } from '@/constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Constants ─────────────────────────────────────────────────────────────────
const JOG_DURATION  = 30;   // seconds
const WALK_DURATION = 60;   // seconds
const TOTAL_SECS    = 9 * 60; // 9 minutes = 540 seconds
const CYCLES        = 6;    // 30s jog + 60s walk = 90s × 6 = 540s

type Phase = 'intro' | 'countdown' | 'jog' | 'walk_transition' | 'walk' | 'jog_transition' | 'complete';

// ── Progress dots ─────────────────────────────────────────────────────────────
function CycleDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{
          width: i < current ? 24 : 10,
          height: 10, borderRadius: 5,
          backgroundColor: i < current ? THEME.colors.teal : i === current ? `${THEME.colors.teal}60` : '#2A2A2E',
        }} />
      ))}
    </View>
  );
}

// ── Countdown overlay ─────────────────────────────────────────────────────────
function CountdownOverlay({ count, label, bgColor }: { count: number | string; label: string; bgColor: string }) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scale.setValue(0.3);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [count]);

  return (
    <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center', backgroundColor: `${bgColor}E8`, zIndex: 20 }]}>
      <Animated.View style={{ alignItems: 'center', transform: [{ scale }], opacity }}>
        <Text style={{ fontSize: typeof count === 'number' ? 120 : 72, fontFamily: THEME.fonts.sansMedium, color: '#FFFFFF', lineHeight: typeof count === 'number' ? 130 : 90 }}>
          {count}
        </Text>
        <Text style={{ fontSize: 22, fontFamily: THEME.fonts.sansMedium, color: 'rgba(255,255,255,0.85)', marginTop: 8, letterSpacing: 3, textTransform: 'uppercase' }}>
          {label}
        </Text>
      </Animated.View>
    </View>
  );
}

// ── Arc timer ─────────────────────────────────────────────────────────────────
function ArcTimer({ seconds, total, color }: { seconds: number; total: number; color: string }) {
  const pct = total > 0 ? seconds / total : 0;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 160, height: 160 }}>
      <View style={{ position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 8, borderColor: '#1A1A1E' }} />
      <View style={{
        position: 'absolute', width: 160, height: 160, borderRadius: 80,
        borderWidth: 8,
        borderColor: color,
        borderTopColor: pct > 0.75 ? color : 'transparent',
        borderRightColor: pct > 0.5 ? color : 'transparent',
        borderBottomColor: pct > 0.25 ? color : 'transparent',
        borderLeftColor: color,
        transform: [{ rotate: '-90deg' }],
        opacity: 0.3 + (pct * 0.7),
      }} />
      <Text style={{ fontSize: 44, fontFamily: THEME.fonts.sansMedium, color: '#FFFFFF' }}>{seconds}</Text>
      <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: 'rgba(255,255,255,0.6)' }}>sec</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function JogWalkIntervalScreen() {
  const router = useRouter();

  const [phase, setPhase]             = useState<Phase>('intro');
  const [phaseTimer, setPhaseTimer]   = useState(3);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [cycleCount, setCycleCount]   = useState(0);
  const [transitionCount, setTransitionCount] = useState(3);
  const [isPaused, setIsPaused]       = useState(false);

  // Init audio
  useEffect(() => {
    initAudio();
    return () => stopAudio();
  }, []);

  const phaseRef    = useRef(phase);
  const pausedRef   = useRef(isPaused);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const bgAnim      = useRef(new Animated.Value(0)).current;

  phaseRef.current  = phase;
  pausedRef.current = isPaused;

  // Background color interpolation
  const backgroundColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#0A0A0B', '#0A1A1A'],
  });

  const animateBg = (toJog: boolean) => {
    Animated.timing(bgAnim, {
      toValue: toJog ? 1 : 0,
      duration: 600,
      useNativeDriver: false,
    }).start();
  };

  // ── Phase transitions ──────────────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    setPhase('countdown');
    setPhaseTimer(3);
    setTransitionCount(3);
  }, []);

  const startJog = useCallback(() => {
    setPhase('jog');
    setPhaseTimer(JOG_DURATION);
    animateBg(true);
    Vibration.vibrate([0, 100, 50, 100]);
  }, []);

  const startWalkTransition = useCallback(() => {
    setPhase('walk_transition');
    setTransitionCount(3);
    Vibration.vibrate(200);
  }, []);

  const startWalk = useCallback(() => {
    setPhase('walk');
    setPhaseTimer(WALK_DURATION);
    animateBg(false);
    Vibration.vibrate([0, 80]);
  }, []);

  const startJogTransition = useCallback((cycle: number) => {
    if (cycle >= CYCLES) {
      setPhase('complete');
      Vibration.vibrate([0, 200, 100, 200, 100, 400]);
      return;
    }
    setPhase('jog_transition');
    setTransitionCount(3);
    Vibration.vibrate(200);
  }, []);

  // ── Main timer tick ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'intro' || phase === 'complete') return;

    timerRef.current = setInterval(() => {
      if (pausedRef.current) return;

      const p = phaseRef.current;

      if (p === 'countdown') {
        setTransitionCount(prev => {
          speakCountdown(prev <= 1 ? 0 : prev - 1);
          if (prev <= 1) { startJog(); return 3; }
          return prev - 1;
        });
        return;
      }

      if (p === 'walk_transition' || p === 'jog_transition') {
        setTransitionCount(prev => {
          speakCountdown(prev <= 1 ? 0 : prev - 1);
          if (prev <= 1) {
            if (p === 'walk_transition') {
              startWalk();
              speakPhase('Walk');
            } else {
              setCycleCount(c => {
                startJogTransition(c + 1);
                return c;
              });
              startJog();
              speakPhase('Jog');
            }
            return 3;
          }
          return prev - 1;
        });
        return;
      }

      if (p === 'jog') {
        setTotalElapsed(t => t + 1);
        setPhaseTimer(prev => {
          if (prev === 4) { speakCountdown(3); Vibration.vibrate(100); }
          if (prev === 3) speakCountdown(2);
          if (prev === 2) speakCountdown(1);
          if (prev <= 1) { startWalkTransition(); return JOG_DURATION; }
          return prev - 1;
        });
        return;
      }

      if (p === 'walk') {
        setTotalElapsed(t => t + 1);
        setPhaseTimer(prev => {
          if (prev === 4) { speakCountdown(3); Vibration.vibrate(100); }
          if (prev === 3) speakCountdown(2);
          if (prev === 2) speakCountdown(1);
          if (prev <= 1) {
            setCycleCount(c => {
              const next = c + 1;
              startJogTransition(next);
              return next;
            });
            return WALK_DURATION;
          }
          return prev - 1;
        });
        return;
      }
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const totalMins = Math.floor(totalElapsed / 60);
  const totalSecs = totalElapsed % 60;
  const isJogging = phase === 'jog' || phase === 'walk_transition';
  const isWalking = phase === 'walk' || phase === 'jog_transition';

  // ── INTRO screen ───────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0B' }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <TouchableOpacity onPress={() => router.replace({ pathname: '/(client)/workout-plan' })} style={{ position: 'absolute', top: 20, left: 20, padding: 8 }}>
            <Text style={{ fontSize: 13, color: THEME.colors.textMuted, fontFamily: THEME.fonts.sansMedium }}>← Back</Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
            Day 1 Warmup
          </Text>
          <Text style={{ fontSize: 32, fontFamily: THEME.fonts.serif, color: '#FFFFFF', textAlign: 'center', marginBottom: 8 }}>
            Jog + Walk Intervals
          </Text>
          <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', lineHeight: 24, marginBottom: 40 }}>
            9 minutes · 6 cycles{'\n'}30 sec jog → 60 sec walk
          </Text>

          {/* Preview figures */}
          <View style={{ flexDirection: 'row', gap: 48, marginBottom: 48 }}>
            <View style={{ alignItems: 'center', gap: 12 }}>
              <View style={{ width: 80, height: 100, backgroundColor: `${THEME.colors.teal}15`, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${THEME.colors.teal}30` }}>
                <JoggingFigure color={THEME.colors.teal} />
              </View>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>JOG 30s</Text>
            </View>
            <View style={{ alignItems: 'center', gap: 12 }}>
              <View style={{ width: 80, height: 100, backgroundColor: `${THEME.colors.amber}15`, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${THEME.colors.amber}30` }}>
                <WalkingFigure color={THEME.colors.amber} />
              </View>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>WALK 60s</Text>
            </View>
          </View>

          <View style={{ backgroundColor: '#1A1A1E', borderRadius: 14, padding: 16, marginBottom: 40, borderWidth: 0.5, borderColor: '#2A2A2E' }}>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', lineHeight: 22 }}>
              💬 Keep breathing steady. If you feel too breathless,{'\n'}slow down — this is warmup, not a race.
            </Text>
          </View>

          <TouchableOpacity
            onPress={startCountdown}
            style={{ backgroundColor: THEME.colors.teal, borderRadius: 32, paddingHorizontal: 48, paddingVertical: 18, shadowColor: THEME.colors.teal, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 }}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 18, fontFamily: THEME.fonts.sansMedium, color: '#0A0A0B' }}>▶ Start Warmup</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── COMPLETE screen ────────────────────────────────────────────────────────
  if (phase === 'complete') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0A1A0F', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }} edges={['top']}>
        <Text style={{ fontSize: 64, marginBottom: 16 }}>🔥</Text>
        <Text style={{ fontSize: 28, fontFamily: THEME.fonts.serif, color: '#FFFFFF', textAlign: 'center', marginBottom: 8 }}>
          Warmup Complete!
        </Text>
        <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', lineHeight: 24, marginBottom: 32 }}>
          9 minutes done · 6 cycles completed{'\n'}Your body is ready for today's workout!
        </Text>
        <CycleDots current={CYCLES} total={CYCLES} />
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 40, backgroundColor: THEME.colors.teal, borderRadius: 16, paddingHorizontal: 40, paddingVertical: 16 }}
        >
          <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: '#0A0A0B' }}>Continue to Stretching →</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── MAIN workout screen ────────────────────────────────────────────────────
  const phaseColor = isJogging ? THEME.colors.teal : THEME.colors.amber;
  const phaseLabel = isJogging ? 'JOG' : 'WALK';

  return (
    <Animated.View style={{ flex: 1, backgroundColor }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* Countdown overlay */}
        {(phase === 'countdown' || phase === 'walk_transition' || phase === 'jog_transition') && (
          <CountdownOverlay
            count={transitionCount === 0 ? (isJogging ? 'JOG!' : 'WALK!') : transitionCount}
            label={transitionCount === 0 ? '' : isJogging ? 'Get ready to walk' : 'Get ready to jog'}
            bgColor={phaseColor}
          />
        )}

        {/* Top bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>✕</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: 'rgba(255,255,255,0.6)' }}>
              {totalMins}:{String(totalSecs).padStart(2, '0')} / 9:00
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsPaused(p => !p)}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{isPaused ? '▶' : '⏸'}</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={{ marginHorizontal: 20, marginBottom: 8 }}>
          <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${(totalElapsed / TOTAL_SECS) * 100}%`, backgroundColor: phaseColor, borderRadius: 2 }} />
          </View>
        </View>

        {/* Cycle dots */}
        <View style={{ marginBottom: 20 }}>
          <CycleDots current={cycleCount} total={CYCLES} />
        </View>

        {/* Phase label */}
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <View style={{ backgroundColor: `${phaseColor}25`, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 8, borderWidth: 1.5, borderColor: `${phaseColor}60` }}>
            <Text style={{ fontSize: 22, fontFamily: THEME.fonts.sansMedium, color: phaseColor, letterSpacing: 4 }}>
              {phaseLabel}
            </Text>
          </View>
        </View>

        {/* Animated figure — main visual */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {/* Ground line */}
          <View style={{ alignItems: 'center', justifyContent: 'flex-end', height: 180 }}>
            {isJogging ? (
              <JoggingFigure color={THEME.colors.teal} />
            ) : (
              <WalkingFigure color={THEME.colors.amber} />
            )}
          </View>

          {/* Ground shadow */}
          <View style={{ width: 80, height: 8, backgroundColor: `${phaseColor}20`, borderRadius: 4, marginTop: 8 }} />

          {/* Ground line */}
          <View style={{ width: SCREEN_W * 0.7, height: 2, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 1, marginTop: 4 }} />
        </View>

        {/* Timer arc */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <ArcTimer
            seconds={phaseTimer}
            total={isJogging ? JOG_DURATION : WALK_DURATION}
            color={phaseColor}
          />
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: 'rgba(255,255,255,0.5)', marginTop: 10 }}>
            {isJogging ? `Walk in ${phaseTimer}s` : `Jog in ${phaseTimer}s`}
          </Text>
        </View>

        {/* Next phase preview */}
        <View style={{ marginHorizontal: 24, marginBottom: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 50, alignItems: 'center', justifyContent: 'center' }}>
            {isJogging ? <WalkingFigure color={`${THEME.colors.amber}80`} /> : <JoggingFigure color={`${THEME.colors.teal}80`} />}
          </View>
          <View>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: 'rgba(255,255,255,0.4)' }}>Up next</Text>
            <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: 'rgba(255,255,255,0.6)' }}>
              {isJogging ? `60 sec walk` : cycleCount < CYCLES - 1 ? `30 sec jog` : 'Warmup complete!'}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: 'rgba(255,255,255,0.3)' }}>
            Cycle {cycleCount + 1}/{CYCLES}
          </Text>
        </View>

      </SafeAreaView>
    </Animated.View>
  );
}
