import { WorkoutCalendar } from '@/components/ui/WorkoutCalendar';
import { WaterTracker } from '@/components/ui/WaterTracker';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Animated, StyleSheet, Alert, Modal, Pressable, Image, useWindowDimensions, BackHandler,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFocusEmoji } from '@/hooks/useWorkout';
import { useManualLog, isToday, getDayDate, DEFAULT_TEMPLATE } from '@/hooks/useManualLog';
import { toLocalDateStr } from '@/lib/dateHelpers';
import { useRecalculateStreak } from '@/hooks/useStreakSystem';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { THEME } from '@/constants/theme';
import { TAB_BAR_CLEARANCE } from '@/components/ui/SlidingTabBar';
import { sanitizeInteger, sanitizeDecimal, NUMERIC_RANGES, clampToRange, MAX_LENGTHS } from '@/utils/validation';
import { PROGRAMS_ENABLED, ADVANCED_TRACKING_ENABLED } from '@/constants/featureFlags';
import { WARMUP_EXERCISES, type ExerciseSide, type WarmupExerciseDefault } from '@/constants/warmupExercises';
import { WORKOUT_EXERCISES } from '@/constants/workoutExercises';
import { COOLDOWN_EXERCISES } from '@/constants/cooldownExercises';
import { MORNING_DRINK_ITEMS, BREAKFAST_ITEMS, LUNCH_ITEMS, EVENING_SNACK_ITEMS, DINNER_ITEMS, type FoodItemDefault } from '@/constants/foodItems';
import { BREAKFAST_GROUPS, type BreakfastItem } from '@/constants/breakfastGroups';
import { LUNCH_GROUPS, type LunchItem } from '@/constants/lunchGroups';
import { DINNER_GROUPS, type DinnerItem } from '@/constants/dinnerGroups';
import { CRAVING_GROUPS, type CravingItem } from '@/constants/cravingGroups';
import { SUPPLEMENT_ITEMS, type SupplementItemDefault } from '@/constants/supplementItems';
import { useSupplementCatalogImages } from '@/hooks/useSupplementCatalogImages';
import {
  useMyRoutineTemplates, useSaveRoutineTemplate, useApplyRoutineTemplate, useDeleteRoutineTemplate,
  type RoutineTemplate, type RoutineTemplateItem, type RoutineDomain,
} from '@/hooks/useWorkoutRoutineTemplates';
import { useMyCustomExercises, useSaveCustomExercise, type CustomExercise } from '@/hooks/useCustomExercises';
import { useMyCustomItems, useSaveCustomItem, type CustomItem } from '@/hooks/useCustomItems';

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
function Checkbox({ checked, onPress, color = THEME.colors.teal, locked = false, testID }: {
  checked: boolean; onPress: () => void; color?: string; locked?: boolean; testID?: string;
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
      testID={testID}
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
const SIDE_LABELS: Record<string, string> = { right: 'Each side', left: 'Each side', both: 'Both sides', rotation: 'Rotation', na: '' };

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

function findSupplementCatalogId(itemName: string): string | null {
  return SUPPLEMENT_ITEMS.find(s => s.name === itemName)?.id ?? null;
}

// Full-size image/name preview — tapping a supplement's name opens this
// instead of squinting at a thumbnail barely 60px wide in the grid.
function SupplementPreviewModal({ visible, name, imageUrl, onClose }: {
  visible: boolean; name: string; imageUrl?: string; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.suppPreviewBackdrop} onPress={onClose}>
        <Pressable style={styles.suppPreviewCard} onPress={() => {}}>
          <View style={styles.suppPreviewImageWrap}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.suppPreviewImage} resizeMode="contain" />
            ) : (
              <Text style={{ fontSize: 64 }}>💊</Text>
            )}
          </View>
          <Text style={styles.suppPreviewName}>{name}</Text>
          <TouchableOpacity onPress={onClose} style={styles.suppPreviewCloseBtn} activeOpacity={0.85}>
            <Text style={styles.suppPreviewCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Square grid cell for a logged supplement — shows the admin-uploaded
// catalog photo when one exists for this item, else a pill-icon fallback.
function SupplementGridCell({ item, imageUrl, onToggle, onRemove, color, locked }: {
  item: any; imageUrl?: string; onToggle: (id: string, checked: boolean) => void;
  onRemove?: (id: string) => void; color: string; locked: boolean;
}) {
  const [previewVisible, setPreviewVisible] = useState(false);

  function handleRemove() {
    Alert.alert('Remove supplement?', `Remove "${item.item_name}" from this day.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onRemove?.(item.id) },
    ]);
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => !locked && onToggle(item.id, item.completed)}
        activeOpacity={0.85}
        style={[styles.suppGridCell, { borderColor: item.completed ? color : THEME.colors.border }, locked && { opacity: 0.38 }]}
      >
        {item.completed && (
          <View style={[styles.suppCheckBadge, { backgroundColor: color }]}>
            <Text style={{ color: '#0A0A0B', fontSize: 12, fontFamily: THEME.fonts.sansMedium }}>✓</Text>
          </View>
        )}
        {!locked && item.is_custom && !item.added_by_coach && onRemove && (
          <TouchableOpacity onPress={handleRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.suppRemoveX}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 16 }}>×</Text>
          </TouchableOpacity>
        )}
        <View style={styles.suppGridImageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.suppGridImage} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: 36 }}>💊</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => setPreviewVisible(true)} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
          <Text numberOfLines={2} style={[styles.suppGridName, item.completed && { color: THEME.colors.textMuted }]}>{item.item_name}</Text>
        </TouchableOpacity>
        {item.added_by_coach && (
          <View style={styles.suppCoachBadge}>
            <Text style={{ fontSize: 11 }}>🧑‍🏫</Text>
            <Text style={styles.suppCoachBadgeText}>Assigned by coach</Text>
          </View>
        )}
      </TouchableOpacity>
      <SupplementPreviewModal visible={previewVisible} name={item.item_name} imageUrl={imageUrl} onClose={() => setPreviewVisible(false)} />
    </>
  );
}

// Horizontal 5-segment progress pill across the meal-time slots — each
// segment fills as that slot's logged supplements get checked off, so the
// whole day's supplement adherence reads at a glance (same idea as a daily
// nutrition tracker, just collapsed into one strip instead of 5 separate bars).
function SupplementSlotPill({ slots, dayData }: { slots: typeof SUPPLEMENT_SLOTS; dayData: any[] }) {
  return (
    <View style={styles.slotPillWrap}>
      <View style={styles.slotPillTrack}>
        {slots.map((slot, i) => {
          const slotItems = dayData.filter((item: any) => item.meal_slot === slot.mealSlot);
          const done = slotItems.filter((item: any) => item.completed).length;
          const pct = slotItems.length ? done / slotItems.length : 0;
          const complete = slotItems.length > 0 && done === slotItems.length;
          return (
            <View key={slot.key} style={[styles.slotPillSegment, i > 0 && { marginLeft: 4 }]}>
              <View style={styles.slotPillSegmentTrack}>
                <View style={[styles.slotPillSegmentFill, { width: `${pct * 100}%`, backgroundColor: slot.color }]} />
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.slotPillLabelsRow}>
        {slots.map((slot) => {
          const slotItems = dayData.filter((item: any) => item.meal_slot === slot.mealSlot);
          const done = slotItems.filter((item: any) => item.completed).length;
          return (
            <View key={slot.key} style={styles.slotPillLabel}>
              <Text style={{ fontSize: 12 }}>{slot.icon}</Text>
              <Text style={[styles.slotPillLabelText, slotItems.length > 0 && done === slotItems.length && { color: slot.color }]}>
                {slotItems.length ? `${done}/${slotItems.length}` : '—'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function SupplementAddCell({ color, onPress }: { color: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.suppGridCell, styles.suppAddCell, { borderColor: color }]}>
      <Text style={{ fontSize: 36, lineHeight: 38, color, fontFamily: THEME.fonts.sansMedium }}>+</Text>
    </TouchableOpacity>
  );
}

// ── Confession Booth — standalone craving section below Dinner ────────
const CRAVING_ROASTS = [
  "Sneaky. Very sneaky.",
  "Your coach has been notified. Just kidding. ...Maybe.",
  "Diet starts tomorrow, right?",
  "This happened. It's logged. It counts.",
  "Bold strategy. Let's see how it plays out.",
  "Your future self is shaking their head.",
  "We don't judge here. We just count calories.",
];

function ConfessionBoothSection({
  items, onToggle, onRemove, onAdd, locked = false,
}: {
  items: any[]; onToggle: (id: string, checked: boolean) => void;
  onRemove: (id: string) => Promise<void>; onAdd: (payload: any) => Promise<void>;
  locked?: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const [open, setOpen] = useState(false);
  const allDone = items.length > 0 && items.every(i => i.completed);
  const roast = CRAVING_ROASTS[items.length % CRAVING_ROASTS.length];

  function handleSelectAll() {
    if (locked) return;
    const target = !allDone;
    items.forEach(item => { if (!!item.completed !== target) onToggle(item.id, item.completed); });
  }

  return (
    <View style={{ marginTop: 8 }}>
      {/* Divider */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(249,115,22,0.2)' }} />
        <Text style={{ color: '#F97316', fontSize: 10, fontFamily: THEME.fonts.sansMedium, marginHorizontal: 8, letterSpacing: 0.8 }}>
          UNPLANNED CRAVINGS
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(249,115,22,0.2)' }} />
      </View>

      {/* Section header row */}
      <TouchableOpacity
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.8}
        style={{
          flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14,
          borderRadius: 12, borderWidth: 1.5,
          borderStyle: items.length === 0 ? 'dashed' : 'solid',
          borderColor: '#F97316',
          backgroundColor: items.length > 0 ? 'rgba(249,115,22,0.08)' : 'rgba(249,115,22,0.04)',
        }}
      >
        <Text style={{ fontSize: 18, marginRight: 10 }}>🙈</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#F97316', fontSize: 13, fontFamily: THEME.fonts.sansMedium }}>
            Confession Booth {items.length > 0 ? `(${items.length})` : ''}
          </Text>
          <Text style={{ color: THEME.colors.textMuted, fontSize: 11, fontFamily: THEME.fonts.sans, marginTop: 1, fontStyle: 'italic' }}>
            {items.length === 0 ? 'Pizza, chips, beer... log the damage' : roast}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {!locked && (
            <TouchableOpacity
              onPress={() => setShowModal(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ color: '#F97316', fontSize: 20, lineHeight: 22 }}>+</Text>
            </TouchableOpacity>
          )}
          {!locked && items.length > 0 && (
            <Checkbox checked={allDone} onPress={handleSelectAll} color="#F97316" />
          )}
          {items.length > 0 && (
            <TouchableOpacity onPress={() => setOpen(o => !o)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: THEME.colors.textMuted, fontSize: 14 }}>{open ? '▾' : '›'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {/* Logged craving items */}
      {open && items.length > 0 && (
        <View style={{ marginTop: 4, paddingHorizontal: 4 }}>
          {items.map((item: any) => (
            <View
              key={item.id}
              style={{
                flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10,
                marginBottom: 4, borderRadius: 10,
                backgroundColor: item.completed ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.02)',
                borderWidth: 1, borderColor: item.completed ? 'rgba(249,115,22,0.3)' : THEME.colors.border,
              }}
            >
              <Checkbox
                checked={!!item.completed}
                onPress={() => !locked && onToggle(item.id, item.completed)}
                color="#F97316"
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: item.completed ? '#F97316' : THEME.colors.textPrimary, fontSize: 13, fontFamily: THEME.fonts.sansMedium }}>
                  {item.item_name}
                </Text>
                {(item.calories || item.quantity) && (
                  <Text style={{ color: THEME.colors.textMuted, fontSize: 11, fontFamily: THEME.fonts.sans, marginTop: 1 }}>
                    {item.quantity ? `${item.quantity} · ` : ''}{item.calories ? `${item.calories} kcal` : ''}
                    {item.fat_g ? ` · ${item.fat_g}g fat` : ''}{item.carbs_g ? ` · ${item.carbs_g}g carbs` : ''}
                  </Text>
                )}
              </View>
              {!locked && (
                <TouchableOpacity onPress={() => onRemove(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ color: THEME.colors.textMuted, fontSize: 16 }}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      <AddExerciseModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onAddDone={() => setShowModal(false)}
        sectionColor="#F97316"
        sectionLabel="Cravings"
        kind="food"
        library={[]}
        onAdd={onAdd}
        initialCravingMode
      />
    </View>
  );
}

// ── Collapsible Section Group ─────────────────────────────────────────
function SectionGroup({ sectionKey, items, onToggle, onAdd, onRemove, locked = false, forceOpenState }: {
  sectionKey: string; items: any[]; onToggle: (id: string, checked: boolean) => void;
  onAdd?: (payload: any) => Promise<void>; onRemove?: (id: string) => Promise<void>; locked?: boolean;
  forceOpenState?: boolean | null; // true = force open, false = force close, null/undefined = user-controlled
}) {
  const { data: supplementImages = {} } = useSupplementCatalogImages();
  const [open, setOpen]           = useState(false); // default collapsed

  useEffect(() => {
    if (forceOpenState !== null && forceOpenState !== undefined) {
      setOpen(forceOpenState);
    }
  }, [forceOpenState]);
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
          {isSupplement ? (
            <View style={styles.suppGrid}>
              {items.map(item => (
                <SupplementGridCell
                  key={item.id}
                  item={item}
                  imageUrl={supplementImages[findSupplementCatalogId(item.item_name) ?? '']}
                  onToggle={onToggle}
                  onRemove={onRemove}
                  color={meta.color}
                  locked={locked}
                />
              ))}
              {addable && !locked && (
                <SupplementAddCell color={meta.color} onPress={() => setShowAddModal(true)} />
              )}
            </View>
          ) : (
            <>
              {items.map(item => (
                <LogItem key={item.id} item={item} onToggle={onToggle} onRemove={onRemove ? (id) => onRemove(id) : undefined} color={meta.color} locked={locked} />
              ))}
              {!items.length && addable && !locked && (
                <TouchableOpacity style={styles.emptySectionCta} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
                  <Text style={[styles.emptySectionCtaIcon, { color: meta.color }]}>+</Text>
                  <Text style={styles.emptySectionCtaText}>Add to {meta.label}</Text>
                </TouchableOpacity>
              )}
            </>
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
          onAdd={async (payload) => { await onAdd!(payload); }}
          onAddDone={() => setShowAddModal(false)}
          initialMealSlot={isFood ? sectionKey : undefined}
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

// ── Save Routine modal ───────────────────────────────────────────────────
// Names and snapshots the currently-open day's Warmup/Workout/Cooldown
// items into a reusable template (see useWorkoutRoutineTemplates.ts).
function SaveRoutineModal({ visible, onClose, onSave, saving, description, namePlaceholder }: {
  visible: boolean; onClose: () => void; onSave: (name: string) => Promise<void>; saving: boolean;
  description: string; namePlaceholder: string;
}) {
  const [name, setName] = useState('');

  function handleClose() {
    setName('');
    onClose();
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleClose} statusBarTranslucent>
      <Pressable style={wg.backdrop} onPress={handleClose}>
        <Pressable style={wg.card}>
          <View style={wg.header}>
            <Text style={wg.title}>💾  Save Routine</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={wg.closeX}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={wg.divider} />
          <View style={{ padding: 18, gap: 12 }}>
            <Text style={{ color: THEME.colors.textMuted, fontSize: 12.5, fontFamily: THEME.fonts.sans, lineHeight: 18 }}>
              {description}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={namePlaceholder}
              placeholderTextColor={THEME.colors.textMuted}
              maxLength={MAX_LENGTHS.shortTitle}
              autoFocus
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, paddingVertical: 12,
                color: THEME.colors.textPrimary, fontSize: 14, fontFamily: THEME.fonts.sans,
              }}
            />
            <TouchableOpacity
              style={[wg.gotItBtn, { margin: 0, opacity: name.trim() && !saving ? 1 : 0.5 }]}
              onPress={() => onSave(name.trim())}
              disabled={!name.trim() || saving}
              activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator color="#000" /> : <Text style={wg.gotItText}>Save Routine</Text>}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Multi-date calendar for the "Custom dates" apply-scope ──────────────────
// Deliberately separate from the shared CalendarGrid (which is single-select
// and disables future dates by default) — this one disables PAST dates
// instead, since scheduling a routine into upcoming days is the whole point.
function RoutineMultiCalendar({ selectedDates, onToggleDate }: {
  selectedDates: Set<string>; onToggleDate: (dateStr: string) => void;
}) {
  const todayStr = toLocalDateStr(new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <TouchableOpacity onPress={() => setVisibleMonth(new Date(year, month - 1, 1))} style={{ padding: 8 }}>
          <Text style={{ fontSize: 18, color: THEME.colors.textMuted }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
          {visibleMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => setVisibleMonth(new Date(year, month + 1, 1))} style={{ padding: 8 }}>
          <Text style={{ fontSize: 18, color: THEME.colors.textMuted }}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {['S','M','T','W','T','F','S'].map((w, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>{w}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day, i) => {
          if (day == null) return <View key={i} style={{ width: '14.28%', aspectRatio: 1 }} />;
          const dateStr = toLocalDateStr(new Date(year, month, day));
          const isSunday = new Date(year, month, day).getDay() === 0;
          // Past dates are temporarily allowed for testing — see handleAddExercise's
          // sibling gate in useApplyRoutineTemplate, also relaxed for the same reason.
          const disabled = isSunday;
          const isSelected = selectedDates.has(dateStr);
          const isToday = dateStr === todayStr;
          return (
            <TouchableOpacity
              key={i}
              disabled={disabled}
              onPress={() => onToggleDate(dateStr)}
              style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <View style={{
                width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                backgroundColor: isSelected ? THEME.colors.teal : 'transparent',
                borderWidth: isToday && !isSelected ? 1 : 0, borderColor: THEME.colors.teal,
              }}>
                <Text style={{
                  fontSize: 12.5, fontFamily: isSelected ? THEME.fonts.sansMedium : THEME.fonts.sans,
                  color: isSelected ? THEME.colors.background : THEME.colors.textPrimary,
                  opacity: disabled ? 0.25 : 1,
                }}>
                  {day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={{ fontSize: 11, color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, marginTop: 10, textAlign: 'center' }}>
        {selectedDates.size} date{selectedDates.size !== 1 ? 's' : ''} selected · Sundays can't be picked
      </Text>
    </View>
  );
}

type RoutineScope = 'today' | 'week' | 'month' | 'custom';

const WORKOUT_SECTION_LABELS: Record<string, string> = { warmup: 'Warm-up', workout: 'Workout', cooldown: 'Cool-down' };
const MEAL_SLOT_ORDER = ['morning_drink', 'breakfast', 'lunch', 'evening_snacks', 'dinner'];
const MEAL_SLOT_LABELS: Record<string, string> = {
  morning_drink: 'Morning Drink', breakfast: 'Breakfast', lunch: 'Lunch', evening_snacks: 'Evening Snacks', dinner: 'Dinner',
};

// Groups a routine's items for the preview — by section (Warm-up/Workout/
// Cool-down) for workout routines, or by meal slot for nutrition/supplement
// ones. Inferred straight from each item's own item_type/meal_slot rather
// than needing a separate domain prop threaded through the modal.
function groupRoutineItemsForPreview(items: RoutineTemplateItem[]): { label: string; items: RoutineTemplateItem[] }[] {
  const isWorkout = items.some(i => i.item_type === 'warmup' || i.item_type === 'workout' || i.item_type === 'cooldown');
  if (isWorkout) {
    return (['warmup', 'workout', 'cooldown'] as const)
      .map(type => ({ label: WORKOUT_SECTION_LABELS[type], items: items.filter(i => i.item_type === type) }))
      .filter(g => g.items.length > 0);
  }
  return MEAL_SLOT_ORDER
    .map(slot => ({ label: MEAL_SLOT_LABELS[slot], items: items.filter(i => i.meal_slot === slot) }))
    .filter(g => g.items.length > 0);
}

// ── Add Routine modal ────────────────────────────────────────────────────
// Step flow: pick a saved template -> pick a scope (today / week / month /
// custom dates) -> confirm -> apply. "Today" here means whichever day is
// currently open in the Workout Plan screen, not necessarily the literal
// calendar date, since that's the day the user has in view when they tap
// the button.
function AddRoutineModal({
  visible, onClose, templates, loadingTemplates, onApply, onDelete, applying, weekStart, selectedDay,
  itemLabel, emptyStateMessage,
}: {
  visible: boolean; onClose: () => void; templates: RoutineTemplate[]; loadingTemplates: boolean;
  onApply: (template: RoutineTemplate, targetDates: Date[]) => Promise<void>; onDelete: (id: string) => Promise<void>;
  applying: boolean; weekStart: string; selectedDay: number;
  itemLabel: string; emptyStateMessage: string;
}) {
  const [step, setStep] = useState<'list' | 'scope' | 'custom' | 'confirm'>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<RoutineTemplate | null>(null);
  const [scope, setScope] = useState<RoutineScope>('today');
  const [customDates, setCustomDates] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Computed live via the hook, not Dimensions.get() at module scope —
  // a module-level Dimensions.get() call is evaluated once when the JS
  // bundle first loads, before native window dimensions are reliably
  // established, and can silently capture a wrong value. useWindowDimensions
  // ties this to the actual render instead.
  const { height: windowHeight } = useWindowDimensions();
  const cardHeight = windowHeight * 0.82;

  // Incremented by Modal's onShow (fires once the modal is FULLY presented)
  // and used as the ScrollView's key. Content measured while the fade-in
  // presentation is still running can capture stale dimensions on Android
  // (statusBarTranslucent), leaving the scrollable range computed as ~zero
  // until some later incidental re-render fixes it — which is exactly the
  // "scroll only starts working after a minute" symptom. Remounting the
  // ScrollView on onShow forces a fresh measurement against the settled
  // window, immediately.
  const [showTick, setShowTick] = useState(0);

  function reset() {
    setStep('list'); setSelectedTemplate(null); setScope('today'); setCustomDates(new Set()); setExpandedIds(new Set());
  }
  function handleClose() { reset(); onClose(); }

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function useTemplate(t: RoutineTemplate) {
    setSelectedTemplate(t);
    setStep('scope');
  }

  function toggleCustomDate(dateStr: string) {
    setCustomDates(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr); else next.add(dateStr);
      return next;
    });
  }

  function computeScopeDates(): Date[] {
    const viewedDate = getDayDate(weekStart, selectedDay);
    if (scope === 'today') return [viewedDate];
    if (scope === 'week') {
      const dates: Date[] = [];
      for (let d = 1; d <= 6; d++) dates.push(getDayDate(weekStart, d));
      return dates;
    }
    if (scope === 'month') {
      const year = viewedDate.getFullYear(), month = viewedDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay  = new Date(year, month + 1, 0);
      const dates: Date[] = [];
      const firstMon = new Date(firstDay);
      const dow0 = firstMon.getDay();
      firstMon.setDate(firstMon.getDate() - (dow0 === 0 ? 6 : dow0 - 1));
      for (let mon = new Date(firstMon); mon <= lastDay; mon.setDate(mon.getDate() + 7)) {
        for (let d = 0; d < 6; d++) {
          const actual = addDaysToDate(mon, d);
          if (actual >= firstDay && actual <= lastDay) dates.push(actual);
        }
      }
      return dates;
    }
    // custom
    return Array.from(customDates).map(s => parseDateLocal(s));
  }

  async function handleConfirmApply() {
    if (!selectedTemplate) return;
    await onApply(selectedTemplate, computeScopeDates());
    handleClose();
  }

  const scopeDatesCount = step === 'confirm' ? computeScopeDates().length : 0;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={handleClose}
      onShow={() => setShowTick(t => t + 1)}
      statusBarTranslucent
    >
      <Pressable style={wg.backdrop} onPress={handleClose}>
        <Pressable style={[wg.card, { height: cardHeight }]}>
          <View style={wg.header}>
            <Text style={wg.title}>
              {step === 'list' ? '📂  Add Routine' : step === 'scope' ? selectedTemplate?.name ?? '' : step === 'custom' ? 'Pick dates' : 'Confirm'}
            </Text>
            {/* Temporary bundle-version marker — expo-updates applies a
                downloaded OTA only on the NEXT cold start, so testers are
                often unknowingly one bundle behind; this makes which code
                is actually running provable at a glance. Remove once the
                scroll fix is confirmed on-device. */}
            <Text style={{ color: THEME.colors.textMuted, fontSize: 9, fontFamily: THEME.fonts.sans, marginLeft: 'auto', marginRight: 10 }}>v5</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={wg.closeX}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={wg.divider} />

          {/* Canonical scroll-in-modal structure: the card has a definite
              pixel height (computed live via useWindowDimensions), so
              flex:1 here resolves against a known number. The showTick key
              remounts this ScrollView after the modal is fully presented —
              see the comment at the showTick state for why. */}
          <ScrollView
            key={`routine-scroll-${showTick}`}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 18 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {step === 'list' && (
              loadingTemplates ? (
                <ActivityIndicator color={THEME.colors.teal} style={{ marginVertical: 20 }} />
              ) : templates.length === 0 ? (
                <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.sans, textAlign: 'center', paddingVertical: 20 }}>
                  {emptyStateMessage}
                </Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {templates.map(t => {
                    const isExpanded = expandedIds.has(t.id);
                    return (
                      <View key={t.id} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <TouchableOpacity style={{ flex: 1 }} onPress={() => toggleExpanded(t.id)} activeOpacity={0.8}>
                            <Text style={{ color: THEME.colors.textPrimary, fontSize: 14, fontFamily: THEME.fonts.sansMedium }} numberOfLines={1}>{t.name}</Text>
                            <Text style={{ color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.sans, marginTop: 2 }}>
                              {t.items.length} {itemLabel}{t.items.length !== 1 ? 's' : ''}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => toggleExpanded(t.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.05)' }}
                            activeOpacity={0.8}
                          >
                            <Text style={{ color: THEME.colors.textSecondary, fontSize: 12, fontFamily: THEME.fonts.sansMedium }}>{isExpanded ? 'Hide' : 'View'}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => useTemplate(t)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: 'rgba(0,196,180,0.12)', borderWidth: 1, borderColor: THEME.colors.teal }}
                            activeOpacity={0.85}
                          >
                            <Text style={{ color: THEME.colors.teal, fontSize: 12, fontFamily: THEME.fonts.sansMedium }}>Use</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => Alert.alert('Delete routine', `Delete "${t.name}"? This can't be undone.`, [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', style: 'destructive', onPress: () => onDelete(t.id) },
                            ])}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={{ color: THEME.colors.textMuted, fontSize: 16 }}>🗑</Text>
                          </TouchableOpacity>
                        </View>

                        {isExpanded && (
                          <View style={{ marginTop: 12, paddingTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' }}>
                            {t.items.length === 0 ? (
                              <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.sans, paddingVertical: 10 }}>
                                No {itemLabel}s in this routine.
                              </Text>
                            ) : groupRoutineItemsForPreview(t.items).map((group, gIdx) => (
                              <View key={group.label}>
                                <Text style={{
                                  color: THEME.colors.teal, fontSize: 10.5, fontFamily: THEME.fonts.sansMedium,
                                  letterSpacing: 0.8, textTransform: 'uppercase', marginTop: gIdx === 0 ? 6 : 16, marginBottom: 4,
                                }}>
                                  {group.label}
                                </Text>
                                {group.items.map((item, idx) => {
                                  const detail = exerciseDetailLine(item);
                                  return (
                                    <View
                                      key={item.id ?? idx}
                                      style={{
                                        paddingVertical: 8,
                                        borderTopWidth: idx > 0 ? 1 : 0,
                                        borderTopColor: 'rgba(255,255,255,0.05)',
                                      }}
                                    >
                                      <Text style={{ color: THEME.colors.textPrimary, fontSize: 14, fontFamily: THEME.fonts.sansMedium, lineHeight: 19 }}>
                                        {item.item_name?.trim() ? item.item_name : '(no name saved)'}
                                      </Text>
                                      {detail && (
                                        <Text style={{ color: THEME.colors.textMuted, fontSize: 12.5, fontFamily: THEME.fonts.sans, marginTop: 3, lineHeight: 17 }}>
                                          {detail}
                                        </Text>
                                      )}
                                    </View>
                                  );
                                })}
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )
            )}

            {step === 'scope' && (
              <View style={{ gap: 10 }}>
                {([
                  { key: 'today' as const, label: 'This day only' },
                  { key: 'week'  as const, label: 'This week (Mon-Sat)' },
                  { key: 'month' as const, label: 'This month' },
                  { key: 'custom' as const, label: 'Custom dates…' },
                ]).map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={{
                      paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12,
                      backgroundColor: scope === opt.key ? 'rgba(0,196,180,0.1)' : THEME.colors.surface2,
                      borderWidth: 1, borderColor: scope === opt.key ? THEME.colors.teal : THEME.colors.border,
                    }}
                    onPress={() => {
                      setScope(opt.key);
                      if (opt.key === 'custom') setStep('custom'); else setStep('confirm');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: scope === opt.key ? THEME.colors.teal : THEME.colors.textPrimary, fontSize: 14, fontFamily: THEME.fonts.sansMedium }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {step === 'custom' && (
              <View style={{ gap: 14 }}>
                <RoutineMultiCalendar selectedDates={customDates} onToggleDate={toggleCustomDate} />
                <TouchableOpacity
                  style={[wg.gotItBtn, { margin: 0, opacity: customDates.size ? 1 : 0.5 }]}
                  disabled={!customDates.size}
                  onPress={() => setStep('confirm')}
                  activeOpacity={0.85}
                >
                  <Text style={wg.gotItText}>Continue with {customDates.size} date{customDates.size !== 1 ? 's' : ''}</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'confirm' && selectedTemplate && (
              <View style={{ gap: 14 }}>
                <Text style={{ color: THEME.colors.textPrimary, fontSize: 14, fontFamily: THEME.fonts.sans, lineHeight: 21 }}>
                  Apply <Text style={{ fontFamily: THEME.fonts.sansMedium }}>"{selectedTemplate.name}"</Text> ({selectedTemplate.items.length} {itemLabel}{selectedTemplate.items.length !== 1 ? 's' : ''}) to{' '}
                  <Text style={{ fontFamily: THEME.fonts.sansMedium }}>{scopeDatesCount} day{scopeDatesCount !== 1 ? 's' : ''}</Text>?
                </Text>
                <Text style={{ color: THEME.colors.textMuted, fontSize: 12.5, fontFamily: THEME.fonts.sans, lineHeight: 18 }}>
                  Any {itemLabel}s you added yourself on those days will be replaced. Anything your coach assigned is never touched. Dates already in the past are skipped automatically.
                </Text>
                <TouchableOpacity
                  style={[wg.gotItBtn, { margin: 0, opacity: applying ? 0.6 : 1 }]}
                  onPress={handleConfirmApply}
                  disabled={applying}
                  activeOpacity={0.85}
                >
                  {applying ? <ActivityIndicator color="#000" /> : <Text style={wg.gotItText}>Apply Routine</Text>}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

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

// Labeled numeric text input used in the food macro detail step
function NumberField({ label, value, onChange, placeholder, decimal = false, range }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; decimal?: boolean; range?: { min: number; max: number };
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: THEME.colors.textSecondary, fontSize: 11, fontFamily: THEME.fonts.sansMedium, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={(v) => onChange(decimal ? sanitizeDecimal(v) : sanitizeInteger(v))}
        onBlur={() => { if (range && value) onChange(String(clampToRange(Number(value), range))); }}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.3)"
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        maxLength={7}
        style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, borderWidth: 1, borderColor: THEME.colors.border }}
      />
    </View>
  );
}

// Strip trailing quantity suffixes like "(3 pcs)", "(1 bowl)", "(2 tbsp)" from
// food item names. Parentheticals that start with a letter are kept because
// they're clarifications: "(Rice Flour Roti)", "(with milk)", "(wheat)" etc.
function cleanFoodName(name: string): string {
  return name.replace(/\s*\(\d[^)]*\)/g, '').trim();
}

// ── Exercise filter helpers ───────────────────────────────────────────────
const EQUIP_FILTERS: { label: string; icon: string }[] = [
  { label: 'All',            icon: '⊞' },
  { label: 'Bodyweight',     icon: '🤸' },
  { label: 'Dumbbell',       icon: '🏋️' },
  { label: 'Barbell',        icon: '🪢' },
  { label: 'Machine',        icon: '⚙️' },
  { label: 'Resistance Band',icon: '📎' },
  { label: 'Kettlebell',     icon: '🔔' },
  { label: 'Suspension Band',icon: '🪝' },
  { label: 'Cardio',         icon: '🏃' },
];
const MUSCLE_FILTERS: { label: string; icon: string }[] = [
  { label: 'All',         icon: '💪' },
  { label: 'Chest',       icon: '🫁' },
  { label: 'Back',        icon: '🔙' },
  { label: 'Shoulders',   icon: '🔝' },
  { label: 'Biceps',      icon: '💪' },
  { label: 'Triceps',     icon: '〽️' },
  { label: 'Abdominals',  icon: '🎯' },
  { label: 'Quads',       icon: '🦵' },
  { label: 'Hamstrings',  icon: '🦿' },
  { label: 'Glutes',      icon: '🍑' },
  { label: 'Calves',      icon: '🦶' },
  { label: 'Cardio',      icon: '❤️' },
];

function inferEquipment(name: string): string {
  if (/kettlebell/.test(name)) return 'Kettlebell';
  if (/barbell/.test(name)) return 'Barbell';
  if (/dumbbell/.test(name)) return 'Dumbbell';
  if (/suspension band|trx/.test(name)) return 'Suspension Band';
  if (/\bresistance band\b|\bband\b/.test(name)) return 'Resistance Band';
  if (/\bcable\b|leg press|chest press machine|seated row|lat pull|pull.down|machine/.test(name)) return 'Machine';
  if (/treadmill|elliptical|rowing machine|stationary bike|recumbent bike|stair climbing|jump rope|sprint|jogging|running|walk|cycling|swimming|dance|zumba|hiit circuit/.test(name)) return 'Cardio';
  return 'Bodyweight';
}

function inferMuscles(name: string): string[] {
  const muscles: string[] = [];
  if (/chest|push.up|press|fly|pec/.test(name)) muscles.push('Chest');
  if (/row|pull|lat|back|deadlift|rdl|hinge|chin.up|pull.up/.test(name)) muscles.push('Back');
  if (/shoulder|lateral raise|overhead|military|face pull|band pull/.test(name)) muscles.push('Shoulders');
  if (/bicep|curl(?!.*leg)/.test(name)) muscles.push('Biceps');
  if (/tricep|dip|skull|extension/.test(name)) muscles.push('Triceps');
  if (/crunch|plank|ab|core|dead bug|bird dog|woodchop|oblique/.test(name)) muscles.push('Abdominals');
  if (/squat|lunge|leg press|step.up|quad|knee extension/.test(name)) muscles.push('Quads');
  if (/hamstring|leg curl|nordic|glute bridge|hip hinge/.test(name)) muscles.push('Hamstrings');
  if (/glute|hip abduction|clamshell|hip thrust|donkey/.test(name)) muscles.push('Glutes');
  if (/calf|heel raise|calf raise/.test(name)) muscles.push('Calves');
  if (/treadmill|elliptical|rowing machine|stationary bike|recumbent bike|stair climbing|jump rope|sprint|jogging|running|walk|cycling|swimming|dance|zumba|hiit|cardio/.test(name)) muscles.push('Cardio');
  return muscles.length ? muscles : ['Full Body'];
}

// Name-based heuristic (same approach as inferEquipment/inferMuscles above)
// — no food item is hand-tagged veg/non-veg today, so this infers it from
// the dish name instead of retrofitting a field across ~900 lines of
// existing curated data. Expects an already-lowercased name.
function isNonVegFood(name: string): boolean {
  return /\b(chicken|mutton|fish|eggs?|prawns?|shrimp|keema|meat|lamb|beef|pork|tuna|salmon|crab)\b/.test(name);
}

// ── Add Exercise Modal ──────────────────────────────────────────────────
// "+" flow for manually-tracked sections (warmup, for now). Two entry
// points — pick from the curated library or type your own — then a shared
// detail form for Sets / Reps / Side / Hold / Rest before inserting.
const SIDE_OPTIONS: { value: ExerciseSide; label: string }[] = [
  { value: 'na',       label: 'N/A' },
  { value: 'right',    label: 'Right' },
  { value: 'left',     label: 'Left' },
  { value: 'both',     label: 'Both' },
  { value: 'rotation', label: 'Rotation' },
];

// Slider data — Reps and Hold have '—' at index 0 meaning "not set"
const SETS_ITEMS = Array.from({ length: 10 }, (_, i) => String(i + 1));           // 1–10
const REPS_ITEMS = ['—', ...Array.from({ length: 50 }, (_, i) => String(i + 1))]; // —,1–50
const HOLD_ITEMS = ['—', ...Array.from({ length: 51 }, (_, i) => String(i + 10))]; // —,10–60
const REST_ITEMS = Array.from({ length: 51 }, (_, i) => String(i + 10));           // 10–60

// Stepper: [ − ]  value  [ + ] with hold-to-repeat
function Stepper({
  items, selectedIndex, onChange, label,
}: {
  items: string[]; selectedIndex: number; onChange: (i: number) => void;
  label: string;
}) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  function startStep(delta: number) {
    let cur = Math.max(0, Math.min(items.length - 1, selectedIndex + delta));
    onChange(cur);
    intervalRef.current = setInterval(() => {
      cur = Math.max(0, Math.min(items.length - 1, cur + delta));
      onChange(cur);
    }, 120);
  }

  function stopStep() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }

  const atStart = selectedIndex === 0;
  const atEnd   = selectedIndex === items.length - 1;
  const value   = items[selectedIndex];

  return (
    <View style={{ flex: 1 }}>
      <Text style={aem.fieldLabel}>{label}</Text>
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12, borderWidth: 1, borderColor: THEME.colors.border,
        paddingVertical: 6,
      }}>
        <TouchableOpacity
          onPressIn={() => !atStart && startStep(-1)}
          onPressOut={stopStep}
          disabled={atStart}
          style={{ paddingHorizontal: 16, paddingVertical: 10 }}
          activeOpacity={0.6}
        >
          <Text style={{ fontSize: 22, color: atStart ? 'rgba(255,255,255,0.15)' : THEME.colors.teal, lineHeight: 26 }}>−</Text>
        </TouchableOpacity>

        <View style={{ alignItems: 'center', minWidth: 52 }}>
          <Text style={{
            fontSize: 22, fontFamily: THEME.fonts.sansSemibold,
            color: THEME.colors.teal,
          }}>
            {value}
          </Text>
          <View style={{ width: 24, height: 2, backgroundColor: THEME.colors.teal, borderRadius: 1, marginTop: 3, opacity: 0.6 }} />
        </View>

        <TouchableOpacity
          onPressIn={() => !atEnd && startStep(1)}
          onPressOut={stopStep}
          disabled={atEnd}
          style={{ paddingHorizontal: 16, paddingVertical: 10 }}
          activeOpacity={0.6}
        >
          <Text style={{ fontSize: 22, color: atEnd ? 'rgba(255,255,255,0.15)' : THEME.colors.teal, lineHeight: 26 }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// NumberSlider: ‹ 5 6 [7] 8 9 › — used for Sets & Reps where narrow slots show single digits
const SLIDER_VISIBLE = 5;
const SLIDER_HALF    = 2;

function NumberSlider({
  items, selectedIndex, onChange, label,
}: {
  items: string[]; selectedIndex: number; onChange: (i: number) => void;
  label: string;
}) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  function startStep(delta: number) {
    let cur = Math.max(0, Math.min(items.length - 1, selectedIndex + delta));
    onChange(cur);
    intervalRef.current = setInterval(() => {
      cur = Math.max(0, Math.min(items.length - 1, cur + delta));
      onChange(cur);
    }, 100);
  }

  function stopStep() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }

  const atStart = selectedIndex === 0;
  const atEnd   = selectedIndex === items.length - 1;

  const slots = Array.from({ length: SLIDER_VISIBLE }, (_, i) => {
    const idx = selectedIndex - SLIDER_HALF + i;
    return { idx, val: idx >= 0 && idx < items.length ? items[idx] : null };
  });

  return (
    <View style={{ flex: 1 }}>
      <Text style={aem.fieldLabel}>{label}</Text>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12, borderWidth: 1, borderColor: THEME.colors.border,
        paddingVertical: 2,
      }}>
        <TouchableOpacity
          onPressIn={() => !atStart && startStep(-1)}
          onPressOut={stopStep}
          disabled={atStart}
          style={{ paddingHorizontal: 10, paddingVertical: 12 }}
          activeOpacity={0.6}
        >
          <Text style={{ fontSize: 18, color: atStart ? 'rgba(255,255,255,0.12)' : THEME.colors.teal }}>‹</Text>
        </TouchableOpacity>

        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          {slots.map(({ idx, val }, pos) => {
            const dist     = Math.abs(pos - SLIDER_HALF);
            const isCenter = pos === SLIDER_HALF;
            const display  = val ?? '';
            return (
              <TouchableOpacity
                key={pos}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}
                onPress={() => val !== null && onChange(idx)}
                activeOpacity={0.65}
                disabled={val === null}
              >
                <Text style={{
                  fontSize:   isCenter ? 18 : dist === 1 ? 14 : 11,
                  fontFamily: isCenter ? THEME.fonts.sansSemibold : THEME.fonts.sans,
                  color:      isCenter ? THEME.colors.teal : THEME.colors.textMuted,
                  opacity:    isCenter ? 1 : dist === 1 ? 0.5 : 0.25,
                }}>
                  {display}
                </Text>
                {isCenter && (
                  <View style={{ width: 20, height: 2, backgroundColor: THEME.colors.teal, borderRadius: 1, marginTop: 3, opacity: 0.7 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPressIn={() => !atEnd && startStep(1)}
          onPressOut={stopStep}
          disabled={atEnd}
          style={{ paddingHorizontal: 10, paddingVertical: 12 }}
          activeOpacity={0.6}
        >
          <Text style={{ fontSize: 18, color: atEnd ? 'rgba(255,255,255,0.12)' : THEME.colors.teal }}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

type SupplementScope = 'today' | 'week' | 'month';

// ── Grouped breakfast item type used in review step ──────────────────────────
interface ReviewItem {
  name: string;
  quantity: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

function AddExerciseModal({ visible, onClose, onAddDone, sectionColor, sectionLabel, kind, library, onAdd, initialCravingMode = false, initialMealSlot }: {
  visible: boolean; onClose: () => void; onAddDone?: () => void; sectionColor: string; sectionLabel: string;
  kind: 'exercise' | 'food' | 'supplement'; library: (WarmupExerciseDefault | FoodItemDefault | SupplementItemDefault)[]; onAdd: (payload: any) => Promise<void>;
  initialCravingMode?: boolean;
  // Food only — which of the 5 meal-time sections this modal instance was opened
  // from. Just the default for the in-modal section picker below, not a lock —
  // the client can still choose a different section to save the item into.
  initialMealSlot?: string;
}) {
  const isBreakfast = kind === 'food' && sectionLabel === 'Breakfast';
  const isLunch     = kind === 'food' && sectionLabel === 'Lunch';
  const isDinner    = kind === 'food' && sectionLabel === 'Dinner';
  const isGrouped   = isBreakfast || isLunch || isDinner;

  // Confession Booth also starts at 'choice' now — "Log a craving" (the
  // curated CRAVING_GROUPS list) is just one of its choice cards alongside
  // My List and Write manually, same shape as the other food sections.
  const initialStep = kind === 'supplement' ? 'scope' : 'choice';
  const [step, setStep] = useState<'scope' | 'choice' | 'grouped' | 'review' | 'list' | 'mylist' | 'detail'>(initialStep);
  // Veg/non-veg — defaults to hiding non-veg for a client whose profile says
  // veg, but stays a toggle (not a hard filter) so they can still see
  // everything if they want to log something outside their usual diet.
  const dietType = useAuthStore((s) => s.profile)?.diet_type;
  const [showNonVeg, setShowNonVeg] = useState(dietType !== 'veg');
  // craving mode: set by ConfessionBoothSection, uses CRAVING_GROUPS and stores as meal_slot='craving'
  const [cravingMode, setCravingMode] = useState(initialCravingMode);
  const activeGroups = cravingMode ? CRAVING_GROUPS : isDinner ? DINNER_GROUPS : isLunch ? LUNCH_GROUPS : BREAKFAST_GROUPS;
  const [scope, setScope] = useState<SupplementScope>('today');
  // Manual entry / My List from Confession Booth can still choose to stay a
  // craving OR reassign to one of the 5 real meal-time sections — the extra
  // "Craving" pill only makes sense when opened from Confession Booth.
  const mealSlotOptions = cravingMode
    ? [{ key: 'craving', label: 'Craving', icon: '🙈', color: '#F97316' }, ...FOOD_SLOTS]
    : FOOD_SLOTS;
  // Food only — which of the mealSlotOptions a manually-entered / My List
  // item actually gets saved to, independent of which section's "+" opened
  // this modal. myListTab is the horizontal-tab filter on the My List step,
  // also food-only.
  const [mealSlotChoice, setMealSlotChoice] = useState(initialCravingMode ? 'craving' : (initialMealSlot ?? FOOD_SLOTS[0].key));
  const [myListTab, setMyListTab] = useState(initialCravingMode ? 'craving' : (initialMealSlot ?? FOOD_SLOTS[0].key));
  const [search, setSearch] = useState('');
  const [filterEquip, setFilterEquip] = useState('All');
  const [filterMuscle, setFilterMuscle] = useState('All');
  const [name, setName]   = useState('');
  // Exercise drum-picker indices
  const [setsIdx, setSetsIdx] = useState(0); // 0 → sets=1
  const [repsIdx, setRepsIdx] = useState(0); // 0 → '—' (not set)
  const [side, setSide]           = useState<ExerciseSide>('na');
  const [allowRotation, setAllowRotation] = useState(false);
  const [holdIdx, setHoldIdx] = useState(0); // 0 → '—' (not set)
  const [restIdx, setRestIdx] = useState(0); // 0 → rest=10s
  // Single food fields (manual / non-breakfast path)
  const [quantity, setQuantity] = useState('');
  // Quantity counter — populated when picking from library
  const [qtyCount, setQtyCountRaw] = useState(1);
  const [qtyUnit,  setQtyUnit]     = useState('');    // e.g. 'piece', 'cup', 'ml', 'tbsp'
  const [qtyBase,  setQtyBase]     = useState(1);     // always 1 (macros are per-unit)
  // Per-unit macros — set when food is picked from library; used to scale with qty
  const [baseCalories, setBaseCalories] = useState(0);
  const [baseProtein,  setBaseProtein]  = useState(0);
  const [baseCarbs,    setBaseCarbs]    = useState(0);
  const [baseFat,      setBaseFat]      = useState(0);
  const [calories, setCalories] = useState('');
  const [protein, setProtein]   = useState('');
  const [carbs, setCarbs]       = useState('');
  const [fat, setFat]           = useState('');
  const [submitting, setSubmitting] = useState(false);

  // "My List" — a client's own remembered manual exercises (shared across
  // Warmup/Workout/Cooldown). enteredManually distinguishes a fresh manual
  // entry (which gets saved to My List on submit) from picking an existing
  // item off a list (curated or My List), which shouldn't re-save itself.
  const { data: myCustomExercises = [] } = useMyCustomExercises(kind === 'exercise');
  const { mutate: saveCustomExercise } = useSaveCustomExercise();
  // Same idea as My List for exercises, for food/supplement — separate table
  // since their shape (name + quantity, food adds macros) doesn't overlap
  // with exercise's sets/reps/side/hold/rest.
  const { data: myCustomItems = [] } = useMyCustomItems(
    kind === 'supplement' ? 'supplement' : 'food',
    kind === 'food' || kind === 'supplement',
  );
  const { mutate: saveCustomItem } = useSaveCustomItem();
  const [enteredManually, setEnteredManually] = useState(false);
  // Multi-select — checked items on the 'list'/'mylist' steps, added in one
  // batch with their library/My-List defaults rather than one at a time.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Grouped breakfast state ─────────────────────────────────────────────────
  // Per group: selected item + its inline quantity (editable before review)
  // All sections start collapsed — nothing pre-expanded by default.
  const defaultGroupOpen = () => Object.fromEntries(activeGroups.map((g) => [g.key, false]));
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>(defaultGroupOpen);
  const [groupSelected, setGroupSelected] = useState<Record<string, BreakfastItem | LunchItem | DinnerItem | CravingItem | null>>({});
  const [groupQty, setGroupQty] = useState<Record<string, number>>({});
  // Review step: array of items with editable macros
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  // Cross-section search for the grouped picker — filters items within
  // every section at once so the user doesn't have to guess which
  // section a dish lives under.
  const [groupSearch, setGroupSearch] = useState('');

  function reset() {
    setStep(kind === 'supplement' ? 'scope' : 'choice');
    setScope('today'); setSearch(''); setFilterEquip('All'); setFilterMuscle('All'); setName('');
    setSetsIdx(0); setRepsIdx(0); setSide('na'); setAllowRotation(false); setHoldIdx(0); setRestIdx(0);
    setQuantity(''); setQtyCountRaw(1); setQtyUnit(''); setQtyBase(1);
    setBaseCalories(0); setBaseProtein(0); setBaseCarbs(0); setBaseFat(0);
    setCalories(''); setProtein(''); setCarbs(''); setFat('');
    setCravingMode(initialCravingMode);
    setGroupOpen(defaultGroupOpen());
    setGroupSelected({});
    setGroupQty({});
    setReviewItems([]);
    setGroupSearch('');
    setEnteredManually(false);
    setSelectedIds(new Set());
    setMealSlotChoice(initialCravingMode ? 'craving' : (initialMealSlot ?? FOOD_SLOTS[0].key));
    setMyListTab(initialCravingMode ? 'craving' : (initialMealSlot ?? FOOD_SLOTS[0].key));
  }

  // Reset fully whenever modal becomes visible so stale selections don't persist
  useEffect(() => { if (visible) reset(); }, [visible]);

  function handleClose() { reset(); onClose(); }

  // Stepper for qty: updates qty display + auto-scales macros
  const QTY_STEP = qtyUnit === 'ml' ? 50 : qtyUnit === 'g' ? 25 : 1;
  const QTY_MAX  = qtyUnit === 'ml' ? 1000 : qtyUnit === 'g' ? 500 : 20;
  const QTY_MIN  = qtyUnit === 'ml' ? 50   : qtyUnit === 'g' ? 25  : 1;

  function setQtyCount(newQty: number) {
    const clamped = Math.max(QTY_MIN, Math.min(QTY_MAX, newQty));
    setQtyCountRaw(clamped);
    if (baseCalories > 0) {
      setQuantity(`${clamped} ${qtyUnit}`);
      setCalories(String(Math.round(baseCalories * clamped)));
      setProtein(String(parseFloat((baseProtein * clamped).toFixed(1))));
      setCarbs(String(parseFloat((baseCarbs * clamped).toFixed(1))));
      setFat(String(parseFloat((baseFat * clamped).toFixed(1))));
    }
  }

  function fmtQtyLabel(qty: number, unit: string): string {
    const noPlural = ['ml', 'g', 'tbsp', 'tsp'];
    if (noPlural.includes(unit)) return `${qty} ${unit}`;
    return qty === 1 ? `${qty} ${unit}` : `${qty} ${unit}s`;
  }


  function pickFromLibrary(ex: WarmupExerciseDefault | FoodItemDefault | SupplementItemDefault) {
    setEnteredManually(false);
    setName(kind === 'food' ? cleanFoodName(ex.name) : ex.name);
    if (kind === 'food') {
      const f = ex as FoodItemDefault;
      const unit = f.qtyUnit ?? 'serving';
      const initQty = unit === 'ml' ? 50 : unit === 'g' ? 25 : 1;
      setQtyUnit(unit);
      setQtyBase(1);
      setQtyCountRaw(initQty);
      setBaseCalories(f.defaultCalories);
      setBaseProtein(f.defaultProteinG);
      setBaseCarbs(f.defaultCarbsG);
      setBaseFat(f.defaultFatG);
      setQuantity(`${initQty} ${unit}`);
      setCalories(String(Math.round(f.defaultCalories * initQty)));
      setProtein(String(Math.round(f.defaultProteinG * initQty)));
      setCarbs(String(Math.round(f.defaultCarbsG * initQty)));
      setFat(String(Math.round(f.defaultFatG * initQty)));
    } else if (kind === 'supplement') {
      const s = ex as SupplementItemDefault;
      setQuantity(s.defaultQuantity);
    } else {
      const e = ex as WarmupExerciseDefault;
      setSetsIdx(Math.max(0, Math.min(9, e.defaultSets - 1)));
      // REPS_ITEMS[0]='—', REPS_ITEMS[N]=String(N) for N 1-50
      setRepsIdx(e.defaultReps != null ? Math.max(0, Math.min(50, e.defaultReps)) : 0);
      setSide(e.defaultSide);
      setAllowRotation(e.defaultSide === 'rotation');
      // HOLD_ITEMS[0]='—', HOLD_ITEMS[k]=String(k+9) for k 1-51
      setHoldIdx(e.defaultHoldSecs != null ? Math.max(0, Math.min(51, e.defaultHoldSecs - 9)) : 0);
      setRestIdx(Math.max(0, Math.min(50, e.defaultRestSecs - 10)));
    }
    setStep('detail');
  }

  // Picking a saved item off "My List" — same idea as pickFromLibrary, just
  // sourced from the client's own remembered exercises instead of the
  // curated library. Doesn't re-trigger a My List save (enteredManually
  // stays false), since it's already on the list.
  function pickFromMyList(ce: CustomExercise) {
    setEnteredManually(false);
    setName(ce.name);
    setSetsIdx(Math.max(0, Math.min(9, ce.default_sets - 1)));
    setRepsIdx(ce.default_reps != null ? Math.max(0, Math.min(50, ce.default_reps)) : 0);
    setSide(ce.default_side);
    setAllowRotation(ce.default_side === 'rotation');
    setHoldIdx(ce.default_hold_secs != null ? Math.max(0, Math.min(51, ce.default_hold_secs - 9)) : 0);
    setRestIdx(Math.max(0, Math.min(50, ce.default_rest_secs - 10)));
    setStep('detail');
  }

  // Same idea as pickFromMyList, for food/supplement — sourced from
  // client_custom_items instead of client_custom_exercises.
  function pickFromMyListItem(item: CustomItem) {
    setEnteredManually(false);
    setName(item.name);
    if (kind === 'food') {
      setQtyUnit(''); // free-text quantity, like manual entry — not a library stepper unit
      setQuantity(item.quantity ?? '');
      setCalories(item.calories != null ? String(item.calories) : '');
      setProtein(item.protein_g != null ? String(item.protein_g) : '');
      setCarbs(item.carbs_g != null ? String(item.carbs_g) : '');
      setFat(item.fat_g != null ? String(item.fat_g) : '');
      setMealSlotChoice(item.meal_slot ?? myListTab);
    } else {
      setQuantity(item.quantity ?? '');
    }
    setStep('detail');
  }

  function startManual() {
    setEnteredManually(true);
    setName(''); setSetsIdx(0); setRepsIdx(0); setSide('na'); setAllowRotation(false); setHoldIdx(0); setRestIdx(0);
    setQuantity(''); setQtyCountRaw(1); setQtyUnit(''); setQtyBase(1);
    setBaseCalories(0); setBaseProtein(0); setBaseCarbs(0); setBaseFat(0);
    setCalories(''); setProtein(''); setCarbs(''); setFat('');
    setStep('detail');
  }

  // Toggle a row's checkbox on the 'list'/'mylist' steps — independent of
  // tapping the row itself, which still jumps straight into single-item
  // detail (pickFromLibrary/pickFromMyList). Both affordances coexist.
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Batch-add every checked item at once, using each one's own default
  // sets/reps/side/hold/rest — no per-item review screen (can still be
  // tweaked afterward in the day's checklist), matching "instead of opening
  // each and every exercise."
  async function handleBatchAdd(items: { name: string; sets: number; reps: number | null; side: ExerciseSide; holdSecs: number | null; restSecs: number }[]) {
    setSubmitting(true);
    try {
      for (const item of items) {
        await onAdd({
          itemName: item.name,
          sets: item.sets,
          reps: item.reps,
          side: item.side === 'na' ? null : item.side,
          holdSecs: item.holdSecs,
          restSecs: item.restSecs,
        });
      }
      reset(); onAddDone?.();
    } catch (err: any) {
      Alert.alert('Could not add', err?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Same idea as handleBatchAdd, for food/supplement My List items — no
  // per-item review screen, each added with its own saved quantity/macros.
  async function handleBatchAddItems(items: CustomItem[]) {
    setSubmitting(true);
    try {
      for (const item of items) {
        if (kind === 'food') {
          await onAdd({
            itemName: item.name,
            quantity: item.quantity ?? null,
            calories: item.calories,
            proteinG: item.protein_g,
            carbsG: item.carbs_g,
            fatG: item.fat_g,
            mealSlot: myListTab,
          });
        } else {
          await onAdd({
            itemName: item.name,
            quantity: item.quantity ?? null,
            scope,
          });
        }
      }
      reset(); onAddDone?.();
    } catch (err: any) {
      Alert.alert('Could not add', err?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Grouped meal helpers (shared by Breakfast + Lunch) ─────────────────────
  function selectGroupItem(groupKey: string, item: BreakfastItem | LunchItem | DinnerItem | CravingItem) {
    const alreadySelected = groupSelected[groupKey]?.id === item.id;
    setGroupSelected(prev => ({ ...prev, [groupKey]: alreadySelected ? null : item }));
    if (!alreadySelected) {
      const unit = (item as BreakfastItem).qtyUnit ?? 'serving';
      const initQty = unit === 'ml' ? 50 : unit === 'g' ? 25 : 1;
      setGroupQty(prev => ({ ...prev, [groupKey]: initQty }));
    }
  }

  function stepGroupQty(groupKey: string, item: BreakfastItem | LunchItem | DinnerItem | CravingItem, delta: number) {
    const unit = (item as BreakfastItem).qtyUnit ?? 'serving';
    const step = unit === 'ml' ? 50 : unit === 'g' ? 25 : 1;
    const min  = unit === 'ml' ? 50 : unit === 'g' ? 25 : 1;
    const max  = unit === 'ml' ? 1000 : unit === 'g' ? 500 : 20;
    setGroupQty(prev => ({
      ...prev,
      [groupKey]: Math.max(min, Math.min(max, (prev[groupKey] ?? min) + delta)),
    }));
  }

  function goToReview() {
    const selected = activeGroups
      .map(g => {
        const item = groupSelected[g.key];
        if (!item) return null;
        const unit = (item as BreakfastItem).qtyUnit ?? 'serving';
        const qty  = groupQty[g.key] ?? (unit === 'ml' ? 50 : unit === 'g' ? 25 : 1);
        const scale = qty; // qtyBase is always 1, so scale = qty × 1
        return {
          name: cleanFoodName(item.name),
          quantity: fmtQtyLabel(qty, unit),
          calories: String(Math.round(item.defaultCalories * scale)),
          protein:  String(parseFloat((item.defaultProteinG * scale).toFixed(1))),
          carbs:    String(parseFloat((item.defaultCarbsG   * scale).toFixed(1))),
          fat:      String(parseFloat((item.defaultFatG     * scale).toFixed(1))),
        } as ReviewItem;
      })
      .filter(Boolean) as ReviewItem[];
    if (selected.length === 0) {
      Alert.alert('Nothing selected', 'Select at least one item from any section.');
      return;
    }
    setReviewItems(selected);
    setStep('review');
  }

  function updateReviewItem(idx: number, field: keyof ReviewItem, val: string) {
    setReviewItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  }

  // ── Submit handlers ─────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!name.trim()) { Alert.alert('Add a name', `Please enter ${kind === 'food' ? 'a food' : kind === 'supplement' ? 'a supplement' : 'an exercise'} name.`); return; }
    setSubmitting(true);
    try {
      if (kind === 'food') {
        const calNum = calories ? Number(calories) : null;
        const proteinNum = protein ? Number(protein) : null;
        const carbsNum = carbs ? Number(carbs) : null;
        const fatNum = fat ? Number(fat) : null;
        await onAdd({
          itemName: name.trim(),
          quantity: quantity.trim() || null,
          calories: calNum,
          proteinG: proteinNum,
          carbsG:   carbsNum,
          fatG:     fatNum,
          mealSlot: mealSlotChoice,
        });
        // A fresh manual entry gets remembered in "My List" for next time —
        // best-effort, shouldn't block or fail today's log if it errors.
        if (enteredManually) {
          saveCustomItem(
            { kind: 'food', name: name.trim(), quantity: quantity.trim() || null, calories: calNum, proteinG: proteinNum, carbsG: carbsNum, fatG: fatNum, mealSlot: mealSlotChoice },
            { onError: () => {} }
          );
        }
      } else if (kind === 'supplement') {
        await onAdd({
          itemName: name.trim(),
          quantity: quantity.trim() || null,
          scope,
        });
        if (enteredManually) {
          saveCustomItem(
            { kind: 'supplement', name: name.trim(), quantity: quantity.trim() || null },
            { onError: () => {} }
          );
        }
      } else {
        const reps     = repsIdx > 0 ? repsIdx : null;          // idx 0 = '—' = not set
        const holdSecs = holdIdx > 0 ? holdIdx + 9 : null;      // idx 0 = '—'; idx k → k+9 secs
        const restSecs = restIdx + 10;                          // always 10–60s
        await onAdd({
          itemName: name.trim(),
          sets:     setsIdx + 1,
          reps,
          side:     side === 'na' ? null : side,
          holdSecs,
          restSecs,
        });
        // A fresh manual entry gets remembered in "My List" for next time —
        // best-effort, shouldn't block or fail today's log if it errors.
        if (enteredManually) {
          saveCustomExercise(
            { name: name.trim(), sets: setsIdx + 1, reps, side, holdSecs, restSecs },
            { onError: () => {} }
          );
        }
      }
      reset(); onAddDone?.();
    } catch (err: any) {
      Alert.alert('Could not add', err?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReviewSubmit() {
    setSubmitting(true);
    try {
      for (const item of reviewItems) {
        await onAdd({
          itemName: item.name,
          quantity: item.quantity || null,
          calories: item.calories ? Number(item.calories) : null,
          proteinG: item.protein  ? Number(item.protein)  : null,
          carbsG:   item.carbs    ? Number(item.carbs)    : null,
          fatG:     item.fat      ? Number(item.fat)      : null,
        });
      }
      reset(); onAddDone?.();
    } catch (err: any) {
      Alert.alert('Could not add', err?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const libraryHasNonVeg = kind === 'food' && library.some((e) => isNonVegFood(e.name.toLowerCase()));

  const filtered = library.filter(e => {
    const n = e.name.toLowerCase();
    if (search.trim() && !n.includes(search.trim().toLowerCase())) return false;
    if (kind === 'exercise') {
      if (filterEquip !== 'All' && inferEquipment(n) !== filterEquip) return false;
      if (filterMuscle !== 'All' && !inferMuscles(n).includes(filterMuscle)) return false;
    }
    if (kind === 'food' && !showNonVeg && isNonVegFood(n)) return false;
    return true;
  });

  const filteredMyList = myCustomExercises.filter((ce) =>
    !search.trim() || ce.name.toLowerCase().includes(search.trim().toLowerCase())
  );
  const filteredMyItems = myCustomItems.filter((it) =>
    (kind !== 'food' || it.meal_slot === myListTab)
    && (!search.trim() || it.name.toLowerCase().includes(search.trim().toLowerCase()))
  );

  const noun = kind === 'food' ? 'food' : kind === 'supplement' ? 'supplement' : 'exercise';
  const nounPlural = noun === 'food' ? 'foods' : noun === 'supplement' ? 'supplements' : 'exercises';
  const nounTitleCase = noun === 'food' ? 'Food' : noun === 'supplement' ? 'Supplement' : 'Exercise';

  const selectedCount = activeGroups.filter(g => groupSelected[g.key]).length;

  function titleFor() {
    if (step === 'scope')   return 'Add supplement';
    if (step === 'grouped') return cravingMode ? 'The Confession Booth 🙈' : isDinner ? 'Build your dinner' : isLunch ? 'Build your lunch' : 'Build your breakfast';
    if (step === 'review')  return cravingMode ? 'Own it. We\'re judging... lovingly.' : `Review ${reviewItems.length} item${reviewItems.length > 1 ? 's' : ''}`;

    if (step === 'choice')  return `Add to ${sectionLabel}`;
    if (step === 'list')    return `Choose a ${noun}`;
    if (step === 'mylist')  return 'My List';
    return name || `${nounTitleCase} details`;
  }

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
      <Pressable style={aem.backdrop} onPress={handleClose}>
        <Pressable style={aem.sheet}>
          <View style={aem.handle} />
          <View style={aem.header}>
            <Text style={aem.title}>{titleFor()}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={aem.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── Scope (supplements) ────────────────────────────────────────── */}
          {step === 'scope' && (
            <View style={{ paddingTop: 6 }}>
              <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
                Add this supplement for:
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                {([
                  { key: 'today', label: 'Today',  icon: '📅', sub: 'Just today' },
                  { key: 'week',  label: 'Week',   icon: '🗓️', sub: 'All 6 days this week' },
                  { key: 'month', label: 'Month',  icon: '📆', sub: 'Every day this month' },
                ] as { key: SupplementScope; label: string; icon: string; sub: string }[]).map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => setScope(opt.key)}
                    style={{
                      flex: 1, padding: 14, borderRadius: 12, alignItems: 'center',
                      borderWidth: 1.5,
                      borderColor: scope === opt.key ? sectionColor : THEME.colors.border,
                      backgroundColor: scope === opt.key ? `${sectionColor}18` : THEME.colors.surface2,
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 22, marginBottom: 6 }}>{opt.icon}</Text>
                    <Text style={{ fontFamily: THEME.fonts.sansMedium, fontSize: 13, color: scope === opt.key ? sectionColor : THEME.colors.textPrimary }}>
                      {opt.label}
                    </Text>
                    <Text style={{ fontFamily: THEME.fonts.sans, fontSize: 11, color: THEME.colors.textMuted, marginTop: 2, textAlign: 'center' }}>
                      {opt.sub}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[aem.choiceCard, { borderColor: sectionColor }]} onPress={() => setStep('list')} activeOpacity={0.85}>
                <Text style={aem.choiceIcon}>📋</Text>
                <View style={{ flex: 1 }}>
                  <Text style={aem.choiceTitle}>Select from list</Text>
                  <Text style={aem.choiceSub}>Choose from {library.length} curated supplement items</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[aem.choiceCard, { borderColor: sectionColor, marginTop: 10 }]} onPress={() => setStep('mylist')} activeOpacity={0.85}>
                <Text style={aem.choiceIcon}>⭐</Text>
                <View style={{ flex: 1 }}>
                  <Text style={aem.choiceTitle}>My List</Text>
                  <Text style={aem.choiceSub}>
                    {myCustomItems.length > 0
                      ? `${myCustomItems.length} supplement${myCustomItems.length > 1 ? 's' : ''} you've added before`
                      : "Supplements you type manually will be saved here"}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[aem.choiceCard, { borderColor: sectionColor, marginTop: 10 }]} onPress={startManual} activeOpacity={0.85}>
                <Text style={aem.choiceIcon}>✏️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={aem.choiceTitle}>Write manually</Text>
                  <Text style={aem.choiceSub}>Type your own supplement name</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Choice ────────────────────────────────────────────────────── */}
          {step === 'choice' && (
            <View style={{ gap: 12, paddingTop: 6 }}>
              {cravingMode && (
                <TouchableOpacity style={[aem.choiceCard, { borderColor: sectionColor }]} onPress={() => setStep('grouped')} activeOpacity={0.85}>
                  <Text style={aem.choiceIcon}>🙈</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={aem.choiceTitle}>Log a craving</Text>
                    <Text style={aem.choiceSub}>Pick from {activeGroups.length} sections — sweet, savory, fried, drinks &amp; more</Text>
                  </View>
                </TouchableOpacity>
              )}
              {!cravingMode && isGrouped && (
                <TouchableOpacity style={[aem.choiceCard, { borderColor: sectionColor }]} onPress={() => setStep('grouped')} activeOpacity={0.85}>
                  <Text style={aem.choiceIcon}>{isDinner ? '🌙' : isLunch ? '🍛' : '🍽️'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={aem.choiceTitle}>{isDinner ? 'Build my dinner' : isLunch ? 'Build my lunch' : 'Build my breakfast'}</Text>

                    <Text style={aem.choiceSub}>
                      {isDinner
                        ? `Pick from ${activeGroups.length} sections — carb base, protein/curry, veg side, salad, accompaniments`
                        : isLunch
                        ? `Pick from ${activeGroups.length} sections — carb base, protein/dal, veg side, salad, accompaniments`
                        : `Pick from ${activeGroups.length} sections — main dish, sides, nuts & sweets, drink`}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              {!cravingMode && !isGrouped && (
                <TouchableOpacity style={[aem.choiceCard, { borderColor: sectionColor }]} onPress={() => setStep('list')} activeOpacity={0.85}>
                  <Text style={aem.choiceIcon}>📋</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={aem.choiceTitle}>Select from list</Text>
                    <Text style={aem.choiceSub}>Choose from {library.length} curated {sectionLabel.toLowerCase()} {noun === 'exercise' ? 'exercises' : 'items'}</Text>
                  </View>
                </TouchableOpacity>
              )}

              {kind === 'exercise' && (
                <TouchableOpacity style={[aem.choiceCard, { borderColor: sectionColor }]} onPress={() => setStep('mylist')} activeOpacity={0.85}>
                  <Text style={aem.choiceIcon}>⭐</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={aem.choiceTitle}>My List</Text>
                    <Text style={aem.choiceSub}>
                      {myCustomExercises.length > 0
                        ? `${myCustomExercises.length} exercise${myCustomExercises.length > 1 ? 's' : ''} you've added before`
                        : "Exercises you type manually will be saved here"}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {kind === 'food' && (
                <TouchableOpacity style={[aem.choiceCard, { borderColor: sectionColor }]} onPress={() => setStep('mylist')} activeOpacity={0.85}>
                  <Text style={aem.choiceIcon}>⭐</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={aem.choiceTitle}>My List</Text>
                    <Text style={aem.choiceSub}>
                      {myCustomItems.length > 0
                        ? `${myCustomItems.length} food item${myCustomItems.length > 1 ? 's' : ''} you've added before`
                        : "Foods you type manually will be saved here"}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[aem.choiceCard, { borderColor: sectionColor }]} onPress={startManual} activeOpacity={0.85}>
                <Text style={aem.choiceIcon}>✏️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={aem.choiceTitle}>Write manually</Text>
                  <Text style={aem.choiceSub}>Type your own {noun} name</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Grouped breakfast picker ───────────────────────────────────── */}
          {step === 'grouped' && (
            <>
              {activeGroups.some((g) => g.items.some((item) => isNonVegFood(item.name.toLowerCase()))) && (
                <TouchableOpacity
                  onPress={() => setShowNonVeg((v) => !v)}
                  activeOpacity={0.75}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, borderWidth: 0.5, borderColor: THEME.colors.border }}
                >
                  <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary }}>🍗 Show non-veg items</Text>
                  <View style={{ width: 40, height: 24, borderRadius: 12, backgroundColor: showNonVeg ? sectionColor : 'rgba(255,255,255,0.12)', padding: 2, justifyContent: 'center' }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', transform: [{ translateX: showNonVeg ? 16 : 0 }] }} />
                  </View>
                </TouchableOpacity>
              )}
              {/* Search across every section at once — matching sections
                  auto-expand so there's no need to guess which one a dish
                  is filed under. */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: THEME.colors.border, paddingHorizontal: 12, marginBottom: 10 }}>
                <Text style={{ fontSize: 14, marginRight: 8, opacity: 0.5 }}>🔍</Text>
                <TextInput
                  value={groupSearch}
                  onChangeText={setGroupSearch}
                  placeholder="Search any dish across all sections..."
                  placeholderTextColor={THEME.colors.textMuted}
                  style={{ flex: 1, paddingVertical: 12, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 13 }}
                />
                {groupSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setGroupSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ color: THEME.colors.textMuted, fontSize: 14 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {(() => {
                  const query = groupSearch.trim().toLowerCase();
                  const isSearching = query.length > 0;
                  const visibleGroups = activeGroups
                    .map(group => ({
                      group,
                      items: group.items
                        .filter(item => !isSearching || cleanFoodName(item.name).toLowerCase().includes(query))
                        .filter(item => showNonVeg || !isNonVegFood(item.name.toLowerCase())),
                    }))
                    .filter(({ items }) => !isSearching || items.length > 0);

                  if (isSearching && visibleGroups.length === 0) {
                    return (
                      <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.sans, textAlign: 'center', paddingVertical: 24 }}>
                        No dishes match "{groupSearch.trim()}".
                      </Text>
                    );
                  }

                  return visibleGroups.map(({ group, items }) => {
                  const isOpen = isSearching ? true : groupOpen[group.key];
                  const selected = groupSelected[group.key];
                  return (
                    <View key={group.key} style={{ marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: selected ? group.color : THEME.colors.border, overflow: 'hidden' }}>
                      {/* Group header — tap to toggle */}
                      <TouchableOpacity
                        onPress={() => setGroupOpen(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                        activeOpacity={0.8}
                        style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: selected ? `${group.color}18` : 'rgba(255,255,255,0.03)' }}
                      >
                        <Text style={{ fontSize: 18, marginRight: 8 }}>{group.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: THEME.colors.textPrimary, fontSize: 13, fontFamily: THEME.fonts.sansMedium }}>{group.label}</Text>
                          {selected ? (
                            <Text style={{ color: group.color, fontSize: 11, fontFamily: THEME.fonts.sans, marginTop: 1 }} numberOfLines={1}>
                              ✓ {cleanFoodName(selected.name)}
                            </Text>
                          ) : cravingMode && 'tagline' in group ? (
                            <Text style={{ color: THEME.colors.textMuted, fontSize: 10, fontFamily: THEME.fonts.sans, marginTop: 1, fontStyle: 'italic' }} numberOfLines={1}>
                              {(group as typeof CRAVING_GROUPS[0]).tagline}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={{ color: THEME.colors.textMuted, fontSize: 14 }}>{isOpen ? '▾' : '›'}</Text>
                      </TouchableOpacity>

                      {/* Items list */}
                      {isOpen && items.map(item => {
                        const isSelected = groupSelected[group.key]?.id === item.id;
                        return (
                          <View key={item.id} style={{ borderTopWidth: 0.5, borderTopColor: THEME.colors.border }}>
                            <TouchableOpacity
                              onPress={() => selectGroupItem(group.key, item)}
                              activeOpacity={0.7}
                              style={{
                                flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10,
                                backgroundColor: isSelected ? `${group.color}12` : 'transparent',
                              }}
                            >
                              {/* Radio dot */}
                              <View style={{
                                width: 18, height: 18, borderRadius: 9, borderWidth: 1.5,
                                borderColor: isSelected ? group.color : THEME.colors.border,
                                backgroundColor: isSelected ? group.color : 'transparent',
                                alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0,
                              }}>
                                {isSelected && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#000' }} />}
                              </View>

                              {/* Name + kcal hint + optional roast */}
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: isSelected ? THEME.colors.textPrimary : THEME.colors.textSecondary, fontSize: 13, fontFamily: isSelected ? THEME.fonts.sansMedium : THEME.fonts.sans }}>
                                  {cleanFoodName(item.name)}
                                </Text>
                                <Text style={{ color: THEME.colors.textMuted, fontSize: 11, fontFamily: THEME.fonts.sans, marginTop: 1 }}>
                                  {(() => {
                                    const unit = (item as BreakfastItem).qtyUnit ?? 'serving';
                                    const qty  = isSelected ? (groupQty[group.key] ?? (unit === 'ml' ? 50 : unit === 'g' ? 25 : 1)) : (unit === 'ml' ? 50 : unit === 'g' ? 25 : 1);
                                    const cal  = Math.round(item.defaultCalories * qty);
                                    const pro  = parseFloat((item.defaultProteinG * qty).toFixed(1));
                                    const fat  = parseFloat((item.defaultFatG * qty).toFixed(1));
                                    return `${cal} kcal · P ${pro}g · F ${fat}g`;
                                  })()}
                                </Text>
                                {'roasts' in item && isSelected && (() => {
                                  const roasts = (item as CravingItem).roasts;
                                  const qty = groupQty[group.key] ?? 1;
                                  const roastText = roasts[Math.min(qty - 1, roasts.length - 1)];
                                  return (
                                    <Text style={{ color: '#F97316', fontSize: 10, fontFamily: THEME.fonts.sans, marginTop: 3, fontStyle: 'italic' }}>
                                      {roastText}
                                    </Text>
                                  );
                                })()}
                              </View>
                            </TouchableOpacity>

                            {/* Inline quantity stepper — only shown when selected */}
                            {isSelected && (() => {
                              const unit    = (item as BreakfastItem).qtyUnit ?? 'serving';
                              const step    = unit === 'ml' ? 50 : unit === 'g' ? 25 : 1;
                              const min     = step;
                              const max     = unit === 'ml' ? 1000 : unit === 'g' ? 500 : 20;
                              const cur     = groupQty[group.key] ?? min;
                              const atMin   = cur <= min;
                              const atMax   = cur >= max;
                              return (
                                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, gap: 10 }}>
                                  <Text style={{ color: THEME.colors.textMuted, fontSize: 11, fontFamily: THEME.fonts.sansMedium, textTransform: 'uppercase', letterSpacing: 0.4 }}>Qty</Text>
                                  <View style={{
                                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                    borderRadius: 10, borderWidth: 1, borderColor: THEME.colors.border,
                                    paddingVertical: 4,
                                  }}>
                                    <TouchableOpacity
                                      onPress={() => stepGroupQty(group.key, item, -step)}
                                      disabled={atMin}
                                      style={{ paddingHorizontal: 14, paddingVertical: 6 }}
                                      activeOpacity={0.6}
                                    >
                                      <Text style={{ fontSize: 20, color: atMin ? 'rgba(255,255,255,0.15)' : group.color, lineHeight: 22 }}>−</Text>
                                    </TouchableOpacity>
                                    <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansSemibold, color: group.color, minWidth: 72, textAlign: 'center' }}>
                                      {fmtQtyLabel(cur, unit)}
                                    </Text>
                                    <TouchableOpacity
                                      onPress={() => stepGroupQty(group.key, item, step)}
                                      disabled={atMax}
                                      style={{ paddingHorizontal: 14, paddingVertical: 6 }}
                                      activeOpacity={0.6}
                                    >
                                      <Text style={{ fontSize: 20, color: atMax ? 'rgba(255,255,255,0.15)' : group.color, lineHeight: 22 }}>+</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              );
                            })()}
                          </View>
                        );
                      })}
                    </View>
                  );
                  });
                })()}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => setStep('choice')}
                  style={{ flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: THEME.colors.border }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>
                    ← Back
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[{ flex: 2 }, aem.submitBtn, { backgroundColor: sectionColor }, selectedCount === 0 && { opacity: 0.4 }]}
                  onPress={goToReview}
                  disabled={selectedCount === 0}
                  activeOpacity={0.85}
                >
                  <Text style={aem.submitBtnText}>
                    Review {selectedCount > 0 ? `${selectedCount} item${selectedCount > 1 ? 's' : ''}` : 'selection'} →
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Review & tweak macros ──────────────────────────────────────── */}
          {step === 'review' && (
            <>
              <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={{ color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.sans, marginBottom: 12 }}>
                  Adjust quantities or macros before adding. All {reviewItems.length} items will be logged separately.
                </Text>
                {reviewItems.map((item, idx) => (
                  <View key={idx} style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                    <Text style={{ color: sectionColor, fontSize: 13, fontFamily: THEME.fonts.sansMedium, marginBottom: 8 }}>{cleanFoodName(item.name)}</Text>
                    <View style={{ marginBottom: 10 }}>
                      <Text style={aem.fieldLabel}>Quantity</Text>
                      <TextInput
                        value={item.quantity}
                        onChangeText={v => updateReviewItem(idx, 'quantity', v)}
                        style={aem.fieldInput}
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        placeholder="e.g. 1 bowl"
                        maxLength={40}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={aem.fieldLabel}>Calories</Text>
                        <TextInput value={item.calories} onChangeText={v => updateReviewItem(idx, 'calories', sanitizeInteger(v))} style={aem.fieldInput} placeholderTextColor="rgba(255,255,255,0.3)" placeholder="kcal" keyboardType="numeric" maxLength={6} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={aem.fieldLabel}>Protein (g)</Text>
                        <TextInput value={item.protein} onChangeText={v => updateReviewItem(idx, 'protein', sanitizeDecimal(v))} style={aem.fieldInput} placeholderTextColor="rgba(255,255,255,0.3)" placeholder="g" keyboardType="decimal-pad" maxLength={6} />
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={aem.fieldLabel}>Carbs (g)</Text>
                        <TextInput value={item.carbs} onChangeText={v => updateReviewItem(idx, 'carbs', sanitizeDecimal(v))} style={aem.fieldInput} placeholderTextColor="rgba(255,255,255,0.3)" placeholder="g" keyboardType="decimal-pad" maxLength={6} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={aem.fieldLabel}>Fat (g)</Text>
                        <TextInput value={item.fat} onChangeText={v => updateReviewItem(idx, 'fat', sanitizeDecimal(v))} style={aem.fieldInput} placeholderTextColor="rgba(255,255,255,0.3)" placeholder="g" keyboardType="decimal-pad" maxLength={6} />
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => setStep('grouped')}
                  style={{ flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: THEME.colors.border }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[{ flex: 2 }, aem.submitBtn, { backgroundColor: sectionColor }, submitting && { opacity: 0.6 }]}
                  onPress={() => handleReviewSubmit()}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting
                    ? <ActivityIndicator color="#000" />
                    : <Text style={aem.submitBtnText}>
                        {cravingMode
                          ? `Confess ${reviewItems.length} item${reviewItems.length > 1 ? 's' : ''} 🙈`
                          : `Add ${reviewItems.length} item${reviewItems.length > 1 ? 's' : ''} to ${sectionLabel}`}
                      </Text>}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Craving slot picker ───────────────────────────────────────── */}

          {/* ── Flat list (non-breakfast food / exercises) ─────────────────── */}
          {step === 'list' && (
            <View style={{ flex: 1 }}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={`Search ${nounPlural}…`}
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={aem.searchInput}
              />
              {kind === 'food' && libraryHasNonVeg && (
                <TouchableOpacity
                  onPress={() => setShowNonVeg((v) => !v)}
                  activeOpacity={0.75}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, borderWidth: 0.5, borderColor: THEME.colors.border }}
                >
                  <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary }}>🍗 Show non-veg items</Text>
                  <View style={{ width: 40, height: 24, borderRadius: 12, backgroundColor: showNonVeg ? sectionColor : 'rgba(255,255,255,0.12)', padding: 2, justifyContent: 'center' }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', transform: [{ translateX: showNonVeg ? 16 : 0 }] }} />
                  </View>
                </TouchableOpacity>
              )}
              {kind === 'exercise' && (
                <View style={{ marginBottom: 8 }}>
                  {/* Equipment filter row */}
                  <Text style={aem.filterRowLabel}>Equipment</Text>
                  <View style={{ height: 34, marginBottom: 8 }}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 24 }}
                    >
                      {EQUIP_FILTERS.map(({ label, icon }) => {
                        const active = filterEquip === label;
                        return (
                          <TouchableOpacity
                            key={label}
                            onPress={() => setFilterEquip(label)}
                            activeOpacity={0.75}
                            style={{
                              flexDirection: 'row', alignItems: 'center', gap: 4,
                              paddingHorizontal: 10, height: 30, borderRadius: 15,
                              borderWidth: 1,
                              borderColor: active ? sectionColor : THEME.colors.border,
                              backgroundColor: active ? `${sectionColor}20` : 'rgba(255,255,255,0.04)',
                            }}
                          >
                            <Text style={{ fontSize: 12 }}>{icon}</Text>
                            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: active ? sectionColor : THEME.colors.textMuted }}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                      {/* Fade-out scroll hint */}
                      <Text style={{ color: 'rgba(255,255,255,0.18)', fontSize: 14, paddingLeft: 2 }}>›</Text>
                    </ScrollView>
                  </View>
                  {/* Muscle group filter row */}
                  <Text style={aem.filterRowLabel}>Muscle Group</Text>
                  <View style={{ height: 34 }}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 24 }}
                    >
                      {MUSCLE_FILTERS.map(({ label, icon }) => {
                        const active = filterMuscle === label;
                        return (
                          <TouchableOpacity
                            key={label}
                            onPress={() => setFilterMuscle(label)}
                            activeOpacity={0.75}
                            style={{
                              flexDirection: 'row', alignItems: 'center', gap: 4,
                              paddingHorizontal: 10, height: 30, borderRadius: 15,
                              borderWidth: 1,
                              borderColor: active ? '#A78BFA' : THEME.colors.border,
                              backgroundColor: active ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)',
                            }}
                          >
                            <Text style={{ fontSize: 12 }}>{icon}</Text>
                            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: active ? '#A78BFA' : THEME.colors.textMuted }}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                      <Text style={{ color: 'rgba(255,255,255,0.18)', fontSize: 14, paddingLeft: 2 }}>›</Text>
                    </ScrollView>
                  </View>
                </View>
              )}
              {kind === 'exercise' && filtered.length > 0 && (
                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 6 }}>
                  Tick to multi-select, or tap a name to view & add it alone
                </Text>
              )}
              <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                {filtered.map(ex => (
                  <TouchableOpacity key={ex.id} style={aem.listRow} onPress={() => pickFromLibrary(ex)} activeOpacity={0.7}>
                    {kind === 'exercise' && (
                      <Checkbox checked={selectedIds.has(ex.id)} onPress={() => toggleSelect(ex.id)} color={sectionColor} />
                    )}
                    <Text style={[aem.listRowText, kind === 'exercise' && { marginLeft: 10 }]}>{ex.name}</Text>
                    <Text style={aem.listRowChevron}>›</Text>
                  </TouchableOpacity>
                ))}
                {!filtered.length && (
                  <Text style={aem.emptyText}>No matches — try "Write manually" instead.</Text>
                )}
              </ScrollView>
              {kind === 'exercise' && selectedIds.size > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    const items = (library as WarmupExerciseDefault[])
                      .filter((ex) => selectedIds.has(ex.id))
                      .map((ex) => ({
                        name: ex.name, sets: ex.defaultSets, reps: ex.defaultReps,
                        side: ex.defaultSide, holdSecs: ex.defaultHoldSecs, restSecs: ex.defaultRestSecs,
                      }));
                    handleBatchAdd(items);
                  }}
                  disabled={submitting}
                  activeOpacity={0.85}
                  style={{ marginTop: 10, backgroundColor: sectionColor, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? <ActivityIndicator color="#000" /> : (
                    <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: '#000' }}>Add {selectedIds.size} selected</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── My List — a client's own remembered manual entries ──────────── */}
          {step === 'mylist' && kind === 'exercise' && (
            <View style={{ flex: 1 }}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search my list…"
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={aem.searchInput}
              />
              {filteredMyList.length > 0 && (
                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 6 }}>
                  Tick to multi-select, or tap a name to view & add it alone
                </Text>
              )}
              <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                {filteredMyList.map((ce) => (
                  <TouchableOpacity key={ce.id} style={aem.listRow} onPress={() => pickFromMyList(ce)} activeOpacity={0.7}>
                    <Checkbox checked={selectedIds.has(ce.id)} onPress={() => toggleSelect(ce.id)} color={sectionColor} />
                    <Text style={[aem.listRowText, { marginLeft: 10 }]}>{ce.name}</Text>
                    <Text style={aem.listRowChevron}>›</Text>
                  </TouchableOpacity>
                ))}
                {!filteredMyList.length && (
                  <Text style={aem.emptyText}>
                    {myCustomExercises.length === 0
                      ? 'Nothing here yet — exercises you type manually will show up here.'
                      : 'No matches.'}
                  </Text>
                )}
              </ScrollView>
              {selectedIds.size > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    const items = myCustomExercises
                      .filter((ce) => selectedIds.has(ce.id))
                      .map((ce) => ({
                        name: ce.name, sets: ce.default_sets, reps: ce.default_reps,
                        side: ce.default_side, holdSecs: ce.default_hold_secs, restSecs: ce.default_rest_secs,
                      }));
                    handleBatchAdd(items);
                  }}
                  disabled={submitting}
                  activeOpacity={0.85}
                  style={{ marginTop: 10, backgroundColor: sectionColor, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? <ActivityIndicator color="#000" /> : (
                    <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: '#000' }}>Add {selectedIds.size} selected</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Same idea as above, for food/supplement — sourced from client_custom_items */}
          {step === 'mylist' && (kind === 'food' || kind === 'supplement') && (
            <View style={{ flex: 1 }}>
              {kind === 'food' && (
                <View style={{ height: 40, marginBottom: 12 }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ flexDirection: 'row', gap: 8 }}
                  >
                    {mealSlotOptions.map((slot) => {
                      const active = myListTab === slot.key;
                      return (
                        <TouchableOpacity
                          key={slot.key}
                          onPress={() => setMyListTab(slot.key)}
                          activeOpacity={0.8}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 5,
                            paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16,
                            borderWidth: 1.5,
                            borderColor: active ? slot.color : THEME.colors.border,
                            backgroundColor: active ? `${slot.color}20` : 'rgba(255,255,255,0.03)',
                          }}
                        >
                          <Text style={{ fontSize: 13 }}>{slot.icon}</Text>
                          <Text style={{
                            fontSize: 12.5, fontFamily: THEME.fonts.sansMedium,
                            color: active ? slot.color : THEME.colors.textSecondary,
                          }}>
                            {slot.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search my list…"
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={aem.searchInput}
              />
              {filteredMyItems.length > 0 && (
                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 6 }}>
                  Tick to multi-select, or tap a name to view & add it alone
                </Text>
              )}
              <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                {filteredMyItems.map((item) => (
                  <TouchableOpacity key={item.id} style={aem.listRow} onPress={() => pickFromMyListItem(item)} activeOpacity={0.7}>
                    <Checkbox checked={selectedIds.has(item.id)} onPress={() => toggleSelect(item.id)} color={sectionColor} />
                    <Text style={[aem.listRowText, { marginLeft: 10 }]}>{item.name}</Text>
                    <Text style={aem.listRowChevron}>›</Text>
                  </TouchableOpacity>
                ))}
                {!filteredMyItems.length && (
                  <Text style={aem.emptyText}>
                    {search.trim()
                      ? 'No matches.'
                      : kind === 'food'
                      ? `Nothing in ${mealSlotOptions.find((s) => s.key === myListTab)?.label ?? 'this section'} yet — foods you type manually and save here will show up under whichever section you pick.`
                      : `Nothing here yet — ${noun}s you type manually will show up here.`}
                  </Text>
                )}
              </ScrollView>
              {selectedIds.size > 0 && (
                <TouchableOpacity
                  onPress={() => handleBatchAddItems(myCustomItems.filter((item) => selectedIds.has(item.id)))}
                  disabled={submitting}
                  activeOpacity={0.85}
                  style={{ marginTop: 10, backgroundColor: sectionColor, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? <ActivityIndicator color="#000" /> : (
                    <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: '#000' }}>Add {selectedIds.size} selected</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Single item detail (manual entry or picked from flat list) ─── */}
          {step === 'detail' && (
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 460 }}>
              <View style={{ marginBottom: 14 }}>
                <Text style={aem.fieldLabel}>{nounTitleCase} name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={noun === 'food' ? 'e.g. Idli with sambar' : noun === 'supplement' ? 'e.g. Whey Protein Isolate' : 'e.g. Arm circles'}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={aem.fieldInput}
                  maxLength={MAX_LENGTHS.shortTitle}
                />
              </View>

              {kind === 'food' ? (
                <>
                  {/* Which section this gets saved to — independent of which
                      section's "+" (or Confession Booth) opened this modal,
                      so a manual entry or a My List pick can land anywhere.
                      Includes "Craving" when opened from Confession Booth. */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={aem.fieldLabel}>Section</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {mealSlotOptions.map((slot) => (
                        <TouchableOpacity
                          key={slot.key}
                          onPress={() => setMealSlotChoice(slot.key)}
                          activeOpacity={0.8}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 5,
                            paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16,
                            borderWidth: 1.5,
                            borderColor: mealSlotChoice === slot.key ? slot.color : THEME.colors.border,
                            backgroundColor: mealSlotChoice === slot.key ? `${slot.color}20` : 'rgba(255,255,255,0.03)',
                          }}
                        >
                          <Text style={{ fontSize: 13 }}>{slot.icon}</Text>
                          <Text style={{
                            fontSize: 12.5, fontFamily: THEME.fonts.sansMedium,
                            color: mealSlotChoice === slot.key ? slot.color : THEME.colors.textSecondary,
                          }}>
                            {slot.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Quantity — stepper when from library, text input for manual */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={aem.fieldLabel}>Quantity</Text>
                    {qtyUnit ? (
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: 12, borderWidth: 1, borderColor: THEME.colors.border,
                        paddingVertical: 6,
                      }}>
                        <TouchableOpacity
                          onPress={() => setQtyCount(qtyCount - QTY_STEP)}
                          disabled={qtyCount <= QTY_MIN}
                          style={{ paddingHorizontal: 18, paddingVertical: 10 }}
                          activeOpacity={0.6}
                        >
                          <Text style={{ fontSize: 22, color: qtyCount <= QTY_MIN ? 'rgba(255,255,255,0.15)' : THEME.colors.teal, lineHeight: 26 }}>−</Text>
                        </TouchableOpacity>
                        <View style={{ alignItems: 'center', minWidth: 90 }}>
                          <Text style={{ fontSize: 18, fontFamily: THEME.fonts.sansSemibold, color: THEME.colors.teal }}>
                            {fmtQtyLabel(qtyCount, qtyUnit)}
                          </Text>
                          <View style={{ width: 28, height: 2, backgroundColor: THEME.colors.teal, borderRadius: 1, marginTop: 3, opacity: 0.6 }} />
                        </View>
                        <TouchableOpacity
                          onPress={() => setQtyCount(qtyCount + QTY_STEP)}
                          disabled={qtyCount >= QTY_MAX}
                          style={{ paddingHorizontal: 18, paddingVertical: 10 }}
                          activeOpacity={0.6}
                        >
                          <Text style={{ fontSize: 22, color: qtyCount >= QTY_MAX ? 'rgba(255,255,255,0.15)' : THEME.colors.teal, lineHeight: 26 }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TextInput
                        value={quantity}
                        onChangeText={setQuantity}
                        placeholder="e.g. 1 bowl, 200g"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={aem.fieldInput}
                      />
                    )}
                  </View>

                  {/* Macros — auto-calculated from qty; user can still tweak */}
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
                    <NumberField label="Calories (kcal)" value={calories} onChange={setCalories} placeholder="e.g. 350" range={NUMERIC_RANGES.calories} />
                    <NumberField label="Protein (g)" value={protein} onChange={setProtein} placeholder="e.g. 12" decimal range={NUMERIC_RANGES.macroGrams} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
                    <NumberField label="Carbs (g)" value={carbs} onChange={setCarbs} placeholder="e.g. 45" decimal range={NUMERIC_RANGES.macroGrams} />
                    <NumberField label="Fat (g)" value={fat} onChange={setFat} placeholder="e.g. 8" decimal range={NUMERIC_RANGES.macroGrams} />
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
                  {/* Sets + Reps sliders */}
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                    <NumberSlider items={SETS_ITEMS} selectedIndex={setsIdx} onChange={setSetsIdx} label="Sets" />
                    <NumberSlider items={REPS_ITEMS} selectedIndex={repsIdx} onChange={setRepsIdx} label="Reps" />
                  </View>

                  {/* Side pills — Rotation only shown when exercise library marks it applicable */}
                  <Text style={aem.fieldLabel}>Side</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {SIDE_OPTIONS.filter(opt => opt.value !== 'rotation' || allowRotation).map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setSide(opt.value)}
                        style={[aem.sidePill, side === opt.value && { backgroundColor: `${sectionColor}25`, borderColor: sectionColor }]}
                      >
                        <Text style={[aem.sidePillText, side === opt.value && { color: sectionColor }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Hold + Rest sliders */}
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
                    <Stepper items={HOLD_ITEMS} selectedIndex={holdIdx} onChange={setHoldIdx} label="Hold (secs)" />
                    <Stepper items={REST_ITEMS} selectedIndex={restIdx} onChange={setRestIdx} label="Rest (secs)" />
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
                  : <Text style={aem.submitBtnText}>
                      Add to {kind === 'food' ? (mealSlotOptions.find((s) => s.key === mealSlotChoice)?.label ?? sectionLabel) : sectionLabel}
                    </Text>}
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
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, height: '82%',
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
  filterRowLabel: { fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 },
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

  // Day-level status badge (Complete/Partial/Not logged) — deliberately NOT
  // the same thing as `allDone`/`pct` above (which stay literal and still
  // drive the numeric progress bar). A day counts as Complete once every
  // one of the 4 sections has at least one item checked off — a client who
  // finished Workout/Nutrition/Supplements in full but only drank 10/13
  // glasses of water engaged with every section and should read as
  // Complete, not Partial. A section with NOTHING added that day (not even
  // an unchecked item) still fails this check — "nothing added" is no
  // different from "added but not filled in", both mean that section wasn't
  // engaged with. "Partial" = something logged, but at least one section
  // (empty or not) has zero progress. "Not logged" = nothing checked off
  // anywhere.
  const groupDone  = (keys: string[]) => keys.reduce((s, k) => s + ((dayData[k] || []).filter((i: any) => i.completed).length), 0);
  const foodNonCraving = ((dayData['food'] || []) as any[]).filter((i) => i.meal_slot !== 'craving');
  const sectionDoneCounts = [
    groupDone(['warmup', 'workout', 'cooldown']),
    groupDone(['water']),
    foodNonCraving.filter((i) => i.completed).length,
    groupDone(['supplement']),
  ];
  const totalLoggedToday = sectionDoneCounts.reduce((s, d) => s + d, 0);
  const dayStatus: 'complete' | 'partial' | 'notLogged' =
    isDayFuture ? 'notLogged'
    : totalLoggedToday === 0 ? 'notLogged'
    : sectionDoneCounts.every((d) => d > 0) ? 'complete'
    : 'partial';

  return { dayDate, isTodayDay, isDayFuture, isDayPast, total, done, pct, allDone, dayStatus };
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
        const { isTodayDay, isDayFuture, isDayPast, total, dayStatus } =
          dayStats(resolvedGrouped, d, weekStart);
        const isActive = d === selectedDay;

        // Background + border + text colours per state
        let bg: string, border: string, nameColor: string, dotColor: string | null;

        if (isTodayDay) {
          bg        = isActive ? THEME.colors.teal : 'rgba(0,196,180,0.1)';
          border    = THEME.colors.teal;
          nameColor = isActive ? '#000' : THEME.colors.teal;
          dotColor  = null; // today is obvious from colour
        } else if (dayStatus === 'complete') {
          bg        = isActive ? '#4CC986' : 'rgba(76,201,134,0.1)';
          border    = '#4CC986';
          nameColor = isActive ? '#000' : '#4CC986';
          dotColor  = null;
        } else if (isDayFuture) {
          bg        = 'transparent';
          border    = isActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)';
          nameColor = isActive ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)';
          dotColor  = null;
        } else if (isDayPast && dayStatus === 'partial') {
          bg        = isActive ? 'rgba(232,164,74,0.1)' : 'transparent';
          border    = isActive ? THEME.colors.amber : 'rgba(255,255,255,0.07)';
          nameColor = isActive ? THEME.colors.amber : THEME.colors.textSecondary;
          dotColor  = THEME.colors.amber;
        } else if (isDayPast && dayStatus === 'notLogged' && total > 0) {
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

function MealSelectionWheel({ slots, hasCravings = false, onSlotPress }: { slots: MealSlotLit[]; hasCravings?: boolean; onSlotPress?: (key: string) => void }) {
  // When cravings exist, squeeze 5 meal segments into 300° and give the
  // remaining 60° to the 🙈 confession segment right after Dinner.
  const CRAVING_DEG = 60;
  const mealSpan = hasCravings ? 360 - CRAVING_DEG : 360;
  const n = slots.length;
  const step = mealSpan / n;
  const segments = slots.map((s, i) => ({
    ...s,
    path: selDonutArc(SEL_CX, SEL_CY, SEL_OUTER, SEL_INNER, i * step + SEL_GAP / 2, (i + 1) * step - SEL_GAP / 2),
    labelPoint: selPolar(SEL_CX, SEL_CY, SEL_OUTER + 18, (i + 0.5) * step),
  }));
  // Confession segment occupies the remaining arc after Dinner
  const confStart = mealSpan + SEL_GAP / 2;
  const confEnd   = 360 - SEL_GAP / 2;
  const confMid   = (confStart + confEnd) / 2;
  const confSegment = hasCravings ? {
    key: 'craving', label: 'Oops 🙈', icon: '🙈', color: '#F97316', lit: true,
    path: selDonutArc(SEL_CX, SEL_CY, SEL_OUTER, SEL_INNER, confStart, confEnd),
    labelPoint: selPolar(SEL_CX, SEL_CY, SEL_OUTER + 18, confMid),
  } : null;

  function handleWheelPress(e: any) {
    if (!onSlotPress) return;
    const { locationX, locationY } = e.nativeEvent;
    const dx = locationX - SEL_CX;
    const dy = locationY - SEL_CY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < SEL_INNER - 6 || dist > SEL_OUTER + 8) return;
    let angle = (Math.atan2(dy, dx) * 180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    if (angle >= 360) angle -= 360;
    // Check meal slots
    for (let i = 0; i < slots.length; i++) {
      const startDeg = i * step + SEL_GAP / 2;
      const endDeg   = (i + 1) * step - SEL_GAP / 2;
      if (angle >= startDeg && angle <= endDeg) { onSlotPress(slots[i].key); return; }
    }
    // Check craving segment
    if (hasCravings) {
      const confStart = mealSpan + SEL_GAP / 2;
      if (angle >= confStart) { onSlotPress('craving'); }
    }
  }

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
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: '#A78BFA' }}>{litCount}/{n}{hasCravings ? ' +🙈' : ''}</Text>
        </View>
      </View>

      {/* Big centered wheel — tappable to jump to that meal section */}
      <View style={{ alignItems: 'center', paddingTop: 20, paddingBottom: 10 }}>
        <TouchableOpacity activeOpacity={onSlotPress ? 0.92 : 1} onPress={handleWheelPress} style={{ alignItems: 'center' }}>
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
            {confSegment && (
              <SelectionSegment key="craving" path={confSegment.path} color="#F97316" lit={true} cx={SEL_CX} cy={SEL_CY} />
            )}
            <Circle cx={SEL_CX} cy={SEL_CY} r={SEL_INNER - 6} fill="rgba(8,12,28,0.95)" />
          </Svg>

          {/* Section icons around the ring */}
          {[...segments, ...(confSegment ? [confSegment] : [])].map(seg => (
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
        {onSlotPress && (
          <Text style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.22)', fontFamily: THEME.fonts.sans, marginTop: 6 }}>
            Tap a segment to jump to that section
          </Text>
        )}
        </TouchableOpacity>

        {litCount === n && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            {['🎊', '🍽', '🎊'].map((e, i) => <Text key={i} style={{ fontSize: 18 }}>{e}</Text>)}
          </View>
        )}
      </View>

      {/* Section legend chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
        {[...segments, ...(confSegment ? [confSegment] : [])].map(seg => (
          <View key={seg.key} style={{
            flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6,
            borderRadius: 14,
            backgroundColor: seg.key === 'craving' ? 'rgba(249,115,22,0.12)' : seg.lit ? `${seg.color}20` : 'rgba(255,255,255,0.04)',
            borderWidth: seg.key === 'craving' ? 1.5 : 1,
            borderColor: seg.key === 'craving' ? 'rgba(249,115,22,0.5)' : seg.lit ? `${seg.color}55` : 'rgba(255,255,255,0.08)',
            borderStyle: seg.key === 'craving' ? 'dashed' : 'solid',
          }}>
            <Text style={{ fontSize: 12 }}>{seg.icon}</Text>
            <Text style={{ color: seg.key === 'craving' ? '#F97316' : seg.lit ? THEME.colors.textPrimary : THEME.colors.textMuted, fontFamily: THEME.fonts.sansMedium, fontSize: 11 }}>{seg.label}</Text>
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
      marginHorizontal: 14, marginTop: 14, marginBottom: 6, padding: 18, borderRadius: 18,
      backgroundColor: 'rgba(76,201,134,0.05)', borderWidth: 0.5, borderColor: 'rgba(76,201,134,0.18)',
      flexDirection: 'row', alignItems: 'center', gap: 18, opacity: locked ? 0.5 : 1,
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
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 23, lineHeight: 25 }}>{calories}</Text>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 9, marginTop: 1 }}>kcal logged</Text>
        </View>
      </View>
      <View style={{ flex: 1, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11.5, flex: 1 }}>Calories</Text>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>{calories} <Text style={{ color: THEME.colors.textMuted, fontSize: 11 }}>/ {CAL_TARGET}</Text></Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CC986' }} />
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11.5, flex: 1 }}>Protein</Text>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>{protein}g <Text style={{ color: THEME.colors.textMuted, fontSize: 11 }}>/ {PROTEIN_TARGET}g</Text></Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#A78BFA' }} />
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11.5, flex: 1 }}>Fat</Text>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>{fat}g <Text style={{ color: THEME.colors.textMuted, fontSize: 11 }}>/ {FAT_TARGET}g</Text></Text>
        </View>
        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 10, marginTop: 3 }}>
          From everything checked off below
        </Text>
      </View>
    </View>
  );
}

const suppBtnStyle  = { paddingHorizontal: 6, paddingVertical: 2 } as const;
const suppIconStyle = { fontSize: 16, fontFamily: THEME.fonts.sans } as const;

// ── Day Panel (content for the selected day) ──────────────────────────
function DayPanel({
  dayNumber, resolvedGrouped, weekStart, onToggle, onToggleAll, onAddExercise, onRemoveExercise, scrollViewRef,
  onOpenSaveRoutine, onOpenAddRoutine, onOpenSaveNutritionRoutine, onOpenAddNutritionRoutine,
  onOpenSaveSupplementRoutine, onOpenAddSupplementRoutine,
}: {
  dayNumber: number;
  resolvedGrouped: any;
  weekStart: string;
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: (dayNumber: number, check: boolean) => void;
  onAddExercise: (dayNumber: number, itemType: string, itemsForOrder: any[], payload: any, mealSlot?: string) => Promise<void>;
  onRemoveExercise: (id: string) => Promise<void>;
  scrollViewRef: React.RefObject<ScrollView>;
  onOpenSaveRoutine: () => void;
  onOpenAddRoutine: () => void;
  onOpenSaveNutritionRoutine: () => void;
  onOpenAddNutritionRoutine: () => void;
  onOpenSaveSupplementRoutine: () => void;
  onOpenAddSupplementRoutine: () => void;
}) {
  const [expandedFoodSlot, setExpandedFoodSlot] = useState<string | null>(null);
  const [suppAllOpen, setSuppAllOpen] = useState<boolean | null>(null);
  const foodSectionOffsets = useRef<Record<string, number>>({});

  // Hub-and-detail navigation: null = the 4-tile overview grid; a section
  // key = that section's full editing UI. Kept as in-place view state (not
  // a route) so the pending-save model, week/day selection, and routine
  // modals all keep working unchanged.
  const [activeSection, setActiveSection] = useState<'workout' | 'water' | 'nutrition' | 'supplement' | null>(null);

  // Android hardware back returns to the hub instead of leaving the screen.
  useEffect(() => {
    if (activeSection === null) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setActiveSection(null);
      return true;
    });
    return () => sub.remove();
  }, [activeSection]);

  function handleMealSlotPress(slotKey: string) {
    setExpandedFoodSlot(slotKey);
    setTimeout(() => {
      const cardTop  = foodSectionOffsets.current['__cardTop'] ?? 0;
      const slotRel  = foodSectionOffsets.current[slotKey] ?? 0;
      const y = cardTop + slotRel;
      scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
    }, 80);
    setTimeout(() => setExpandedFoodSlot(null), 600);
  }

  function handleSuppExpandAll(open: boolean) {
    setSuppAllOpen(open);
    setTimeout(() => setSuppAllOpen(null), 600);
  }
  const { isTodayDay, isDayFuture, isDayPast, total, pct, allDone, dayStatus } =
    dayStats(resolvedGrouped, dayNumber, weekStart);
  const dayData  = resolvedGrouped[dayNumber] || {};
  const dayDate  = getDayDate(weekStart, dayNumber);
  const dateStr  = dayDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const barColor = allDone ? '#4CC986' : isTodayDay ? THEME.colors.teal : isDayFuture ? 'rgba(255,255,255,0.12)' : THEME.colors.amber;
  const pctColor = isDayFuture ? 'rgba(255,255,255,0.18)' : allDone ? '#4CC986' : isTodayDay ? THEME.colors.teal : THEME.colors.textMuted;

  // Hub tile metrics. Nutrition adherence counts exclude cravings (they're
  // confessions, not plan items), but the kcal figure includes everything
  // eaten — matching what DailyNutritionRing already reports inside.
  const tileDone = (items: any[]) => items.filter((i: any) => i.completed).length;
  const workoutTileItems = [...(dayData['warmup'] || []), ...(dayData['workout'] || []), ...(dayData['cooldown'] || [])];
  const waterTileItems   = dayData['water'] || [];
  const foodTileItems    = (dayData['food'] || []).filter((i: any) => i.meal_slot !== 'craving');
  const suppTileItems    = dayData['supplement'] || [];
  const eatenCalories    = (dayData['food'] || []).filter((i: any) => i.completed).reduce((s: number, i: any) => s + (i.calories ?? 0), 0);

  const hubTiles: { key: 'workout' | 'water' | 'nutrition' | 'supplement'; icon: string; label: string; color: string; done: number; total: number; metric: string }[] = [
    { key: 'workout', icon: '💪', label: 'Workout', color: THEME.colors.teal,
      done: tileDone(workoutTileItems), total: workoutTileItems.length,
      metric: workoutTileItems.length ? `${tileDone(workoutTileItems)}/${workoutTileItems.length} done` : 'Nothing added yet' },
    { key: 'water', icon: '💧', label: 'Water', color: '#64B5F6',
      done: tileDone(waterTileItems), total: waterTileItems.length,
      metric: waterTileItems.length ? `${tileDone(waterTileItems)}/${waterTileItems.length} glasses` : 'Nothing added yet' },
    { key: 'nutrition', icon: '🥗', label: 'Nutrition', color: '#4ADE80',
      done: tileDone(foodTileItems), total: foodTileItems.length,
      metric: foodTileItems.length
        ? `${tileDone(foodTileItems)}/${foodTileItems.length} items${eatenCalories > 0 ? ` · ${eatenCalories} kcal` : ''}`
        : 'Nothing added yet' },
    { key: 'supplement', icon: '💊', label: 'Supplements', color: '#A78BFA',
      done: tileDone(suppTileItems), total: suppTileItems.length,
      metric: suppTileItems.length ? `${tileDone(suppTileItems)}/${suppTileItems.length} taken` : 'Nothing added yet' },
  ];

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
            {!isTodayDay && dayStatus === 'complete' && <View style={styles.donePill}><Text style={styles.donePillText}>✓ DONE</Text></View>}
            {isDayPast && dayStatus === 'partial' && <View style={styles.partialPill}><Text style={styles.partialPillText}>◑ PARTIAL</Text></View>}
            {isDayPast && dayStatus === 'notLogged' && total > 0 && <View style={styles.missedPill}><Text style={styles.missedPillText}>● NOT LOGGED</Text></View>}
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
              testID="day-select-all-checkbox"
              checked={allDone}
              onPress={() => onToggleAll(dayNumber, !allDone)}
              color={allDone ? '#4CC986' : isTodayDay ? THEME.colors.teal : THEME.colors.amber}
            />
          )}
        </View>
      </View>

      <View style={styles.dayDivider} />

      {/* ── Hub: 4-tile overview grid (tap a tile to open that section) ── */}
      {activeSection === null && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 14, paddingVertical: 14 }}>
          {hubTiles.map(tile => {
            const complete = tile.total > 0 && tile.done === tile.total;
            const pctTile = tile.total ? Math.round((tile.done / tile.total) * 100) : 0;
            return (
              <TouchableOpacity
                key={tile.key}
                onPress={() => setActiveSection(tile.key)}
                activeOpacity={0.8}
                style={{
                  width: '47%', flexGrow: 1,
                  backgroundColor: `${tile.color}0D`,
                  borderRadius: 16, padding: 14, gap: 8,
                  borderWidth: 1, borderColor: complete ? `${tile.color}66` : THEME.colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 20 }}>{tile.icon}</Text>
                  <Text style={{ color: complete ? tile.color : THEME.colors.textMuted, fontSize: complete ? 12 : 15 }}>
                    {complete ? '✓' : '›'}
                  </Text>
                </View>
                <Text style={{ color: THEME.colors.textPrimary, fontSize: 14, fontFamily: THEME.fonts.sansMedium }}>{tile.label}</Text>
                <Text
                  style={{ color: tile.total ? THEME.colors.textSecondary : THEME.colors.textMuted, fontSize: 11.5, fontFamily: THEME.fonts.sans }}
                  numberOfLines={1}
                >
                  {tile.metric}
                </Text>
                <View style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <View style={{ width: `${pctTile}%`, height: '100%', backgroundColor: tile.color, borderRadius: 2 }} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── Detail: back-to-overview link ── */}
      {activeSection !== null && (
        <TouchableOpacity
          onPress={() => setActiveSection(null)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, alignSelf: 'flex-start' }}
          activeOpacity={0.7}
        >
          <Text style={{ color: THEME.colors.teal, fontSize: 16, lineHeight: 18 }}>‹</Text>
          <Text style={{ color: THEME.colors.teal, fontSize: 13, fontFamily: THEME.fonts.sansMedium }}>Overview</Text>
        </TouchableOpacity>
      )}

      {/* Sections — warmup / workout / cooldown (water + food handled separately) */}
      {activeSection === 'workout' && (<>
      {SECTIONS.filter(s => s.key !== 'water').map(s => (
        <SectionGroup
          key={s.key}
          sectionKey={s.key}
          items={dayData[s.key] || []}
          onToggle={onToggle}
          locked={isDayFuture}
          onAdd={(payload: any) => onAddExercise(dayNumber, s.key, dayData[s.key] || [], payload)}
          onRemove={onRemoveExercise}
          forceOpenState={true}
        />
      ))}

      {/* Save / Add Routine — snapshot this day's Warmup/Workout/Cooldown, or
          apply a previously saved one to this day/week/month/custom dates */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 12 }}>
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingVertical: 13, borderWidth: 0.5, borderColor: THEME.colors.border }}
          onPress={onOpenSaveRoutine}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 16 }}>💾</Text>
          <Text style={{ fontFamily: THEME.fonts.sansMedium, fontSize: 13.5, color: THEME.colors.textPrimary }}>Save Routine</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingVertical: 13, borderWidth: 0.5, borderColor: THEME.colors.border }}
          onPress={onOpenAddRoutine}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 16 }}>📂</Text>
          <Text style={{ fontFamily: THEME.fonts.sansMedium, fontSize: 13.5, color: THEME.colors.textPrimary }}>Add Routine</Text>
        </TouchableOpacity>
      </View>
      </>)}

      {/* Water tracker — custom circular UI */}
      {activeSection === 'water' && (
        (dayData['water'] || []).length > 0 ? (
          <View style={{ marginHorizontal: 14, marginTop: 10, marginBottom: 4 }}>
            <WaterTracker
              items={dayData['water'] || []}
              onToggle={onToggle}
              locked={isDayFuture}
            />
          </View>
        ) : (
          <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.sans, textAlign: 'center', paddingVertical: 24 }}>
            Water tracking hasn't been set up for this week yet.
          </Text>
        )
      )}

      {activeSection === 'nutrition' && (<>
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
        const cravingItems = foodItems.filter((i: any) => i.meal_slot === 'craving');
        const hasCravings = cravingItems.length > 0;
        return <MealSelectionWheel slots={slots} hasCravings={hasCravings} onSlotPress={handleMealSlotPress} />;
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

      {/* Confession Damage Bar — only shown when craving items are logged & checked */}
      {(() => {
        const cravingEaten = (dayData['food'] || []).filter((i: any) => i.meal_slot === 'craving');
        if (cravingEaten.length === 0) return null;
        const cCal  = cravingEaten.reduce((s: number, i: any) => s + (i.calories ?? 0), 0);
        const cFat  = cravingEaten.reduce((s: number, i: any) => s + (i.fat_g ?? 0), 0);
        const cCarb = cravingEaten.reduce((s: number, i: any) => s + (i.carbs_g ?? 0), 0);
        const roasts = [
          'Included. Regretfully.',
          'These count. Just so you know.',
          'Added to your permanent record.',
          'Coach sees this. Enjoy.',
          'No take-backs. It is logged.',
        ];
        const roast = roasts[cravingEaten.length % roasts.length];
        return (
          <View style={{
            marginHorizontal: 14, marginTop: -4, marginBottom: 8,
            borderRadius: 12, borderWidth: 1, borderColor: 'rgba(249,115,22,0.35)',
            backgroundColor: 'rgba(249,115,22,0.07)', paddingVertical: 8, paddingHorizontal: 14,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
              <Text style={{ fontSize: 13, marginRight: 6 }}>🙈</Text>
              <Text style={{ color: '#F97316', fontSize: 11, fontFamily: THEME.fonts.sansMedium, flex: 1 }}>
                Confession Damage
              </Text>
              <Text style={{ color: THEME.colors.textMuted, fontSize: 10, fontFamily: THEME.fonts.sans, fontStyle: 'italic' }}>
                {roast}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 0 }}>
              {[
                { label: 'Calories', value: `${cCal}`, unit: 'kcal', color: '#F97316' },
                { label: 'Fat',      value: `${cFat}`,  unit: 'g',    color: '#FB923C' },
                { label: 'Carbs',    value: `${cCarb}`, unit: 'g',    color: '#FBBF24' },
              ].map((stat, i) => (
                <View key={stat.label} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: 'rgba(249,115,22,0.2)' }}>
                  <Text style={{ color: stat.color, fontSize: 15, fontFamily: THEME.fonts.sansMedium }}>{stat.value}<Text style={{ fontSize: 10 }}>{stat.unit}</Text></Text>
                  <Text style={{ color: THEME.colors.textMuted, fontSize: 10, fontFamily: THEME.fonts.sans }}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })()}

      {/* Nutrition category card — groups all 5 food meal-time sections under
          one clearly bordered/elevated container so they read as a single
          deliberate category rather than 5 loose stacked sections. Tint uses
          the existing dinner/food accent already present in FOOD_SLOTS. */}
      <View
        style={styles.categoryCard}
        onLayout={e => { foodSectionOffsets.current['__cardTop'] = e.nativeEvent.layout.y; }}
      >
        <View style={[styles.categoryCardHeader, { borderBottomColor: 'rgba(74,222,128,0.15)' }]}>
          <Text style={styles.categoryCardIcon}>🥗</Text>
          <Text style={[styles.categoryCardLabel, { color: '#4ADE80' }]}>Nutrition</Text>
        </View>
        <View style={styles.categoryCardBody}>
          {/* Non-craving food across ALL sections, not just this one — passed
              as itemsForOrder so item_order still comes out right when the
              modal's own section picker overrides which slot an item lands
              in (see AddExerciseModal's mealSlotChoice), since the item may
              end up in a different section than the one whose "+" opened it. */}
          {(() => {
            const allFoodItemsNonCraving = (dayData['food'] || []).filter((i: any) => i.meal_slot !== 'craving');
            return FOOD_SLOTS.map(slot => {
              const slotItems = (dayData['food'] || []).filter((i: any) => i.meal_slot === slot.key);
              return (
                <View key={slot.key} onLayout={e => { foodSectionOffsets.current[slot.key] = e.nativeEvent.layout.y; }}>
                  <SectionGroup
                    sectionKey={slot.key}
                    items={slotItems}
                    onToggle={onToggle}
                    locked={isDayFuture}
                    onAdd={(payload: any) => onAddExercise(dayNumber, 'food', allFoodItemsNonCraving, payload, slot.key)}
                    onRemove={onRemoveExercise}
                    forceOpenState={expandedFoodSlot === slot.key ? true : undefined}
                  />
                </View>
              );
            });
          })()}

          {/* Save / Add Routine — snapshot this day's Nutrition (excluding
              Confession Booth, which is free-form logging, not a plannable
              routine), or apply a previously saved one */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 12 }}>
            <TouchableOpacity
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingVertical: 13, borderWidth: 0.5, borderColor: THEME.colors.border }}
              onPress={onOpenSaveNutritionRoutine}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 16 }}>💾</Text>
              <Text style={{ fontFamily: THEME.fonts.sansMedium, fontSize: 13.5, color: THEME.colors.textPrimary }}>Save Routine</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingVertical: 13, borderWidth: 0.5, borderColor: THEME.colors.border }}
              onPress={onOpenAddNutritionRoutine}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 16 }}>📂</Text>
              <Text style={{ fontFamily: THEME.fonts.sansMedium, fontSize: 13.5, color: THEME.colors.textPrimary }}>Add Routine</Text>
            </TouchableOpacity>
          </View>

          {/* ── Confession Booth — standalone craving logger ─────────────── */}
          {(() => {
            const cravingItems = (dayData['food'] || []).filter((i: any) => i.meal_slot === 'craving');
            // Full day's food list (not just craving items) as itemsForOrder — Confession
            // Booth's My List/manual entry can now reassign an item to a real section
            // instead of staying a craving, same reasoning as allFoodItemsNonCraving above.
            const allFoodItems = dayData['food'] || [];
            return (
              <ConfessionBoothSection
                items={cravingItems}
                onToggle={onToggle}
                onRemove={onRemoveExercise}
                onAdd={(payload: any) => onAddExercise(dayNumber, 'food', allFoodItems, payload, 'craving')}
                locked={isDayFuture}
              />
            );
          })()}
        </View>
      </View>
      </>)}

      {/* Supplements category card — same treatment, using the existing
          purple supplement accent (#A78BFA) already used throughout this
          file for supplement-related UI (meal wheel header, nutrition ring
          fat segment, SUPPLEMENT_SLOTS color). */}
      {activeSection === 'supplement' && (
      <View style={[styles.categoryCard, { marginTop: 16 }]}>
        <View style={[styles.categoryCardHeader, { borderBottomColor: 'rgba(167,139,250,0.18)' }]}>
          <Text style={styles.categoryCardIcon}>💊</Text>
          <Text style={[styles.categoryCardLabel, { color: '#A78BFA', flex: 1 }]}>Supplements</Text>
          <TouchableOpacity onPress={() => handleSuppExpandAll(true)} activeOpacity={0.7} style={suppBtnStyle}>
            <Text style={[suppIconStyle, { color: '#A78BFA' }]}>☰</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSuppExpandAll(false)} activeOpacity={0.7} style={suppBtnStyle}>
            <Text style={[suppIconStyle, { color: 'rgba(167,139,250,0.5)' }]}>⊟</Text>
          </TouchableOpacity>
        </View>
        <SupplementSlotPill slots={SUPPLEMENT_SLOTS} dayData={dayData['supplement'] || []} />
        <View style={styles.categoryCardBody}>
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
                forceOpenState={suppAllOpen}
              />
            );
          })}

          {/* Save / Add Routine — snapshot this day's full Supplement
              schedule (all 5 slots), or apply a previously saved one */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <TouchableOpacity
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingVertical: 13, borderWidth: 0.5, borderColor: THEME.colors.border }}
              onPress={onOpenSaveSupplementRoutine}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 16 }}>💾</Text>
              <Text style={{ fontFamily: THEME.fonts.sansMedium, fontSize: 13.5, color: THEME.colors.textPrimary }}>Save Routine</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingVertical: 13, borderWidth: 0.5, borderColor: THEME.colors.border }}
              onPress={onOpenAddSupplementRoutine}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 16 }}>📂</Text>
              <Text style={{ fontFamily: THEME.fonts.sansMedium, fontSize: 13.5, color: THEME.colors.textPrimary }}>Add Routine</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      )}
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
        testID="save-progress-button"
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

