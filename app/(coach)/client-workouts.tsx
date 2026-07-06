import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useClientWeekLogs, useCoachAddExercise, useCoachRemoveExercise, EditableSection, EDITABLE_SECTIONS } from '@/hooks/useCoachWorkoutEditor';
import { useClientWeekNutrition, useCoachAddMeal, useCoachRemoveMeal, MealSlot, MEAL_SLOTS } from '@/hooks/useCoachNutritionEditor';
import { useClientWeekSupplements, useCoachAddSupplement, useCoachRemoveSupplement } from '@/hooks/useCoachSupplementEditor';
import { getWeekStart, getDayDate } from '@/hooks/useManualLog';
import { WARMUP_EXERCISES } from '@/constants/warmupExercises';
import { WORKOUT_EXERCISES } from '@/constants/workoutExercises';
import { COOLDOWN_EXERCISES } from '@/constants/cooldownExercises';
import { MORNING_DRINK_ITEMS, BREAKFAST_ITEMS, LUNCH_ITEMS, EVENING_SNACK_ITEMS, DINNER_ITEMS, FoodItemDefault } from '@/constants/foodItems';
import { SUPPLEMENT_ITEMS, SupplementItemDefault, getSupplementInteractionWarning } from '@/constants/supplementItems';
import { useClientProfile } from '@/hooks/useCoachClientOverview';
import { THEME } from '@/constants/theme';
import { sanitizeInteger, NUMERIC_RANGES, clampToRange } from '@/utils/validation';

const SUCCESS = THEME.colors.success ?? '#4CC986';

const EXERCISE_META: Record<EditableSection, { label: string; icon: string; color: string }> = {
  warmup:   { label: 'Warmup',   icon: '🔥', color: THEME.colors.amber },
  workout:  { label: 'Workout',  icon: '💪', color: THEME.colors.teal },
  cooldown: { label: 'Cooldown', icon: '🧘', color: '#60A5FA' },
};
const MEAL_META: Record<MealSlot, { label: string; icon: string; color: string }> = {
  morning_drink:  { label: 'Morning Drink',  icon: '☀️', color: '#FBBF24' },
  breakfast:      { label: 'Breakfast',      icon: '🍳', color: '#FB923C' },
  lunch:          { label: 'Lunch',          icon: '🍛', color: '#4ADE80' },
  evening_snacks: { label: 'Evening Snacks', icon: '🍪', color: '#F59E0B' },
  dinner:         { label: 'Dinner',         icon: '🍽', color: '#818CF8' },
};

const EXERCISE_LIBRARY: Record<EditableSection, { id: string; name: string; defaultSets: number; defaultReps: number | null; defaultSide: string; defaultHoldSecs: number | null; defaultRestSecs: number }[]> = {
  warmup: WARMUP_EXERCISES, workout: WORKOUT_EXERCISES, cooldown: COOLDOWN_EXERCISES,
};
const FOOD_LIBRARY: Record<MealSlot, FoodItemDefault[]> = {
  morning_drink: MORNING_DRINK_ITEMS, breakfast: BREAKFAST_ITEMS, lunch: LUNCH_ITEMS, evening_snacks: EVENING_SNACK_ITEMS, dinner: DINNER_ITEMS,
};
const SUPPLEMENT_META: Record<MealSlot, { label: string; icon: string; color: string }> = {
  morning_drink:  { label: 'Morning',        icon: '☀️', color: '#FBBF24' },
  breakfast:      { label: 'Breakfast',      icon: '🍳', color: '#FB923C' },
  lunch:          { label: 'Lunch',          icon: '🍛', color: '#4ADE80' },
  evening_snacks: { label: 'Evening Snacks', icon: '🍪', color: '#F59E0B' },
  dinner:         { label: 'Dinner',         icon: '🍽', color: '#818CF8' },
};

const SIDE_LABELS: Record<string, string> = { right: 'Each side', left: 'Each side', rotation: 'Rotation', na: '' };
const SIDE_OPTIONS: { key: string; label: string }[] = [
  { key: 'na', label: 'N/A' }, { key: 'right', label: 'Each side' }, { key: 'rotation', label: 'Rotation' },
];

