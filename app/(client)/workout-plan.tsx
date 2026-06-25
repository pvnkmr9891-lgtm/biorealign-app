import { WorkoutCalendar } from '@/components/ui/WorkoutCalendar';
import { WaterTracker } from '@/components/ui/WaterTracker';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Animated, StyleSheet, Alert, Modal, Pressable,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFocusEmoji } from '@/hooks/useWorkout';
import { useManualLog, isToday, getDayDate, DEFAULT_TEMPLATE } from '@/hooks/useManualLog';
import { useRecalculateStreak } from '@/hooks/useStreakSystem';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { THEME } from '@/constants/theme';
import { PROGRAMS_ENABLED, ADVANCED_TRACKING_ENABLED } from '@/constants/featureFlags';
import { WARMUP_EXERCISES, type ExerciseSide, type WarmupExerciseDefault } from '@/constants/warmupExercises';
import { WORKOUT_EXERCISES } from '@/constants/workoutExercises';
import { COOLDOWN_EXERCISES } from '@/constants/cooldownExercises';
import { MORNING_DRINK_ITEMS, BREAKFAST_ITEMS, LUNCH_ITEMS, EVENING_SNACK_ITEMS, DINNER_ITEMS, type FoodItemDefault } from '@/constants/foodItems';
import { SUPPLEMENT_ITEMS, type SupplementItemDefault } from '@/constants/supplementItems';

const DAY_NAMES  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBRS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SECTIONS = [
  { key: 'warmup',   label: 'Warm-up',     icon: '🔥', color: THEME.colors.amber },
  { key: 'workout',  label: 'Workout',     icon: '💪', color: THEME.colors.teal  },
  { key: 'cooldown', label: 'Cool-down',   icon: '🧘', color: '#7EC8E3' },
  { key: 'water',    label: 'Water Intake',icon: '💧', color: '#64B5F6' },
];

// Food is split into 5 always-addable meal-time sections. Each row is still
// stored with item_type='food' (so alignment scoring keeps working) — the
// meal_slot column buckets it into one of these for display.
const FOOD_SLOTS = [
  { key: 'morning_drink',  label: 'Morning Drink',  icon: '☀️', color: '#FBBF24' },
  { key: 'breakfast',      label: 'Breakfast',      icon: '🍳', color: '#FB923C' },
  { key: 'lunch',          label: 'Lunch',          icon: '🍛', color: '#4ADE80' },
  { key: 'evening_snacks', label: 'Evening Snacks', icon: '🍪', color: '#F59E0B' },
  { key: 'dinner',         label: 'Dinner',         icon: '🍽', color: '#818CF8' },
];

// Supplements reuse the same 5 meal-time slots as nutrition (so a creatine
// dose can be tagged to "Breakfast", a pre-workout to "Lunch", etc.) but are
// stored as their own item_type='supplement' — kept visually + structurally
// distinct from food via the 'supp_' prefixed section key below.
const SUPPLEMENT_SLOTS = FOOD_SLOTS.map(s => ({ ...s, key: `supp_${s.key}`, mealSlot: s.key, color: '#A78BFA' }));

// ── Checkbox ──────────────────────────────────────────────────────────
function Checkbox({ checked, onPress, color = THEME.colors.teal, locked = false }: {
  checked: boolean; onPress: () => void; color?: string; locked?: boolean;
}) {
  const scale = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const bump  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: checked ? 1 : 0,
      useNativeDriver: true,
      tension: 220,
      friction: 8,
    }).start();
  }, [checked]);

  function handlePress() {
    Animated.sequence([
      Animated.timing(bump, { toValue: 0.80, duration: 80, useNativeDriver: true }),
      Animated.spring(bump, { toValue: 1, tension: 300, friction: 8, useNativeDriver: true }),
    ]).start();
    onPress();
  }

  if (locked) {
    return (
      <View style={[styles.checkOuter, { borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'transparent' }]}>
        <Text style={{ color: 'rgba(255,255,255,0.15)', fontSize: 13, lineHeight: 16 }}>—</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View style={[
        styles.checkOuter,
        {
          borderColor:     checked ? color : THEME.colors.border,
          backgroundColor: checked ? color : 'transparent',
          transform: [{ scale: bump }],
        },
      ]}>
        <Animated.Text style={[styles.checkTick, { transform: [{ scale }] }]}>✓</Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Detail line: Sets × Reps · Side · Hold · Rest (exercises) or
// Quantity · Calories · Macros (food) ───────────────────────────────────
const SIDE_LABELS: Record<string, string> = { right: 'Each side', left: 'Each side', rotation: 'Rotation', na: '' };

function exerciseDetailLine(item: any): string | null {
  // Food items carry meal_slot — branch to the nutrition-flavoured line.
  if (item.meal_slot) {
    const parts: string[] = [];
    if (item.quantity)  parts.push(item.quantity);
    if (item.calories)  parts.push(`${item.calories} kcal`);
    if (item.protein_g) parts.push(`P ${item.protein_g}g`);
    if (item.carbs_g)   parts.push(`C ${item.carbs_g}g`);
    if (item.fat_g)      parts.push(`F ${item.fat_g}g`);
    return parts.length ? parts.join('  ·  ') : null;
  }

  const parts: string[] = [];
  if (item.sets)      parts.push(`${item.sets} set${item.sets > 1 ? 's' : ''}`);
  if (item.reps)       parts.push(`${item.reps} reps`);
  if (item.side && SIDE_LABELS[item.side]) parts.push(SIDE_LABELS[item.side]);
  if (item.hold_secs)  parts.push(`Hold ${item.hold_secs}s`);
  if (item.rest_secs)  parts.push(`Rest ${item.rest_secs}s`);
  return parts.length ? parts.join('  ·  ') : null;
}

// ── Log Item Row ──────────────────────────────────────────────────────
function LogItem({ item, onToggle, onRemove, color, locked = false }: {
  item: any; onToggle: (id: string, checked: boolean) => void; onRemove?: (id: string) => void; color: string; locked?: boolean;
}) {
  const timeLabel = item.completed_at
    ? new Date(item.completed_at).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : null;
  const detailLine = exerciseDetailLine(item);

  function handleRemove() {
    Alert.alert('Remove exercise?', `Remove "${item.item_name}" from this day.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onRemove?.(item.id) },
    ]);
  }

  return (
    <View style={[styles.logRow, locked && { opacity: 0.38 }]}>
      <Checkbox
        checked={item.completed}
        onPress={() => !locked && onToggle(item.id, item.completed)}
        color={color}
        locked={locked}
      />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text
            style={[styles.logItemName, item.completed && styles.logItemDone]}
            numberOfLines={2}
          >
            {item.item_name}
          </Text>
          {item.added_by_coach && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${THEME.colors.amber}20`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9 }}>🧑‍🏫</Text>
              <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>Assigned by coach</Text>
            </View>
          )}
        </View>
        {detailLine && (
          <Text style={styles.logItemDetail} numberOfLines={1}>{detailLine}</Text>
        )}
      </View>
      {item.completed && timeLabel && (
        <Text style={styles.logTime}>{timeLabel}</Text>
      )}
      {!locked && item.is_custom && !item.added_by_coach && onRemove && (
        <TouchableOpacity onPress={handleRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 8 }}>
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 16 }}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Sections where the client can manually add their own exercises/food.
const FOOD_SLOT_KEYS = FOOD_SLOTS.map(s => s.key);
const SUPPLEMENT_SLOT_KEYS = SUPPLEMENT_SLOTS.map(s => s.key);
const ADDABLE_SECTIONS = ['warmup', 'workout', 'cooldown', ...FOOD_SLOT_KEYS, ...SUPPLEMENT_SLOT_KEYS];

// Per-section library used by the "select from list" step — exercise
// defaults (sets/reps/side/hold/rest) for warmup/workout/cooldown, food
// defaults (quantity/calories/macros) for the 5 meal-time slots, supplement
// defaults (suggested dosage) for the 5 supplement slots.
const EXERCISE_LIBRARY: Record<string, (WarmupExerciseDefault | FoodItemDefault | SupplementItemDefault)[]> = {
  warmup:          WARMUP_EXERCISES,
  workout:         WORKOUT_EXERCISES,
  cooldown:        COOLDOWN_EXERCISES,
  morning_drink:   MORNING_DRINK_ITEMS,
  breakfast:       BREAKFAST_ITEMS,
  lunch:           LUNCH_ITEMS,
  evening_snacks:  EVENING_SNACK_ITEMS,
  dinner:          DINNER_ITEMS,
};
SUPPLEMENT_SLOT_KEYS.forEach((key) => { EXERCISE_LIBRARY[key] = SUPPLEMENT_ITEMS; });

const ALL_SECTIONS_META = [...SECTIONS, ...FOOD_SLOTS, ...SUPPLEMENT_SLOTS];

