// src/components/ui/WorkoutCalendar.tsx
// ─────────────────────────────────────────────────────────────────────
// Hovering workout calendar with:
//  • Month navigation (prev / next)
//  • Color-coded day completion (teal today, green/amber/red past)
//  • Plan range highlight (start → end date)
//  • Start date picker with intensity selector
//  • Persists to Supabase profiles table
// ─────────────────────────────────────────────────────────────────────

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { assignFBRBeginnerPlan, isFBRBeginner } from '@/hooks/useAssignWorkoutPlan';
import { getWeekStart } from '@/hooks/useManualLog';
import {
  View, Text, TouchableOpacity, Modal, Animated,
  StyleSheet, Platform, Alert, ActivityIndicator,
  Dimensions, ScrollView,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { THEME } from '@/constants/theme';
import { ADVANCED_TRACKING_ENABLED } from '@/constants/featureFlags';

const { width: SW } = Dimensions.get('window');

// ── Constants ─────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

const INTENSITY_CONFIG = {
  beginner: { weeks: 20, label: 'Beginner', color: '#10B981', icon: '🌱' },
  medium:   { weeks: 12, label: 'Medium',   color: '#E8A44A', icon: '⚡' },
  hard:     { weeks: 8,  label: 'Hard',     color: '#EF4444', icon: '🔥' },
} as const;

type Intensity = keyof typeof INTENSITY_CONFIG;

const TRAINING_CONFIG = {
  home:   { label: 'Home',   icon: '🏠' },
  gym:    { label: 'Gym',    icon: '🏋️' },
  hybrid: { label: 'Hybrid', icon: '🔄' },
} as const;

type TrainingType = keyof typeof TRAINING_CONFIG;

type DayStatus = 'complete' | 'partial' | 'missed' | 'rest' | 'future' | 'unknown';

const STATUS_DOT: Record<DayStatus, string> = {
  complete: '#4CC986',
  partial:  '#E8A44A',
  missed:   '#EF4444',
  rest:     'transparent',
  future:   'transparent',
  unknown:  'transparent',
};

// ── Helpers ───────────────────────────────────────────────────────────
function toStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function addWeeks(date: Date, n: number): Date {
  return addDays(date, n * 7);
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()     === b.getMonth()    &&
         a.getDate()      === b.getDate();
}

function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  const first   = new Date(year, month, 1);
  const daysInM = new Date(year, month + 1, 0).getDate();
  const startDow = (first.getDay() + 6) % 7; // Mon=0

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInM; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function getMonthWeekStarts(year: number, month: number): string[] {
  const starts: string[] = [];
  let cur = getMondayOfWeek(new Date(year, month, 1));
  const end = new Date(year, month + 1, 0);
  while (cur <= end) {
    starts.push(toStr(cur));
    cur = addDays(cur, 7);
  }
  return starts;
}

// ── Data hook ─────────────────────────────────────────────────────────
function useMonthData(userId: string, year: number, month: number) {
  const weekStarts = useMemo(() => getMonthWeekStarts(year, month), [year, month]);

  return useQuery({
    queryKey: ['calendar_month', userId, year, month],
    enabled:  !!userId,
    staleTime: 1000 * 60 * 3,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manual_workout_logs')
        .select('week_start_date, day_number, completed')
        .eq('client_id', userId)
        .in('week_start_date', weekStarts);

      if (error) throw error;

      const map: Record<string, { total: number; done: number }> = {};
      (data ?? []).forEach(log => {
        // day_number 1=Mon … 6=Sat; week_start_date is Monday
        const ws  = parseDate(log.week_start_date);
        const day = addDays(ws, log.day_number - 1);
        const key = toStr(day);
        if (!map[key]) map[key] = { total: 0, done: 0 };
        map[key].total++;
        if (log.completed) map[key].done++;
      });
      return map;
    },
  });
}