function exerciseDetailLine(item: any): string | null {
  const parts: string[] = [];
  if (item.sets) parts.push(`${item.sets} set${item.sets > 1 ? 's' : ''}`);
  if (item.reps) parts.push(`${item.reps} reps`);
  if (item.side && SIDE_LABELS[item.side]) parts.push(SIDE_LABELS[item.side]);
  if (item.hold_secs) parts.push(`Hold ${item.hold_secs}s`);
  if (item.rest_secs) parts.push(`Rest ${item.rest_secs}s`);
  return parts.length ? parts.join('  ·  ') : null;
}
function mealDetailLine(item: any): string | null {
  const parts: string[] = [];
  if (item.quantity)  parts.push(item.quantity);
  if (item.calories)  parts.push(`${item.calories} kcal`);
  if (item.protein_g) parts.push(`P ${item.protein_g}g`);
  if (item.carbs_g)   parts.push(`C ${item.carbs_g}g`);
  if (item.fat_g)      parts.push(`F ${item.fat_g}g`);
  return parts.length ? parts.join('  ·  ') : null;
}
function supplementDetailLine(item: any): string | null {
  return item.quantity ?? null;
}

function shiftWeek(weekStart: string, delta: number) {
  const d = new Date(weekStart + 'T00:00:00');
  d.setDate(d.getDate() + delta * 7);
  return getWeekStart(d);
}

type ModalTarget = { kind: 'exercise'; key: EditableSection } | { kind: 'meal'; key: MealSlot } | { kind: 'supplement'; key: MealSlot };
type SupplementScope = 'today' | 'week' | 'month';

