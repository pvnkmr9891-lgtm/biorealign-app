import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActiveEnrollment, useTodayCheckin, useSaveCheckin } from '@/hooks/useClient';
import { THEME } from '@/constants/theme';

const METRICS = [
  { key: 'mood',       label: 'Mood',       hint: 'How are you feeling?',       max: 10, lowLabel: 'Low', highLabel: 'Great' },
  { key: 'energy',     label: 'Energy',     hint: 'Physical energy level',       max: 10, lowLabel: 'Drained', highLabel: 'Energised' },
  { key: 'sleep_hrs',  label: 'Sleep',      hint: 'Hours slept last night',      max: 12, lowLabel: '0 hrs', highLabel: '12 hrs', unit: 'hrs' },
  { key: 'pain_level', label: 'Pain',       hint: '0 = none, 10 = severe',      max: 10, lowLabel: 'None', highLabel: 'Severe' },
] as const;

type MetricKey = (typeof METRICS)[number]['key'];
type Scores = Record<MetricKey, number>;

const DEFAULTS: Scores = { mood: 6, energy: 6, sleep_hrs: 7, pain_level: 1 };

export default function CheckinScreen() {
  const { data: enrollment } = useActiveEnrollment();
  const { data: todayCheckin, isLoading: checkinLoading } = useTodayCheckin();
  const { mutateAsync: saveCheckin, isPending } = useSaveCheckin();

  const [scores, setScores] = useState<Scores>(DEFAULTS);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  // Pre-fill from today's existing check-in
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
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }} edges={['top']}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: THEME.colors.tealMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 0.5, borderColor: `${THEME.colors.teal}40` }}>
          <Text style={{ fontSize: 28 }}>✓</Text>
        </View>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 28, textAlign: 'center', marginBottom: 8 }}>
          Check-in saved
        </Text>
        <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
          Your scores have been updated. Keep going — consistency is the protocol.
        </Text>
        <TouchableOpacity
          onPress={() => setSaved(false)}
          style={{ marginTop: 32, backgroundColor: THEME.colors.surface2, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>
            Update today's log
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 }}>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 32 }}>Daily check-in</Text>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 14, marginTop: 4 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          {todayCheckin && (
            <View style={{ backgroundColor: THEME.colors.tealMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 10, alignSelf: 'flex-start', borderWidth: 0.5, borderColor: `${THEME.colors.teal}30` }}>
              <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 12 }}>
                Already logged today — updating
              </Text>
            </View>
          )}
        </View>

        {/* Metric sliders */}
        <View style={{ gap: 28, paddingHorizontal: 24 }}>
          {METRICS.map((m) => {
            const val = scores[m.key];
            const pct = val / m.max;
            const isPain = m.key === 'pain_level';
            const fillColor = isPain
              ? val <= 2 ? THEME.colors.success : val <= 5 ? THEME.colors.amber : THEME.colors.error
              : THEME.colors.teal;

            return (
              <View key={m.key}>
                {/* Label row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <View>
                    <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 15 }}>
                      {m.label}
                    </Text>
                    <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12 }}>
                      {m.hint}
                    </Text>
                  </View>
                  <Text style={{ color: fillColor, fontFamily: THEME.fonts.sansMedium, fontSize: 22 }}>
                    {val}{m.unit ? ` ${m.unit}` : ''}
                  </Text>
                </View>

                {/* Tap grid */}
                <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
                  {Array.from({ length: m.max }, (_, i) => i + 1).map((v) => {
                    const active = isPain ? v <= val : v <= val;
                    return (
                      <TouchableOpacity
                        key={v}
                        onPress={() => setScores((s) => ({ ...s, [m.key]: v }))}
                        style={{
                          flex: 1,
                          height: 36,
                          borderRadius: 6,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: active ? fillColor : THEME.colors.surface2,
                          borderWidth: 0.5,
                          borderColor: active ? fillColor : THEME.colors.border,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: active ? THEME.colors.background : THEME.colors.textMuted }}>
                          {v}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Low / high labels */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11 }}>{m.lowLabel}</Text>
                  <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11 }}>{m.highLabel}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Notes */}
        <View style={{ marginHorizontal: 24, marginTop: 28 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
            Notes (optional)
          </Text>
          <TextInput
            style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 0.5, borderColor: THEME.colors.border, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, minHeight: 80, textAlignVertical: 'top' }}
            placeholder="How did you feel today? Any observations for your coach..."
            placeholderTextColor={THEME.colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending}
          activeOpacity={0.85}
          style={{ marginHorizontal: 24, marginTop: 28, backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
        >
          {isPending ? (
            <ActivityIndicator color={THEME.colors.background} />
          ) : (
            <Text style={{ color: THEME.colors.background, fontFamily: THEME.fonts.sansMedium, fontSize: 16 }}>
              {todayCheckin ? 'Update check-in' : 'Save check-in'}
            </Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
