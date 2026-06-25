// app/(client)/plan-add-exercise.tsx
// Browse the exercise library, pick exercises, pick which days (1–6),
// then insert them into manual_workout_logs for every remaining week of the active plan.

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SectionList, FlatList,
  StyleSheet, Modal, Animated, Pressable, ActivityIndicator,
  Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore'; // only for session.user.id
import { THEME } from '@/constants/theme';

// ── Constants ─────────────────────────────────────────────────────────
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const INTENSITY_WEEKS: Record<string, number> = { beginner: 20, medium: 12, hard: 8 };

const EQUIPMENT_OPTIONS = [
  'All Equipment','Barbell','Bodyweight','Cable','Cardio',
  'Dumbbells','EZ Curl Bar','Kettlebell','Machine',
  'Other','Resistance Band','Smith Machine',
];
const MUSCLE_OPTIONS = [
  'All Muscles','Abdominals','Abductors','Adductors','Biceps',
  'Calves','Cardio','Chest','Forearms','Full Body','Glutes',
  'Hamstrings','Lats','Lower Back','Neck','Quadriceps',
  'Shoulders','Traps','Triceps','Upper Back','Other',
];

const MUSCLE_COLOR: Record<string, string> = {
  'Chest':'#F97316','Lats':'#3B82F6','Upper Back':'#3B82F6','Lower Back':'#6B7280',
  'Shoulders':'#8B5CF6','Biceps':'#EF4444','Triceps':'#EC4899','Quadriceps':'#10B981',
  'Hamstrings':'#10B981','Glutes':'#14B8A6','Calves':'#84CC16','Abdominals':'#F59E0B',
  'Full Body':'#6366F1','Traps':'#D97706','Forearms':'#DC2626','Cardio':'#0EA5E9',
};
const muscleColor = (m: string) => MUSCLE_COLOR[m] ?? '#6B7280';

// ── Helpers (all arithmetic stays in UTC strings to match DB convention) ──
// Add N days to a YYYY-MM-DD string, returning a YYYY-MM-DD string.
function addDaysToStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d + days);
  return new Date(ms).toISOString().split('T')[0];
}

// Return the Monday-of-week for a date string using the same UTC offset
// convention that useManualLog's getWeekStart() uses.
function currentWeekStart(): string {
  const d = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0]; // same pattern as useManualLog
}

// Compute plan end date string from plan start string + weeks.
function planEndStr(startStr: string, intensity: string): string {
  const weeks = INTENSITY_WEEKS[intensity] ?? 20;
  return addDaysToStr(startStr, weeks * 7 - 1);
}

// Generate all week-start strings from fromWeekStart through planEnd (inclusive).
// String comparison of ISO dates is safe for ordering.
function getAllWeekStarts(fromWeekStart: string, planEnd: string): string[] {
  const starts: string[] = [];
  let cur = fromWeekStart;
  while (cur <= planEnd) {
    starts.push(cur);
    cur = addDaysToStr(cur, 7);
  }
  return starts;
}

// ── Data ───────────────────────────────────────────────────────────────
function useExerciseLibrary() {
  return useQuery({
    queryKey: ['exercise_library'],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_library')
        .select('id, name, primary_muscle, equipment, is_popular')
        .order('name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── Filter bottom sheet ────────────────────────────────────────────────
function FilterSheet({
  visible, title, options, selected, onSelect, onClose,
}: {
  visible: boolean; title: string; options: string[];
  selected: string; onSelect: (v: string) => void; onClose: () => void;
}) {
  const [show, setShow] = useState(visible);
  const slideY = useRef(new Animated.Value(600)).current;
  const fade   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShow(true);
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.timing(fade,   { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: 600, duration: 240, useNativeDriver: true }),
        Animated.timing(fade,   { toValue: 0,   duration: 200, useNativeDriver: true }),
      ]).start(() => setShow(false));
    }
  }, [visible]);

  if (!show) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[fs.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[fs.panel, { transform: [{ translateY: slideY }] }]}>
        <View style={fs.handle} />
        <Text style={fs.title}>{title}</Text>
        <View style={fs.divider} />
        <FlatList
          data={options}
          keyExtractor={item => item}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSel = item === selected;
            return (
              <TouchableOpacity style={fs.row} onPress={() => { onSelect(item); onClose(); }} activeOpacity={0.7}>
                <Text style={[fs.rowText, isSel && fs.rowTextActive]}>{item}</Text>
                {isSel && <Text style={fs.check}>✓</Text>}
              </TouchableOpacity>
            );
          }}
        />
      </Animated.View>
    </Modal>
  );
}