// ── Add Exercise Modal ──────────────────────────────────────────────────
function AddExerciseModal({
  visible, onClose, section, onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  section: EditableSection | null;
  onAdd: (payload: { itemName: string; sets: number | null; reps: number | null; side: string; holdSecs: number | null; restSecs: number; applyToWeek: boolean }) => void;
}) {
  const [step, setStep] = useState<'choose' | 'list' | 'manual'>('choose');
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [side, setSide] = useState('na');
  const [hold, setHold] = useState('');
  const [rest, setRest] = useState('');
  const [applyToWeek, setApplyToWeek] = useState(false);

  const reset = () => {
    setStep('choose'); setSearch(''); setName(''); setSets(''); setReps(''); setSide('na'); setHold(''); setRest(''); setApplyToWeek(false);
  };
  const close = () => { reset(); onClose(); };

  if (!section) return null;
  const library = EXERCISE_LIBRARY[section];
  const filtered = library.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));

  const pickFromList = (ex: typeof library[0]) => {
    setName(ex.name); setSets(String(ex.defaultSets ?? '')); setReps(ex.defaultReps != null ? String(ex.defaultReps) : '');
    setSide(ex.defaultSide ?? 'na'); setHold(ex.defaultHoldSecs != null ? String(ex.defaultHoldSecs) : ''); setRest(String(ex.defaultRestSecs ?? ''));
    setStep('manual');
  };

  const submit = () => {
    if (!name.trim()) { Alert.alert('Name required', 'Please enter an exercise name.'); return; }
    onAdd({
      itemName: name.trim(),
      sets: sets ? clampToRange(Number(sets), NUMERIC_RANGES.sets) : null,
      reps: reps ? clampToRange(Number(reps), NUMERIC_RANGES.reps) : null,
      side,
      holdSecs: hold ? clampToRange(Number(hold), NUMERIC_RANGES.holdSeconds) : null,
      restSecs: rest ? clampToRange(Number(rest), NUMERIC_RANGES.restSeconds) : 0,
      applyToWeek,
    });
    close();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={close} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '85%', backgroundColor: THEME.colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>Add to {EXERCISE_META[section].label}</Text>
          <TouchableOpacity onPress={close}><Text style={{ fontSize: 20, color: THEME.colors.textMuted }}>✕</Text></TouchableOpacity>
        </View>

        {step === 'choose' && (
          <View style={{ gap: 12 }}>
            <TouchableOpacity onPress={() => setStep('list')} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 22 }}>📋</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Select from list</Text>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>Curated exercises with smart defaults</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('manual')} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 22 }}>✏️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Write manually</Text>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>Custom exercise with your own parameters</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {step === 'list' && (
          <>
            <TextInput value={search} onChangeText={setSearch} placeholder="Search exercises..." placeholderTextColor={THEME.colors.textMuted}
              style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, marginBottom: 10, borderWidth: 0.5, borderColor: THEME.colors.border }} />
            <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
              {filtered.map((ex) => (
                <TouchableOpacity key={ex.id} onPress={() => pickFromList(ex)} style={{ paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: THEME.colors.border }}>
                  <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>{ex.name}</Text>
                </TouchableOpacity>
              ))}
              {filtered.length === 0 && <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13, paddingVertical: 20, textAlign: 'center' }}>No matches</Text>}
            </ScrollView>
          </>
        )}

        {step === 'manual' && (
          <ScrollView keyboardShouldPersistTaps="handled">
            <TextInput value={name} onChangeText={setName} placeholder="Exercise name" placeholderTextColor={THEME.colors.textMuted}
              style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, marginBottom: 14, borderWidth: 0.5, borderColor: THEME.colors.border }} />
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 6 }}>Sets</Text>
                <TextInput value={sets} onChangeText={(t) => setSets(sanitizeInteger(t))} keyboardType="numeric" maxLength={3} placeholder="3" placeholderTextColor={THEME.colors.textMuted} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, borderWidth: 0.5, borderColor: THEME.colors.border }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 6 }}>Reps</Text>
                <TextInput value={reps} onChangeText={(t) => setReps(sanitizeInteger(t))} keyboardType="numeric" maxLength={3} placeholder="12" placeholderTextColor={THEME.colors.textMuted} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, borderWidth: 0.5, borderColor: THEME.colors.border }} />
              </View>
            </View>
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 8 }}>Side</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {SIDE_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt.key} onPress={() => setSide(opt.key)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: side === opt.key ? THEME.colors.teal : THEME.colors.surface2, borderWidth: 0.5, borderColor: side === opt.key ? THEME.colors.teal : THEME.colors.border }}>
                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: side === opt.key ? THEME.colors.background : THEME.colors.textSecondary }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 6 }}>Hold (secs)</Text>
                <TextInput value={hold} onChangeText={(t) => setHold(sanitizeInteger(t))} keyboardType="numeric" maxLength={4} placeholder="—" placeholderTextColor={THEME.colors.textMuted} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, borderWidth: 0.5, borderColor: THEME.colors.border }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 6 }}>Rest (secs)</Text>
                <TextInput value={rest} onChangeText={(t) => setRest(sanitizeInteger(t))} keyboardType="numeric" maxLength={4} placeholder="30" placeholderTextColor={THEME.colors.textMuted} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, borderWidth: 0.5, borderColor: THEME.colors.border }} />
              </View>
            </View>

            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 8 }}>Apply to</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
              <TouchableOpacity onPress={() => setApplyToWeek(false)} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: !applyToWeek ? THEME.colors.teal : THEME.colors.surface2, borderWidth: 0.5, borderColor: !applyToWeek ? THEME.colors.teal : THEME.colors.border }}>
                <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: !applyToWeek ? THEME.colors.background : THEME.colors.textSecondary }}>This day only</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setApplyToWeek(true)} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: applyToWeek ? THEME.colors.teal : THEME.colors.surface2, borderWidth: 0.5, borderColor: applyToWeek ? THEME.colors.teal : THEME.colors.border }}>
                <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: applyToWeek ? THEME.colors.background : THEME.colors.textSecondary }}>Entire week (all 6 days)</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={submit} style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Add Exercise</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ── Add Meal Modal ───────────────────────────────────────────────────────
