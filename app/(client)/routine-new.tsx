// app/(client)/routine-new.tsx
// Shows saved routines at top + create new form below
import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ScrollView, StyleSheet, StatusBar, Alert,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRoutineStore } from '@/store/routineStore';
import { useAuthStore } from '@/store/authStore';
import { THEME } from '@/constants/theme';

// ── Colour helpers ────────────────────────────────────────────
const MUSCLE_COLOR: Record<string, string> = {
  'Chest':'#F97316','Lats':'#3B82F6','Upper Back':'#3B82F6',
  'Lower Back':'#6B7280','Shoulders':'#8B5CF6','Biceps':'#EF4444',
  'Triceps':'#EC4899','Quadriceps':'#10B981','Hamstrings':'#10B981',
  'Glutes':'#14B8A6','Calves':'#84CC16','Abdominals':'#F59E0B',
  'Full Body':'#6366F1','Traps':'#D97706','Forearms':'#DC2626',
  'Cardio':'#0EA5E9',
};
const ROUTINE_COLORS = ['#00C4B4','#E8A44A','#8B5CF6','#EF4444','#10B981','#3B82F6'];
const muscleColor = (m: string) => MUSCLE_COLOR[m] ?? '#6B7280';
const routineColor = (index: number) => ROUTINE_COLORS[index % ROUTINE_COLORS.length];