// ── Day cell ──────────────────────────────────────────────────────────
function DayCell({
  date, today, dateMap, startDate, endDate, onPress, selectedDate,
}: {
  date: Date | null;
  today: Date;
  dateMap: Record<string, { total: number; done: number }> | undefined;
  startDate: Date | null;
  endDate:   Date | null;
  onPress:   (d: Date) => void;
  selectedDate: Date | null;
}) {
  if (!date) return <View style={dc.empty} />;

  const key      = toStr(date);
  const isToday  = sameDay(date, today);
  const isPast   = date < today && !isToday;
  const isSunday = date.getDay() === 0;
  const isStart  = startDate ? sameDay(date, startDate) : false;
  const isEnd    = endDate   ? sameDay(date, endDate)   : false;
  const inPlan   = startDate && endDate
    ? (date >= startDate && date <= endDate) : false;
  const isSelected = selectedDate ? sameDay(date, selectedDate) : false;

  // ── Determine circle fill colour ──────────────────────────────
  let circleBg  = '#1C1C22';             // default dark circle
  let numColor  = 'rgba(255,255,255,0.45)';
  let ringColor: string | null = null;

  if (isToday) {
    circleBg = THEME.colors.teal;
    numColor = '#000';
  } else if (isPast && !isSunday) {
    // Color purely by logged completion for that date — independent of any plan range.
    const stats = dateMap?.[key];
    if (!stats || stats.total === 0 || stats.done === 0) {
      circleBg = '#C0392B';              // red — nothing done
      numColor = '#fff';
    } else if (stats.done < stats.total) {
      circleBg = '#D4A017';              // amber — partial
      numColor = '#000';
    } else {
      circleBg = '#27AE60';             // green — all done
      numColor = '#000';
    }
  } else if (isSunday) {
    circleBg = '#111115';               // dim for rest day
    numColor = 'rgba(255,255,255,0.18)';
  } else if (ADVANCED_TRACKING_ENABLED && inPlan && !isToday) {
    circleBg = 'rgba(0,196,180,0.13)'; // subtle teal for future plan days
    numColor = 'rgba(255,255,255,0.6)';
  }

  // Start / end / selected get a teal ring
  if (isStart || isEnd) ringColor = THEME.colors.teal;
  if (isSelected)       ringColor = THEME.colors.teal;

  return (
    <TouchableOpacity
      onPress={() => onPress(date)}
      activeOpacity={0.75}
      style={dc.cell}
    >
      {/* Outer ring for start / end / selected */}
      {ringColor && (
        <View style={[dc.ring, { borderColor: ringColor }]} />
      )}

      {/* Filled circle */}
      <View style={[dc.circle, { backgroundColor: circleBg }]}>
        <Text style={[dc.num, { color: numColor }]}>{date.getDate()}</Text>
      </View>

      {/* Start / end micro-label */}
      {isStart && <Text style={dc.microLabel}>start</Text>}
      {isEnd   && <Text style={dc.microLabel}>end</Text>}
    </TouchableOpacity>
  );
}

const CELL_W  = Math.floor((SW - 56) / 7);
const CIRCLE  = Math.min(CELL_W - 8, 38);

const dc = StyleSheet.create({
  empty:      { width: CELL_W, height: 54 },
  cell:       { width: CELL_W, height: 54, alignItems: 'center', justifyContent: 'center' },
  ring:       {
    position:     'absolute',
    width:        CIRCLE + 6,
    height:       CIRCLE + 6,
    borderRadius: (CIRCLE + 6) / 2,
    borderWidth:  1.5,
    borderColor:  THEME.colors.teal,
  },
  circle:     {
    width:        CIRCLE,
    height:       CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems:   'center',
    justifyContent: 'center',
  },
  num:        { fontSize: 13, fontFamily: 'DMSans-Medium' },
  microLabel: {
    position:   'absolute',
    bottom:     2,
    fontSize:   7,
    color:      THEME.colors.teal,
    fontFamily: 'DMSans-Medium',
    letterSpacing: 0.3,
  },
});