// ── Collapsible Section Group ─────────────────────────────────────────
function SectionGroup({ sectionKey, items, onToggle, onAdd, onRemove, locked = false }: {
  sectionKey: string; items: any[]; onToggle: (id: string, checked: boolean) => void;
  onAdd?: (payload: any) => Promise<void>; onRemove?: (id: string) => Promise<void>; locked?: boolean;
}) {
  const [open, setOpen]           = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const meta      = ALL_SECTIONS_META.find(s => s.key === sectionKey)!;
  const addable   = ADDABLE_SECTIONS.includes(sectionKey) && !!onAdd;
  const isFood       = FOOD_SLOT_KEYS.includes(sectionKey);
  const isSupplement = SUPPLEMENT_SLOT_KEYS.includes(sectionKey);
  const done      = items.filter(i => i.completed).length;
  const allDone   = done === items.length && items.length > 0;

  function handleSectionSelectAll() {
    if (locked) return;
    const target = !allDone;
    items.forEach(item => {
      if (item.completed !== target) onToggle(item.id, item.completed);
    });
  }

  if (!items.length && !addable) return null;

  return (
    <View style={styles.sectionGroup}>

      {/* Header row */}
      <View style={[styles.sectionHeader, { backgroundColor: `${meta.color}12`, flexDirection: 'row', alignItems: 'center' }]}>
        <Text style={styles.sectionIcon}>{meta.icon}</Text>
        <Text style={[styles.sectionLabel, { color: meta.color }]}>{meta.label}</Text>

        {/* "?" button — water section */}
        {sectionKey === 'water' && (
          <TouchableOpacity
            style={styles.guideBtn}
            onPress={() => setShowGuide(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.guideBtnText}>?</Text>
          </TouchableOpacity>
        )}

        {/* "+" add-exercise button */}
        {addable && !locked && (
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: meta.color }]}
            onPress={() => setShowAddModal(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.addBtnText, { color: meta.color }]}>+</Text>
          </TouchableOpacity>
        )}

        {/* Section-level select-all checkbox */}
        {!locked && items.length > 0 && (
          <View style={{ marginLeft: 6 }}>
            <Checkbox checked={allDone} onPress={handleSectionSelectAll} color={meta.color} />
          </View>
        )}

        {/* Right side: count + chevron (tap to collapse) */}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }}
          onPress={() => setOpen(o => !o)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={[styles.sectionPill, { borderColor: allDone ? meta.color : THEME.colors.border }]}>
            <Text style={[styles.sectionPillText, { color: allDone ? meta.color : THEME.colors.textMuted }]}>
              {done}/{items.length}
            </Text>
          </View>
          <Text style={styles.sectionChevron}>{open ? '▾' : '›'}</Text>
        </TouchableOpacity>
      </View>

      {/* Items */}
      {open && (
        <View style={styles.sectionItems}>
          {items.map(item => (
            <LogItem key={item.id} item={item} onToggle={onToggle} onRemove={onRemove ? (id) => onRemove(id) : undefined} color={meta.color} locked={locked} />
          ))}
          {!items.length && addable && !locked && (
            <TouchableOpacity style={styles.emptySectionCta} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
              <Text style={[styles.emptySectionCtaIcon, { color: meta.color }]}>+</Text>
              <Text style={styles.emptySectionCtaText}>Add to {meta.label}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Section guide modals */}
      {sectionKey === 'water' && (
        <WaterGuideModal visible={showGuide} onClose={() => setShowGuide(false)} />
      )}
      {addable && (
        <AddExerciseModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          sectionColor={meta.color}
          sectionLabel={meta.label}
          kind={isFood ? 'food' : isSupplement ? 'supplement' : 'exercise'}
          library={EXERCISE_LIBRARY[sectionKey] ?? []}
          onAdd={async (payload) => { await onAdd!(payload); setShowAddModal(false); }}
        />
      )}
    </View>
  );
}


function WaterGuideModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const GUIDELINES = [
    { icon: '🌅', label: 'Morning',         tip: '1 glass after waking' },
    { icon: '⚡', label: 'Pre-workout',      tip: '250–500 ml' },
    { icon: '🏃', label: 'During workout',   tip: 'Small sips every 10–15 minutes' },
    { icon: '💪', label: 'After workout',    tip: '300–500 ml' },
    { icon: '🌊', label: 'Through the day',  tip: 'Spread evenly' },
  ];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={wg.backdrop} onPress={onClose}>
        <Pressable style={wg.card}>
          {/* Header */}
          <View style={wg.header}>
            <Text style={wg.title}>💧  Hydration Guidelines</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={wg.closeX}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={wg.divider} />

          {/* Guideline rows */}
          {GUIDELINES.map((g, i) => (
            <View key={i} style={[wg.row, i < GUIDELINES.length - 1 && wg.rowBorder]}>
              <Text style={wg.rowIcon}>{g.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={wg.rowLabel}>{g.label}</Text>
                <Text style={wg.rowTip}>{g.tip}</Text>
              </View>
            </View>
          ))}

          {/* Got it */}
          <TouchableOpacity style={wg.gotItBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={wg.gotItText}>Got it</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const wg = StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 28 },
  card:      { width: '100%', backgroundColor: '#15151A', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,196,180,0.2)' },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  title:     { color: THEME.colors.textPrimary, fontSize: 15, fontFamily: THEME.fonts.sansMedium },
  closeX:    { color: THEME.colors.textMuted, fontSize: 15 },
  divider:   { height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  rowIcon:   { fontSize: 18, width: 26, textAlign: 'center', flexShrink: 0 },
  rowLabel:  { color: THEME.colors.textPrimary, fontSize: 13, fontFamily: THEME.fonts.sansMedium, marginBottom: 2 },
  rowTip:    { color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.sans },
  gotItBtn:  { margin: 14, backgroundColor: THEME.colors.teal, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  gotItText: { color: '#000', fontSize: 14, fontFamily: THEME.fonts.sansMedium },
});

// ── Food Guidelines per programme (dead since Lite mode has no curated
// programmes — kept disabled rather than deleted; see PROGRAMS_ENABLED) ──
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type FoodGuideRow = { icon: string; label: string; target: string };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FOOD_GUIDELINES: Record<string, FoodGuideRow[]> = {
  total_transformation: [
    { icon: '💧', label: 'Water',            target: '30–40 ml/kg body weight' },
    { icon: '🥦', label: 'Vegetables',       target: '3–5 servings' },
    { icon: '🍎', label: 'Fruits',           target: '2 servings' },
    { icon: '🥩', label: 'Protein',          target: 'Every meal' },
    { icon: '🚫', label: 'Packaged snacks',  target: 'Max 1/week' },
    { icon: '🥤', label: 'Soft drinks',      target: '0' },
    { icon: '📵', label: 'Screen eating',    target: 'No' },
  ],
  metabolic_renewal: [
    { icon: '💧', label: 'Water',            target: '35–40 ml/kg body weight' },
    { icon: '🥦', label: 'Vegetables',       target: '4–5 servings' },
    { icon: '🍎', label: 'Fruits',           target: '2 servings' },
    { icon: '🥩', label: 'Protein',          target: 'Every meal' },
    { icon: '🌾', label: 'Fiber',            target: '25–35 g/day' },
    { icon: '🚫', label: 'Packaged snacks',  target: 'Max 1–2/week' },
    { icon: '🥤', label: 'Soft drinks',      target: '0' },
    { icon: '📵', label: 'Screen eating',    target: 'No' },
  ],
  postural_realignment: [
    { icon: '💧', label: 'Water',            target: '30–40 ml/kg body weight' },
    { icon: '🥦', label: 'Vegetables',       target: '4–6 servings/day' },
    { icon: '🍎', label: 'Fruits',           target: '2 servings/day' },
    { icon: '🥩', label: 'Protein',          target: 'Every meal (1.2–1.8 g/kg/day)' },
    { icon: '🥑', label: 'Healthy Fats',     target: '2–3 servings/day' },
    { icon: '🌾', label: 'Whole Grains',     target: '2–4 servings/day' },
    { icon: '🚫', label: 'Packaged snacks',  target: 'Max 1/week' },
    { icon: '🥤', label: 'Soft drinks',      target: '0' },
    { icon: '🍷', label: 'Alcohol',          target: 'Avoid during protocol' },
  ],
  hormonal_balance: [
    { icon: '💧', label: 'Water',             target: '40–45 ml/kg body weight' },
    { icon: '🥩', label: 'Protein',           target: 'Every meal (25–35 g/meal)' },
    { icon: '🥦', label: 'Vegetables',        target: '5–7 servings/day' },
    { icon: '🍎', label: 'Fruits',            target: '2–3 servings/day' },
    { icon: '🥑', label: 'Healthy Fats',      target: 'Every meal' },
    { icon: '🐟', label: 'Omega-3 Sources',   target: 'Daily' },
    { icon: '🌾', label: 'Fiber',             target: '25–35 g/day' },
    { icon: '🚫', label: 'Processed Foods',   target: 'Max 1/week' },
    { icon: '🦴', label: 'Collagen Support',  target: 'Daily' },
    { icon: '🍷', label: 'Alcohol',           target: '0 during rehabilitation' },
  ],
  corporate_reset: [
    { icon: '💧', label: 'Water',            target: '35–40 ml/kg body weight' },
    { icon: '🥩', label: 'Protein',          target: 'Every meal' },
    { icon: '🥦', label: 'Vegetables',       target: '4–5 servings' },
    { icon: '🍎', label: 'Fruits',           target: '2 servings' },
    { icon: '🌾', label: 'Fiber',            target: '25–35 g/day' },
    { icon: '☕', label: 'Caffeine',         target: 'Max 2–3 cups/day' },
    { icon: '🚫', label: 'Packaged snacks',  target: 'Max 1–2/week' },
    { icon: '🥤', label: 'Soft drinks',      target: '0' },
    { icon: '🍷', label: 'Alcohol',          target: 'Max 1–2/week' },
  ],
  athletic_performance: [
    { icon: '💧', label: 'Water',            target: '40–50 ml/kg body weight' },
    { icon: '🥩', label: 'Protein',          target: 'Every meal (25–40 g)' },
    { icon: '🥦', label: 'Vegetables',       target: '5–7 servings' },
    { icon: '🍎', label: 'Fruits',           target: '2–4 servings' },
    { icon: '⏱️', label: 'Recovery Meal',    target: 'Within 45 min post-training' },
    { icon: '🥑', label: 'Healthy Fats',     target: 'Every meal' },
    { icon: '🐟', label: 'Omega-3 Sources',  target: 'Daily' },
    { icon: '🌾', label: 'Fiber',            target: '25–35 g/day' },
    { icon: '🏃', label: 'Sports Drinks',    target: 'Only during sessions >90 min' },
    { icon: '🍬', label: 'Added Sugar',      target: 'Minimal' },
    { icon: '🍷', label: 'Alcohol',          target: 'Avoid during performance cycles' },
    { icon: '🧂', label: 'Electrolytes',     target: 'Daily' },
  ],
  mind_body: [
    { icon: '💧', label: 'Water',               target: '30–35 ml/kg body weight' },
    { icon: '🥩', label: 'Protein',             target: 'Every meal (20–30 g)' },
    { icon: '🥦', label: 'Vegetables',          target: '5 servings/day' },
    { icon: '🍎', label: 'Fruits',              target: '2–3 servings/day' },
    { icon: '🌾', label: 'Fiber',               target: '25–35 g/day' },
    { icon: '🥑', label: 'Healthy Fats',        target: 'Every meal' },
    { icon: '🐟', label: 'Omega-3 Sources',     target: 'Daily' },
    { icon: '🥛', label: 'Calcium-Rich Foods',  target: '2–3 servings/day' },
    { icon: '🚫', label: 'Ultra-Processed',     target: 'Max 1/week' },
    { icon: '🍬', label: 'Added Sugar',         target: 'Minimal' },
    { icon: '🌙', label: 'Dinner Timing',       target: '2–3 hrs before sleep' },
  ],
};
// '3-PRP' is the DB alias for postural_realignment
FOOD_GUIDELINES['3-PRP'] = FOOD_GUIDELINES.postural_realignment;

function FoodGuideModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const profile  = useAuthStore(s => s.profile);
  const rawId    = profile?.workout_program_id ?? '';
  const rows: FoodGuideRow[] = FOOD_GUIDELINES[rawId] ?? FOOD_GUIDELINES.total_transformation;

  const programName: Record<string, string> = {
    total_transformation:  'Future Body Reset',
    metabolic_renewal:     'Metabolic Reversal System',
    postural_realignment:  'Posture Recode Protocol',
    '3-PRP':               'Posture Recode Protocol',
    hormonal_balance:      'Rebuild & Rehab System',
    corporate_reset:       'Corporate Performance Reset',
    athletic_performance:  'Peak Performance Lab',
    mind_body:             'Longevity & Vitality Engine',
  };
  const label = programName[rawId] ?? 'Your Programme';

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={wg.backdrop} onPress={onClose}>
        <Pressable style={wg.card}>
          {/* Header */}
          <View style={wg.header}>
            <View style={{ flex: 1 }}>
              <Text style={wg.title}>🥗  Food Guidelines</Text>
              <Text style={{ color: THEME.colors.teal, fontSize: 11, fontFamily: THEME.fonts.sansMedium, marginTop: 2 }}>{label}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={wg.closeX}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={wg.divider} />

          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
            {rows.map((g, i) => (
              <View key={i} style={[wg.row, i < rows.length - 1 && wg.rowBorder]}>
                <Text style={wg.rowIcon}>{g.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={wg.rowLabel}>{g.label}</Text>
                  <Text style={wg.rowTip}>{g.target}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={wg.gotItBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={wg.gotItText}>Got it</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Add Exercise Modal ──────────────────────────────────────────────────
// "+" flow for manually-tracked sections (warmup, for now). Two entry
// points — pick from the curated library or type your own — then a shared
// detail form for Sets / Reps / Side / Hold / Rest before inserting.
const SIDE_OPTIONS: { value: ExerciseSide; label: string }[] = [
  { value: 'na',       label: 'N/A' },
  { value: 'right',    label: 'Right' },
  { value: 'left',     label: 'Left' },
  { value: 'rotation', label: 'Rotation' },
];

function NumberField({ label, value, onChange, placeholder, decimal = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; decimal?: boolean;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={aem.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(decimal ? t.replace(/[^0-9.]/g, '') : t.replace(/[^0-9]/g, ''))}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.25)"
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        style={aem.fieldInput}
      />
    </View>
  );
}

function AddExerciseModal({ visible, onClose, sectionColor, sectionLabel, kind, library, onAdd }: {
  visible: boolean; onClose: () => void; sectionColor: string; sectionLabel: string;
  kind: 'exercise' | 'food' | 'supplement'; library: (WarmupExerciseDefault | FoodItemDefault | SupplementItemDefault)[]; onAdd: (payload: any) => Promise<void>;
}) {
  const [step, setStep]   = useState<'choice' | 'list' | 'detail'>('choice');
  const [search, setSearch] = useState('');
  const [name, setName]   = useState('');
  // Exercise fields
  const [sets, setSets]   = useState('');
  const [reps, setReps]   = useState('');
  const [side, setSide]   = useState<ExerciseSide>('na');
  const [hold, setHold]   = useState('');
  const [rest, setRest]   = useState('');
  // Food fields
  const [quantity, setQuantity] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein]   = useState('');
  const [carbs, setCarbs]       = useState('');
  const [fat, setFat]           = useState('');
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setStep('choice'); setSearch(''); setName('');
    setSets(''); setReps(''); setSide('na'); setHold(''); setRest('');
    setQuantity(''); setCalories(''); setProtein(''); setCarbs(''); setFat('');
  }

  function handleClose() { reset(); onClose(); }

  function pickFromLibrary(ex: WarmupExerciseDefault | FoodItemDefault | SupplementItemDefault) {
    setName(ex.name);
    if (kind === 'food') {
      const f = ex as FoodItemDefault;
      setQuantity(f.defaultQuantity);
      setCalories(String(f.defaultCalories));
      setProtein(String(f.defaultProteinG));
      setCarbs(String(f.defaultCarbsG));
      setFat(String(f.defaultFatG));
    } else if (kind === 'supplement') {
      const s = ex as SupplementItemDefault;
      setQuantity(s.defaultQuantity);
    } else {
      const e = ex as WarmupExerciseDefault;
      setSets(String(e.defaultSets));
      setReps(e.defaultReps != null ? String(e.defaultReps) : '');
      setSide(e.defaultSide);
      setHold(e.defaultHoldSecs != null ? String(e.defaultHoldSecs) : '');
      setRest(String(e.defaultRestSecs));
    }
    setStep('detail');
  }

  function startManual() {
    setName(''); setSets(''); setReps(''); setSide('na'); setHold(''); setRest('');
    setQuantity(''); setCalories(''); setProtein(''); setCarbs(''); setFat('');
    setStep('detail');
  }

  async function handleSubmit() {
    if (!name.trim()) { Alert.alert('Add a name', `Please enter ${kind === 'food' ? 'a food' : kind === 'supplement' ? 'a supplement' : 'an exercise'} name.`); return; }
    setSubmitting(true);
    try {
      if (kind === 'food') {
        await onAdd({
          itemName: name.trim(),
          quantity: quantity.trim() || null,
          calories: calories ? Number(calories) : null,
          proteinG: protein ? Number(protein) : null,
          carbsG:   carbs   ? Number(carbs)   : null,
          fatG:     fat     ? Number(fat)     : null,
        });
      } else if (kind === 'supplement') {
        await onAdd({
          itemName: name.trim(),
          quantity: quantity.trim() || null,
        });
      } else {
        await onAdd({
          itemName: name.trim(),
          sets:     sets ? Number(sets) : null,
          reps:     reps ? Number(reps) : null,
          side:     side === 'na' ? null : side,
          holdSecs: hold ? Number(hold) : null,
          restSecs: rest ? Number(rest) : null,
        });
      }
      reset();
    } catch (err: any) {
      Alert.alert('Could not add', err?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = search.trim()
    ? library.filter(e => e.name.toLowerCase().includes(search.trim().toLowerCase()))
    : library;

  const noun = kind === 'food' ? 'food' : kind === 'supplement' ? 'supplement' : 'exercise';
  const nounPlural = noun === 'food' ? 'foods' : noun === 'supplement' ? 'supplements' : 'exercises';
  const nounTitleCase = noun === 'food' ? 'Food' : noun === 'supplement' ? 'Supplement' : 'Exercise';

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
      <Pressable style={aem.backdrop} onPress={handleClose}>
        <Pressable style={aem.sheet}>
          <View style={aem.handle} />
          <View style={aem.header}>
            <Text style={aem.title}>
              {step === 'choice' ? `Add to ${sectionLabel}` : step === 'list' ? `Choose a ${noun}` : name || `${nounTitleCase} details`}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={aem.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          {step === 'choice' && (
            <View style={{ gap: 12, paddingTop: 6 }}>
              <TouchableOpacity style={[aem.choiceCard, { borderColor: sectionColor }]} onPress={() => setStep('list')} activeOpacity={0.85}>
                <Text style={aem.choiceIcon}>📋</Text>
                <View style={{ flex: 1 }}>
                  <Text style={aem.choiceTitle}>Select from list</Text>
                  <Text style={aem.choiceSub}>Choose from {library.length} curated {sectionLabel.toLowerCase()} {noun === 'exercise' ? 'exercises' : 'items'}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[aem.choiceCard, { borderColor: sectionColor }]} onPress={startManual} activeOpacity={0.85}>
                <Text style={aem.choiceIcon}>✏️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={aem.choiceTitle}>Write manually</Text>
                  <Text style={aem.choiceSub}>Type your own {noun} name</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {step === 'list' && (
            <>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={`Search ${nounPlural}…`}
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={aem.searchInput}
              />
              <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                {filtered.map(ex => (
                  <TouchableOpacity key={ex.id} style={aem.listRow} onPress={() => pickFromLibrary(ex)} activeOpacity={0.7}>
                    <Text style={aem.listRowText}>{ex.name}</Text>
                    <Text style={aem.listRowChevron}>›</Text>
                  </TouchableOpacity>
                ))}
                {!filtered.length && (
                  <Text style={aem.emptyText}>No matches — try “Write manually” instead.</Text>
                )}
              </ScrollView>
            </>
          )}

          {step === 'detail' && (
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
              <View style={{ marginBottom: 14 }}>
                <Text style={aem.fieldLabel}>{nounTitleCase} name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={noun === 'food' ? 'e.g. Idli with sambar' : noun === 'supplement' ? 'e.g. Whey Protein Isolate' : 'e.g. Arm circles'}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={aem.fieldInput}
                />
              </View>

              {kind === 'food' ? (
                <>
                  <View style={{ marginBottom: 14 }}>
                    <Text style={aem.fieldLabel}>Quantity</Text>
                    <TextInput
                      value={quantity}
                      onChangeText={setQuantity}
                      placeholder="e.g. 1 bowl, 200g"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      style={aem.fieldInput}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
                    <NumberField label="Calories (kcal)" value={calories} onChange={setCalories} placeholder="e.g. 350" />
                    <NumberField label="Protein (g)" value={protein} onChange={setProtein} placeholder="e.g. 12" decimal />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
                    <NumberField label="Carbs (g)" value={carbs} onChange={setCarbs} placeholder="e.g. 45" decimal />
                    <NumberField label="Fat (g)" value={fat} onChange={setFat} placeholder="e.g. 8" decimal />
                  </View>
                </>
              ) : kind === 'supplement' ? (
                <View style={{ marginBottom: 18 }}>
                  <Text style={aem.fieldLabel}>Dosage</Text>
                  <TextInput
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="e.g. 5g, 1 capsule"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={aem.fieldInput}
                  />
                </View>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
                    <NumberField label="Sets" value={sets} onChange={setSets} placeholder="e.g. 2" />
                    <NumberField label="Reps" value={reps} onChange={setReps} placeholder="e.g. 12" />
                  </View>

                  <Text style={aem.fieldLabel}>Side</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                    {SIDE_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setSide(opt.value)}
                        style={[aem.sidePill, side === opt.value && { backgroundColor: `${sectionColor}25`, borderColor: sectionColor }]}
                      >
                        <Text style={[aem.sidePillText, side === opt.value && { color: sectionColor }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
                    <NumberField label="Hold (secs)" value={hold} onChange={setHold} placeholder="e.g. 30" />
                    <NumberField label="Rest (secs)" value={rest} onChange={setRest} placeholder="e.g. 15" />
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[aem.submitBtn, { backgroundColor: sectionColor }, submitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting
                  ? <ActivityIndicator color="#000" />
                  : <Text style={aem.submitBtnText}>Add to {sectionLabel}</Text>}
              </TouchableOpacity>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const aem = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0E1320', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, maxHeight: '85%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', alignSelf: 'center', marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { color: THEME.colors.textPrimary, fontSize: 16, fontFamily: THEME.fonts.sansMedium, flex: 1, marginRight: 12 },
  closeX: { color: THEME.colors.textMuted, fontSize: 16 },
  choiceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14,
    borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)',
  },
  choiceIcon: { fontSize: 24 },
  choiceTitle: { color: THEME.colors.textPrimary, fontSize: 14, fontFamily: THEME.fonts.sansMedium, marginBottom: 2 },
  choiceSub: { color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.sans },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 13, marginBottom: 10,
    borderWidth: 1, borderColor: THEME.colors.border,
  },
  listRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  listRowText: { color: THEME.colors.textSecondary, fontSize: 13, fontFamily: THEME.fonts.sans, flex: 1 },
  listRowChevron: { color: THEME.colors.textMuted, fontSize: 16 },
  emptyText: { color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.sans, textAlign: 'center', paddingVertical: 24 },
  fieldLabel: { color: THEME.colors.textSecondary, fontSize: 11, fontFamily: THEME.fonts.sansMedium, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 },
  fieldInput: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14,
    borderWidth: 1, borderColor: THEME.colors.border,
  },
  sidePill: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: THEME.colors.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  sidePillText: { color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.sansMedium },
  submitBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 6 },
  submitBtnText: { color: '#000', fontSize: 15, fontFamily: THEME.fonts.sansMedium },
});

// ── Progress Bar ──────────────────────────────────────────────────────
function ProgressBar({ percent, color }: { percent: number; color: string }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, { toValue: percent, duration: 600, useNativeDriver: false }).start();
  }, [percent]);
  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, {
        width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        backgroundColor: color,
      }]} />
    </View>
  );
}

// ── Day helper ────────────────────────────────────────────────────────
function dayStats(resolvedGrouped: any, dayNumber: number, weekStart: string) {
  const dayDate = getDayDate(weekStart, dayNumber);
  const nowDate = new Date(); nowDate.setHours(0, 0, 0, 0);
  const isTodayDay  = isToday(weekStart, dayNumber);
  const isDayFuture = !isTodayDay && dayDate > nowDate;
  const isDayPast   = !isTodayDay && dayDate < nowDate;
  const dayData     = resolvedGrouped[dayNumber] || {};
  let total = 0; let done = 0;
  Object.values(dayData).forEach((items: any) => {
    total += items.length;
    done  += items.filter((i: any) => i.completed).length;
  });
  const pct     = total ? Math.round((done / total) * 100) : 0;
  const allDone = !isDayFuture && pct === 100 && total > 0;
  return { dayDate, isTodayDay, isDayFuture, isDayPast, total, done, pct, allDone };
}

// ── Horizontal Day Tabs ────────────────────────────────────────────────
function DayTabs({ selectedDay, onSelect, resolvedGrouped, weekStart }: {
  selectedDay: number;
  onSelect: (d: number) => void;
  resolvedGrouped: any;
  weekStart: string;
}) {
  return (
    <View style={tabStyles.row}>
      {[1, 2, 3, 4, 5, 6].map(d => {
        const { isTodayDay, isDayFuture, isDayPast, pct, allDone, total } =
          dayStats(resolvedGrouped, d, weekStart);
        const isActive = d === selectedDay;

        // Background + border + text colours per state
        let bg: string, border: string, nameColor: string, dotColor: string | null;

        if (isTodayDay) {
          bg        = isActive ? THEME.colors.teal : 'rgba(0,196,180,0.1)';
          border    = THEME.colors.teal;
          nameColor = isActive ? '#000' : THEME.colors.teal;
          dotColor  = null; // today is obvious from colour
        } else if (allDone) {
          bg        = isActive ? '#4CC986' : 'rgba(76,201,134,0.1)';
          border    = '#4CC986';
          nameColor = isActive ? '#000' : '#4CC986';
          dotColor  = null;
        } else if (isDayFuture) {
          bg        = 'transparent';
          border    = isActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)';
          nameColor = isActive ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)';
          dotColor  = null;
        } else if (isDayPast && pct > 0) {
          bg        = isActive ? 'rgba(232,164,74,0.1)' : 'transparent';
          border    = isActive ? THEME.colors.amber : 'rgba(255,255,255,0.07)';
          nameColor = isActive ? THEME.colors.amber : THEME.colors.textSecondary;
          dotColor  = THEME.colors.amber;
        } else if (isDayPast && total > 0) {
          bg        = isActive ? 'rgba(239,68,68,0.08)' : 'transparent';
          border    = isActive ? '#EF4444' : 'rgba(255,255,255,0.07)';
          nameColor = isActive ? '#EF4444' : THEME.colors.textMuted;
          dotColor  = '#EF4444';
        } else {
          bg        = isActive ? 'rgba(255,255,255,0.07)' : 'transparent';
          border    = isActive ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.06)';
          nameColor = isActive ? THEME.colors.textPrimary : THEME.colors.textMuted;
          dotColor  = null;
        }

        return (
          <TouchableOpacity
            key={d}
            style={[tabStyles.tab, { backgroundColor: bg, borderColor: border }]}
            onPress={() => onSelect(d)}
            activeOpacity={0.75}
          >
            <Text style={[tabStyles.abbr, { color: nameColor }]}>{DAY_ABBRS[d - 1]}</Text>
            <Text style={[tabStyles.dateLabel, { color: nameColor, opacity: isActive ? 0.85 : 0.55 }]}>
              {getDayDate(weekStart, d).getDate()}
            </Text>
            <View style={tabStyles.dotSlot}>
              {dotColor && <View style={[tabStyles.dot, { backgroundColor: dotColor }]} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Meal Selection Wheel ──────────────────────────────────────────────────
// Big, centered donut (same scale & card language as WaterTracker) — one
// arc per meal-time section (Morning Drink, Breakfast, Lunch, Evening
// Snacks, Dinner). A segment lights up + bounces the moment anything in
// that section is checked off — binary, not proportional. Center medallion
// bumps on every change; full completion triggers a glow + sparkle burst.
const AnimatedSelectPath = Animated.createAnimatedComponent(Path);
const SEL_SZ    = 240;
const SEL_CX    = SEL_SZ / 2;
const SEL_CY    = SEL_SZ / 2;
const SEL_OUTER = 110;
const SEL_INNER = 64;
const SEL_GAP   = 4;

function selPolar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function selDonutArc(cx: number, cy: number, outer: number, inner: number, startDeg: number, endDeg: number): string {
  const o1 = selPolar(cx, cy, outer, startDeg);
  const o2 = selPolar(cx, cy, outer, endDeg);
  const i1 = selPolar(cx, cy, inner, endDeg);
  const i2 = selPolar(cx, cy, inner, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)}`,
    `L ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

type MealSlotLit = { key: string; label: string; icon: string; color: string; lit: boolean };

// One arc segment — fill color spring-animates, plus a quick pop/bounce
// (scale from center) the instant it transitions from unlit to lit.
function SelectionSegment({ path, color, lit, cx, cy }: { path: string; color: string; lit: boolean; cx: number; cy: number }) {
  const fillAnim = useRef(new Animated.Value(lit ? 1 : 0)).current;
  const popAnim  = useRef(new Animated.Value(1)).current;
  const wasLit   = useRef(lit);

  useEffect(() => {
    Animated.spring(fillAnim, { toValue: lit ? 1 : 0, useNativeDriver: false, tension: 70, friction: 9 }).start();
    if (lit && !wasLit.current) {
      Animated.sequence([
        Animated.spring(popAnim, { toValue: 1.12, useNativeDriver: false, tension: 260, friction: 5 }),
        Animated.spring(popAnim, { toValue: 1,    useNativeDriver: false, tension: 260, friction: 7 }),
      ]).start();
    }
    wasLit.current = lit;
  }, [lit]);

  const fill = fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.06)', color] });

  return (
    <AnimatedSelectPath
      d={path}
      fill={fill}
      stroke="rgba(255,255,255,0.12)"
      strokeWidth={0.8}
      scale={popAnim as any}
      originX={cx}
      originY={cy}
    />
  );
}

function MealSelectionWheel({ slots }: { slots: MealSlotLit[] }) {
  const n = slots.length;
  const step = 360 / n;
  const segments = slots.map((s, i) => ({
    ...s,
    path: selDonutArc(SEL_CX, SEL_CY, SEL_OUTER, SEL_INNER, i * step + SEL_GAP / 2, (i + 1) * step - SEL_GAP / 2),
    labelPoint: selPolar(SEL_CX, SEL_CY, SEL_OUTER + 18, (i + 0.5) * step),
  }));

  const litCount = segments.filter(s => s.lit).length;
  const wasAllLit = useRef(false);
  const celebrate = useRef(new Animated.Value(0)).current;
  const wheelBounce = useRef(new Animated.Value(1)).current;
  const medallionBump = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const sparkleSpin = useRef(new Animated.Value(0)).current;

  // Center medallion bumps on every change in lit count — keeps the wheel
  // feeling alive even before all 5 sections are lit.
  useEffect(() => {
    Animated.sequence([
      Animated.timing(medallionBump, { toValue: 1.15, duration: 110, useNativeDriver: true }),
      Animated.spring(medallionBump, { toValue: 1, useNativeDriver: true, tension: 300, friction: 7 }),
    ]).start();
  }, [litCount]);

  useEffect(() => {
    const allLit = litCount === n;
    Animated.timing(glow, { toValue: allLit ? 1 : 0, duration: 500, useNativeDriver: false }).start();
    if (allLit && !wasAllLit.current) {
      celebrate.setValue(0);
      sparkleSpin.setValue(0);
      Animated.sequence([
        Animated.timing(celebrate, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(celebrate, { toValue: 0, duration: 350, delay: 900, useNativeDriver: true }),
      ]).start();
      Animated.timing(sparkleSpin, { toValue: 1, duration: 1100, useNativeDriver: true }).start();
      Animated.sequence([
        Animated.spring(wheelBounce, { toValue: 1.12, useNativeDriver: true, tension: 200, friction: 4 }),
        Animated.spring(wheelBounce, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 6 }),
      ]).start();
    }
    wasAllLit.current = allLit;
  }, [litCount]);

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });
  const spinDeg = sparkleSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{
      marginHorizontal: 14, marginTop: 12, borderRadius: 20, overflow: 'hidden',
      backgroundColor: 'rgba(8,12,28,0.98)', borderWidth: 1, borderColor: 'rgba(129,140,248,0.22)',
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: 'rgba(129,140,248,0.07)', borderBottomWidth: 1, borderBottomColor: 'rgba(129,140,248,0.12)',
      }}>
        <Text style={{ fontSize: 18 }}>🍽</Text>
        <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: '#A78BFA', flex: 1 }}>Meal Sections</Text>
        <View style={{ backgroundColor: 'rgba(129,140,248,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(129,140,248,0.35)' }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: '#A78BFA' }}>{litCount}/{n}</Text>
        </View>
      </View>

      {/* Big centered wheel */}
      <View style={{ alignItems: 'center', paddingTop: 20, paddingBottom: 10 }}>
        <Animated.View style={{ width: SEL_SZ, height: SEL_SZ, transform: [{ scale: wheelBounce }] }}>
          {/* Glow halo when fully lit */}
          <Animated.View pointerEvents="none" style={{
            position: 'absolute', left: SEL_CX - 130, top: SEL_CY - 130, width: 260, height: 260, borderRadius: 130,
            backgroundColor: '#A78BFA', opacity: glowOpacity,
          }} />

          <Svg width={SEL_SZ} height={SEL_SZ} style={StyleSheet.absoluteFill}>
            <Circle cx={SEL_CX} cy={SEL_CY} r={(SEL_OUTER + SEL_INNER) / 2} stroke="rgba(255,255,255,0.04)" strokeWidth={SEL_OUTER - SEL_INNER} fill="none" />
            {segments.map(seg => (
              <SelectionSegment key={seg.key} path={seg.path} color={seg.color} lit={seg.lit} cx={SEL_CX} cy={SEL_CY} />
            ))}
            <Circle cx={SEL_CX} cy={SEL_CY} r={SEL_INNER - 6} fill="rgba(8,12,28,0.95)" />
          </Svg>

          {/* Section icons around the ring */}
          {segments.map(seg => (
            <Text
              key={seg.key}
              style={{
                position: 'absolute', left: seg.labelPoint.x - 12, top: seg.labelPoint.y - 12,
                width: 24, height: 24, textAlign: 'center', fontSize: 16,
                opacity: seg.lit ? 1 : 0.35,
              }}
            >
              {seg.icon}
            </Text>
          ))}

          {/* Center medallion */}
          <Animated.View style={{
            position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center',
            transform: [{ scale: medallionBump }],
          }}>
            <Text style={{ fontSize: 30 }}>{litCount === n ? '🎉' : '🍽'}</Text>
            <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 22, lineHeight: 26, marginTop: 2 }}>{litCount}/{n}</Text>
            <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 10 }}>meals started</Text>
          </Animated.View>

          {/* Celebration pop */}
          <Animated.View pointerEvents="none" style={{
            position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center',
            opacity: celebrate, transform: [{ scale: celebrate.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.4] }) }],
          }}>
            <Text style={{ fontSize: 64 }}>✨</Text>
          </Animated.View>

          {/* Spinning sparkle ring accent on completion */}
          {litCount === n && (
            <Animated.View pointerEvents="none" style={{
              position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center',
              transform: [{ rotate: spinDeg }],
            }}>
              <Text style={{ position: 'absolute', top: 6, fontSize: 16 }}>✨</Text>
            </Animated.View>
          )}
        </Animated.View>

        {litCount === n && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            {['🎊', '🍽', '🎊'].map((e, i) => <Text key={i} style={{ fontSize: 18 }}>{e}</Text>)}
          </View>
        )}
      </View>

      {/* Section legend chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
        {segments.map(seg => (
          <View key={seg.key} style={{
            flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6,
            borderRadius: 14, backgroundColor: seg.lit ? `${seg.color}20` : 'rgba(255,255,255,0.04)',
            borderWidth: 1, borderColor: seg.lit ? `${seg.color}55` : 'rgba(255,255,255,0.08)',
          }}>
            <Text style={{ fontSize: 12 }}>{seg.icon}</Text>
            <Text style={{ color: seg.lit ? THEME.colors.textPrimary : THEME.colors.textMuted, fontFamily: THEME.fonts.sansMedium, fontSize: 11 }}>{seg.label}</Text>
          </View>
        ))}
      </View>

      <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: 'rgba(255,255,255,0.18)', textAlign: 'center', marginBottom: 14, paddingHorizontal: 16 }}>
        Check off anything in a section below to light it up here
      </Text>
    </View>
  );
}

// ── Daily Nutrition Ring ─────────────────────────────────────────────────
// Apple-Watch-style concentric rings summarising everything checked off
// across the 5 food sections — calories outer, protein middle, fat inner.
const AnimatedRingCircle = Animated.createAnimatedComponent(Circle);
const RING_SZ = 124;
const RING_CX = RING_SZ / 2;
const RING_CY = RING_SZ / 2;
const OUTER_R = 54;
const MID_R   = 40;
const INNER_R = 26;
const CAL_TARGET     = 2000; // kcal/day — sensible default, not yet user-configurable
const PROTEIN_TARGET = 60;   // g/day
const FAT_TARGET     = 70;   // g/day

function polarPoint(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function NutritionRing({ r, strokeWidth, pct, color, animDelay = 0 }: {
  r: number; strokeWidth: number; pct: number; color: string; animDelay?: number;
}) {
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  const dashAnim = useRef(new Animated.Value(circumference)).current;

  useEffect(() => {
    dashAnim.setValue(circumference);
    Animated.timing(dashAnim, {
      toValue: circumference * (1 - clamped),
      duration: 750,
      delay: animDelay,
      useNativeDriver: false,
      easing: t => 1 - Math.pow(1 - t, 3),
    }).start();
  }, [clamped]);

  return (
    <>
      <Circle cx={RING_CX} cy={RING_CY} r={r} stroke={`${color}1F`} strokeWidth={strokeWidth} fill="none" />
      <AnimatedRingCircle
        cx={RING_CX} cy={RING_CY} r={r}
        stroke={color} strokeWidth={strokeWidth} fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashAnim}
        rotation={-90}
        origin={`${RING_CX}, ${RING_CY}`}
      />
    </>
  );
}

function DailyNutritionRing({ calories, protein, fat, locked }: {
  calories: number; protein: number; fat: number; locked?: boolean;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const calPct = calories / CAL_TARGET;
  const dot = polarPoint(RING_CX, RING_CY, OUTER_R, Math.min(1, calPct) * 360);

  useEffect(() => {
    if (calories <= 0) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.5, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [calories > 0]);

  return (
    <View style={{
      marginHorizontal: 14, marginTop: 12, marginBottom: 4, padding: 16, borderRadius: 16,
      backgroundColor: 'rgba(76,201,134,0.05)', borderWidth: 0.5, borderColor: 'rgba(76,201,134,0.18)',
      flexDirection: 'row', alignItems: 'center', gap: 16, opacity: locked ? 0.5 : 1,
    }}>
      <View style={{ width: RING_SZ, height: RING_SZ }}>
        <Svg width={RING_SZ} height={RING_SZ} style={StyleSheet.absoluteFill}>
          <NutritionRing r={OUTER_R} strokeWidth={8} pct={calPct} color="#F59E0B" />
          <NutritionRing r={MID_R}   strokeWidth={8} pct={protein / PROTEIN_TARGET} color="#4CC986" animDelay={120} />
          <NutritionRing r={INNER_R} strokeWidth={8} pct={fat / FAT_TARGET} color="#A78BFA" animDelay={240} />
        </Svg>
        {calories > 0 && (
          <Animated.View pointerEvents="none" style={{
            position: 'absolute', left: dot.x - 5, top: dot.y - 5, width: 10, height: 10,
            borderRadius: 5, backgroundColor: '#F59E0B', transform: [{ scale: pulse }], opacity: 0.7,
          }} />
        )}
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 20, lineHeight: 22 }}>{calories}</Text>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 9 }}>kcal logged</Text>
        </View>
      </View>
      <View style={{ flex: 1, gap: 7 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 12, flex: 1 }}>Calories</Text>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 12 }}>{calories} / {CAL_TARGET}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CC986' }} />
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 12, flex: 1 }}>Protein</Text>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 12 }}>{protein}g / {PROTEIN_TARGET}g</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#A78BFA' }} />
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 12, flex: 1 }}>Fat</Text>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 12 }}>{fat}g / {FAT_TARGET}g</Text>
        </View>
        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 10, marginTop: 2 }}>
          From everything checked off below
        </Text>
      </View>
    </View>
  );
}

// ── Day Panel (content for the selected day) ──────────────────────────
function DayPanel({ dayNumber, resolvedGrouped, weekStart, onToggle, onToggleAll, onAddExercise, onRemoveExercise }: {
  dayNumber: number;
  resolvedGrouped: any;
  weekStart: string;
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: (dayNumber: number, check: boolean) => void;
  onAddExercise: (dayNumber: number, itemType: string, itemsForOrder: any[], payload: any, mealSlot?: string) => Promise<void>;
  onRemoveExercise: (id: string) => Promise<void>;
}) {
  const { isTodayDay, isDayFuture, isDayPast, total, pct, allDone } =
    dayStats(resolvedGrouped, dayNumber, weekStart);
  const dayData  = resolvedGrouped[dayNumber] || {};
  const dayDate  = getDayDate(weekStart, dayNumber);
  const dateStr  = dayDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const barColor = allDone ? '#4CC986' : isTodayDay ? THEME.colors.teal : isDayFuture ? 'rgba(255,255,255,0.12)' : THEME.colors.amber;
  const pctColor = isDayFuture ? 'rgba(255,255,255,0.18)' : allDone ? '#4CC986' : isTodayDay ? THEME.colors.teal : THEME.colors.textMuted;

  return (
    <View style={[
      tabStyles.panel,
      isTodayDay  && styles.dayCardToday,
      allDone     && styles.dayCardDone,
      isDayFuture && styles.dayCardFuture,
    ]}>
      {/* Panel header */}
      <View style={tabStyles.panelHeader}>
        <View style={{ flex: 1 }}>
          {/* Day name + status pill row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
            <Text style={[tabStyles.panelDayName, isDayFuture && { color: THEME.colors.textMuted }]}>
              {DAY_NAMES[dayNumber - 1]}
            </Text>
            <Text style={tabStyles.panelDate}>{dateStr}</Text>
            {isTodayDay  && <View style={styles.todayPill}><Text style={styles.todayPillText}>TODAY</Text></View>}
            {!isTodayDay && allDone && <View style={styles.donePill}><Text style={styles.donePillText}>✓ DONE</Text></View>}
            {isDayPast && !allDone && pct > 0 && <View style={styles.partialPill}><Text style={styles.partialPillText}>◑ PARTIAL</Text></View>}
            {isDayPast && pct === 0 && total > 0 && <View style={styles.missedPill}><Text style={styles.missedPillText}>● NOT LOGGED</Text></View>}
            {isDayFuture && <View style={styles.upcomingPill}><Text style={styles.upcomingPillText}>⏳ UPCOMING</Text></View>}
          </View>
          <ProgressBar percent={isDayFuture ? 0 : pct} color={barColor} />
        </View>

        {/* Right: % + select-all */}
        <View style={{ alignItems: 'center', gap: 6, paddingLeft: 12 }}>
          <Text style={[tabStyles.panelPct, { color: pctColor }]}>
            {isDayFuture ? '—' : `${pct}%`}
          </Text>
          {total > 0 && !isDayFuture && (
            <Checkbox
              checked={allDone}
              onPress={() => onToggleAll(dayNumber, !allDone)}
              color={allDone ? '#4CC986' : isTodayDay ? THEME.colors.teal : THEME.colors.amber}
            />
          )}
        </View>
      </View>

      <View style={styles.dayDivider} />

      {/* Sections — warmup / workout / cooldown (water + food handled separately) */}
      {SECTIONS.filter(s => s.key !== 'water').map(s => (
        <SectionGroup
          key={s.key}
          sectionKey={s.key}
          items={dayData[s.key] || []}
          onToggle={onToggle}
          locked={isDayFuture}
          onAdd={(payload: any) => onAddExercise(dayNumber, s.key, dayData[s.key] || [], payload)}
          onRemove={onRemoveExercise}
        />
      ))}

      {/* Water tracker — custom circular UI */}
      {(dayData['water'] || []).length > 0 && (
        <View style={{ marginHorizontal: 14, marginTop: 10, marginBottom: 4 }}>
          <WaterTracker
            items={dayData['water'] || []}
            onToggle={onToggle}
            locked={isDayFuture}
          />
        </View>
      )}

      {/* Meal Selection Wheel — lights up a section as soon as anything in it is checked */}
      {(() => {
        const foodItems = dayData['food'] || [];
        const slots: MealSlotLit[] = FOOD_SLOTS.map(slot => ({
          key: slot.key,
          label: slot.label,
          icon: slot.icon,
          color: slot.color,
          lit: foodItems.some((i: any) => i.meal_slot === slot.key && i.completed),
        }));
        return <MealSelectionWheel slots={slots} />;
      })()}

      {/* Daily Nutrition Ring — live summary of everything checked off below */}
      {(() => {
        const foodItems = dayData['food'] || [];
        const eaten = foodItems.filter((i: any) => i.completed);
        const totalCalories = eaten.reduce((s: number, i: any) => s + (i.calories ?? 0), 0);
        const totalProtein  = eaten.reduce((s: number, i: any) => s + (i.protein_g ?? 0), 0);
        const totalFat      = eaten.reduce((s: number, i: any) => s + (i.fat_g ?? 0), 0);
        return <DailyNutritionRing calories={totalCalories} protein={totalProtein} fat={totalFat} locked={isDayFuture} />;
      })()}

      {/* Food — 5 meal-time sections, each independently addable. All rows
          share item_type='food'; meal_slot buckets them for display. */}
      {FOOD_SLOTS.map(slot => {
        const slotItems = (dayData['food'] || []).filter((i: any) => i.meal_slot === slot.key);
        return (
          <SectionGroup
            key={slot.key}
            sectionKey={slot.key}
            items={slotItems}
            onToggle={onToggle}
            locked={isDayFuture}
            onAdd={(payload: any) => onAddExercise(dayNumber, 'food', slotItems, payload, slot.key)}
            onRemove={onRemoveExercise}
          />
        );
      })}

      {/* Supplements — same 5 meal-time slots as nutrition, but their own
          item_type='supplement' so they stay out of calorie/macro totals. */}
      <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: '#A78BFA', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 14, marginBottom: 8, marginHorizontal: 14 }}>
        💊 Supplements
      </Text>
      {SUPPLEMENT_SLOTS.map(slot => {
        const slotItems = (dayData['supplement'] || []).filter((i: any) => i.meal_slot === slot.mealSlot);
        return (
          <SectionGroup
            key={slot.key}
            sectionKey={slot.key}
            items={slotItems}
            onToggle={onToggle}
            locked={isDayFuture}
            onAdd={(payload: any) => onAddExercise(dayNumber, 'supplement', slotItems, payload, slot.mealSlot)}
            onRemove={onRemoveExercise}
          />
        );
      })}
    </View>
  );
}

