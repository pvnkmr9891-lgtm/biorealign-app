import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useActiveEnrollment, useTodayCheckin, useSaveCheckin } from '@/hooks/useClient';
import { THEME } from '@/constants/theme';

// ── Types ─────────────────────────────────────────────────────────────────────
type MetricKey = 'mood' | 'energy' | 'sleep_hrs' | 'pain_level';
type Scores = Record<MetricKey, number>;
const DEFAULTS: Scores = { mood: 6, energy: 6, sleep_hrs: 7, pain_level: 1 };

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
    max: 10,
    lowLabel: 'Exhausted',
    highLabel: 'Energised',
    emoji: ['⚡','⚡','⚡','⚡','⚡','⚡','⚡','⚡','⚡','⚡'],
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
    hint: '0 = none,  10 = severe',
    max: 10,
    lowLabel: 'Pain free',
    highLabel: 'Severe',
    isPain: true,
    color: '#F87171',
  },
] as const;

// ── Score computation (mirrors useClient hook) ────────────────────────────────
function computeScores(scores: Scores) {
  const sleepNorm  = Math.min((scores.sleep_hrs / 8) * 10, 10);
  const painInvert = 10 - scores.pain_level;

  const recovery = Math.round(
    (scores.mood * 0.25 + scores.energy * 0.25 + sleepNorm * 0.35 + painInvert * 0.15) * 10
  );
  const fitness   = Math.min(100, Math.round(50 + ((scores.energy + scores.mood) / 20 - 0.5) * 15));
  const longevity = Math.round(fitness * 0.4 + recovery * 0.6);

  return { recovery, fitness, longevity };
}

// ── Score ring (mini) ─────────────────────────────────────────────────────────
function MiniScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: score,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [score]);

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

// ── Tap grid selector ─────────────────────────────────────────────────────────
function MetricSelector({
  metric, value, onChange,
}: {
  metric: typeof METRICS[number];
  value: number;
  onChange: (v: number) => void;
}) {
  const isPain = 'isPain' in metric && metric.isPain;
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
      {/* Header */}
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

      {/* Tap grid */}
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
                flex: 1,
                height: 38,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? btnColor : '#1A1A1E',
                borderWidth: 1,
                borderColor: active ? btnColor : THEME.colors.border,
              }}
            >
              <Text style={{
                fontSize: 11,
                fontFamily: THEME.fonts.sansMedium,
                color: active ? THEME.colors.background : THEME.colors.textMuted,
              }}>
                {v}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Low / high labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 10 }}>{metric.lowLabel}</Text>
        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 10 }}>{metric.highLabel}</Text>
      </View>
    </View>
  );
}

