// app/(client)/routine-add-exercise.tsx
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, SectionList,
  StyleSheet, StatusBar, Modal, Animated, Pressable,
  ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRoutineStore } from '@/store/routineStore';
import { THEME } from '@/constants/theme';

// ── Filter options ────────────────────────────────────────────
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

// ── Muscle colour ─────────────────────────────────────────────
const MUSCLE_COLOR: Record<string, string> = {
  'Chest':'#F97316','Lats':'#3B82F6','Upper Back':'#3B82F6',
  'Lower Back':'#6B7280','Shoulders':'#8B5CF6','Biceps':'#EF4444',
  'Triceps':'#EC4899','Quadriceps':'#10B981','Hamstrings':'#10B981',
  'Glutes':'#14B8A6','Calves':'#84CC16','Abdominals':'#F59E0B',
  'Full Body':'#6366F1','Traps':'#D97706','Forearms':'#DC2626',
  'Cardio':'#0EA5E9',
};
const muscleColor = (m: string) => MUSCLE_COLOR[m] ?? '#6B7280';

// ── Fetch exercises from Supabase ─────────────────────────────
function useExerciseLibrary() {
  return useQuery({
    queryKey: ['exercise_library'],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_library')
        .select('id, name, primary_muscle, equipment, secondary_muscle, is_popular')
        .order('name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── Filter bottom sheet ───────────────────────────────────────
function FilterSheet({
  visible, title, options, selected, onSelect, onClose,
}: {
  visible: boolean; title: string; options: string[];
  selected: string; onSelect: (v: string) => void; onClose: () => void;
}) {
  const [show, setShow]  = useState(visible);
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

  return (
    <Modal transparent visible={show} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={[sheet.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[sheet.panel, { transform: [{ translateY: slideY }] }]}>
        {/* Handle */}
        <View style={sheet.handle} />

        {/* Title */}
        <Text style={sheet.sheetTitle}>{title}</Text>
        <View style={sheet.sheetDivider} />

        {/* Options */}
        <FlatList
          data={options}
          keyExtractor={item => item}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = item === selected;
            return (
              <TouchableOpacity
                style={sheet.optionRow}
                onPress={() => { onSelect(item); onClose(); }}
                activeOpacity={0.7}
              >
                {/* Circle avatar for muscle options */}
                {title === 'Muscle Group' && (
                  <View style={[sheet.muscleCircle, {
                    backgroundColor: item === 'All Muscles'
                      ? 'rgba(255,255,255,0.1)'
                      : `${muscleColor(item)}22`,
                    borderColor: item === 'All Muscles'
                      ? 'rgba(255,255,255,0.15)'
                      : `${muscleColor(item)}44`,
                  }]}>
                    <Text style={{ fontSize: 14 }}>
                      {item === 'All Muscles' ? '⊞' : ''}
                    </Text>
                    {item !== 'All Muscles' && (
                      <View style={[sheet.muscleDot, { backgroundColor: muscleColor(item) }]} />
                    )}
                  </View>
                )}

                <Text style={[sheet.optionText, isSelected && sheet.optionTextSelected]}>
                  {item}
                </Text>

                {isSelected && (
                  <Text style={sheet.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </Animated.View>
    </Modal>
  );
}

// ── Exercise row ──────────────────────────────────────────────
function ExerciseRow({
  item, isSelected, onPress,
}: {
  item: any; isSelected: boolean; onPress: () => void;
}) {
  const color = muscleColor(item.primary_muscle);
  return (
    <TouchableOpacity style={row.wrap} onPress={onPress} activeOpacity={0.7}>
      {/* Avatar */}
      <View style={[row.avatar, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}>
        <Text style={[row.avatarText, { color }]}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={row.name} numberOfLines={1}>{item.name}</Text>
        <Text style={row.muscle}>{item.primary_muscle}</Text>
      </View>

      {/* Selected indicator */}
      <View style={[row.selectBtn, isSelected && row.selectBtnActive]}>
        <Text style={[row.selectIcon, isSelected && row.selectIconActive]}>
          {isSelected ? '✓' : '↗'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────
export default function RoutineAddExerciseScreen() {
  const router = useRouter();
  const { addExercise, removeExercise, isSelected } = useRoutineStore();
  const { data: allExercises = [], isLoading } = useExerciseLibrary();

  const [search,        setSearch]        = useState('');
  const [equipment,     setEquipment]     = useState('All Equipment');
  const [muscle,        setMuscle]        = useState('All Muscles');
  const [showEquip,     setShowEquip]     = useState(false);
  const [showMuscle,    setShowMuscle]    = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);

  // Filtered + sectioned list
  const sections = useMemo(() => {
    let list = allExercises;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((ex: any) =>
        ex.name.toLowerCase().includes(q) ||
        ex.primary_muscle.toLowerCase().includes(q)
      );
    }

    // Equipment filter
    if (equipment !== 'All Equipment') {
      list = list.filter((ex: any) => ex.equipment === equipment);
    }

    // Muscle filter
    if (muscle !== 'All Muscles') {
      list = list.filter((ex: any) => ex.primary_muscle === muscle);
    }

    // Split into popular + all
    const popular = list.filter((ex: any) => ex.is_popular);
    const all     = list;

    const sections = [];
    if (popular.length && !search.trim() && equipment === 'All Equipment' && muscle === 'All Muscles') {
      sections.push({ title: 'Popular Exercises', data: popular });
    }

    // Alphabet sections for non-filtered view OR just flat list for filtered
    if (search.trim() || equipment !== 'All Equipment' || muscle !== 'All Muscles') {
      sections.push({ title: 'Results', data: all });
    } else {
      // Group alphabetically
      const letters: Record<string, any[]> = {};
      all.forEach((ex: any) => {
        const l = ex.name.charAt(0).toUpperCase();
        if (!letters[l]) letters[l] = [];
        letters[l].push(ex);
      });
      Object.keys(letters).sort().forEach(l => {
        sections.push({ title: l, data: letters[l] });
      });
    }

    return sections;
  }, [allExercises, search, equipment, muscle]);

  function toggleExercise(ex: any) {
    if (isSelected(ex.id)) {
      removeExercise(ex.id);
      setSelectedCount(c => c - 1);
    } else {
      addExercise({
        id:            ex.id,
        name:          ex.name,
        primaryMuscle: ex.primary_muscle,
        equipment:     ex.equipment,
        sets:          3,
        reps:          '10',
        restSeconds:   90,
      });
      setSelectedCount(c => c + 1);
    }
  }

  const activeFilters =
    (equipment !== 'All Equipment' ? 1 : 0) +
    (muscle !== 'All Muscles' ? 1 : 0);

  return (
    <SafeAreaView style={scr.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.background} />

      {/* ── Header ── */}
      <View style={scr.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={scr.headerLeft}>Cancel</Text>
        </TouchableOpacity>

        <Text style={scr.headerTitle}>Add Exercise</Text>

        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[scr.headerRight, selectedCount > 0 && scr.headerRightActive]}>
            {selectedCount > 0 ? `Add (${selectedCount})` : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={scr.searchWrap}>
        <Text style={scr.searchIcon}>🔍</Text>
        <TextInput
          style={scr.searchInput}
          placeholder="Search exercise"
          placeholderTextColor={THEME.colors.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      </View>

      {/* ── Filter chips ── */}
      <View style={scr.filterRow}>
        <TouchableOpacity
          style={[scr.filterChip, equipment !== 'All Equipment' && scr.filterChipActive]}
          onPress={() => setShowEquip(true)}
          activeOpacity={0.75}
        >
          <Text style={[scr.filterChipText, equipment !== 'All Equipment' && scr.filterChipTextActive]}>
            {equipment}
            {equipment !== 'All Equipment' ? ' ✓' : ' ▾'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[scr.filterChip, muscle !== 'All Muscles' && scr.filterChipActive]}
          onPress={() => setShowMuscle(true)}
          activeOpacity={0.75}
        >
          <Text style={[scr.filterChipText, muscle !== 'All Muscles' && scr.filterChipTextActive]}>
            {muscle}
            {muscle !== 'All Muscles' ? ' ✓' : ' ▾'}
          </Text>
        </TouchableOpacity>

        {activeFilters > 0 && (
          <TouchableOpacity
            style={scr.clearBtn}
            onPress={() => { setEquipment('All Equipment'); setMuscle('All Muscles'); }}
          >
            <Text style={scr.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Exercise list ── */}
      {isLoading ? (
        <View style={scr.loadingWrap}>
          <ActivityIndicator color={THEME.colors.teal} size="large" />
          <Text style={scr.loadingText}>Loading exercises…</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={scr.sectionHeader}>
              <Text style={scr.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <ExerciseRow
              item={item}
              isSelected={isSelected(item.id)}
              onPress={() => toggleExercise(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={scr.separator} />}
        />
      )}

      {/* ── Filter sheets ── */}
      <FilterSheet
        visible={showEquip}
        title="Equipment"
        options={EQUIPMENT_OPTIONS}
        selected={equipment}
        onSelect={setEquipment}
        onClose={() => setShowEquip(false)}
      />
      <FilterSheet
        visible={showMuscle}
        title="Muscle Group"
        options={MUSCLE_OPTIONS}
        selected={muscle}
        onSelect={setMuscle}
        onClose={() => setShowMuscle(false)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const scr = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerLeft:        { color: THEME.colors.teal, fontSize: 16, fontFamily: THEME.fonts.sans },
  headerTitle:       { color: THEME.colors.textPrimary, fontSize: 17, fontFamily: THEME.fonts.sansMedium },
  headerRight:       { color: THEME.colors.textMuted, fontSize: 16, fontFamily: THEME.fonts.sans },
  headerRightActive: { color: '#2563EB', fontFamily: THEME.fonts.sansMedium },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 12, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, paddingHorizontal: 14, height: 44,
  },
  searchIcon:  { fontSize: 15, opacity: 0.6 },
  searchInput: {
    flex: 1, color: THEME.colors.textPrimary,
    fontSize: 15, fontFamily: THEME.fonts.sans,
  },

  filterRow:         { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 8 },
  filterChip:        { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  filterChipActive:  { backgroundColor: `${THEME.colors.teal}18`, borderColor: `${THEME.colors.teal}50` },
  filterChipText:    { color: THEME.colors.textSecondary, fontSize: 13, fontFamily: THEME.fonts.sansMedium },
  filterChipTextActive: { color: THEME.colors.teal },
  clearBtn:          { paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center' },
  clearBtnText:      { color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.sans },

  sectionHeader:     { paddingHorizontal: 16, paddingVertical: 10, paddingTop: 16 },
  sectionTitle:      { color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.sansMedium, letterSpacing: 0.5 },

  separator:         { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 74 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.sans },
});

const row = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 18, fontFamily: THEME.fonts.sansMedium },
  name:       { fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: 2 },
  muscle:     { fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted },
  selectBtn:  {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  selectBtnActive:  { backgroundColor: `${THEME.colors.teal}20`, borderColor: THEME.colors.teal },
  selectIcon:       { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  selectIconActive: { color: THEME.colors.teal, fontFamily: 'DMSans_600SemiBold' },
});

const sheet = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 200,
  },
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#18181C',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    zIndex: 201,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  handle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginTop: 10, marginBottom: 6,
  },
  sheetTitle: {
    color: THEME.colors.textPrimary, fontSize: 16,
    fontFamily: THEME.fonts.sansMedium, textAlign: 'center',
    paddingVertical: 12,
  },
  sheetDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  muscleCircle: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', flexShrink: 0,
  },
  muscleDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  optionText: {
    flex: 1, fontSize: 15, fontFamily: THEME.fonts.sans,
    color: THEME.colors.textSecondary,
  },
  optionTextSelected: {
    color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium,
  },
  checkmark: { color: '#2563EB', fontSize: 17, fontFamily: THEME.fonts.sansMedium },
});