function AddMealModal({
  visible, onClose, slot, onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  slot: MealSlot | null;
  onAdd: (payload: { itemName: string; quantity: string; calories: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null; applyToWeek: boolean }) => void;
}) {
  const [step, setStep] = useState<'choose' | 'list' | 'manual'>('choose');
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [applyToWeek, setApplyToWeek] = useState(false);

  const reset = () => { setStep('choose'); setSearch(''); setName(''); setQuantity(''); setCalories(''); setProtein(''); setCarbs(''); setFat(''); setApplyToWeek(false); };
  const close = () => { reset(); onClose(); };

  if (!slot) return null;
  const library = FOOD_LIBRARY[slot];
  const filtered = library.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  const pickFromList = (f: FoodItemDefault) => {
    setName(f.name); setQuantity(f.defaultQuantity ?? ''); setCalories(String(f.defaultCalories ?? ''));
    setProtein(String(f.defaultProteinG ?? '')); setCarbs(String(f.defaultCarbsG ?? '')); setFat(String(f.defaultFatG ?? ''));
    setStep('manual');
  };

  const submit = () => {
    if (!name.trim()) { Alert.alert('Name required', 'Please enter a food item name.'); return; }
    onAdd({
      itemName: name.trim(), quantity: quantity.trim(),
      calories: calories ? clampToRange(Number(calories), NUMERIC_RANGES.calories) : null,
      proteinG: protein ? clampToRange(Number(protein), NUMERIC_RANGES.macroGrams) : null,
      carbsG: carbs ? clampToRange(Number(carbs), NUMERIC_RANGES.macroGrams) : null,
      fatG: fat ? clampToRange(Number(fat), NUMERIC_RANGES.macroGrams) : null,
      applyToWeek,
    });
    close();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={close} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '85%', backgroundColor: THEME.colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>Add to {MEAL_META[slot].label}</Text>
          <TouchableOpacity onPress={close}><Text style={{ fontSize: 20, color: THEME.colors.textMuted }}>✕</Text></TouchableOpacity>
        </View>

        {step === 'choose' && (
          <View style={{ gap: 12 }}>
            <TouchableOpacity onPress={() => setStep('list')} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 22 }}>📋</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Select from list</Text>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>Curated dishes with calories & macros pre-filled</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('manual')} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 22 }}>✏️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Write manually</Text>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>Custom dish with your own quantity & macros</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {step === 'list' && (
          <>
            <TextInput value={search} onChangeText={setSearch} placeholder="Search dishes..." placeholderTextColor={THEME.colors.textMuted}
              style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, marginBottom: 10, borderWidth: 0.5, borderColor: THEME.colors.border }} />
            <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
              {filtered.map((f) => (
                <TouchableOpacity key={f.id} onPress={() => pickFromList(f)} style={{ paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: THEME.colors.border }}>
                  <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>{f.name}</Text>
                  <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{f.defaultQuantity} · {f.defaultCalories} kcal</Text>
                </TouchableOpacity>
              ))}
              {filtered.length === 0 && <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13, paddingVertical: 20, textAlign: 'center' }}>No matches</Text>}
            </ScrollView>
          </>
        )}

        {step === 'manual' && (
          <ScrollView keyboardShouldPersistTaps="handled">
            <TextInput value={name} onChangeText={setName} placeholder="Dish name" placeholderTextColor={THEME.colors.textMuted} maxLength={80}
              style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, marginBottom: 14, borderWidth: 0.5, borderColor: THEME.colors.border }} />
            <TextInput value={quantity} onChangeText={setQuantity} placeholder="Quantity (e.g. 1 bowl, 200ml)" placeholderTextColor={THEME.colors.textMuted} maxLength={40}
              style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, marginBottom: 14, borderWidth: 0.5, borderColor: THEME.colors.border }} />
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 6 }}>Calories</Text>
                <TextInput value={calories} onChangeText={(t) => setCalories(sanitizeInteger(t))} keyboardType="numeric" maxLength={5} placeholder="kcal" placeholderTextColor={THEME.colors.textMuted} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, borderWidth: 0.5, borderColor: THEME.colors.border }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 6 }}>Protein (g)</Text>
                <TextInput value={protein} onChangeText={(t) => setProtein(sanitizeInteger(t))} keyboardType="numeric" maxLength={4} placeholder="g" placeholderTextColor={THEME.colors.textMuted} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, borderWidth: 0.5, borderColor: THEME.colors.border }} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 6 }}>Carbs (g)</Text>
                <TextInput value={carbs} onChangeText={(t) => setCarbs(sanitizeInteger(t))} keyboardType="numeric" maxLength={4} placeholder="g" placeholderTextColor={THEME.colors.textMuted} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, borderWidth: 0.5, borderColor: THEME.colors.border }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 6 }}>Fat (g)</Text>
                <TextInput value={fat} onChangeText={(t) => setFat(sanitizeInteger(t))} keyboardType="numeric" maxLength={4} placeholder="g" placeholderTextColor={THEME.colors.textMuted} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, borderWidth: 0.5, borderColor: THEME.colors.border }} />
              </View>
            </View>

            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 8 }}>Apply to</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
              <TouchableOpacity onPress={() => setApplyToWeek(false)} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: !applyToWeek ? THEME.colors.teal : THEME.colors.surface2, borderWidth: 0.5, borderColor: !applyToWeek ? THEME.colors.teal : THEME.colors.border }}>
                <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: !applyToWeek ? THEME.colors.background : THEME.colors.textSecondary }}>This day only</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setApplyToWeek(true)} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: applyToWeek ? THEME.colors.teal : THEME.colors.surface2, borderWidth: 0.5, borderColor: applyToWeek ? THEME.colors.teal : THEME.colors.border }}>
                <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: applyToWeek ? THEME.colors.background : THEME.colors.textSecondary }}>Entire week (all 6 days)</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={submit} style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Add to Plan</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ── Add Supplement Modal ─────────────────────────────────────────────────
