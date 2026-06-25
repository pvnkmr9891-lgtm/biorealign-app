// src/app/(tabs)/manual-log.jsx
// ─────────────────────────────────────────────────────────────
// Manual Workout Log — V1
// 6-day checklist: warmup · workout · cooldown · water · food
// Dark luxury theme matching BioRealign brand
// ─────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { useManualLog, isToday, isPast, getDayDate } from '../../src/hooks/useManualLog';

// Create a local client — only used if no parent provider exists
const queryClient = new QueryClient();

export default function ManualLogScreen() {
  return (
    <QueryClientProvider client={queryClient}>
      <ManualLogContent />
    </QueryClientProvider>
  );
}
// ──────────────────────────────────────────────────────────────
//  CONSTANTS
// ──────────────────────────────────────────────────────────────
const C = {
  bg:      '#0A0A0B',
  bg2:     '#111113',
  bg3:     '#18181C',
  bg4:     '#1F1F25',
  teal:    '#00C4B4',
  teal15:  'rgba(0,196,180,0.15)',
  teal08:  'rgba(0,196,180,0.08)',
  amber:   '#E8A44A',
  amber15: 'rgba(232,164,74,0.15)',
  green:   '#4CC986',
  green15: 'rgba(76,201,134,0.15)',
  red:     '#E85555',
  text:    '#F0EEE8',
  text2:   '#A8A49C',
  text3:   '#6C6860',
  border:  '#2A2A30',
  border2: 'rgba(255,255,255,0.06)',
};

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SECTIONS = [
  { key: 'warmup',   label: 'Warm-up',     icon: '🔥', color: C.amber,  bgColor: C.amber15 },
  { key: 'workout',  label: 'Workout',     icon: '💪', color: C.teal,   bgColor: C.teal15  },
  { key: 'cooldown', label: 'Cool-down',   icon: '🧘', color: '#7EC8E3', bgColor: 'rgba(126,200,227,0.12)' },
  { key: 'water',    label: 'Water Intake',icon: '💧', color: '#64B5F6', bgColor: 'rgba(100,181,246,0.12)' },
  { key: 'food',     label: 'Food Intake', icon: '🍽', color: C.green,  bgColor: C.green15 },
];