// ── Save Button ───────────────────────────────────────────────────────
function SaveButton({ isDirty, isSaving, onSave }: {
  isDirty: boolean; isSaving: boolean; onSave: () => void;
}) {
  return (
    <View style={saveStyles.container}>
      <TouchableOpacity
        style={[
          saveStyles.button,
          !isDirty && !isSaving && saveStyles.buttonClean,
        ]}
        onPress={onSave}
        disabled={isSaving}
        activeOpacity={0.85}
      >
        {isSaving ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color="#000" size="small" />
            <Text style={saveStyles.buttonText}>Saving…</Text>
          </View>
        ) : isDirty ? (
          <Text style={saveStyles.buttonText}>💾  Save Progress</Text>
        ) : (
          <Text style={[saveStyles.buttonText, { color: THEME.colors.textMuted }]}>✓  All Saved</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const saveStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical:   16,
    paddingBottom:     24,
  },
  button: {
    backgroundColor: THEME.colors.teal,
    borderRadius:    14,
    paddingVertical: 16,
    alignItems:      'center',
    shadowColor:     THEME.colors.teal,
    shadowOpacity:   0.3,
    shadowRadius:    12,
    shadowOffset:    { width: 0, height: 4 },
    elevation:       6,
  },
  buttonClean: {
    backgroundColor: THEME.colors.surface2,
    shadowOpacity:   0,
    elevation:       0,
  },
  buttonText: {
    fontSize:    16,
    fontFamily:  THEME.fonts.sansMedium,
    color:       '#000',
    letterSpacing: 0.3,
  },
  });