function AddSupplementModal({
  visible, onClose, slot, onAdd, warningFor,
}: {
  visible: boolean;
  onClose: () => void;
  slot: MealSlot | null;
  onAdd: (payload: { itemName: string; quantity: string; scope: SupplementScope }) => void;
  warningFor: (name: string) => string | null;
}) {
  const [step, setStep] = useState<'scope' | 'choose' | 'list' | 'manual'>('scope');
  const [scope, setScope] = useState<SupplementScope>('today');
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');

  const reset = () => { setStep('scope'); setScope('today'); setSearch(''); setName(''); setQuantity(''); };
  const close = () => { reset(); onClose(); };

  if (!slot) return null;
  const filtered = SUPPLEMENT_ITEMS.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  const pickFromList = (s: SupplementItemDefault) => {
    setName(s.name); setQuantity(s.defaultQuantity ?? '');
    setStep('manual');
  };

  const submit = () => {
    if (!name.trim()) { Alert.alert('Name required', 'Please enter a supplement name.'); return; }
    onAdd({ itemName: name.trim(), quantity: quantity.trim(), scope });
    close();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={close} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '85%', backgroundColor: THEME.colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>
            {step === 'scope' ? 'Add supplement' : `Add supplement — ${SUPPLEMENT_META[slot].label}`}
          </Text>
          <TouchableOpacity onPress={close}><Text style={{ fontSize: 20, color: THEME.colors.textMuted }}>✕</Text></TouchableOpacity>
        </View>

        {step === 'scope' && (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>How many days to add this supplement?</Text>
            {([
              { value: 'today' as const, icon: '📅', label: 'Today', sub: 'Add only to this day' },
              { value: 'week' as const,  icon: '🗓️', label: 'This Week', sub: 'Add to all 6 days this week' },
              { value: 'month' as const, icon: '📆', label: 'This Month', sub: 'Add to every day this calendar month' },
            ] as const).map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => { setScope(opt.value); setStep('choose'); }}
                style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <Text style={{ fontSize: 22 }}>{opt.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{opt.label}</Text>
                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{opt.sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 'choose' && (
          <View style={{ gap: 12 }}>
            <TouchableOpacity onPress={() => setStep('list')} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 22 }}>💊</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Select from list</Text>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>Curated supplement library with suggested dosage</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('manual')} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 22 }}>✏️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Write manually</Text>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>Custom supplement with your own dosage</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {step === 'list' && (
          <>
            <TextInput value={search} onChangeText={setSearch} placeholder="Search supplements..." placeholderTextColor={THEME.colors.textMuted}
              style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, marginBottom: 10, borderWidth: 0.5, borderColor: THEME.colors.border }} />
            <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
              {filtered.map((s) => (
                <TouchableOpacity key={s.id} onPress={() => pickFromList(s)} style={{ paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: THEME.colors.border }}>
                  <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>{s.name}</Text>
                  <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{s.defaultQuantity}</Text>
                </TouchableOpacity>
              ))}
              {filtered.length === 0 && <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13, paddingVertical: 20, textAlign: 'center' }}>No matches</Text>}
            </ScrollView>
          </>
        )}

        {step === 'manual' && (
          <ScrollView keyboardShouldPersistTaps="handled">
            <TextInput value={name} onChangeText={setName} placeholder="Supplement name" placeholderTextColor={THEME.colors.textMuted}
              style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, marginBottom: 14, borderWidth: 0.5, borderColor: THEME.colors.border }} />
            <TextInput value={quantity} onChangeText={setQuantity} placeholder="Dosage (e.g. 5g, 1 capsule)" placeholderTextColor={THEME.colors.textMuted}
              style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, marginBottom: 16, borderWidth: 0.5, borderColor: THEME.colors.border }} />

            {name.trim() && warningFor(name) && (
              <View style={{ backgroundColor: '#F8717120', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 0.5, borderColor: '#F87171' }}>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: '#F87171', marginBottom: 2 }}>⚠️ Safety caution</Text>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary, lineHeight: 17 }}>{warningFor(name)}</Text>
              </View>
            )}

            <TouchableOpacity onPress={submit} style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Add Supplement</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ── A section block (works for both exercise sections and meal slots) ────