// ── Saved routine card ────────────────────────────────────────
function RoutineCard({ routine, index }: { routine: any; index: number }) {
  const color     = routineColor(index);
  const exCount   = routine.routine_exercises?.length ?? 0;
  const exNames   = (routine.routine_exercises ?? [])
    .slice(0, 3)
    .map((re: any) => re.exercise_library?.name ?? '')
    .filter(Boolean)
    .join(', ');

  return (
    <View style={[card.wrap, { borderLeftColor: color }]}>
      <View style={[card.dot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={card.title} numberOfLines={1}>{routine.title}</Text>
        {exNames ? (
          <Text style={card.sub} numberOfLines={1}>{exNames}{exCount > 3 ? '…' : ''}</Text>
        ) : null}
      </View>
      <View style={[card.badge, { backgroundColor: `${color}18`, borderColor: `${color}35` }]}>
        <Text style={[card.badgeText, { color }]}>{exCount} exercise{exCount !== 1 ? 's' : ''}</Text>
      </View>
    </View>
  );
}

// ── Exercise row in create form ───────────────────────────────
function ExerciseRow({ item, onRemove }: { item: any; onRemove: () => void }) {
  const color = muscleColor(item.primaryMuscle);
  return (
    <View style={exRow.wrap}>
      <View style={[exRow.avatar, { backgroundColor: `${color}22`, borderColor: `${color}44` }]}>
        <Text style={[exRow.avatarText, { color }]}>{item.name.charAt(0)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={exRow.name} numberOfLines={1}>{item.name}</Text>
        <Text style={exRow.muscle}>{item.primaryMuscle}</Text>
      </View>
      <View style={exRow.pill}>
        <Text style={exRow.pillText}>{item.sets} × {item.reps}</Text>
      </View>
      <TouchableOpacity onPress={onRemove} style={exRow.remove} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
        <Text style={exRow.removeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────
export default function RoutineScreen() {
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const { session }  = useAuthStore();
  const userId       = session?.user?.id ?? null;
  const { title, exercises, setTitle, removeExercise, reset } = useRoutineStore();

  const [saving, setSaving]       = useState(false);
  const [creating, setCreating]   = useState(false);
  const inputRef = useRef<TextInput>(null);

  // ── Fetch saved routines ──────────────────────────────────
  const { data: savedRoutines = [], isLoading: routinesLoading } = useQuery({
    queryKey: ['routines', userId],
    enabled: !!userId,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routines')
        .select(`
          id, title, created_at,
          routine_exercises (
            id,
            exercise_library ( name, primary_muscle )
          )
        `)
        .eq('client_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Save new routine ──────────────────────────────────────
  async function handleSave() {
    if (!title.trim()) {
      inputRef.current?.focus();
      Alert.alert('Add a title', 'Give your routine a name before saving.');
      return;
    }
    if (!exercises.length) {
      Alert.alert('No exercises', 'Add at least one exercise to your routine.');
      return;
    }
    setSaving(true);
    try {
      const { data: routine, error: rErr } = await supabase
        .from('routines')
        .insert({ client_id: userId, title: title.trim() })
        .select()
        .single();
      if (rErr) throw rErr;

      const rows = exercises.map((ex, i) => ({
        routine_id:   routine.id,
        exercise_id:  ex.id,
        order_index:  i,
        sets:         ex.sets,
        reps:         ex.reps,
        rest_seconds: ex.restSeconds,
      }));
      const { error: reErr } = await supabase.from('routine_exercises').insert(rows);
      if (reErr) throw reErr;

      reset();
      setCreating(false);
      queryClient.invalidateQueries({ queryKey: ['routines', userId] });
    } catch (err: any) {
      Alert.alert('Save failed', err.message ?? 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleStartCreate() {
    reset();
    setCreating(true);
    setTimeout(() => inputRef.current?.focus(), 300);
  }

  function handleCancelCreate() {
    if (title.trim() || exercises.length > 0) {
      Alert.alert('Discard?', 'Your unsaved routine will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => { reset(); setCreating(false); } },
      ]);
    } else {
      reset();
      setCreating(false);
    }
  }

  const hasContent = title.trim().length > 0 || exercises.length > 0;

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.background} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={s.headerBack}>‹  Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>
            {creating ? 'Create Routine' : 'Routines'}
          </Text>
          {creating ? (
            <TouchableOpacity onPress={handleCancelCreate} activeOpacity={0.7}>
              <Text style={s.headerAction}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={s.headerNewBtn}
              onPress={handleStartCreate}
              activeOpacity={0.8}
            >
              <Text style={s.headerNewBtnText}>＋ New</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ════ CREATE FORM (when creating = true) ════ */}
          {creating && (
            <View>
              <TextInput
                ref={inputRef}
                style={s.titleInput}
                placeholder="Routine title"
                placeholderTextColor={THEME.colors.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={60}
                returnKeyType="done"
              />
              <View style={s.titleDivider} />

              {exercises.length === 0 ? (
                <View style={s.emptyState}>
                  <Text style={s.emptyIcon}>🏋️</Text>
                  <Text style={s.emptyText}>
                    Get started by adding an exercise to your routine.
                  </Text>
                </View>
              ) : (
                <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                  {exercises.map(item => (
                    <ExerciseRow
                      key={item.id}
                      item={item}
                      onRemove={() => removeExercise(item.id)}
                    />
                  ))}
                </View>
              )}

              {/* Add exercise */}
              <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                <TouchableOpacity
                  style={s.addExBtn}
                  onPress={() => router.push('/(client)/routine-add-exercise')}
                  activeOpacity={0.85}
                >
                  <Text style={s.addExBtnText}>＋  Add exercise</Text>
                </TouchableOpacity>
              </View>

              {/* Save */}
              {hasContent && (
                <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
                  <TouchableOpacity
                    style={[s.saveBtn, saving && { opacity: 0.6 }]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.85}
                  >
                    {saving
                      ? <ActivityIndicator color="#000" size="small" />
                      : <Text style={s.saveBtnText}>💾  Save Routine</Text>
                    }
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* ════ SAVED ROUTINES LIST ════ */}
          {!creating && (
            <View style={{ paddingTop: 8 }}>
              {routinesLoading ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <ActivityIndicator color={THEME.colors.teal} />
                </View>
              ) : savedRoutines.length === 0 ? (
                <View style={s.noRoutinesState}>
                  <Text style={s.noRoutinesIcon}>📋</Text>
                  <Text style={s.noRoutinesTitle}>No routines yet</Text>
                  <Text style={s.noRoutinesSub}>
                    Tap <Text style={{ color: THEME.colors.teal }}>＋ New</Text> to create your first routine.
                  </Text>
                  <TouchableOpacity
                    style={s.createFirstBtn}
                    onPress={handleStartCreate}
                    activeOpacity={0.85}
                  >
                    <Text style={s.createFirstBtnText}>＋  Create New Routine</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={s.sectionLabel}>MY ROUTINES</Text>
                  {savedRoutines.map((routine: any, index: number) => (
                    <RoutineCard key={routine.id} routine={routine} index={index} />
                  ))}

                  {/* Create another */}
                  <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
                    <TouchableOpacity
                      style={s.addExBtn}
                      onPress={handleStartCreate}
                      activeOpacity={0.85}
                    >
                      <Text style={s.addExBtnText}>＋  Create New Routine</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerBack:   { color: THEME.colors.teal, fontSize: 16, fontFamily: THEME.fonts.sans },
  headerTitle:  { color: THEME.colors.textPrimary, fontSize: 17, fontFamily: THEME.fonts.sansMedium },
  headerAction: { color: THEME.colors.teal, fontSize: 16, fontFamily: THEME.fonts.sans },
  headerNewBtn: {
    backgroundColor: `${THEME.colors.teal}18`,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: `${THEME.colors.teal}35`,
  },
  headerNewBtnText: { color: THEME.colors.teal, fontSize: 13, fontFamily: THEME.fonts.sansMedium },

  // Title input
  titleInput: {
    fontSize: 22, fontFamily: THEME.fonts.sans,
    color: THEME.colors.textPrimary,
    paddingHorizontal: 20, paddingVertical: 20,
  },
  titleDivider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 20, marginBottom: 8,
  },

  // Empty create state
  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, paddingVertical: 36, gap: 12,
  },
  emptyIcon: { fontSize: 44, opacity: 0.4 },
  emptyText: {
    color: THEME.colors.textMuted, fontSize: 14, fontFamily: THEME.fonts.sans,
    textAlign: 'center', lineHeight: 22,
  },

  // No routines state
  noRoutinesState: {
    alignItems: 'center', paddingHorizontal: 40, paddingTop: 48, paddingBottom: 24, gap: 10,
  },
  noRoutinesIcon:  { fontSize: 48, opacity: 0.35, marginBottom: 4 },
  noRoutinesTitle: { color: THEME.colors.textPrimary, fontSize: 17, fontFamily: THEME.fonts.sansMedium },
  noRoutinesSub:   { color: THEME.colors.textMuted, fontSize: 14, fontFamily: THEME.fonts.sans, textAlign: 'center', lineHeight: 21 },

  sectionLabel: {
    color: THEME.colors.textMuted, fontSize: 11, fontFamily: THEME.fonts.sansMedium,
    letterSpacing: 1.2, paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4,
  },

  // Buttons
  addExBtn: {
    backgroundColor: '#2563EB', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  addExBtnText: { color: '#fff', fontSize: 15, fontFamily: THEME.fonts.sansMedium },

  saveBtn: {
    backgroundColor: THEME.colors.teal, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    shadowColor: THEME.colors.teal, shadowOpacity: 0.25,
    shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  saveBtnText: { color: '#000', fontSize: 15, fontFamily: THEME.fonts.sansMedium },

  createFirstBtn: {
    marginTop: 16, backgroundColor: THEME.colors.teal,
    borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', paddingHorizontal: 32,
  },
  createFirstBtnText: { color: '#000', fontSize: 15, fontFamily: THEME.fonts.sansMedium },
});

const card = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: THEME.colors.surface2,
    borderRadius: 14, padding: 14,
    borderLeftWidth: 3,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  title: { color: THEME.colors.textPrimary, fontSize: 15, fontFamily: THEME.fonts.sansMedium, marginBottom: 2 },
  sub:   { color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.sans },
  badge: {
    borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, flexShrink: 0,
  },
  badgeText: { fontSize: 11, fontFamily: THEME.fonts.sansMedium },
});

const exRow = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 17, fontFamily: THEME.fonts.sansMedium },
  name:   { fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: 2 },
  muscle: { fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted },
  pill:   { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  pillText: { fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary },
  remove: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  removeText: { color: THEME.colors.textMuted, fontSize: 12 },
});