// ── Success screen ────────────────────────────────────────────────────────────
function SuccessScreen({
  scores,
  isUpdate,
  onUpdate,
  onDone,
}: {
  scores: Scores;
  isUpdate: boolean;
  onUpdate: () => void;
  onDone: () => void;
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

  const hour = new Date().getHours();
  const message = scores.energy >= 7 && scores.mood >= 7
    ? "You're in great shape today. Make it count."
    : scores.pain_level >= 6
    ? "Pain noted. Your coach will review this. Take it easy today."
    : scores.sleep_hrs < 6
    ? "Low sleep detected. Prioritise rest and recovery today."
    : "Consistency is the protocol. Keep showing up.";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 60 }}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>

          {/* Check mark */}
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: `${THEME.colors.teal}20`, borderWidth: 2, borderColor: `${THEME.colors.teal}60`, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: THEME.colors.teal, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 6 }}>
            <Text style={{ fontSize: 36, color: THEME.colors.teal }}>✓</Text>
          </View>

          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
            {isUpdate ? 'Check-in updated' : 'Check-in saved'}
          </Text>
          <Text style={{ fontSize: 30, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center', marginBottom: 12, lineHeight: 38 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>

          {/* Message */}
          <View style={{ backgroundColor: `${THEME.colors.amber}12`, borderRadius: 12, padding: 16, borderLeftWidth: 3, borderLeftColor: THEME.colors.amber, marginBottom: 32, width: '100%' }}>
            <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.amber, lineHeight: 22, fontStyle: 'italic' }}>
              "{message}"
            </Text>
          </View>

          {/* Score preview */}
          <View style={{ width: '100%', backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 32 }}>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 20, textAlign: 'center' }}>
              Today's scores
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <MiniScoreRing score={computed.fitness}   label="Fitness"   color={THEME.colors.teal} />
              <MiniScoreRing score={computed.recovery}  label="Recovery"  color="#A78BFA" />
              <MiniScoreRing score={computed.longevity} label="Longevity" color={THEME.colors.amber} />
            </View>
          </View>

          {/* Quick stats */}
          <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginBottom: 36 }}>
            {[
              { label: 'Mood',   value: `${scores.mood}/10`,        color: THEME.colors.teal },
              { label: 'Energy', value: `${scores.energy}/10`,      color: THEME.colors.amber },
              { label: 'Sleep',  value: `${scores.sleep_hrs} hrs`,  color: '#A78BFA' },
              { label: 'Pain',   value: `${scores.pain_level}/10`,  color: scores.pain_level >= 6 ? '#F87171' : '#34D399' },
            ].map((s) => (
              <View key={s.label} style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
                <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: s.color }}>
                  {s.value}
                </Text>
                <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 3 }}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <TouchableOpacity
            onPress={onDone}
            activeOpacity={0.85}
            style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center', width: '100%', marginBottom: 12, shadowColor: THEME.colors.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 4 }}
          >
            <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>
              Back to Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onUpdate} activeOpacity={0.7}>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textDecorationLine: 'underline' }}>
              Update today's check-in
            </Text>
          </TouchableOpacity>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CheckinScreen() {
  const router = useRouter();
  const { data: enrollment }                         = useActiveEnrollment();
  const { data: todayCheckin, isLoading: checkinLoading } = useTodayCheckin();
  const { mutateAsync: saveCheckin, isPending }       = useSaveCheckin();

  const [scores, setScores] = useState<Scores>(DEFAULTS);
  const [notes, setNotes]   = useState('');
  const [saved, setSaved]   = useState(false);

  // Pre-fill existing check-in
  useEffect(() => {
    if (todayCheckin) {
      setScores({
        mood:       todayCheckin.mood,
        energy:     todayCheckin.energy,
        sleep_hrs:  todayCheckin.sleep_hrs,
        pain_level: todayCheckin.pain_level,
      });
      setNotes(todayCheckin.notes ?? '');
    }
  }, [todayCheckin]);

  const preview = computeScores(scores);

  const handleSave = async () => {
    await saveCheckin({
      ...scores,
      notes: notes.trim() || undefined,
      enrollment_id: enrollment?.id,
    });
    setSaved(true);
  };

  if (checkinLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator color={THEME.colors.teal} />
      </SafeAreaView>
    );
  }

  if (saved) {
    return (
      <SuccessScreen
        scores={scores}
        isUpdate={!!todayCheckin}
        onUpdate={() => setSaved(false)}
        onDone={() => router.replace('/(client)')}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 }}>
          <Text style={{ fontSize: 11, color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            Daily Check-in
          </Text>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 30 }}>
            How are you today?
          </Text>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 14, marginTop: 4 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          {todayCheckin && (
            <View style={{ backgroundColor: THEME.colors.tealMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginTop: 10, alignSelf: 'flex-start', borderWidth: 0.5, borderColor: `${THEME.colors.teal}30` }}>
              <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 12 }}>
                ✓ Already logged today — updating
              </Text>
            </View>
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
                <Text style={{ fontSize: 24, fontFamily: THEME.fonts.sansMedium, color: s.color }}>
                  {s.score}
                </Text>
                <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Metric selectors */}
        <View style={{ paddingHorizontal: 24, gap: 14 }}>
          {METRICS.map((m) => (
            <MetricSelector
              key={m.key}
              metric={m}
              value={scores[m.key]}
              onChange={(v) => setScores(s => ({ ...s, [m.key]: v }))}
            />
          ))}
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

      {/* Fixed save button */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: THEME.colors.background, borderTopWidth: 0.5, borderTopColor: THEME.colors.border, paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 32 }}>
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
              {todayCheckin ? 'Update check-in' : 'Save check-in'} →
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
