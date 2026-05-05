import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useActiveEnrollment, useProgressHistory } from '@/hooks/useClient';
import { useBodyMetrics, useLatestBodyMetric, useSaveBodyMetrics, useProgressPhotos, useUploadProgressPhoto } from '@/hooks/useProgress';
import { LineChart } from '@/components/ui/LineChart';
import { THEME } from '@/constants/theme';

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

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data: enrollment } = useActiveEnrollment();
  const { data: history = [], isLoading } = useProgressHistory(10);
  const { data: bodyHistory = [] } = useBodyMetrics(10);

  const latest   = history[history.length - 1] ?? null;
  const previous = history[history.length - 2] ?? null;
  const latestBody   = bodyHistory[bodyHistory.length - 1] ?? null;
  const previousBody = bodyHistory[bodyHistory.length - 2] ?? null;

  const labels = history.map(m =>
    new Date(m.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  );

  const SERIES = [
    { key: 'fitness_score',   label: 'Fitness',   color: THEME.scoreColors.fitness,   data: history.map(m => m.fitness_score   ?? 0) },
    { key: 'recovery_score',  label: 'Recovery',  color: THEME.scoreColors.recovery,  data: history.map(m => m.recovery_score  ?? 0) },
    { key: 'longevity_score', label: 'Longevity', color: THEME.scoreColors.longevity, data: history.map(m => m.longevity_score ?? 0) },
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
        <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 16 }}>
          Score trend
        </Text>
        {isLoading || history.length < 2 ? (
          <View style={{ height: 160, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13 }}>
              {isLoading ? 'Loading…' : 'Complete 2+ check-ins to see your trend'}
            </Text>
          </View>
        ) : (
          <LineChart series={SERIES} labels={labels} height={180} showDots={history.length <= 8} />
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
  const { data: latest } = useLatestBodyMetric();
  const saveMetrics = useSaveBodyMetrics();

  const [weight, setWeight]       = useState(String(latest?.weight_kg     ?? ''));
  const [bodyFat, setBodyFat]     = useState(String(latest?.body_fat_pct  ?? ''));
  const [waist, setWaist]         = useState(String(latest?.waist_cm      ?? ''));
  const [hips, setHips]           = useState(String(latest?.hips_cm       ?? ''));
  const [chest, setChest]         = useState(String(latest?.chest_cm      ?? ''));
  const [leftArm, setLeftArm]     = useState(String(latest?.left_arm_cm   ?? ''));
  const [rightArm, setRightArm]   = useState(String(latest?.right_arm_cm  ?? ''));
  const [leftThigh, setLeftThigh] = useState(String(latest?.left_thigh_cm ?? ''));
  const [rightThigh, setRightThigh] = useState(String(latest?.right_thigh_cm ?? ''));
  const [pushups, setPushups]     = useState(String(latest?.pushup_count  ?? ''));
  const [plank, setPlank]         = useState(String(latest?.plank_seconds ?? ''));
  const [squats, setSquats]       = useState(String(latest?.squat_reps    ?? ''));
  const [notes, setNotes]         = useState(latest?.notes ?? '');
  const [saved, setSaved]         = useState(false);

  const p = (v: string) => parseFloat(v) || undefined;
  const n = (v: string) => parseInt(v) || undefined;

  const handleSave = async () => {
    await saveMetrics.mutateAsync({
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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Today badge */}
        <View style={{ backgroundColor: `${THEME.colors.teal}15`, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: `${THEME.colors.teal}30`, marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 16 }}>📅</Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>
            Logging for {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>

        {/* Weight & composition */}
        <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Weight & Composition</Text>
        <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 20 }}>
          <MetricRow label="Body weight"  value={weight}  onChange={setWeight}  unit="kg"  hint="Morning, before food" />
          <MetricRow label="Body fat"     value={bodyFat} onChange={setBodyFat} unit="%"   hint="Optional" />
        </View>

        {/* Measurements */}
        <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Measurements</Text>
        <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 20 }}>
          <MetricRow label="Waist"        value={waist}      onChange={setWaist}      unit="cm" />
          <MetricRow label="Hips"         value={hips}       onChange={setHips}       unit="cm" />
          <MetricRow label="Chest"        value={chest}      onChange={setChest}      unit="cm" />
          <MetricRow label="Left arm"     value={leftArm}    onChange={setLeftArm}    unit="cm" />
          <MetricRow label="Right arm"    value={rightArm}   onChange={setRightArm}   unit="cm" />
          <MetricRow label="Left thigh"   value={leftThigh}  onChange={setLeftThigh}  unit="cm" />
          <MetricRow label="Right thigh"  value={rightThigh} onChange={setRightThigh} unit="cm" />
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
          placeholder="How are you feeling about your progress today?"
          placeholderTextColor={THEME.colors.textMuted}
          multiline
        />

      </ScrollView>

      {/* Save button */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: THEME.colors.background, borderTopWidth: 0.5, borderTopColor: THEME.colors.border, paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 32 }}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saveMetrics.isPending}
          activeOpacity={0.85}
          style={{ backgroundColor: saved ? (THEME.colors.success ?? '#34D399') : THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: THEME.colors.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 }}
        >
          {saveMetrics.isPending
            ? <ActivityIndicator color={THEME.colors.background} />
            : <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>
                {saved ? '✓ Saved!' : 'Save measurements →'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Photos tab ────────────────────────────────────────────────────────────────
function PhotosTab() {
  const { data: photos = [], isLoading } = useProgressPhotos();
  const uploadPhoto = useUploadProgressPhoto();
  const [uploading, setUploading] = useState(false);

  const PHOTO_TYPES: { type: 'front' | 'side' | 'back'; label: string; emoji: string }[] = [
    { type: 'front', label: 'Front',  emoji: '🧍' },
    { type: 'side',  label: 'Side',   emoji: '🚶' },
    { type: 'back',  label: 'Back',   emoji: '🪞' },
  ];

  const handleAddPhoto = async (photoType: 'front' | 'side' | 'back') => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }

    Alert.alert('Add photo', 'Take a new photo or choose from gallery', [
      {
        text: 'Camera',
        onPress: async () => {
          const { granted: camGranted } = await ImagePicker.requestCameraPermissionsAsync();
          if (!camGranted) return;
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [3, 4], quality: 0.7 });
          if (!result.canceled) {
            setUploading(true);
            try {
              await uploadPhoto.mutateAsync({ uri: result.assets[0].uri, photoType });
            } finally {
              setUploading(false);
            }
          }
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [3, 4], quality: 0.7 });
          if (!result.canceled) {
            setUploading(true);
            try {
              await uploadPhoto.mutateAsync({ uri: result.assets[0].uri, photoType });
            } finally {
              setUploading(false);
            }
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Group photos by date
  const grouped = photos.reduce((acc: Record<string, typeof photos>, photo) => {
    const date = photo.photo_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(photo);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

      {/* Upload row */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>
          Add today's photos
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {PHOTO_TYPES.map(pt => (
            <TouchableOpacity
              key={pt.type}
              onPress={() => handleAddPhoto(pt.type)}
              disabled={uploading}
              activeOpacity={0.8}
              style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: THEME.colors.border, gap: 6 }}
            >
              <Text style={{ fontSize: 22 }}>{pt.emoji}</Text>
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>+ {pt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {uploading && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <ActivityIndicator size="small" color={THEME.colors.teal} />
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Uploading...</Text>
          </View>
        )}
      </View>

      {/* Privacy note */}
      <View style={{ backgroundColor: `${THEME.colors.teal}10`, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: `${THEME.colors.teal}25`, marginBottom: 24, flexDirection: 'row', gap: 10 }}>
        <Text style={{ fontSize: 14 }}>🔒</Text>
        <Text style={{ flex: 1, fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 18 }}>
          Photos are private and only visible to you and your assigned coach.
        </Text>
      </View>

      {/* Photo history */}
      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />
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
              {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {grouped[date].map(photo => (
                <View key={photo.id} style={{ flex: 1, aspectRatio: 3 / 4, borderRadius: 12, overflow: 'hidden', backgroundColor: THEME.colors.surface2, borderWidth: 0.5, borderColor: THEME.colors.border }}>
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
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

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
