import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useWorkoutDay, useCompleteWorkout } from '@/hooks/useWorkout';
import { ExerciseVideo, getExerciseVideo } from '@/components/workout/ExerciseVideo';
import { THEME } from '@/constants/theme';
import {
  initAudio, speakCountdown, speakPhase,
  speakExerciseVoiceover, stopAudio, hasVoiceover,
} from '@/utils/WorkoutAudio';

export default function WorkoutPlayerScreen() {
  const router = useRouter();
  const { dayId, dayTitle, dayColor, startSectionIndex } = useLocalSearchParams<{
    dayId: string;
    dayTitle: string;
    dayColor: string;
    startSectionIndex?: string;
  }>();

  const { data: day, isLoading } = useWorkoutDay(dayId);
  const { mutateAsync: completeWorkout } = useCompleteWorkout();
  const color = dayColor ?? THEME.colors.teal;

  const allExercises = (day?.sections ?? []).flatMap(section =>
    (section.exercises ?? []).map(ex => ({
      ...ex,
      sectionTitle: section.title,
      sectionType: section.type,
    }))
  );

  // Calculate starting exercise index from section index
  const startIdx = (() => {
    const sIdx = parseInt(startSectionIndex ?? '0');
    if (!sIdx || !day?.sections) return 0;
    let count = 0;
    for (let i = 0; i < sIdx && i < day.sections.length; i++) {
      count += (day.sections[i]?.exercises?.length ?? 0);
    }
    return count;
  })();

  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [currentSet, setCurrentSet]   = useState(1);
  const [phase, setPhase]             = useState<'exercise' | 'rest' | 'complete'>('exercise');
  const [timer, setTimer]             = useState(0);
  const [totalTimer, setTotalTimer]   = useState(0);
  const [isRunning, setIsRunning]     = useState(false);
  const [isPaused, setIsPaused]       = useState(false);
  const [startTime]                   = useState(Date.now());
  const [initialized, setInitialized] = useState(false);
  const timerRef                      = useRef<ReturnType<typeof setInterval> | null>(null);

  // Set initial exercise index once day data loads
  useEffect(() => {
    if (day && !initialized && startIdx > 0) {
      setExerciseIdx(startIdx);
      const ex = allExercises[startIdx];
      if (ex?.is_timed && ex?.duration_seconds) setTimer(ex.duration_seconds);
      setInitialized(true);
    } else if (day && !initialized) {
      setInitialized(true);
    }
  }, [day, initialized]);

  const current = allExercises[exerciseIdx];

  // Init audio on mount, stop on unmount or back navigation
  useEffect(() => {
    initAudio();
    return () => {
      stopAudio();
    };
  }, []);

  // Total elapsed timer
  useEffect(() => {
    const t = setInterval(() => setTotalTimer(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Exercise/rest countdown
  useEffect(() => {
    if (!isRunning || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); onTimerEnd(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, isPaused, exerciseIdx, phase, currentSet]);

  const onTimerEnd = useCallback(() => {
    Vibration.vibrate(400);
    if (phase === 'exercise') {
      const sets = current?.sets ?? 1;
      if (currentSet < sets) {
        setPhase('rest');
        setTimer(current?.rest_seconds ?? 30);
        setIsRunning(true);
        speakPhase('Rest. Next set coming up.');
      } else {
        nextExercise();
      }
    } else if (phase === 'rest') {
      setPhase('exercise');
      setCurrentSet(p => p + 1);
      if (current?.is_timed && current?.duration_seconds) {
        setTimer(current.duration_seconds);
        setIsRunning(true);
      } else {
        setIsRunning(false);
      }
      speakPhase('Go!');
    }
  }, [phase, currentSet, current, exerciseIdx]);

  const startTimer = useCallback(() => {
    const ex = allExercises[exerciseIdx];
    if (ex?.is_timed && ex?.duration_seconds) {
      setTimer(ex.duration_seconds);
      setIsRunning(true);
      setIsPaused(false);
    }
  }, [exerciseIdx, allExercises]);

  const nextExercise = useCallback(() => {
    if (exerciseIdx >= allExercises.length - 1) {
      setPhase('complete');
      setIsRunning(false);
      speakPhase('Great work! Workout complete!');
      return;
    }
    const n = exerciseIdx + 1;
    setExerciseIdx(n);
    setCurrentSet(1);
    setPhase('exercise');
    setIsRunning(false);
    if (allExercises[n]?.is_timed && allExercises[n]?.duration_seconds) {
      setTimer(allExercises[n].duration_seconds!);
    }
    // Speak next exercise name
    speakPhase(allExercises[n]?.name ?? '');
  }, [exerciseIdx, allExercises]);

  const prevExercise = () => {
    if (exerciseIdx === 0) return;
    const p = exerciseIdx - 1;
    setExerciseIdx(p);
    setCurrentSet(1);
    setPhase('exercise');
    setIsRunning(false);
    if (allExercises[p]?.is_timed && allExercises[p]?.duration_seconds) {
      setTimer(allExercises[p].duration_seconds!);
    }
  };

  const doneSet = () => {
    const sets = current?.sets ?? 1;
    if (currentSet < sets) {
      if ((current?.rest_seconds ?? 0) > 0) {
        setPhase('rest');
        setTimer(current!.rest_seconds);
        setIsRunning(true);
      } else {
        setCurrentSet(p => p + 1);
      }
    } else {
      nextExercise();
    }
  };

  const saveWorkout = async () => {
    const mins = Math.round((Date.now() - startTime) / 60000);
    await completeWorkout({ dayId, durationMins: mins });
    router.replace({ pathname: '/(client)/workout-plan' });
    Alert.alert('🏆 Workout Complete!', `Great work! You finished ${dayTitle} in ${mins} minutes.`);
  };

  const quit = () => Alert.alert(
    'Quit workout?',
    'Your progress will not be saved.',
    [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Quit', style: 'destructive', onPress: () => { stopAudio(); router.replace({ pathname: '/(client)/workout-plan' }); } },
    ]
  );

  if (isLoading || !current) return null;

  const totalM   = Math.floor(totalTimer / 60);
  const totalS   = totalTimer % 60;
  const progress = exerciseIdx / Math.max(allExercises.length, 1);

  // ── Complete state ────────────────────────────────────────────────────────
  if (phase === 'complete') {
    const mins = Math.round((Date.now() - startTime) / 60000);
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }} edges={['top']}>
        <Text style={{ fontSize: 64, marginBottom: 20 }}>🏆</Text>
        <Text style={{ fontSize: 30, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
          Workout Complete!
        </Text>
        <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
          You crushed {dayTitle} in {mins} minutes.{'\n'}Great work — recovery starts now!
        </Text>
        <View style={{ flexDirection: 'row', gap: 14, marginBottom: 32 }}>
          {[
            { label: 'Exercises', value: String(allExercises.length) },
            { label: 'Duration', value: `${mins}m` },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
              <Text style={{ fontSize: 28, fontFamily: THEME.fonts.sansMedium, color }}>{s.value}</Text>
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 4 }}>{s.label}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity onPress={saveWorkout}
          style={{ backgroundColor: color, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 48, alignItems: 'center' }}>
          <Text style={{ fontSize: 17, fontFamily: THEME.fonts.sansMedium, color: '#0A0A0B' }}>Save & Finish 🎉</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Main player ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>

      {/* Top bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: THEME.colors.border }}>
        <TouchableOpacity onPress={quit}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, color: THEME.colors.textMuted }}>✕</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{dayTitle}</Text>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
            {totalM}:{String(totalS).padStart(2, '0')} elapsed
          </Text>
        </View>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color }}>
          {exerciseIdx + 1}/{allExercises.length}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={{ height: 3, backgroundColor: '#1A1A1E' }}>
        <View style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: color }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Section label */}
        <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
          {current.sectionTitle}
        </Text>

        {/* Exercise name */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Text style={{ fontSize: 26, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, lineHeight: 34, flex: 1 }}>
            {current.name}
          </Text>
          {hasVoiceover(current.name) && (
            <View style={{ backgroundColor: `${color}20`, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 0.5, borderColor: `${color}40` }}>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color }}>🔊 Audio</Text>
            </View>
          )}
        </View>

        {/* Sets dots */}
        {(current.sets ?? 0) > 1 && (
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20, alignItems: 'center' }}>
            {Array.from({ length: current.sets! }).map((_, i) => (
              <View key={i} style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: i < currentSet - 1 ? color : '#1A1A1E',
                borderWidth: 1.5,
                borderColor: i === currentSet - 1 ? color : THEME.colors.border,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: i < currentSet - 1 ? '#0A0A0B' : i === currentSet - 1 ? color : THEME.colors.textMuted }}>
                  {i + 1}
                </Text>
              </View>
            ))}
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginLeft: 4 }}>
              Set {currentSet} of {current.sets}
            </Text>
          </View>
        )}

        {/* Timer / Rest / Reps display */}
        {phase === 'rest' ? (
          <View style={{ alignItems: 'center', backgroundColor: `${THEME.colors.amber}10`, borderRadius: 20, padding: 28, marginBottom: 20, borderWidth: 1, borderColor: `${THEME.colors.amber}25` }}>
            <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber, marginBottom: 12 }}>🌿 Rest</Text>
            <Text style={{ fontSize: 56, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>{timer}</Text>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 4 }}>seconds remaining</Text>
            <TouchableOpacity
              onPress={() => { setPhase('exercise'); setCurrentSet(p => p + 1); setIsRunning(false); }}
              style={{ marginTop: 16, backgroundColor: THEME.colors.surface2, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 0.5, borderColor: THEME.colors.border }}
            >
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Skip rest ›</Text>
            </TouchableOpacity>
          </View>
        ) : current.is_timed && current.duration_seconds ? (
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{
              width: 160, height: 160, borderRadius: 80,
              backgroundColor: `${color}15`,
              borderWidth: 8,
              borderColor: isRunning && !isPaused ? color : '#2A2A2E',
              alignItems: 'center', justifyContent: 'center', marginBottom: 20,
            }}>
              <Text style={{ fontSize: 44, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
                {timer >= 60
                  ? `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}`
                  : String(timer)
                }
              </Text>
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                {timer >= 60 ? 'min' : 'sec'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  if (!isRunning) {
                    setTimer(current.duration_seconds!);
                    startTimer();
                    speakExerciseVoiceover(current.name);
                  } else setIsPaused(p => !p);
                }}
                style={{ backgroundColor: color, borderRadius: 28, paddingHorizontal: 28, paddingVertical: 14 }}
              >
                <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: '#0A0A0B' }}>
                  {!isRunning ? '▶ Start' : isPaused ? '▶ Resume' : '⏸ Pause'}
                </Text>
              </TouchableOpacity>
              {isRunning && (
                <TouchableOpacity
                  onPress={() => { setIsRunning(false); onTimerEnd(); }}
                  style={{ backgroundColor: THEME.colors.surface2, borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}
                >
                  <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>Done ✓</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 24, marginBottom: 20, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
            <Text style={{ fontSize: 44, fontFamily: THEME.fonts.sansMedium, color, marginBottom: 6 }}>
              {current.reps ?? '—'}
            </Text>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>reps / holds</Text>
          </View>
        )}

        {/* Exercise video */}
        <ExerciseVideo exerciseName={current.name} color={color} />

        {/* Instructions */}
        <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            How to do it
          </Text>
          <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary, lineHeight: 26 }}>
            {current.instructions}
          </Text>
        </View>

        {/* Coach tip */}
        {current.coach_tip && (
          <View style={{ backgroundColor: `${THEME.colors.amber}10`, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: `${THEME.colors.amber}25`, marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber, marginBottom: 6 }}>
              💬 Coach tip
            </Text>
            <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.amber, lineHeight: 22 }}>
              {current.coach_tip}
            </Text>
          </View>
        )}

        {/* Next preview */}
        {exerciseIdx < allExercises.length - 1 && (
          <View style={{ backgroundColor: '#0D0D0F', borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 4 }}>Up next</Text>
            <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary }}>
              {allExercises[exerciseIdx + 1]?.name}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom controls */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: THEME.colors.background, borderTopWidth: 0.5, borderTopColor: THEME.colors.border, paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 28, flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity
          onPress={prevExercise}
          disabled={exerciseIdx === 0}
          style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border, opacity: exerciseIdx === 0 ? 0.3 : 1 }}
        >
          <Text style={{ fontSize: 22, color: THEME.colors.textMuted }}>‹</Text>
        </TouchableOpacity>

        {phase !== 'rest' && (
          <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
            {/* Complete Set / Finish */}
            <TouchableOpacity
              onPress={doneSet}
              style={{ flex: 2, height: 52, borderRadius: 26, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: '#0A0A0B' }}>
                {(current.sets ?? 1) > 1 && currentSet < (current.sets ?? 1)
                  ? `✓ Set ${currentSet} Done`
                  : exerciseIdx === allExercises.length - 1
                    ? 'Finish 🏆'
                    : '✓ Done'
                }
              </Text>
            </TouchableOpacity>

            {/* Skip exercise — only show if not last */}
            {exerciseIdx < allExercises.length - 1 && (
              <TouchableOpacity
                onPress={() => {
                  stopAudio();
                  nextExercise();
                }}
                style={{ flex: 1, height: 52, borderRadius: 26, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: THEME.colors.border }}
              >
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>
                  Skip ›
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {phase === 'rest' && (
          <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 2, height: 52, borderRadius: 26, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
              <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>Resting... ⏳</Text>
            </View>
            {exerciseIdx < allExercises.length - 1 && (
              <TouchableOpacity
                onPress={() => {
                  stopAudio();
                  setPhase('exercise');
                  nextExercise();
                }}
                style={{ flex: 1, height: 52, borderRadius: 26, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: THEME.colors.border }}
              >
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>Skip ›</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