// ── Save Routine item collectors, one per domain ─────────────────────────
// Each reads a day's already-resolved section data (see resolvedGrouped)
// and maps it into the flat RoutineTemplateItem shape the templates tables
// store, keeping only the fields relevant to that domain.
function collectWorkoutRoutineItems(dayData: any): RoutineTemplateItem[] {
  const items: RoutineTemplateItem[] = [];
  (['warmup', 'workout', 'cooldown'] as const).forEach(sectionKey => {
    (dayData[sectionKey] || []).forEach((item: any) => {
      items.push({
        item_type:  sectionKey,
        item_name:  item.item_name,
        item_order: item.item_order ?? 0,
        sets:       item.sets ?? null,
        reps:       item.reps ?? null,
        side:       item.side ?? null,
        hold_secs:  item.hold_secs ?? null,
        rest_secs:  item.rest_secs ?? null,
      });
    });
  });
  return items;
}

// Excludes meal_slot='craving' (Confession Booth) deliberately — that's
// free-form logging of what actually happened, not part of a plannable
// routine, which is exactly why Save/Add Routine sit before it on screen.
function collectNutritionRoutineItems(dayData: any): RoutineTemplateItem[] {
  return (dayData['food'] || [])
    .filter((item: any) => item.meal_slot !== 'craving')
    .map((item: any) => ({
      item_type:  'food',
      item_name:  item.item_name,
      item_order: item.item_order ?? 0,
      meal_slot:  item.meal_slot ?? null,
      quantity:   item.quantity ?? null,
      calories:   item.calories ?? null,
      protein_g:  item.protein_g ?? null,
      carbs_g:    item.carbs_g ?? null,
      fat_g:      item.fat_g ?? null,
    }));
}