function ItemSection({
  icon, label, color, items, detailLine, onAddPress, onRemove, warningFor,
}: {
  icon: string; label: string; color: string; items: any[]; detailLine: (i: any) => string | null;
  onAddPress: () => void; onRemove: (id: string) => void; warningFor?: (i: any) => string | null;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: `${color}20`, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 12 }}>{icon}</Text>
          </View>
          <Text style={{ fontSize: 13.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{label}</Text>
        </View>
        <TouchableOpacity onPress={onAddPress} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: `${color}20`, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, color }}>+</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, padding: 11, borderWidth: 0.5, borderColor: THEME.colors.border, borderStyle: 'dashed' }}>
          <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center' }}>Nothing added yet</Text>
        </View>
      ) : (
        <View style={{ gap: 6 }}>
          {items.map((item: any) => {
            const warning = warningFor?.(item) ?? null;
            return (
            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.colors.surface2, borderRadius: 11, padding: 11, borderWidth: 0.5, borderColor: warning ? '#F87171' : (item.completed ? `${SUCCESS}40` : THEME.colors.border), gap: 9 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{item.item_name}</Text>
                  {item.is_custom && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${THEME.colors.teal}20`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9 }}>👤</Text>
                      <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Added by client</Text>
                    </View>
                  )}
                </View>
                {detailLine(item) && <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{detailLine(item)}</Text>}
                {warning && (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 6, backgroundColor: '#F8717120', borderRadius: 7, padding: 7 }}>
                    <Text style={{ fontSize: 10.5 }}>⚠️</Text>
                    <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sans, color: '#F87171', flex: 1, lineHeight: 14 }}>{warning}</Text>
                  </View>
                )}
              </View>
              {item.completed && (
                <View style={{ backgroundColor: `${SUCCESS}20`, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Text style={{ fontSize: 10, color: SUCCESS }}>✓</Text>
                  <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: SUCCESS }}>Done</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => onRemove(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 16, color: THEME.colors.textMuted }}>×</Text>
              </TouchableOpacity>
            </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function ClientWorkoutsScreen() {
  const router = useRouter();
  const { clientId, clientName } = useLocalSearchParams<{ clientId: string; clientName: string }>();
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [selectedDay, setSelectedDay] = useState(1);
  const [modalTarget, setModalTarget] = useState<ModalTarget | null>(null);

  const { data: exGrouped, isLoading: exLoading } = useClientWeekLogs(clientId, weekStart);
  const { data: mealGrouped, isLoading: mealLoading } = useClientWeekNutrition(clientId, weekStart);
  const { data: supplementGrouped, isLoading: supplementLoading } = useClientWeekSupplements(clientId, weekStart);
  // Single source of truth for conditions/medications is now profiles
  // (Overview tab), not the Detailed Assessment, which no longer asks them.
  const { data: clientProfile } = useClientProfile(clientId);
  const clientHealth = clientProfile as { conditions?: string[]; medications?: string[] } | undefined;
  const supplementWarningFor = (item: { item_name?: string }) =>
    item?.item_name ? getSupplementInteractionWarning(item.item_name, clientHealth) : null;
  const { mutateAsync: addExercise } = useCoachAddExercise();
  const { mutateAsync: removeExercise } = useCoachRemoveExercise();
  const { mutateAsync: addMeal } = useCoachAddMeal();
  const { mutateAsync: removeMeal } = useCoachRemoveMeal();
  const { mutateAsync: addSupplement } = useCoachAddSupplement();
  const { mutateAsync: removeSupplement } = useCoachRemoveSupplement();

  const dayMeta = useMemo(() => {
    return [1, 2, 3, 4, 5, 6].map((d) => {
      const date = getDayDate(weekStart, d);
      return { day: d, label: date.toLocaleDateString('en-IN', { weekday: 'short' }), date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) };
    });
  }, [weekStart]);

  const exDayData = exGrouped?.[selectedDay] ?? { warmup: [], workout: [], cooldown: [] };
  const mealDayData = mealGrouped?.[selectedDay] ?? { morning_drink: [], breakfast: [], lunch: [], evening_snacks: [], dinner: [] };
  const supplementDayData = supplementGrouped?.[selectedDay] ?? { morning_drink: [], breakfast: [], lunch: [], evening_snacks: [], dinner: [] };

  const onAddExercise = async (payload: { itemName: string; sets: number | null; reps: number | null; side: string; holdSecs: number | null; restSecs: number; applyToWeek: boolean }) => {
    if (!modalTarget || modalTarget.kind !== 'exercise' || !exGrouped) return;
    const section = modalTarget.key;
    const dayNumbers = payload.applyToWeek ? [1, 2, 3, 4, 5, 6] : [selectedDay];
    const startOrderByDay: Record<number, number> = {};
    dayNumbers.forEach((d) => { startOrderByDay[d] = (exGrouped[d]?.[section]?.length ?? 0) + 1; });
    try {
      await addExercise({ clientId, weekStart, dayNumbers, itemType: section, itemName: payload.itemName, sets: payload.sets, reps: payload.reps, side: payload.side, holdSecs: payload.holdSecs, restSecs: payload.restSecs, startOrderByDay });
    } catch (e: any) {
      Alert.alert('Could not add exercise', e.message ?? 'Please try again.');
    }
  };

  const onAddMeal = async (payload: { itemName: string; quantity: string; calories: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null; applyToWeek: boolean }) => {
    if (!modalTarget || modalTarget.kind !== 'meal' || !mealGrouped) return;
    const slot = modalTarget.key;
    const dayNumbers = payload.applyToWeek ? [1, 2, 3, 4, 5, 6] : [selectedDay];
    const startOrderByDay: Record<number, number> = {};
    dayNumbers.forEach((d) => { startOrderByDay[d] = (mealGrouped[d]?.[slot]?.length ?? 0) + 1; });
    try {
      await addMeal({ clientId, weekStart, dayNumbers, mealSlot: slot, itemName: payload.itemName, quantity: payload.quantity, calories: payload.calories, proteinG: payload.proteinG, carbsG: payload.carbsG, fatG: payload.fatG, startOrderByDay });
    } catch (e: any) {
      Alert.alert('Could not add meal', e.message ?? 'Please try again.');
    }
  };

  const onAddSupplement = async (payload: { itemName: string; quantity: string; scope: SupplementScope }) => {
    if (!modalTarget || modalTarget.kind !== 'supplement' || !supplementGrouped) return;
    const slot = modalTarget.key;
    let dayNumbers: number[];
    if (payload.scope === 'week') {
      dayNumbers = [1, 2, 3, 4, 5, 6];
    } else if (payload.scope === 'month') {
      // Find all day_numbers in the current calendar month for the active weekStart
      const today = new Date();
      const year = today.getFullYear(), month = today.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const [wy, wm, wd] = weekStart.split('-').map(Number);
      const monDate = new Date(wy, wm - 1, wd);
      const collected: number[] = [];
      for (let d = 1; d <= 6; d++) {
        const actual = new Date(monDate);
        actual.setDate(actual.getDate() + d - 1);
        if (actual >= firstDay && actual <= lastDay) collected.push(d);
      }
      dayNumbers = collected.length ? collected : [selectedDay];
    } else {
      dayNumbers = [selectedDay];
    }
    const startOrderByDay: Record<number, number> = {};
    dayNumbers.forEach((d) => { startOrderByDay[d] = (supplementGrouped[d]?.[slot]?.length ?? 0) + 1; });
    try {
      await addSupplement({ clientId, weekStart, dayNumbers, mealSlot: slot, itemName: payload.itemName, quantity: payload.quantity, startOrderByDay });
    } catch (e: any) {
      Alert.alert('Could not add supplement', e.message ?? 'Please try again.');
    }
  };

  const onRemoveExercise = (id: string) => {
    Alert.alert('Remove exercise', 'Remove this from the plan?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeExercise({ id, clientId, weekStart }) },
    ]);
  };
  const onRemoveMeal = (id: string) => {
    Alert.alert('Remove meal', 'Remove this from the plan?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMeal({ id, clientId, weekStart }) },
    ]);
  };
  const onRemoveSupplement = (id: string) => {
    Alert.alert('Remove supplement', 'Remove this from the plan?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeSupplement({ id, clientId, weekStart }) },
    ]);
  };

  const isLoading = exLoading || mealLoading || supplementLoading;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 20, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>{clientName}'s Plan</Text>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 1 }}>Suggest exercises & nutrition</Text>
        </View>
      </View>

      {/* Week nav */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 12 }}>
        <TouchableOpacity onPress={() => setWeekStart((w) => shiftWeek(w, -1))} style={{ padding: 8 }}>
          <Text style={{ fontSize: 18, color: THEME.colors.textMuted }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary }}>
          Week of {new Date(weekStart + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => setWeekStart((w) => shiftWeek(w, 1))} style={{ padding: 8 }}>
          <Text style={{ fontSize: 18, color: THEME.colors.textMuted }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 24, gap: 8, paddingBottom: 14 }}>
        {dayMeta.map((d) => {
          const active = d.day === selectedDay;
          return (
            <TouchableOpacity key={d.day} onPress={() => setSelectedDay(d.day)} style={{ alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: active ? THEME.colors.teal : THEME.colors.surface2, borderWidth: 0.5, borderColor: active ? THEME.colors.teal : THEME.colors.border, minWidth: 64 }}>
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: active ? THEME.colors.background : THEME.colors.textPrimary }}>{d.label}</Text>
              <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: active ? THEME.colors.background : THEME.colors.textMuted, marginTop: 1 }}>{d.date}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, marginBottom: 10, letterSpacing: 0.5 }}>💪 EXERCISES</Text>
          {EDITABLE_SECTIONS.map((section) => (
            <ItemSection
              key={section}
              icon={EXERCISE_META[section].icon}
              label={EXERCISE_META[section].label}
              color={EXERCISE_META[section].color}
              items={exDayData[section] ?? []}
              detailLine={exerciseDetailLine}
              onAddPress={() => setModalTarget({ kind: 'exercise', key: section })}
              onRemove={onRemoveExercise}
            />
          ))}

          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: '#FB923C', marginTop: 8, marginBottom: 10, letterSpacing: 0.5 }}>🍽️ NUTRITION</Text>
          {MEAL_SLOTS.map((slot) => (
            <ItemSection
              key={slot}
              icon={MEAL_META[slot].icon}
              label={MEAL_META[slot].label}
              color={MEAL_META[slot].color}
              items={mealDayData[slot] ?? []}
              detailLine={mealDetailLine}
              onAddPress={() => setModalTarget({ kind: 'meal', key: slot })}
              onRemove={onRemoveMeal}
            />
          ))}

          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: '#A78BFA', marginTop: 8, marginBottom: 10, letterSpacing: 0.5 }}>💊 SUPPLEMENTS</Text>
          {MEAL_SLOTS.map((slot) => (
            <ItemSection
              key={slot}
              icon={SUPPLEMENT_META[slot].icon}
              label={SUPPLEMENT_META[slot].label}
              color="#A78BFA"
              items={supplementDayData[slot] ?? []}
              detailLine={supplementDetailLine}
              onAddPress={() => setModalTarget({ kind: 'supplement', key: slot })}
              onRemove={onRemoveSupplement}
              warningFor={supplementWarningFor}
            />
          ))}
        </ScrollView>
      )}

      <AddExerciseModal
        visible={modalTarget?.kind === 'exercise'}
        section={modalTarget?.kind === 'exercise' ? modalTarget.key : null}
        onClose={() => setModalTarget(null)}
        onAdd={onAddExercise}
      />
      <AddMealModal
        visible={modalTarget?.kind === 'meal'}
        slot={modalTarget?.kind === 'meal' ? modalTarget.key : null}
        onClose={() => setModalTarget(null)}
        onAdd={onAddMeal}
      />
      <AddSupplementModal
        visible={modalTarget?.kind === 'supplement'}
        slot={modalTarget?.kind === 'supplement' ? modalTarget.key : null}
        onClose={() => setModalTarget(null)}
        onAdd={onAddSupplement}
        warningFor={(name) => getSupplementInteractionWarning(name, clientHealth)}
      />
    </SafeAreaView>
  );
}