// ── Manual Log View ───────────────────────────────────────────────────
const INTENSITY_WEEKS: Record<string, number> = { beginner: 20, medium: 12, hard: 8 };

function addDaysToDate(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function parseDateLocal(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function ManualLogView({ userId }: { userId: string }) {
  const { profile, fetchProfile, setProfile } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mutate: recalcStreak } = useRecalculateStreak();

  const [calendarOpen, setCalendarOpen]   = useState(false);
  const [startDate, setStartDate]         = useState<string | null>((profile as any)?.workout_start_date ?? null);
  const [planIntensity, setPlanIntensity]       = useState<string | null>((profile as any)?.workout_intensity ?? null);
  const [planTrainingType, setPlanTrainingType] = useState<string | null>((profile as any)?.workout_training_type ?? null);

  // Keep local state in sync whenever the auth store profile is refreshed
  useEffect(() => {
    setStartDate((profile as any)?.workout_start_date ?? null);
    setPlanIntensity((profile as any)?.workout_intensity ?? null);
    setPlanTrainingType((profile as any)?.workout_training_type ?? null);
  }, [(profile as any)?.workout_start_date, (profile as any)?.workout_intensity, (profile as any)?.workout_training_type]);

  // The week the user is currently viewing (defaults to current week)
  const currentWeekStart = useMemo(() => {
    const d = new Date(); const dow = d.getDay();
    d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
    d.setHours(0, 0, 0, 0);
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
    return y + '-' + m + '-' + day;
  }, []);
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(currentWeekStart);

  // Compute plan end date
  const planEndDate = useMemo<Date | null>(() => {
    if (!startDate || !planIntensity) return null;
    const weeks = INTENSITY_WEEKS[planIntensity] ?? 20;
    const sd = parseDateLocal(startDate);
    return addDaysToDate(sd, weeks * 7 - 1);
  }, [startDate, planIntensity]);

  // Is the selected week within the active plan?
  const weekInPlan = useMemo<boolean | null>(() => {
    if (!startDate) return null; // no plan set
    const sd = parseDateLocal(startDate);
    sd.setHours(0, 0, 0, 0);
    const weekMon = parseDateLocal(selectedWeekStart);
    const weekSat = addDaysToDate(weekMon, 5);
    if (!planEndDate) return null;
    const ed = new Date(planEndDate); ed.setHours(23, 59, 59, 999);
    return weekSat >= sd && weekMon <= ed;
  }, [startDate, planEndDate, selectedWeekStart]);

     const { logs, grouped, weekStart, isLoading, shouldInit, initWeek, needsWaterSeed, ensureWaterSeeded, reseedFood, batchSave, isSaving, addItem, removeItem } =
    useManualLog(userId, profile, selectedWeekStart);

  const rawProgramId = (profile as any)?.workout_program_id ?? '';
  const isFBRPlan    = PROGRAMS_ENABLED && (rawProgramId === 'total_transformation' || rawProgramId === 'FBR');
  const [dietType, setDietType] = useState<'veg' | 'non_veg'>((profile as any)?.diet_type ?? 'veg');
  const [isDietSwitching, setIsDietSwitching] = useState(false);

  // Sync dietType when profile loads (initial useState may run before profile is hydrated)
  useEffect(() => {
    const stored = (profile as any)?.diet_type as 'veg' | 'non_veg' | null;
    if (stored) setDietType(stored);
  }, [(profile as any)?.diet_type]);

  async function handleDietToggle(next: 'veg' | 'non_veg') {
    if (next === dietType || isDietSwitching) return;
    const prev = dietType;
    setIsDietSwitching(true);
    setDietType(next);
    try {
      const { error } = await supabase.from('profiles').update({ diet_type: next }).eq('id', userId);
      if (error) throw error;
      // Refresh auth store so profile.diet_type is current on next mount
      setProfile({ ...(profile as any), diet_type: next });
      await reseedFood(next);
    } catch (err) {
      console.error('[DietToggle] failed:', err);
      setDietType(prev);
    } finally {
      setIsDietSwitching(false);
    }
  }

  // Local pending state: overrides DB values until Save is pressed
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [isDirty, setIsDirty] = useState(false);
  const didInit = useRef(false);
  useEffect(() => {
    if (shouldInit && !didInit.current) { didInit.current = true; initWeek(); }
  }, [shouldInit]);

  // Water has its own seed check — independent of shouldInit, which only
  // fires for weeks with zero rows at all. A week that already has custom
  // warmup/workout/food rows (added via "+") would otherwise never get its
  // water rows seeded, leaving water stuck on per-day preview placeholders
  // that vanish once you Save (see needsWaterSeed in useManualLog.js).
  const didSeedWater = useRef(false);
  useEffect(() => {
    if (needsWaterSeed && !didSeedWater.current) { didSeedWater.current = true; ensureWaterSeeded(); }
  }, [needsWaterSeed]);

  // Reset local edits when navigating to a different week
  useEffect(() => {
    setPending({});
    setIsDirty(false);
    didInit.current = false;
    didSeedWater.current = false;
  }, [selectedWeekStart]);

  // Which day tab is active — default to today if in this week, else day 1
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    for (let d = 1; d <= 6; d++) {
      if (isToday(selectedWeekStart, d)) return d;
    }
    return 1;
  });
  useEffect(() => {
    let def = 1;
    for (let d = 1; d <= 6; d++) {
      if (isToday(selectedWeekStart, d)) { def = d; break; }
    }
    setSelectedDay(def);
  }, [selectedWeekStart]);

  // Merge DB state with local pending overrides; fill template for days with no DB rows
  const resolvedGrouped = useMemo(() => {
    const result: Record<number, Record<string, any[]>> = {};
    // PRP path seeds water/food with day_number=null (shared across all days)
    const nullDay = (grouped as any)[null] || {};

    const applyPending = (item: any) => ({
      ...item,
      completed:    pending[item.id] !== undefined ? pending[item.id]    : item.completed,
      completed_at: pending[item.id] !== undefined
        ? (pending[item.id] ? (item.completed_at || new Date().toISOString()) : null)
        : item.completed_at,
    });

    for (let d = 1; d <= 6; d++) {
      result[d] = {};
      const day = (grouped as any)[d] || {};

      // DB items for this day
      for (const [sectionKey, items] of Object.entries(day)) {
        result[d][sectionKey] = (items as any[]).map(applyPending);
      }

      // Fill sections missing from DB: first try day_number=null rows (PRP water/food),
      // then fall back to template preview items
      const dayTemplate = DEFAULT_TEMPLATE.find((t: any) => t.day_number === d);
      if (dayTemplate) {
        for (const [sectionKey, templateItems] of Object.entries(dayTemplate.sections) as [string, any[]][]) {
          if (!result[d][sectionKey] || result[d][sectionKey].length === 0) {
            const nullItems: any[] = nullDay[sectionKey];
            if (nullItems && nullItems.length > 0) {
              // Use the shared day_number=null rows (real DB IDs — can be toggled & saved)
              result[d][sectionKey] = nullItems.map(applyPending);
            } else {
              result[d][sectionKey] = templateItems.map((item: any, idx: number) => {
                const tplId = `_tpl_${d}_${sectionKey}_${idx}`;
                const checked = pending[tplId] ?? false;
                return {
                  id:           tplId,
                  item_name:    item.name,
                  item_order:   item.order,
                  day_number:   d,
                  item_type:    sectionKey,
                  completed:    checked,
                  completed_at: checked ? new Date().toISOString() : null,
                  _template:    true,
                };
              });
            }
          }
        }
      }
    }
    return result;
  }, [grouped, pending]);

  // Toggle a single item (local only — not saved until Save button)
  const handleToggle = useCallback((id: string, currentChecked: boolean) => {
    setPending(prev => ({ ...prev, [id]: !currentChecked }));
    setIsDirty(true);
  }, []);

  // Toggle all items for a day at once
  const handleToggleAll = useCallback((dayNumber: number, check: boolean) => {
    const day = resolvedGrouped[dayNumber] || {};
    const updates: Record<string, boolean> = {};
    Object.values(day).forEach((items: any) => {
      (items as any[]).forEach(item => { updates[item.id] = check; });
    });
    if (Object.keys(updates).length === 0) return;
    setPending(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, [resolvedGrouped]);

  // Add a client-authored exercise/food item to a section (inserted
  // immediately, not part of the pending/Save flow — same pattern as
  // plan-add-exercise.tsx). itemsForOrder is whatever the section is
  // currently showing (already meal_slot-filtered for food), used only to
  // compute the next item_order.
  const handleAddExercise = useCallback(async (dayNumber: number, itemType: string, itemsForOrder: any[], payload: any, mealSlot?: string) => {
    const realOrders = itemsForOrder.map((i: any) => i.item_order || 0);
    const nextOrder  = realOrders.length ? Math.max(...realOrders) + 1 : 1;
    await addItem({ dayNumber, itemType, itemOrder: nextOrder, mealSlot, ...payload });
  }, [addItem]);

  const handleRemoveExercise = useCallback(async (id: string) => {
    await removeItem(id);
  }, [removeItem]);

  // Batch save all items to Supabase
  async function handleSave() {
    // Collect checked template items that need to be inserted as real DB rows
    const newRows: any[] = [];
    const seenTplKeys = new Set<string>();
    for (let d = 1; d <= 6; d++) {
      const dayData = resolvedGrouped[d] || {};
      for (const items of Object.values(dayData) as any[][]) {
        for (const item of items) {
          if (item._template && pending[item.id] === true) {
            // Deduplicate: PRP water/food appear on all 6 days but insert once with day_number=null
            const dedupeKey = `${item.item_type}__${item.item_name}`;
            if (!seenTplKeys.has(dedupeKey)) {
              seenTplKeys.add(dedupeKey);
              newRows.push({
                client_id:       userId,
                week_start_date: weekStart,
                day_number:      item.day_number,
                item_type:       item.item_type,
                item_name:       item.item_name,
                item_order:      item.item_order,
                completed:       true,
                completed_at:    new Date().toISOString(),
              });
            }
          }
        }
      }
    }

    if (!logs.length && !newRows.length) return;

    try {
      if (newRows.length) {
        const { error } = await supabase.from('manual_workout_logs').insert(newRows);
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ['manual_logs', userId, weekStart] });
      }

      if (logs.length) {
        const updates = logs.map(log => {
          const checked = pending[log.id] !== undefined ? pending[log.id] : log.completed;
          return {
            id:          log.id,
            completed:   checked,
            completed_at: checked
              ? (log.completed_at || new Date().toISOString())
              : null,
          };
        });
        await batchSave(updates);
      }

      setPending({});
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['calendar_month'] });
      // Always invalidate alignment + home-page query keys after any save, regardless
      // of whether batchSave or newRows path ran (batchSave.onSuccess handles it only
      // for the logs path; newRows path had no alignment invalidation).
      queryClient.invalidateQueries({ queryKey: ['alignment', userId] });
      queryClient.invalidateQueries({ queryKey: ['client', userId, 'week_activity'] });
      queryClient.invalidateQueries({ queryKey: ['client', userId, 'week_stats'] });
      queryClient.invalidateQueries({ queryKey: ['client', userId, 'total_days_logged'] });
      // Recalculate alignment streak after every save (fire-and-forget)
      recalcStreak();
    } catch {
      Alert.alert('Save failed', 'Please check your connection and try again.');
    }
  }

  // Week totals using resolved state
  let totalAll = 0; let doneAll = 0;
  for (let d = 1; d <= 6; d++) {
    const day = resolvedGrouped[d] || {};
    Object.values(day).forEach((items: any) => {
      totalAll += items.length;
      doneAll  += items.filter((i: any) => i.completed).length;
    });
  }
  const weekPct = totalAll ? Math.round((doneAll / totalAll) * 100) : 0;

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={THEME.colors.teal} size="large" />
        <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.sans, marginTop: 12 }}>
          Setting up your weekly plan…
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 8, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
      <View style={{ paddingTop: 24, paddingBottom: 16 }}>
  {/* Header row with calendar icon */}
  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Workout Log</Text>
      <Text style={{ fontSize: 26, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginBottom: 4 }}>6-Day Checklist</Text>
      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 20 }}>Track workouts, water & meals. Tap any day to expand.</Text>
    </View>
    {/* Icon buttons row */}
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      {/* Daily Pulse shortcut */}
      <TouchableOpacity
        onPress={() => router.push('/(client)/checkin')}
        style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(236,72,153,0.1)', borderWidth: 1, borderColor: 'rgba(236,72,153,0.25)', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 18 }}>💓</Text>
      </TouchableOpacity>
      {/* Calendar icon */}
      <TouchableOpacity
        onPress={() => setCalendarOpen(true)}
        style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,196,180,0.1)', borderWidth: 1, borderColor: 'rgba(0,196,180,0.25)', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 18 }}>📅</Text>
      </TouchableOpacity>
    </View>
  </View>
  {/* Active plan indicator */}
  {startDate && (
    <View style={{ marginTop: 10, backgroundColor: 'rgba(0,196,180,0.07)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 0.5, borderColor: 'rgba(0,196,180,0.2)' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 14 }}>
          {{ beginner: '🌱', medium: '⚡', hard: '🔥' }[planIntensity ?? 'beginner'] ?? '📋'}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>
            Plan active · started {new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
            {{ home: '🏠 Home', gym: '🏋️ Gym', hybrid: '🔄 Hybrid' }[planTrainingType ?? 'home'] ?? '🏠 Home'}
            {'  ·  '}
            {{ beginner: 'Beginner', medium: 'Medium', hard: 'Hard' }[planIntensity ?? 'beginner'] ?? 'Beginner'}
          </Text>
        </View>
      </View>

      {/* Veg / Non-Veg diet toggle — FBR only */}
      {isFBRPlan && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 }}>
          <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 0.5 }}>DIET</Text>
          <View style={{ flexDirection: 'row', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <TouchableOpacity
              onPress={() => handleDietToggle('veg')}
              activeOpacity={0.8}
              disabled={isDietSwitching}
              style={{
                paddingHorizontal: 14, paddingVertical: 5,
                backgroundColor: dietType === 'veg' ? '#4ADE80' : 'rgba(255,255,255,0.05)',
              }}
            >
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: dietType === 'veg' ? '#000' : 'rgba(255,255,255,0.4)' }}>
                🌿 Veg
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDietToggle('non_veg')}
              activeOpacity={0.8}
              disabled={isDietSwitching}
              style={{
                paddingHorizontal: 14, paddingVertical: 5,
                backgroundColor: dietType === 'non_veg' ? '#FB923C' : 'rgba(255,255,255,0.05)',
              }}
            >
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: dietType === 'non_veg' ? '#000' : 'rgba(255,255,255,0.4)' }}>
                🍗 Non-Veg
              </Text>
            </TouchableOpacity>
          </View>
          {isDietSwitching && (
            <ActivityIndicator size="small" color={THEME.colors.teal} />
          )}
        </View>
      )}
    </View>
  )}