// ── Legend ────────────────────────────────────────────────────────────
function Legend() {
  const items = [
    { color: THEME.colors.teal, label: 'Today' },
    { color: '#4CC986',          label: 'All done' },
    { color: '#E8A44A',          label: 'Partial' },
    { color: '#EF4444',          label: 'Missed' },
  ];
  return (
    <View style={lg.row}>
      {items.map(item => (
        <View key={item.label} style={lg.item}>
          <View style={[lg.dot, { backgroundColor: item.color }]} />
          <Text style={lg.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const lg = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'center', gap: 14, paddingTop: 10 },
  item:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot:   { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 11, fontFamily: 'DMSans-Regular', color: THEME.colors.textMuted },
});

// ── Main calendar component ───────────────────────────────────────────
export function WorkoutCalendar({
  visible,
  onClose,
  userId,
  initialStartDate,
  initialIntensity,
  initialTrainingType,
  workoutProgramId,
  onSave,
  onDaySelect,
}: {
  visible:              boolean;
  onClose:              () => void;
  userId:               string;
  initialStartDate:     string | null;
  initialIntensity:     string | null;
  initialTrainingType?: string | null;
  workoutProgramId?:    string | null;
  onSave:               (startDate: string, intensity: Intensity, trainingType: TrainingType) => void;
  onDaySelect?:         (weekStart: string) => void;
}) {
  const today   = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const qClient = useQueryClient();

  const [year,         setYear]         = useState(today.getFullYear());
  const [month,        setMonth]        = useState(today.getMonth());
  const [startDate,    setStartDate]    = useState<Date | null>(
    initialStartDate ? parseDate(initialStartDate) : null
  );
  const [intensity,    setIntensity]    = useState<Intensity>(
    (initialIntensity as Intensity) ?? 'beginner'
  );
  const [trainingType, setTrainingType] = useState<TrainingType>(
    (initialTrainingType as TrainingType) ?? 'home'
  );
  const [selected,     setSelected]     = useState<Date | null>(null);
  const [saving,       setSaving]       = useState(false);

  // Sync from outside
  useEffect(() => {
    setStartDate(initialStartDate ? parseDate(initialStartDate) : null);
    setIntensity((initialIntensity as Intensity) ?? 'beginner');
    setTrainingType((initialTrainingType as TrainingType) ?? 'home');
  }, [initialStartDate, initialIntensity, initialTrainingType]);

  // Plan range
  const endDate = useMemo(() => {
    if (!startDate) return null;
    return addDays(addWeeks(startDate, INTENSITY_CONFIG[intensity].weeks), -1);
  }, [startDate, intensity]);

  // Monthly data
  const { data: dateMap, isLoading: dataLoading } = useMonthData(userId, year, month);

  // Grid
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  // Animation
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 120, friction: 10 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -20, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 0,   duration: 180, useNativeDriver: true }),
      ]).start(() => setShow(false));
    }
  }, [visible]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  function handleDayPress(date: Date) {
    setSelected(prev => prev && sameDay(prev, date) ? null : date);
  }

  async function handleSetStartDate() {
    if (!selected) return;
    setSaving(true);
    try {
      const dateStr = toStr(selected);
      const { error } = await supabase
        .from('profiles')
        .update({
          workout_start_date:    dateStr,
          workout_intensity:     intensity,
          workout_training_type: trainingType,
        })
        .eq('id', userId);

      if (error) throw error;

      // Refresh auth store so profile.workout_start_date is current on remount
      await useAuthStore.getState().fetchProfile(userId);

      setStartDate(selected);
      setSelected(null);
      onSave(dateStr, intensity, trainingType);
      qClient.invalidateQueries({ queryKey: ['calendar_month'] });

      // Directly seed manual_workout_logs for FBR beginner plans
      if (isFBRBeginner(workoutProgramId, intensity)) {
        const weekStart = getWeekStart();
        assignFBRBeginnerPlan(userId, trainingType, weekStart)
          .then(() => qClient.invalidateQueries({ queryKey: ['manual_logs', userId, weekStart] }))
          .catch(e => console.warn('[Plan] seed failed', e));
      }

      Alert.alert(
        '✅  Start date set',
        `Your ${INTENSITY_CONFIG[intensity].label} plan starts on ${selected.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      );
    } catch (err: any) {
      Alert.alert('Save failed', err.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleClearStartDate() {
    Alert.alert('Clear start date?', 'Your plan dates will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: async () => {
          await supabase.from('profiles').update({ workout_start_date: null }).eq('id', userId);
          setStartDate(null);
          setSelected(null);
          onSave('', intensity);
        },
      },
    ]);
  }

  const cfg = INTENSITY_CONFIG[intensity];

  return (
    <Modal transparent visible={show} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Calendar card */}
      <Animated.View style={[s.card, { transform: [{ translateY: slideAnim }], opacity: fadeAnim }]}>

        {/* ── Month header ── */}
        <View style={s.monthHeader}>
          <TouchableOpacity onPress={prevMonth} style={s.navBtn} activeOpacity={0.7}>
            <Text style={s.navArrow}>‹</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goToday} activeOpacity={0.7}>
            <Text style={s.monthTitle}>
              {MONTH_NAMES[month]}  {year}
            </Text>
            {(month !== today.getMonth() || year !== today.getFullYear()) && (
              <Text style={s.todayJump}>tap to return to today</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={nextMonth} style={s.navBtn} activeOpacity={0.7}>
            <Text style={s.navArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
            <Text style={s.closeX}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* ── Day-of-week labels ── */}
        <View style={s.dayLabels}>
          {DAY_LABELS.map(d => (
            <Text key={d} style={[s.dayLabel, d === 'Su' && s.dayLabelDim]}>{d}</Text>
          ))}
        </View>

        <View style={s.divider} />

        {/* ── Calendar grid ── */}
        {dataLoading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={THEME.colors.teal} size="small" />
          </View>
        ) : (
          <View style={s.grid}>
            {grid.map((week, wi) => (
              <View key={wi} style={s.week}>
                {week.map((date, di) => (
                  <DayCell
                    key={di}
                    date={date}
                    today={today}
                    dateMap={dateMap}
                    startDate={startDate}
                    endDate={endDate}
                    onPress={handleDayPress}
                    selectedDate={selected}
                  />
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={s.divider} />

        {/* ── Plan info — deferred to Pro version, see ADVANCED_TRACKING_ENABLED ── */}
        {ADVANCED_TRACKING_ENABLED && (
          <View style={s.planSection}>
            {startDate ? (
              <View style={s.planRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.planLabel}>Active plan</Text>
                  <Text style={s.planDates}>
                    {startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {'  →  '}
                    {endDate?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                  <Text style={[s.planBadge, { color: cfg.color }]}>
                    {cfg.icon}  {cfg.label}  ·  {cfg.weeks} weeks
                  </Text>
                </View>
                <TouchableOpacity onPress={handleClearStartDate} style={s.clearBtn}>
                  <Text style={s.clearBtnText}>Reset</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={s.planHint}>
                Tap any future date to set your workout plan start date
              </Text>
            )}
          </View>
        )}

        {/* ── Selected date action ── */}
        {selected && (
          <View style={s.actionSection}>
            <Text style={s.actionDate}>
              📅  {selected.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' })}
            </Text>

            {ADVANCED_TRACKING_ENABLED && (
              <>
                {/* Intensity picker (always shown so user can change plan intensity) */}
                <View style={s.intensityRow}>
                  {(Object.entries(INTENSITY_CONFIG) as [Intensity, typeof INTENSITY_CONFIG[Intensity]][]).map(([key, meta]) => (
                    <TouchableOpacity
                      key={key}
                      style={[s.intensityBtn, intensity === key && { borderColor: meta.color, backgroundColor: `${meta.color}18` }]}
                      onPress={() => setIntensity(key)}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 12 }}>{meta.icon}</Text>
                      <Text style={[s.intensityBtnText, intensity === key && { color: meta.color }]}>
                        {meta.label}
                      </Text>
                      <Text style={[s.intensityWks, intensity === key && { color: meta.color }]}>
                        {meta.weeks}w
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Training environment picker */}
                <View style={[s.intensityRow, { marginTop: 8 }]}>
                  {(Object.entries(TRAINING_CONFIG) as [TrainingType, typeof TRAINING_CONFIG[TrainingType]][]).map(([key, meta]) => (
                    <TouchableOpacity
                      key={key}
                      style={[s.intensityBtn, trainingType === key && { borderColor: '#A78BFA', backgroundColor: 'rgba(167,139,250,0.12)' }]}
                      onPress={() => setTrainingType(key)}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 12 }}>{meta.icon}</Text>
                      <Text style={[s.intensityBtnText, trainingType === key && { color: '#A78BFA' }]}>
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Action buttons row */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {onDaySelect && (
                <TouchableOpacity
                  style={[s.setBtn, { flex: 1, backgroundColor: 'rgba(0,196,180,0.12)', borderWidth: 1, borderColor: 'rgba(0,196,180,0.35)' }]}
                  onPress={() => {
                    const ws = getMondayOfWeek(selected);
                    onDaySelect(toStr(ws));
                    onClose();
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[s.setBtnText, { color: THEME.colors.teal }]}>View Week</Text>
                </TouchableOpacity>
              )}
              {ADVANCED_TRACKING_ENABLED && (
                <TouchableOpacity
                  style={[s.setBtn, { flex: 1 }, saving && { opacity: 0.6 }]}
                  onPress={handleSetStartDate}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving
                    ? <ActivityIndicator color="#000" size="small" />
                    : <Text style={s.setBtnText}>Set as Start</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── Legend ── */}
        <View style={s.divider} />
        <Legend />
        <View style={{ height: 10 }} />
      </Animated.View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
const CARD_W = SW - 32;

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    position:   'absolute',
    top:         Platform.OS === 'ios' ? 52 : 36,
    left:        16,
    width:       CARD_W,
    backgroundColor: '#13131A',
    borderRadius:    18,
    borderWidth:     0.5,
    borderColor:     'rgba(0,196,180,0.25)',
    overflow:        'hidden',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.5,
    shadowRadius:    24,
    elevation:       20,
  },

  // Month header
  monthHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical:   14,
  },
  navBtn:      { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  navArrow:    { color: THEME.colors.textPrimary, fontSize: 20, lineHeight: 22, fontFamily: 'DMSans-Medium' },
  monthTitle:  { color: THEME.colors.textPrimary, fontSize: 16, fontFamily: 'DMSans-Bold', textAlign: 'center' },
  todayJump:   { color: THEME.colors.teal, fontSize: 10, textAlign: 'center', fontFamily: 'DMSans-Regular', marginTop: 2 },
  closeBtn:    { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  closeX:      { color: THEME.colors.textMuted, fontSize: 13 },

  // Day labels
  dayLabels: {
    flexDirection:  'row',
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  dayLabel:    { width: (CARD_W - 28) / 7, textAlign: 'center', fontSize: 11, fontFamily: 'DMSans-Medium', color: THEME.colors.textMuted, letterSpacing: 0.3 },
  dayLabelDim: { color: 'rgba(255,255,255,0.2)' },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 0 },

  // Grid
  grid:        { paddingHorizontal: 14, paddingVertical: 6 },
  week:        { flexDirection: 'row' },
  loadingWrap: { height: 200, alignItems: 'center', justifyContent: 'center' },

  // Plan info
  planSection: { paddingHorizontal: 16, paddingVertical: 12 },
  planHint:    { color: THEME.colors.textMuted, fontSize: 12, fontFamily: 'DMSans-Regular', textAlign: 'center', lineHeight: 18 },
  planRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planLabel:   { color: THEME.colors.textMuted, fontSize: 10, fontFamily: 'DMSans-Medium', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  planDates:   { color: THEME.colors.textPrimary, fontSize: 13, fontFamily: 'DMSans-Bold', marginBottom: 3 },
  planBadge:   { fontSize: 12, fontFamily: 'DMSans-Medium' },
  clearBtn:    { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  clearBtnText:{ color: THEME.colors.textMuted, fontSize: 12, fontFamily: 'DMSans-Medium' },

  // Selected date action
  actionSection: {
    flexDirection: 'column',
    gap: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,196,180,0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,196,180,0.12)',
  },
  actionDate: { color: THEME.colors.textPrimary, fontSize: 13, fontFamily: 'DMSans-Medium', marginBottom: 8 },

  // Intensity picker
  intensityRow: { flexDirection: 'row', gap: 6 },
  intensityBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8, paddingVertical: 7,
  },
  intensityBtnText: { fontSize: 11, fontFamily: 'DMSans-Medium', color: THEME.colors.textMuted, flex: 1 },
  intensityWks:     { fontSize: 10, fontFamily: 'DMSans-Regular', color: THEME.colors.textMuted },

  // Set start button
  setBtn: {
    backgroundColor: THEME.colors.teal,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 76,
  },
  setBtnText: { color: '#000', fontSize: 13, fontFamily: 'DMSans-Bold' },
});