// ── Day Picker bottom sheet ────────────────────────────────────────────
function DayPickerSheet({
  visible, selectedDays, onToggleDay, onConfirm, onClose, exerciseCount, saving,
}: {
  visible: boolean;
  selectedDays: Set<number>;
  onToggleDay: (d: number) => void;
  onConfirm: () => void;
  onClose: () => void;
  exerciseCount: number;
  saving: boolean;
}) {
  const [show, setShow] = useState(visible);
  const slideY = useRef(new Animated.Value(500)).current;
  const fade   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShow(true);
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.timing(fade,   { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: 500, duration: 240, useNativeDriver: true }),
        Animated.timing(fade,   { toValue: 0,   duration: 200, useNativeDriver: true }),
      ]).start(() => setShow(false));
    }
  }, [visible]);

  if (!show) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[dp.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[dp.panel, { transform: [{ translateY: slideY }] }]}>
        <View style={dp.handle} />
        <Text style={dp.title}>Choose Days</Text>
        <Text style={dp.subtitle}>
          {exerciseCount === 1 ? '1 exercise' : `${exerciseCount} exercises`} will be added to the selected days across your entire plan.
        </Text>
        <View style={dp.divider} />

        {/* Day toggles */}
        <View style={dp.daysGrid}>
          {DAY_NAMES.map((name, idx) => {
            const dayNum = idx + 1;
            const active = selectedDays.has(dayNum);
            return (
              <TouchableOpacity
                key={dayNum}
                style={[dp.dayBtn, active && dp.dayBtnActive]}
                onPress={() => onToggleDay(dayNum)}
                activeOpacity={0.75}
              >
                <Text style={[dp.dayNum, active && dp.dayNumActive]}>{dayNum}</Text>
                <Text style={[dp.dayName, active && dp.dayNameActive]} numberOfLines={1}>{name}</Text>
                {active && <View style={dp.dayCheck}><Text style={{ color: THEME.colors.teal, fontSize: 11 }}>✓</Text></View>}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={dp.divider} />

        {/* Confirm button */}
        <TouchableOpacity
          style={[dp.confirmBtn, (selectedDays.size === 0 || saving) && dp.confirmBtnDisabled]}
          onPress={onConfirm}
          disabled={selectedDays.size === 0 || saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#000" size="small" />
            : <Text style={dp.confirmText}>
                {selectedDays.size === 0
                  ? 'Select at least one day'
                  : `Add to ${selectedDays.size} day${selectedDays.size > 1 ? 's' : ''} →`}
              </Text>
          }
        </TouchableOpacity>
        <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
      </Animated.View>
    </Modal>
  );
}

// ── Exercise row ───────────────────────────────────────────────────────
function ExerciseRow({ item, isSelected, onPress }: { item: any; isSelected: boolean; onPress: () => void }) {
  const color = muscleColor(item.primary_muscle);
  return (
    <TouchableOpacity style={er.wrap} onPress={onPress} activeOpacity={0.7}>
      <View style={[er.avatar, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}>
        <Text style={[er.avatarText, { color }]}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={er.name} numberOfLines={1}>{item.name}</Text>
        <Text style={er.muscle}>{item.primary_muscle}</Text>
      </View>
      <View style={[er.selBtn, isSelected && er.selBtnActive]}>
        <Text style={[er.selIcon, isSelected && er.selIconActive]}>{isSelected ? '✓' : '+'}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────
export default function PlanAddExerciseScreen() {
  const router  = useRouter();
  const qClient = useQueryClient();
  const { session } = useAuthStore() as any;
  const userId  = session?.user?.id ?? null;

  // Plan dates come from router params (passed from ManualLogView which has the
  // up-to-date local state — avoids stale auth store values after plan changes).
  const {
    weekStart:    paramWeekStart,
    planStart:    paramPlanStart,
    planIntensity: paramIntensity,
  } = useLocalSearchParams<{ weekStart?: string; planStart?: string; planIntensity?: string }>();

  const planStartStr  = paramPlanStart   && paramPlanStart   !== '' ? paramPlanStart   : null;
  const planIntensity = paramIntensity   && paramIntensity   !== '' ? paramIntensity   : 'beginner';

  // Compute plan end string in pure UTC arithmetic (no timezone conversion risk)
  const planEnd = useMemo<string | null>(() => {
    if (!planStartStr) return null;
    return planEndStr(planStartStr, planIntensity);
  }, [planStartStr, planIntensity]);

  // The week from which to start adding (default = current week)
  const fromWeek = (paramWeekStart && paramWeekStart !== '') ? paramWeekStart : currentWeekStart();

  const { data: allExercises = [], isLoading } = useExerciseLibrary();

  const [search,       setSearch]      = useState('');
  const [equipment,    setEquipment]   = useState('All Equipment');
  const [muscle,       setMuscle]      = useState('All Muscles');
  const [showEquip,    setShowEquip]   = useState(false);
  const [showMuscle,   setShowMuscle]  = useState(false);
  const [selected,     setSelected]    = useState<Map<string, any>>(new Map());
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [selectedDays, setSelectedDays]  = useState<Set<number>>(new Set());
  const [saving,       setSaving]        = useState(false);

  // Filter + section list
  const sections = useMemo(() => {
    let list = allExercises as any[];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(ex => ex.name.toLowerCase().includes(q) || ex.primary_muscle.toLowerCase().includes(q));
    }
    if (equipment !== 'All Equipment') list = list.filter(ex => ex.equipment === equipment);
    if (muscle    !== 'All Muscles')   list = list.filter(ex => ex.primary_muscle === muscle);

    const secs: { title: string; data: any[] }[] = [];
    const filtered = search.trim() || equipment !== 'All Equipment' || muscle !== 'All Muscles';

    if (!filtered) {
      const popular = list.filter(ex => ex.is_popular);
      if (popular.length) secs.push({ title: 'Popular', data: popular });
      const byLetter: Record<string, any[]> = {};
      list.forEach(ex => {
        const l = ex.name.charAt(0).toUpperCase();
        if (!byLetter[l]) byLetter[l] = [];
        byLetter[l].push(ex);
      });
      Object.keys(byLetter).sort().forEach(l => secs.push({ title: l, data: byLetter[l] }));
    } else {
      secs.push({ title: `${list.length} result${list.length !== 1 ? 's' : ''}`, data: list });
    }
    return secs;
  }, [allExercises, search, equipment, muscle]);

  function toggleExercise(ex: any) {
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(ex.id)) next.delete(ex.id);
      else next.set(ex.id, ex);
      return next;
    });
  }

  function toggleDay(d: number) {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d); else next.add(d);
      return next;
    });
  }

  async function handleConfirm() {
    if (!userId || selected.size === 0 || selectedDays.size === 0) return;
    if (!planEnd) {
      Alert.alert('No active plan', 'Please set your workout plan start date first.');
      return;
    }

    setSaving(true);
    try {
      const weekStarts = getAllWeekStarts(fromWeek, planEnd);
      const exercises  = Array.from(selected.values());
      const rows: any[] = [];

      weekStarts.forEach(ws => {
        selectedDays.forEach(dayNum => {
          exercises.forEach((ex, idx) => {
            rows.push({
              client_id:       userId,
              week_start_date: ws,
              day_number:      dayNum,
              item_type:       'workout',
              item_name:       ex.name,
              item_order:      100 + idx,
              completed:       false,
              completed_at:    null,
            });
          });
        });
      });

      const { error } = await supabase.from('manual_workout_logs').insert(rows);
      if (error) throw error;

      // Invalidate all affected week queries
      weekStarts.forEach(ws => {
        qClient.invalidateQueries({ queryKey: ['manual_logs', userId, ws] });
      });

      const dayLabels = Array.from(selectedDays)
        .sort()
        .map(d => DAY_NAMES[d - 1])
        .join(', ');

      Alert.alert(
        '✅ Exercises added',
        `${exercises.length} exercise${exercises.length > 1 ? 's' : ''} added to ${dayLabels} across ${weekStarts.length} week${weekStarts.length > 1 ? 's' : ''} of your plan.`,
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert('Failed to add', err.message ?? 'Please try again.');
    } finally {
      setSaving(false);
      setShowDayPicker(false);
    }
  }

  const activeFilters = (equipment !== 'All Equipment' ? 1 : 0) + (muscle !== 'All Muscles' ? 1 : 0);

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.title}>Add Exercises</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* ── No plan warning ── */}
      {!planEnd && (
        <View style={s.noPlanBanner}>
          <Text style={s.noPlanText}>⚠️  No active plan set — exercises cannot be saved. Please set a plan start date first.</Text>
        </View>
      )}

      {/* ── Search ── */}
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Search exercises…"
          placeholderTextColor={THEME.colors.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      </View>

      {/* ── Filters ── */}
      <View style={s.filterRow}>
        <TouchableOpacity
          style={[s.chip, equipment !== 'All Equipment' && s.chipActive]}
          onPress={() => setShowEquip(true)}
          activeOpacity={0.75}
        >
          <Text style={[s.chipText, equipment !== 'All Equipment' && s.chipTextActive]}>
            {equipment !== 'All Equipment' ? `${equipment} ✓` : `Equipment ▾`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.chip, muscle !== 'All Muscles' && s.chipActive]}
          onPress={() => setShowMuscle(true)}
          activeOpacity={0.75}
        >
          <Text style={[s.chipText, muscle !== 'All Muscles' && s.chipTextActive]}>
            {muscle !== 'All Muscles' ? `${muscle} ✓` : `Muscle ▾`}
          </Text>
        </TouchableOpacity>
        {activeFilters > 0 && (
          <TouchableOpacity onPress={() => { setEquipment('All Equipment'); setMuscle('All Muscles'); }}>
            <Text style={s.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Exercise list ── */}
      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={THEME.colors.teal} size="large" />
          <Text style={s.loadingText}>Loading exercises…</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: selected.size > 0 ? 100 : 24 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <ExerciseRow
              item={item}
              isSelected={selected.has(item.id)}
              onPress={() => toggleExercise(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={s.sep} />}
        />
      )}

      {/* ── Floating "Add to plan" button ── */}
      {selected.size > 0 && (
        <View style={s.floatBar}>
          <TouchableOpacity
            style={s.floatBtn}
            onPress={() => setShowDayPicker(true)}
            activeOpacity={0.88}
          >
            <Text style={s.floatBtnText}>
              Add {selected.size} exercise{selected.size > 1 ? 's' : ''} to plan  →
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Filter sheets ── */}
      <FilterSheet visible={showEquip}  title="Equipment"    options={EQUIPMENT_OPTIONS} selected={equipment} onSelect={setEquipment} onClose={() => setShowEquip(false)}  />
      <FilterSheet visible={showMuscle} title="Muscle Group" options={MUSCLE_OPTIONS}    selected={muscle}    onSelect={setMuscle}    onClose={() => setShowMuscle(false)} />

      {/* ── Day picker ── */}
      <DayPickerSheet
        visible={showDayPicker}
        selectedDays={selectedDays}
        onToggleDay={toggleDay}
        onConfirm={handleConfirm}
        onClose={() => setShowDayPicker(false)}
        exerciseCount={selected.size}
        saving={saving}
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: THEME.colors.background },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  cancel:    { color: THEME.colors.teal, fontSize: 16, fontFamily: THEME.fonts.sans, width: 60 },
  title:     { color: THEME.colors.textPrimary, fontSize: 17, fontFamily: THEME.fonts.sansMedium },

  noPlanBanner: { margin: 12, backgroundColor: 'rgba(232,164,74,0.1)', borderRadius: 10, padding: 10, borderWidth: 0.5, borderColor: 'rgba(232,164,74,0.3)' },
  noPlanText:   { color: THEME.colors.amber, fontSize: 12, fontFamily: THEME.fonts.sans, lineHeight: 18 },

  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 14, height: 44 },
  searchIcon:  { fontSize: 15, opacity: 0.6 },
  searchInput: { flex: 1, color: THEME.colors.textPrimary, fontSize: 15, fontFamily: THEME.fonts.sans },

  filterRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 8 },
  chip:         { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chipActive:   { backgroundColor: `${THEME.colors.teal}18`, borderColor: `${THEME.colors.teal}50` },
  chipText:     { color: THEME.colors.textSecondary, fontSize: 13, fontFamily: THEME.fonts.sansMedium },
  chipTextActive: { color: THEME.colors.teal },
  clearText:    { color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.sans, alignSelf: 'center', paddingHorizontal: 4 },

  sectionHeader: { paddingHorizontal: 16, paddingVertical: 10, paddingTop: 16 },
  sectionTitle:  { color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.sansMedium, letterSpacing: 0.5, textTransform: 'uppercase' },
  sep:           { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 74 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.sans },

  floatBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 20, paddingTop: 10, backgroundColor: 'rgba(10,10,11,0.92)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  floatBtn: { backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: THEME.colors.teal, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  floatBtnText: { color: '#000', fontSize: 15, fontFamily: THEME.fonts.sansMedium },
});