</View>

        {/* ── Routines ── deactivated for now: superseded by the per-section
             "+" add-exercise flow (see ADDABLE_SECTIONS). Re-enable by
             flipping ADVANCED_TRACKING_ENABLED back on. */}
        {ADVANCED_TRACKING_ENABLED && (
<View style={{ marginTop: 16, marginBottom: 4 }}>
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
    <Text style={{ fontSize: 17, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Routines</Text>
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/(client)/plan-add-exercise', params: { weekStart: selectedWeekStart, planStart: startDate ?? '', planIntensity: planIntensity ?? 'beginner' } })}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 0.5, borderColor: 'rgba(0,196,180,0.3)' }}
    >
      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Add Exercises</Text>
      <Text style={{ fontSize: 18, color: THEME.colors.teal, lineHeight: 22 }}>+</Text>
    </TouchableOpacity>
  </View>
  <View style={{ flexDirection: 'row', gap: 12 }}>
      <TouchableOpacity
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}
        onPress={() => router.push('/(client)/routine-new')}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 20 }}>📋</Text>
        <Text style={{ fontFamily: THEME.fonts.sansMedium, fontSize: 14, color: THEME.colors.textPrimary }}>New Routine</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}
        onPress={() => router.push('/(client)/routine-explore')}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 20 }}>🔍</Text>
        <Text style={{ fontFamily: THEME.fonts.sansMedium, fontSize: 14, color: THEME.colors.textPrimary }}>Explore</Text>
           </TouchableOpacity>
    </View>