// ──────────────────────────────────────────────────────────────
//  ANIMATED CHECKBOX
// ──────────────────────────────────────────────────────────────
function Checkbox({ checked, onPress, disabled, color = C.teal }) {
  const scale  = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const bounce = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue:        checked ? 1 : 0,
      useNativeDriver: true,
      tension:         200,
      friction:         8,
    }).start();
  }, [checked]);

  function handlePress() {
    if (disabled || checked) return;
    // Brief scale-down tap feedback
    Animated.sequence([
      Animated.timing(bounce, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(bounce,  { toValue: 1,    tension: 300, friction: 8, useNativeDriver: true }),
    ]).start();
    onPress();
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || checked}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View
        style={[
          styles.checkOuter,
          { borderColor: checked ? color : C.border },
          checked && { backgroundColor: color },
          { transform: [{ scale: bounce }] },
        ]}
      >
        {/* Checkmark tick (scale in on check) */}
        <Animated.View style={{ transform: [{ scale }] }}>
          <Text style={styles.checkTick}>✓</Text>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ──────────────────────────────────────────────────────────────
//  LOG ITEM ROW
// ──────────────────────────────────────────────────────────────
function LogItem({ item, onCheck, sectionColor }) {
  const rowOpacity = useRef(new Animated.Value(1)).current;

  function handleCheck() {
    Animated.sequence([
      Animated.timing(rowOpacity, { toValue: 0.5, duration: 120, useNativeDriver: true }),
      Animated.timing(rowOpacity, { toValue: 1,   duration: 120, useNativeDriver: true }),
    ]).start();
    onCheck(item.id);
  }

  const timeLabel = item.completed_at
    ? new Date(item.completed_at).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : null;

  return (
    <Animated.View style={[styles.logRow, { opacity: rowOpacity }]}>
      <Checkbox
        checked={item.completed}
        onPress={handleCheck}
        disabled={item.completed}
        color={sectionColor}
      />
      <Text
        style={[
          styles.logItemName,
          item.completed && styles.logItemNameDone,
        ]}
        numberOfLines={2}
      >
        {item.item_name}
      </Text>
      {timeLabel && (
        <Text style={styles.logTime}>{timeLabel}</Text>
      )}
    </Animated.View>
  );
}

// ──────────────────────────────────────────────────────────────
//  SECTION GROUP
// ──────────────────────────────────────────────────────────────
function SectionGroup({ sectionKey, items = [], onCheck }) {
  const meta = SECTIONS.find((s) => s.key === sectionKey) || SECTIONS[1];
  const done = items.filter((i) => i.completed).length;
  const all  = items.length;
  const allDone = done === all && all > 0;

  if (!items.length) return null;

  return (
    <View style={styles.sectionGroup}>
      {/* Section header */}
      <View style={[styles.sectionHeader, { backgroundColor: meta.bgColor }]}>
        <Text style={styles.sectionIcon}>{meta.icon}</Text>
        <Text style={[styles.sectionLabel, { color: meta.color }]}>{meta.label}</Text>
        <View style={[
          styles.sectionCount,
          { backgroundColor: allDone ? meta.bgColor : C.bg4,
            borderColor:      allDone ? meta.color  : C.border },
        ]}>
          <Text style={[styles.sectionCountText, { color: allDone ? meta.color : C.text3 }]}>
            {done}/{all}
          </Text>
        </View>
      </View>

      {/* Items */}
      <View style={styles.sectionItems}>
        {items.map((item) => (
          <LogItem
            key={item.id}
            item={item}
            onCheck={onCheck}
            sectionColor={meta.color}
          />
        ))}
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
//  MINI PROGRESS BAR
// ──────────────────────────────────────────────────────────────
function ProgressBar({ percent, color = C.teal }) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue:        percent,
      duration:        600,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            width: width.interpolate({
              inputRange:  [0, 100],
              outputRange: ['0%', '100%'],
            }),
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
//  DAY CARD
// ──────────────────────────────────────────────────────────────
function DayCard({ dayNumber, grouped, weekStart, onCheck, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const dayData   = grouped[dayNumber] || {};
  const today     = isToday(weekStart, dayNumber);
  const past      = isPast(weekStart, dayNumber);
  const dayDate   = getDayDate(weekStart, dayNumber);
  const dateLabel = dayDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  // Progress
  let total = 0;
  let done  = 0;
  Object.values(dayData).forEach((items) => {
    total += items.length;
    done  += items.filter((i) => i.completed).length;
  });
  const pct = total ? Math.round((done / total) * 100) : 0;
  const allDone = pct === 100;

  const progressColor = allDone ? C.green : today ? C.teal : C.amber;

  // Animated arrow
  const arrowRot = useRef(new Animated.Value(open ? 1 : 0)).current;
  function toggle() {
    const next = !open;
    setOpen(next);
    Animated.spring(arrowRot, {
      toValue:        next ? 1 : 0,
      useNativeDriver: true,
      tension:         200,
      friction:         10,
    }).start();
  }
  const arrowDeg = arrowRot.interpolate({
    inputRange: [0, 1], outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={[
      styles.dayCard,
      today && styles.dayCardToday,
      allDone && styles.dayCardDone,
    ]}>
      {/* Card header */}
      <TouchableOpacity
        style={styles.dayHeader}
        onPress={toggle}
        activeOpacity={0.75}
      >
        {/* Day badge */}
        <View style={[
          styles.dayBadge,
          today ? { backgroundColor: C.teal } :
          allDone ? { backgroundColor: C.green } :
          { backgroundColor: C.bg4 }
        ]}>
          <Text style={[
            styles.dayBadgeNum,
            { color: today || allDone ? '#000' : C.text2 }
          ]}>
            {dayNumber}
          </Text>
        </View>

        {/* Day info */}
        <View style={styles.dayInfo}>
          <View style={styles.dayTitleRow}>
            <Text style={styles.dayName}>{DAY_NAMES[dayNumber - 1]}</Text>
            {today && (
              <View style={styles.todayPill}>
                <Text style={styles.todayPillText}>TODAY</Text>
              </View>
            )}
            {allDone && (
              <View style={styles.donePill}>
                <Text style={styles.donePillText}>✓ DONE</Text>
              </View>
            )}
          </View>
          <Text style={styles.dayDate}>{dateLabel}</Text>
          <ProgressBar percent={pct} color={progressColor} />
        </View>

        {/* Right: percent + arrow */}
        <View style={styles.dayRight}>
          <Text style={[styles.dayPct, { color: allDone ? C.green : today ? C.teal : C.text3 }]}>
            {pct}%
          </Text>
          <Animated.Text style={[styles.arrow, { transform: [{ rotate: arrowDeg }] }]}>
            ▾
          </Animated.Text>
        </View>
      </TouchableOpacity>

      {/* Card body */}
      {open && (
        <View style={styles.dayBody}>
          <View style={styles.dayDivider} />
          {SECTIONS.map(({ key }) => (
            <SectionGroup
              key={key}
              sectionKey={key}
              items={dayData[key] || []}
              onCheck={(id) => onCheck({ id })}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
//  WEEK SUMMARY BANNER
// ──────────────────────────────────────────────────────────────
function WeekSummary({ grouped, weekStart }) {
  let total = 0;
  let done  = 0;
  for (let d = 1; d <= 6; d++) {
    const day = grouped[d] || {};
    Object.values(day).forEach((items) => {
      total += items.length;
      done  += items.filter((i) => i.completed).length;
    });
  }
  const pct = total ? Math.round((done / total) * 100) : 0;

  const start = new Date(weekStart);
  const end   = new Date(weekStart);
  end.setDate(end.getDate() + 5);
  const rangeLabel = `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;

  return (
    <View style={styles.weekBanner}>
      <View>
        <Text style={styles.weekRangeLabel}>{rangeLabel}</Text>
        <Text style={styles.weekProgressLabel}>
          {done} of {total} tasks completed
        </Text>
      </View>
      <View style={styles.weekCircle}>
        <Text style={styles.weekPct}>{pct}%</Text>
        <Text style={styles.weekPctSub}>done</Text>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
//  EMPTY / LOADING STATES
// ──────────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator color={C.teal} size="large" />
      <Text style={styles.centerText}>Loading your workout log…</Text>
    </View>
  );
}

function InitialisingState() {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator color={C.teal} size="large" />
      <Text style={styles.centerText}>Setting up this week's plan…</Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
//  MAIN SCREEN
// ──────────────────────────────────────────────────────────────
export default function ManualLogScreen() {
  return (
    <QueryClientProvider client={queryClient}>
      <ManualLogContent />
    </QueryClientProvider>
  );
}

// Rename your existing function from ManualLogScreen to ManualLogContent
function ManualLogContent() {
  const insets = useSafeAreaInsets();

  // Get authenticated user
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data?.session?.user?.id ?? null);
    });
  }, []);

  const { logs, grouped, weekStart, isLoading, shouldInit, initWeek, checkItem } =
    useManualLog(userId);

  // Auto-init week when there are no logs
  const didInit = useRef(false);
  useEffect(() => {
    if (shouldInit && userId && !didInit.current) {
      didInit.current = true;
      initWeek();
    }
  }, [shouldInit, userId]);

  // ── Render ────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Manual Log</Text>
          <Text style={styles.headerSub}>6-day workout & habit tracker</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>V1</Text>
        </View>
      </View>

      {/* ── Content ── */}
      {isLoading ? (
        <LoadingState />
      ) : shouldInit ? (
        <InitialisingState />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Week summary */}
          <WeekSummary grouped={grouped} weekStart={weekStart} />

          {/* Legend */}
          <View style={styles.legend}>
            {SECTIONS.map(({ key, icon, label, color }) => (
              <View key={key} style={styles.legendItem}>
                <Text style={styles.legendIcon}>{icon}</Text>
                <Text style={[styles.legendLabel, { color }]}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Day cards */}
          {[1, 2, 3, 4, 5, 6].map((dayNum) => (
            <DayCard
              key={dayNum}
              dayNumber={dayNum}
              grouped={grouped}
              weekStart={weekStart}
              onCheck={checkItem}
              defaultOpen={isToday(weekStart, dayNum)}
            />
          ))}

          {/* Footer note */}
          <Text style={styles.footerNote}>
            Items can be marked at any time during the day.{'\n'}
            Check marks are permanent once submitted.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
//  STYLES
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // ── Header ──
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical:   16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor:   C.bg2,
  },
  headerTitle: {
    color:      C.text,
    fontSize:   22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSub: {
    color:    C.text3,
    fontSize: 12,
    marginTop: 2,
  },
  headerBadge: {
    backgroundColor: C.teal15,
    borderWidth:     1,
    borderColor:     'rgba(0,196,180,0.3)',
    borderRadius:    20,
    paddingHorizontal: 10,
    paddingVertical:    4,
  },
  headerBadgeText: {
    color:      C.teal,
    fontSize:   11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap:     12,
  },

  // ── Week banner ──
  weekBanner: {
    backgroundColor:   C.bg2,
    borderWidth:       1,
    borderColor:       C.border,
    borderRadius:      14,
    padding:           18,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    marginBottom:       4,
  },
  weekRangeLabel: {
    color:    C.text3,
    fontSize: 12,
    fontWeight: '500',
  },
  weekProgressLabel: {
    color:    C.text,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  weekCircle: {
    width:          56,
    height:         56,
    borderRadius:   28,
    borderWidth:     2,
    borderColor:    C.teal,
    alignItems:     'center',
    justifyContent: 'center',
    backgroundColor: C.teal08,
  },
  weekPct: {
    color:    C.teal,
    fontSize: 15,
    fontWeight: '800',
  },
  weekPctSub: {
    color:    C.text3,
    fontSize: 9,
    fontWeight: '500',
    marginTop: -1,
  },

  // ── Legend ──
  legend: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:            8,
    marginBottom:   4,
  },
  legendItem: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:             4,
    backgroundColor: C.bg2,
    borderWidth:     1,
    borderColor:    C.border,
    borderRadius:   20,
    paddingHorizontal: 10,
    paddingVertical:    5,
  },
  legendIcon:  { fontSize: 11 },
  legendLabel: { fontSize: 11, fontWeight: '500' },

  // ── Day card ──
  dayCard: {
    backgroundColor: C.bg2,
    borderWidth:     1,
    borderColor:     C.border,
    borderRadius:    14,
    overflow:        'hidden',
  },
  dayCardToday: {
    borderColor: 'rgba(0,196,180,0.35)',
  },
  dayCardDone: {
    borderColor: 'rgba(76,201,134,0.3)',
  },

  dayHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    padding:        14,
    gap:            12,
  },

  dayBadge: {
    width:          38,
    height:         38,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  dayBadgeNum: {
    fontSize:   16,
    fontWeight: '800',
  },

  dayInfo: {
    flex: 1,
    gap:   3,
  },
  dayTitleRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:            6,
  },
  dayName: {
    color:    C.text,
    fontSize: 15,
    fontWeight: '600',
  },
  todayPill: {
    backgroundColor: 'rgba(0,196,180,0.12)',
    borderWidth:     1,
    borderColor:     'rgba(0,196,180,0.3)',
    borderRadius:    10,
    paddingHorizontal: 7,
    paddingVertical:   2,
  },
  todayPillText: {
    color:    C.teal,
    fontSize:  9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  donePill: {
    backgroundColor: 'rgba(76,201,134,0.12)',
    borderWidth:     1,
    borderColor:     'rgba(76,201,134,0.3)',
    borderRadius:    10,
    paddingHorizontal: 7,
    paddingVertical:   2,
  },
  donePillText: {
    color:    C.green,
    fontSize:  9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  dayDate: {
    color:    C.text3,
    fontSize: 12,
  },

  dayRight: {
    alignItems:  'center',
    gap:          4,
    flexShrink:   0,
  },
  dayPct: {
    fontSize:   13,
    fontWeight: '700',
  },
  arrow: {
    color:    C.text3,
    fontSize: 16,
  },

  dayDivider: {
    height:          1,
    backgroundColor: C.border,
    marginHorizontal: 14,
  },
  dayBody: {
    paddingBottom: 8,
  },

  // ── Progress bar ──
  progressTrack: {
    height:          3,
    backgroundColor: C.bg4,
    borderRadius:    2,
    marginTop:       5,
    overflow:        'hidden',
  },
  progressFill: {
    height:       3,
    borderRadius: 2,
  },

  // ── Section group ──
  sectionGroup: {
    marginTop: 10,
    marginHorizontal: 14,
  },
  sectionHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:             8,
    paddingHorizontal: 12,
    paddingVertical:    8,
    borderRadius:       8,
    marginBottom:       2,
  },
  sectionIcon:  { fontSize: 14 },
  sectionLabel: {
    fontSize:   12,
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
  },
  sectionCount: {
    borderWidth:       1,
    borderRadius:      20,
    paddingHorizontal: 8,
    paddingVertical:   2,
  },
  sectionCountText: {
    fontSize:   11,
    fontWeight: '600',
  },

  // ── Section items ──
  sectionItems: {
    paddingHorizontal: 4,
  },

  // ── Log item row ──
  logRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap:             12,
    borderBottomWidth: 1,
    borderBottomColor: C.border2,
  },
  logItemName: {
    flex:     1,
    color:    C.text2,
    fontSize: 13,
    lineHeight: 19,
  },
  logItemNameDone: {
    color:           C.text3,
    textDecorationLine: 'line-through',
  },
  logTime: {
    color:    C.text3,
    fontSize: 11,
    flexShrink: 0,
  },

  // ── Checkbox ──
  checkOuter: {
    width:          22,
    height:         22,
    borderRadius:    6,
    borderWidth:     1.5,
    borderColor:    C.border,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  checkTick: {
    color:      '#000',
    fontSize:   13,
    fontWeight: '900',
    lineHeight: 16,
  },

  // ── States ──
  centerState: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            14,
  },
  centerText: {
    color:    C.text2,
    fontSize: 14,
  },

  footerNote: {
    color:     C.text3,
    fontSize:  12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop:  8,
  },
});