function collectSupplementRoutineItems(dayData: any): RoutineTemplateItem[] {
  return (dayData['supplement'] || []).map((item: any) => ({
    item_type:  'supplement',
    item_name:  item.item_name,
    item_order: item.item_order ?? 0,
    meal_slot:  item.meal_slot ?? null,
    quantity:   item.quantity ?? null,
  }));
}

function ManualLogView({ userId }: { userId: string }) {
  const scrollViewRef = useRef<ScrollView>(null);
  const { profile, fetchProfile, setProfile } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mutate: recalcStreak } = useRecalculateStreak();

  // Save Routine / Add Routine — one set of modal-visibility state per
  // domain (workout / nutrition / supplement), sharing the same
  // save/apply/delete mutations (they're domain-parameterized) and the
  // same SaveRoutineModal/AddRoutineModal components.
  const [workoutRoutineModal, setWorkoutRoutineModal]       = useState<'save' | 'add' | null>(null);
  const [nutritionRoutineModal, setNutritionRoutineModal]   = useState<'save' | 'add' | null>(null);
  const [supplementRoutineModal, setSupplementRoutineModal] = useState<'save' | 'add' | null>(null);

  const { data: workoutTemplates = [], isLoading: workoutTemplatesLoading }       = useMyRoutineTemplates('workout');
  const { data: nutritionTemplates = [], isLoading: nutritionTemplatesLoading }   = useMyRoutineTemplates('nutrition');
  const { data: supplementTemplates = [], isLoading: supplementTemplatesLoading } = useMyRoutineTemplates('supplement');

  const { mutateAsync: saveRoutineTemplate, isPending: savingRoutine } = useSaveRoutineTemplate();

  const { mutateAsync: applyWorkoutRoutine, isPending: applyingWorkoutRoutine }       = useApplyRoutineTemplate('workout');
  const { mutateAsync: applyNutritionRoutine, isPending: applyingNutritionRoutine }   = useApplyRoutineTemplate('nutrition');
  const { mutateAsync: applySupplementRoutine, isPending: applyingSupplementRoutine } = useApplyRoutineTemplate('supplement');

  const { mutateAsync: deleteWorkoutTemplate }    = useDeleteRoutineTemplate('workout');
  const { mutateAsync: deleteNutritionTemplate }  = useDeleteRoutineTemplate('nutrition');
  const { mutateAsync: deleteSupplementTemplate } = useDeleteRoutineTemplate('supplement');

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

     const { logs, grouped, weekStart, isLoading, shouldInit, initWeek, needsWaterSeed, ensureWaterSeeded, batchSave, isSaving, addItem, removeItem } =
    useManualLog(userId, profile, selectedWeekStart);

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

  // Snapshot the currently-open day's items for one domain into a named,
  // reusable template (see useWorkoutRoutineTemplates.ts / the collect*
  // helpers above).
  const handleSaveRoutine = useCallback(async (
    domain: RoutineDomain, name: string, closeModal: () => void, emptyMessage: string,
  ) => {
    const dayData = resolvedGrouped[selectedDay] || {};
    const items =
      domain === 'workout'    ? collectWorkoutRoutineItems(dayData) :
      domain === 'nutrition'  ? collectNutritionRoutineItems(dayData) :
                                 collectSupplementRoutineItems(dayData);
    if (items.length === 0) {
      Alert.alert('Nothing to save', emptyMessage);
      return;
    }
    try {
      await saveRoutineTemplate({ name, domain, items });
      closeModal();
      Alert.alert('Saved', `"${name}" saved with ${items.length} item${items.length !== 1 ? 's' : ''}.`);
    } catch (e: any) {
      Alert.alert('Could not save routine', e?.message ?? 'Please try again.');
    }
  }, [resolvedGrouped, selectedDay, saveRoutineTemplate]);

  // Applies a saved template's items to the resolved target dates via
  // whichever domain's apply-mutation is passed in, replacing only the
  // client's own existing items on those days (see useApplyRoutineTemplate
  // — coach-assigned exercises are never touched, and past dates/Sundays
  // are silently skipped).
  const handleApplyRoutine = useCallback(async (
    applyFn: (args: { items: RoutineTemplateItem[]; targetDates: Date[] }) => Promise<{ appliedCount: number; skippedPast: number; skippedSunday: number }>,
    closeModal: () => void,
    template: RoutineTemplate,
    targetDates: Date[],
  ) => {
    try {
      const result = await applyFn({ items: template.items, targetDates });
      closeModal();
      const parts = [`Applied "${template.name}" to ${result.appliedCount} day${result.appliedCount !== 1 ? 's' : ''}.`];
      if (result.skippedPast)   parts.push(`${result.skippedPast} past date${result.skippedPast !== 1 ? 's were' : ' was'} skipped.`);
      if (result.skippedSunday) parts.push(`${result.skippedSunday} Sunday${result.skippedSunday !== 1 ? 's were' : ' was'} skipped (rest day).`);
      Alert.alert('Routine applied', parts.join(' '));
      queryClient.invalidateQueries({ queryKey: ['manual_logs', userId] });
    } catch (e: any) {
      Alert.alert('Could not apply routine', e?.message ?? 'Please try again.');
    }
  }, [queryClient, userId]);

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
    // Food's "Write manually"/My List can pick a different meal-time section
    // than the one whose "+" opened the modal — payload.mealSlot wins over
    // the closed-over section when present.
    const { scope, mealSlot: payloadMealSlot, ...itemPayload } = payload;
    const effectiveMealSlot = payloadMealSlot ?? mealSlot;
    const relevantItemsForOrder = payloadMealSlot
      ? itemsForOrder.filter((i: any) => i.meal_slot === effectiveMealSlot)
      : itemsForOrder;
    const realOrders = relevantItemsForOrder.map((i: any) => i.item_order || 0);
    const nextOrder  = realOrders.length ? Math.max(...realOrders) + 1 : 1;

    // For supplements with week/month scope, bulk-insert across multiple days
    if (itemType === 'supplement' && (scope === 'week' || scope === 'month')) {
      // Determine which (weekStart, dayNumber) pairs to insert
      const pairs: { ws: string; dn: number }[] = [];

      if (scope === 'week') {
        for (let d = 1; d <= 6; d++) pairs.push({ ws: weekStart, dn: d });
      } else {
        // month: find every Monday whose week overlaps with the calendar month of
        // the day currently being viewed — NOT the device's real-world "today". Using
        // real-world today here meant adding from a past/future week (e.g. browsing
        // back to last month) silently dropped that week's boundary days whenever they
        // fell outside real-world today's month.
        const [wy, wm, wd] = weekStart.split('-').map(Number);
        const viewedDate = new Date(wy, wm - 1, wd + (dayNumber - 1));
        const year = viewedDate.getFullYear();
        const month = viewedDate.getMonth(); // 0-indexed
        const firstDay = new Date(year, month, 1);
        const lastDay  = new Date(year, month + 1, 0);
        // Walk from the Monday at-or-before the 1st, to the Monday on-or-after the last
        const firstMon = new Date(firstDay);
        const dow0 = firstMon.getDay();
        firstMon.setDate(firstMon.getDate() - (dow0 === 0 ? 6 : dow0 - 1));
        for (let mon = new Date(firstMon); mon <= lastDay; mon.setDate(mon.getDate() + 7)) {
          const ws = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
          for (let d = 1; d <= 6; d++) {
            // actual calendar date for this (ws, d)
            const actualDate = new Date(mon);
            actualDate.setDate(actualDate.getDate() + d - 1);
            // only include days that fall within this calendar month
            if (actualDate >= firstDay && actualDate <= lastDay) {
              pairs.push({ ws, dn: d });
            }
          }
        }
      }

      const rows = pairs.map(({ ws, dn }) => ({
        client_id:       userId,
        week_start_date: ws,
        day_number:      dn,
        item_type:       'supplement',
        item_name:       itemPayload.itemName,
        item_order:      nextOrder,
        completed:       false,
        meal_slot:       effectiveMealSlot ?? null,
        quantity:        itemPayload.quantity ?? null,
        is_custom:       true,
      }));

      const { error } = await supabase.from('manual_workout_logs').upsert(rows, {
        onConflict: 'client_id,week_start_date,day_number,item_type,item_name,meal_slot',
        ignoreDuplicates: true,
      });
      if (error) throw error;
      // Invalidate all weeks for this user so any visible week re-fetches
      queryClient.invalidateQueries({ queryKey: ['manual_logs', userId] });
      return;
    }

    await addItem({ dayNumber, itemType, itemOrder: nextOrder, mealSlot: effectiveMealSlot, ...itemPayload });
  }, [addItem, weekStart, userId]);

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
      queryClient.invalidateQueries({ queryKey: ['training_load', userId] });
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
        ref={scrollViewRef}
        contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE, paddingHorizontal: 16 }}
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
              scrollViewRef={scrollViewRef}
              onOpenSaveRoutine={() => setWorkoutRoutineModal('save')}
              onOpenAddRoutine={() => setWorkoutRoutineModal('add')}
              onOpenSaveNutritionRoutine={() => setNutritionRoutineModal('save')}
              onOpenAddNutritionRoutine={() => setNutritionRoutineModal('add')}
              onOpenSaveSupplementRoutine={() => setSupplementRoutineModal('save')}
              onOpenAddSupplementRoutine={() => setSupplementRoutineModal('add')}
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

      {/* Workout routine modals */}
      <SaveRoutineModal
        visible={workoutRoutineModal === 'save'}
        onClose={() => setWorkoutRoutineModal(null)}
        onSave={(name) => handleSaveRoutine('workout', name, () => setWorkoutRoutineModal(null), 'Add at least one exercise to Warmup, Workout, or Cool-down before saving a routine.')}
        saving={savingRoutine}
        description="Saves every exercise currently in Warmup, Workout, and Cool-down for this day, so you can reapply the whole set later."
        namePlaceholder="e.g. Day 1 Push Routine"
      />
      <AddRoutineModal
        visible={workoutRoutineModal === 'add'}
        onClose={() => setWorkoutRoutineModal(null)}
        templates={workoutTemplates}
        loadingTemplates={workoutTemplatesLoading}
        onApply={(template, dates) => handleApplyRoutine(applyWorkoutRoutine, () => setWorkoutRoutineModal(null), template, dates)}
        onDelete={deleteWorkoutTemplate}
        applying={applyingWorkoutRoutine}
        weekStart={weekStart}
        selectedDay={selectedDay}
        itemLabel="exercise"
        emptyStateMessage="No saved routines yet — build a day's exercises, then tap Save Routine."
      />

      {/* Nutrition routine modals */}
      <SaveRoutineModal
        visible={nutritionRoutineModal === 'save'}
        onClose={() => setNutritionRoutineModal(null)}
        onSave={(name) => handleSaveRoutine('nutrition', name, () => setNutritionRoutineModal(null), 'Add at least one item to a meal slot before saving a routine.')}
        saving={savingRoutine}
        description="Saves every item currently in your meal slots for this day (not Confession Booth), so you can reapply the whole set later."
        namePlaceholder="e.g. High Protein Day"
      />
      <AddRoutineModal
        visible={nutritionRoutineModal === 'add'}
        onClose={() => setNutritionRoutineModal(null)}
        templates={nutritionTemplates}
        loadingTemplates={nutritionTemplatesLoading}
        onApply={(template, dates) => handleApplyRoutine(applyNutritionRoutine, () => setNutritionRoutineModal(null), template, dates)}
        onDelete={deleteNutritionTemplate}
        applying={applyingNutritionRoutine}
        weekStart={weekStart}
        selectedDay={selectedDay}
        itemLabel="item"
        emptyStateMessage="No saved routines yet — build a day's meals, then tap Save Routine."
      />

      {/* Supplement routine modals */}
      <SaveRoutineModal
        visible={supplementRoutineModal === 'save'}
        onClose={() => setSupplementRoutineModal(null)}
        onSave={(name) => handleSaveRoutine('supplement', name, () => setSupplementRoutineModal(null), 'Add at least one supplement before saving a routine.')}
        saving={savingRoutine}
        description="Saves every supplement currently scheduled across all 5 slots for this day, so you can reapply the whole set later."
        namePlaceholder="e.g. Standard Stack"
      />
      <AddRoutineModal
        visible={supplementRoutineModal === 'add'}
        onClose={() => setSupplementRoutineModal(null)}
        templates={supplementTemplates}
        loadingTemplates={supplementTemplatesLoading}
        onApply={(template, dates) => handleApplyRoutine(applySupplementRoutine, () => setSupplementRoutineModal(null), template, dates)}
        onDelete={deleteSupplementTemplate}
        applying={applyingSupplementRoutine}
        weekStart={weekStart}
        selectedDay={selectedDay}
        itemLabel="supplement"
        emptyStateMessage="No saved routines yet — build a day's supplement schedule, then tap Save Routine."
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
    <SafeAreaView testID="workout-plan-screen" style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
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
  sectionGroup: { marginTop: 14, marginHorizontal: 14 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 10, marginBottom: 3 },
  sectionIcon:  { fontSize: 15 },
  sectionLabel: { fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, letterSpacing: 0.3, flex: 1 },
  sectionPill:  { borderWidth: 1, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  sectionPillText: { fontSize: 12, fontFamily: THEME.fonts.sansMedium },
  sectionChevron:  { color: THEME.colors.textMuted, fontSize: 14 },
  sectionItems: { paddingHorizontal: 4 },
  // Outer category card — wraps the 5 Nutrition or 5 Supplement SectionGroups
  // so they read as one deliberate category (rounded card, soft elevation,
  // generous internal breathing room) instead of a loose stack. Borrows the
  // "rounded stat-card rows with calm separation" quality from the
  // habit-tracker / Kalo references — color stays whatever is passed via the
  // header's inline tint, base card uses existing THEME tokens only.
  categoryCard: {
    marginHorizontal: 14,
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: THEME.colors.surface2,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  categoryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  categoryCardIcon: { fontSize: 16 },
  categoryCardLabel: { fontSize: 14.5, fontFamily: THEME.fonts.sansMedium, letterSpacing: 0.3 },
  categoryCardBody: { paddingVertical: 4, paddingBottom: 10 },
  logRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  logItemName:  { flex: 1, color: THEME.colors.textSecondary, fontSize: 13.5, fontFamily: THEME.fonts.sans, lineHeight: 19 },
  logItemDone:  { color: THEME.colors.textMuted, textDecorationLine: 'line-through' },
  logItemDetail:{ color: THEME.colors.textMuted, fontSize: 11, fontFamily: THEME.fonts.sans, marginTop: 3 },
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
  suppGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 4 },
  suppGridCell:    {
    width: '47%', aspectRatio: 0.68, borderRadius: 16, borderWidth: 1.5,
    backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 10, paddingTop: 12, paddingBottom: 10, gap: 8,
  },
  suppAddCell:     { borderStyle: 'dashed', backgroundColor: 'transparent' },
  suppGridImageWrap: { width: '72%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.colors.surface3 },
  suppGridImage:   { width: '100%', height: '100%' },
  suppGridName:    { fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, textAlign: 'center', lineHeight: 17, textDecorationLine: 'underline' },
  suppCheckBadge:  { position: 'absolute', top: 8, left: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  suppCoachBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: `${THEME.colors.amber}20` },
  suppCoachBadgeText: { fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber },
  suppRemoveX:     { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  suppPreviewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  suppPreviewCard: { width: '100%', maxWidth: 340, backgroundColor: THEME.colors.surface2, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border },
  suppPreviewImageWrap: { width: 220, height: 220, borderRadius: 16, backgroundColor: THEME.colors.surface3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 18 },
  suppPreviewImage: { width: '100%', height: '100%' },
  suppPreviewName: { fontSize: 17, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, textAlign: 'center', lineHeight: 23, marginBottom: 20 },
  suppPreviewCloseBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, backgroundColor: THEME.colors.teal },
  suppPreviewCloseBtnText: { color: THEME.colors.background, fontFamily: THEME.fonts.sansSemibold, fontSize: 14 },
  slotPillWrap:          { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 },
  slotPillTrack:         { flexDirection: 'row' },
  slotPillSegment:       { flex: 1 },
  slotPillSegmentTrack:  { height: 7, borderRadius: 4, backgroundColor: THEME.colors.surface3, overflow: 'hidden' },
  slotPillSegmentFill:   { height: '100%', borderRadius: 4 },
  slotPillLabelsRow:     { flexDirection: 'row', marginTop: 6 },
  slotPillLabel:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  slotPillLabelText:     { fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted },
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