</View>
        )}
        {/* Day cards — always shown by default in Lite mode (plan-gating disabled, see ADVANCED_TRACKING_ENABLED) */}
        <View style={{ marginTop: 4 }}>
            {/* Week navigator — sits directly above the day tabs */}
            {(() => {
              const mon = parseDateLocal(selectedWeekStart);
              const sat = addDaysToDate(mon, 5);
              const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
              const isCurrentWeek = selectedWeekStart === currentWeekStart;
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => {
                      const prev = new Date(parseDateLocal(selectedWeekStart));
                      prev.setDate(prev.getDate() - 7);
                      const py = prev.getFullYear(), pm = String(prev.getMonth()+1).padStart(2,'0'), pd = String(prev.getDate()).padStart(2,'0');
                      setSelectedWeekStart(py + '-' + pm + '-' + pd);
                    }}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: THEME.colors.surface2, borderWidth: 0.5, borderColor: THEME.colors.border, alignItems: 'center', justifyContent: 'center' }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: THEME.colors.textPrimary, fontSize: 16 }}>‹</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, alignItems: 'center', backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingVertical: 8, borderWidth: 0.5, borderColor: THEME.colors.border }}
                    onPress={() => setSelectedWeekStart(currentWeekStart)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: THEME.colors.textPrimary, fontSize: 13, fontFamily: THEME.fonts.sansMedium }}>
                      {fmt(mon)} – {fmt(sat)}
                    </Text>
                    {!isCurrentWeek && (
                      <Text style={{ color: THEME.colors.teal, fontSize: 10, fontFamily: THEME.fonts.sans, marginTop: 2 }}>tap to return to current week</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const next = new Date(parseDateLocal(selectedWeekStart));
                      next.setDate(next.getDate() + 7);
                      const ny = next.getFullYear(), nm = String(next.getMonth()+1).padStart(2,'0'), nd = String(next.getDate()).padStart(2,'0');
                      setSelectedWeekStart(ny + '-' + nm + '-' + nd);
                    }}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: THEME.colors.surface2, borderWidth: 0.5, borderColor: THEME.colors.border, alignItems: 'center', justifyContent: 'center' }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: THEME.colors.textPrimary, fontSize: 16 }}>›</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
            <DayTabs
              selectedDay={selectedDay}
              onSelect={setSelectedDay}
              resolvedGrouped={resolvedGrouped}
              weekStart={weekStart}
            />
            <DayPanel
              dayNumber={selectedDay}
              resolvedGrouped={resolvedGrouped}
              weekStart={weekStart}
              onToggle={handleToggle}
              onToggleAll={handleToggleAll}
              onAddExercise={handleAddExercise}
              onRemoveExercise={handleRemoveExercise}
            />
          </View>
      </ScrollView>


      {/* Workout Calendar overlay */}