const er = StyleSheet.create({
  wrap:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  avatar:       { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:   { fontSize: 18, fontFamily: THEME.fonts.sansMedium },
  name:         { fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: 2 },
  muscle:       { fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted },
  selBtn:       { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  selBtnActive: { backgroundColor: `${THEME.colors.teal}20`, borderColor: THEME.colors.teal },
  selIcon:      { color: 'rgba(255,255,255,0.4)', fontSize: 16 },
  selIconActive:{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium },
});

const fs = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 200 },
  panel:    { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#18181C', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', zIndex: 201, maxHeight: '85%', paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  handle:   { width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  title:    { color: THEME.colors.textPrimary, fontSize: 16, fontFamily: THEME.fonts.sansMedium, textAlign: 'center', paddingVertical: 12 },
  divider:  { height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  row:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  rowText:  { flex: 1, fontSize: 15, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary },
  rowTextActive: { color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium },
  check:    { color: THEME.colors.teal, fontSize: 17, fontFamily: THEME.fonts.sansMedium },
});

const dp = StyleSheet.create({
  backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 200 },
  panel:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#16161C', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: 'rgba(0,196,180,0.15)', zIndex: 201, paddingHorizontal: 16 },
  handle:     { width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  title:      { color: THEME.colors.textPrimary, fontSize: 18, fontFamily: THEME.fonts.sansMedium, textAlign: 'center', marginBottom: 6 },
  subtitle:   { color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.sans, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  divider:    { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 16 },

  daysGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  dayBtn:     { width: '28%', alignItems: 'center', backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', position: 'relative' },
  dayBtnActive: { backgroundColor: 'rgba(0,196,180,0.1)', borderColor: THEME.colors.teal },
  dayNum:     { fontSize: 20, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 4 },
  dayNumActive: { color: THEME.colors.teal },
  dayName:    { fontSize: 11, fontFamily: THEME.fonts.sans, color: 'rgba(255,255,255,0.3)' },
  dayNameActive: { color: THEME.colors.teal },
  dayCheck:   { position: 'absolute', top: 6, right: 8 },

  confirmBtn:         { backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  confirmBtnDisabled: { backgroundColor: THEME.colors.surface2 },
  confirmText:        { color: '#000', fontSize: 15, fontFamily: THEME.fonts.sansMedium },
});