<WorkoutCalendar
  visible={calendarOpen}
  onClose={() => setCalendarOpen(false)}
  userId={userId}
  initialStartDate={startDate}
  initialIntensity={planIntensity}
  initialTrainingType={planTrainingType}
  workoutProgramId={(profile as any)?.workout_program_id ?? null}
  onSave={async (date, intensity, trainingType) => {
    setStartDate(date || null);
    setPlanIntensity(intensity);
    setPlanTrainingType(trainingType);
    // Clear this week's checklist rows so initWeek re-seeds with the new plan's exercises
    const thisWeek = weekStart;
    await supabase
      .from('manual_workout_logs')
      .delete()
      .eq('client_id', userId)
      .eq('week_start_date', thisWeek);
    queryClient.invalidateQueries({ queryKey: ['manual_logs', userId, thisWeek] });
  }}
  onDaySelect={(ws) => setSelectedWeekStart(ws)}
/>

      {/* Sticky Save button */}
      <SaveButton isDirty={isDirty} isSaving={isSaving} onSave={handleSave} />
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────
export default function WorkoutPlanScreen() {
  const { session } = useAuthStore();
  const userId = session?.user?.id ?? null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      {userId
        ? <ManualLogView userId={userId} />
        : <ActivityIndicator color={THEME.colors.teal} style={{ flex: 1 }} />
      }
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  weekCard:    { backgroundColor: THEME.colors.surface2, borderWidth: 1, borderColor: 'rgba(0,196,180,0.2)', borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  weekCircle:  { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: THEME.colors.teal, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,196,180,0.08)' },
  dayCard:       { backgroundColor: THEME.colors.surface2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' },
  dayCardToday:  { borderColor: 'rgba(0,196,180,0.4)' },
  dayCardDone:   { borderColor: 'rgba(76,201,134,0.35)' },
  dayCardFuture: { opacity: 0.55 },
  dayHeader:   { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  dayBadge:    { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dayBadgeNum: { fontSize: 17, fontFamily: THEME.fonts.sansMedium },
  dayName:     { fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary },
  dayDate:     { fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 },
  dayPct:      { fontSize: 13, fontFamily: THEME.fonts.sansMedium },
  arrow:       { color: THEME.colors.textMuted, fontSize: 16 },
  todayPill:   { backgroundColor: 'rgba(0,196,180,0.12)', borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  todayPillText:{ color: THEME.colors.teal, fontSize: 9, fontFamily: THEME.fonts.sansMedium, letterSpacing: 0.8 },
  donePill:    { backgroundColor: 'rgba(76,201,134,0.12)', borderWidth: 1, borderColor: 'rgba(76,201,134,0.3)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  donePillText:{ color: '#4CC986', fontSize: 9, fontFamily: THEME.fonts.sansMedium, letterSpacing: 0.8 },
  partialPill:     { backgroundColor: 'rgba(232,164,74,0.12)', borderWidth: 1, borderColor: 'rgba(232,164,74,0.3)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
partialPillText: { color: '#E8A44A', fontSize: 9, fontFamily: THEME.fonts.sansMedium, letterSpacing: 0.8 },
missedPill:      { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
missedPillText:  { color: '#EF4444', fontSize: 9, fontFamily: THEME.fonts.sansMedium, letterSpacing: 0.8 },
upcomingPill:    { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
upcomingPillText:{ color: 'rgba(255,255,255,0.35)', fontSize: 9, fontFamily: THEME.fonts.sansMedium, letterSpacing: 0.8 },
  dayDivider:  { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 14 },
  dayBody:     { paddingBottom: 10 },
  progressTrack:{ height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },
  sectionGroup: { marginTop: 10, marginHorizontal: 14 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9, marginBottom: 2 },
  sectionIcon:  { fontSize: 15 },
  sectionLabel: { fontSize: 12, fontFamily: THEME.fonts.sansMedium, letterSpacing: 0.4, flex: 1 },
  sectionPill:  { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  sectionPillText: { fontSize: 11, fontFamily: THEME.fonts.sansMedium },
  sectionChevron:  { color: THEME.colors.textMuted, fontSize: 14 },
  sectionItems: { paddingHorizontal: 4 },
  logRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 8, gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  logItemName:  { flex: 1, color: THEME.colors.textSecondary, fontSize: 13, fontFamily: THEME.fonts.sans, lineHeight: 19 },
  logItemDone:  { color: THEME.colors.textMuted, textDecorationLine: 'line-through' },
  logItemDetail:{ color: THEME.colors.textMuted, fontSize: 11, fontFamily: THEME.fonts.sans, marginTop: 2 },
  logTime:      { color: THEME.colors.textMuted, fontSize: 11, fontFamily: THEME.fonts.sans, flexShrink: 0 },
  addBtn:       { width: 20, height: 20, borderRadius: 10, borderWidth: 1.2, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  addBtnText:   { fontSize: 13, fontFamily: THEME.fonts.sansMedium, lineHeight: 15 },
  emptySectionCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 18, marginHorizontal: 4, borderRadius: 12, borderWidth: 1,
    borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.12)',
  },
  emptySectionCtaIcon: { fontSize: 16, fontFamily: THEME.fonts.sansMedium },
  emptySectionCtaText: { color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.sansMedium },
  checkOuter:   { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkTick:    { color: '#000', fontSize: 13, fontFamily: THEME.fonts.sansMedium, lineHeight: 16 },
  guideBtn:     { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(100,181,246,0.5)', alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  guideBtnText: { color: '#64B5F6', fontSize: 10, fontFamily: THEME.fonts.sansMedium, lineHeight: 12 },
  planGate:     { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginTop: 8 },
  planGateIcon: { fontSize: 40, marginBottom: 12 },
  planGateTitle:{ fontSize: 17, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: 8 },
  planGateBody: { fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  planGateBtn:  { backgroundColor: THEME.colors.teal, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  planGateBtnText: { color: '#000', fontSize: 14, fontFamily: THEME.fonts.sansMedium },
});

// ── Tab + panel styles ────────────────────────────────────────────────
const tabStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  abbr: {
    fontSize: 11,
    fontFamily: THEME.fonts.sansMedium,
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  dateLabel: {
    fontSize: 9,
    fontFamily: THEME.fonts.sans,
    marginBottom: 4,
  },
  dotSlot: {
    height: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  panel: {
    backgroundColor: THEME.colors.surface2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    paddingBottom: 6,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 8,
  },
  panelDayName: {
    fontSize: 16,
    fontFamily: THEME.fonts.sansMedium,
    color: THEME.colors.textPrimary,
  },
  panelDate: {
    fontSize: 12,
    fontFamily: THEME.fonts.sans,
    color: THEME.colors.textMuted,
  },
  panelPct: {
    fontSize: 14,
    fontFamily: THEME.fonts.sansMedium,
  },
});

