import { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Animated, StyleSheet,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { THEME } from '@/constants/theme';

// ── Meal configuration (supports 5-meal beginner + 6-meal medium/hard) ────────
const MEAL_CONFIGS: Record<number, { label: string; time: string; icon: string; color: string }[]> = {
  5: [
    { label: 'Breakfast',     time: '7:00 AM',  icon: '🌅', color: '#FB923C' },
    { label: 'Mid-Morning',   time: '10:00 AM', icon: '🍎', color: '#FCD34D' },
    { label: 'Lunch',         time: '1:00 PM',  icon: '☀️', color: '#4ADE80' },
    { label: 'Evening Snack', time: '4:30 PM',  icon: '🌤', color: '#F59E0B' },
    { label: 'Dinner',        time: '7:30 PM',  icon: '🌙', color: '#818CF8' },
  ],
  6: [
    { label: 'Breakfast',      time: '7:00 AM',  icon: '🌅', color: '#FB923C' },
    { label: 'Mid-Morning',    time: '10:00 AM', icon: '🍎', color: '#FCD34D' },
    { label: 'Lunch',          time: '1:00 PM',  icon: '☀️', color: '#4ADE80' },
    { label: 'Activity Snack', time: '3:30 PM',  icon: '⚡', color: '#34D399' },
    { label: 'Evening Snack',  time: '5:00 PM',  icon: '🌤', color: '#F59E0B' },
    { label: 'Dinner',         time: '7:30 PM',  icon: '🌙', color: '#818CF8' },
  ],
  7: [
    { label: 'Breakfast',      time: '7:00 AM',  icon: '🌅', color: '#FB923C' },
    { label: 'Mid-Morning',    time: '10:00 AM', icon: '🍎', color: '#FCD34D' },
    { label: 'Pre-Activity',   time: '12:30 PM', icon: '⚡', color: '#34D399' },
    { label: 'Lunch',          time: '1:30 PM',  icon: '☀️', color: '#4ADE80' },
    { label: 'Post-Activity',  time: '3:30 PM',  icon: '💪', color: '#A78BFA' },
    { label: 'Evening Snack',  time: '5:30 PM',  icon: '🌤', color: '#F59E0B' },
    { label: 'Dinner',         time: '7:30 PM',  icon: '🌙', color: '#818CF8' },
  ],
};

const DEFAULT_TOTAL = 5;

// ── SVG arc helpers ───────────────────────────────────────────────────────────
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutArc(
  cx: number, cy: number, outer: number, inner: number,
  startDeg: number, endDeg: number,
): string {
  const o1 = polar(cx, cy, outer, startDeg);
  const o2 = polar(cx, cy, outer, endDeg);
  const i1 = polar(cx, cy, inner, endDeg);
  const i2 = polar(cx, cy, inner, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)}`,
    `L ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

const SZ    = 200;
const CX    = SZ / 2;
const CY    = SZ / 2;
const OUTER = 86;
const INNER = 34;
const GAP   = 6;

function buildSegments(total: number) {
  const step = 360 / total;
  return Array.from({ length: total }, (_, i) => ({
    path:      donutArc(CX, CY, OUTER, INNER, i * step + GAP / 2, (i + 1) * step - GAP / 2),
    iconPoint: polar(CX, CY, OUTER + 18, (i + 0.5) * step),
  }));
}

// ── Plate wheel ───────────────────────────────────────────────────────────────
function PlateWheel({
  filled,
  count,
  total,
  mealConfig,
}: {
  filled: boolean[];
  count: number;
  total: number;
  mealConfig: typeof MEAL_CONFIGS[5];
}) {
  const segments = buildSegments(total);
  const halfway  = Math.floor(total / 2);
  const motiv =
    count === 0       ? 'Time to fuel up!'  :
    count < halfway   ? 'Keep it going!'    :
    count === halfway ? 'Halfway there!'    :
    count < total     ? 'Almost done!'      :
                        'Plate complete! 🎉';

  return (
    <View style={plateStyles.wrap}>
      <View style={{ width: SZ, height: SZ }}>
        <Svg width={SZ} height={SZ} style={StyleSheet.absoluteFill}>
          {/* Track ring */}
          <Circle
            cx={CX} cy={CY}
            r={(OUTER + INNER) / 2}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={OUTER - INNER}
            fill="none"
          />
          {/* Donut segments */}
          {segments.map((seg, i) => (
            <Path
              key={i}
              d={seg.path}
              fill={filled[i] ? mealConfig[i].color : 'rgba(255,255,255,0.07)'}
              stroke={filled[i] ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.04)'}
              strokeWidth={0.8}
            />
          ))}
          {/* Center backdrop */}
          <Circle cx={CX} cy={CY} r={INNER - 3} fill="rgba(8,12,28,1)" />
        </Svg>

        {/* Meal icons positioned around the ring */}
        {segments.map((seg, i) => (
          <Text
            key={i}
            style={[
              plateStyles.segIcon,
              { left: seg.iconPoint.x - 11, top: seg.iconPoint.y - 11, opacity: filled[i] ? 1 : 0.3 },
            ]}
          >
            {mealConfig[i].icon}
          </Text>
        ))}

        {/* Center count */}
        <View style={plateStyles.center}>
          <Text style={plateStyles.countNum}>{count === total ? '🍽' : String(count)}</Text>
          <Text style={plateStyles.countSub}>/ {total} meals</Text>
          <Text style={plateStyles.motiv}>{motiv}</Text>
        </View>
      </View>
    </View>
  );
}

const plateStyles = StyleSheet.create({
  wrap:     { alignItems: 'center', paddingVertical: 10 },
  segIcon:  { position: 'absolute', fontSize: 16 },
  center:   { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  countNum: { fontSize: 24, fontFamily: THEME.fonts.sansMedium, color: '#fff', lineHeight: 28 },
  countSub: { fontSize: 9,  fontFamily: THEME.fonts.sans, color: 'rgba(255,255,255,0.3)', marginTop: 1 },
  motiv:    { fontSize: 9,  fontFamily: THEME.fonts.sans, color: 'rgba(255,255,255,0.4)', marginTop: 3, letterSpacing: 0.2 },
});

// ── Meal card ─────────────────────────────────────────────────────────────────
function MealCard({
  index,
  filled,
  description,
  onPress,
  locked,
  mealConfig,
}: {
  index: number;
  filled: boolean;
  description: string;
  onPress: (i: number) => void;
  locked?: boolean;
  mealConfig: typeof MEAL_CONFIGS[5];
}) {
  const meal       = mealConfig[index];
  const checkScale = useRef(new Animated.Value(filled ? 1 : 0)).current;
  const cardBump   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(checkScale, {
      toValue: filled ? 1 : 0,
      useNativeDriver: true,
      tension: 260,
      friction: 8,
    }).start();
  }, [filled]);

  function handlePress() {
    if (locked) return;
    Animated.sequence([
      Animated.timing(cardBump, { toValue: 0.97, duration: 55, useNativeDriver: true }),
      Animated.spring(cardBump, { toValue: 1, tension: 320, friction: 8, useNativeDriver: true }),
    ]).start();
    onPress(index);
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={locked ? 1 : 0.8}>
      {/* Outer Animated.View: native-driver card scale on tap */}
      <Animated.View
        style={[
          cardStyles.card,
          filled && { backgroundColor: `${meal.color}18`, borderColor: `${meal.color}30` },
          { transform: [{ scale: cardBump }] },
        ]}
      >
        {/* Left colour stripe */}
        <View style={[cardStyles.stripe, { backgroundColor: filled ? meal.color : 'rgba(255,255,255,0.07)' }]} />

        {/* Icon circle */}
        <View style={[cardStyles.iconWrap, { backgroundColor: filled ? `${meal.color}25` : 'rgba(255,255,255,0.05)' }]}>
          <Text style={cardStyles.icon}>{meal.icon}</Text>
        </View>

        {/* Text block */}
        <View style={cardStyles.textArea}>
          <View style={cardStyles.titleRow}>
            <Text style={[cardStyles.mealLabel, { color: filled ? meal.color : 'rgba(255,255,255,0.5)' }]}>
              {meal.label}
            </Text>
            <Text style={cardStyles.time}>{meal.time}</Text>
          </View>
          <Text
            style={[cardStyles.desc, { color: filled ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.36)' }]}
            numberOfLines={2}
          >
            {description}
          </Text>
        </View>

        {/* Check circle: outer ring (static View) + inner fill (native-driver Animated) */}
        <View style={[cardStyles.checkRing, { borderColor: filled ? meal.color : 'rgba(255,255,255,0.12)' }]}>
          <Animated.View
            style={[
              cardStyles.checkFill,
              { backgroundColor: meal.color, transform: [{ scale: checkScale }], opacity: checkScale },
            ]}
          >
            <Text style={cardStyles.checkTick}>✓</Text>
          </Animated.View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    marginBottom: 8,
    minHeight: 64,
  },
  stripe:    { width: 4, alignSelf: 'stretch', minHeight: 64 },
  iconWrap:  { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginHorizontal: 10, flexShrink: 0 },
  icon:      { fontSize: 17 },
  textArea:  { flex: 1, paddingRight: 8, paddingVertical: 10 },
  titleRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  mealLabel: { fontSize: 12, fontFamily: THEME.fonts.sansMedium, letterSpacing: 0.2 },
  time:      { fontSize: 10, fontFamily: THEME.fonts.sans, color: 'rgba(255,255,255,0.25)' },
  desc:      { fontSize: 12, fontFamily: THEME.fonts.sans, lineHeight: 17 },
  checkRing: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0,
    overflow: 'hidden',
  },
  checkFill: {
    position: 'absolute',
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  checkTick: { color: '#000', fontSize: 13, fontFamily: THEME.fonts.sansMedium, lineHeight: 16 },
});

// ── Main export ───────────────────────────────────────────────────────────────
export function FoodTracker({
  items,
  onToggle,
  locked,
}: {
  items: any[];
  onToggle: (id: string, checked: boolean) => void;
  locked?: boolean;
}) {
  const sorted      = [...items].sort((a, b) => (a.item_order ?? 0) - (b.item_order ?? 0));
  const total       = sorted.length || DEFAULT_TOTAL;
  const mealConfig  = MEAL_CONFIGS[total] ?? MEAL_CONFIGS[DEFAULT_TOTAL];
  const displayList = sorted.slice(0, total);
  const filledFlags = displayList.map(it => !!it.completed);
  const filledCount = filledFlags.filter(Boolean).length;

  const handlePress = useCallback((idx: number) => {
    if (locked) return;
    const item = displayList[idx];
    if (item) onToggle(item.id, item.completed);
  }, [displayList, locked, onToggle]);

  return (
    <View style={rootStyles.root}>
      {/* Header */}
      <View style={rootStyles.header}>
        <Text style={rootStyles.headerIcon}>🥗</Text>
        <Text style={rootStyles.headerTitle}>Nutrition Plan</Text>
        <View style={[
          rootStyles.badge,
          filledCount === total && { backgroundColor: 'rgba(74,222,128,0.15)', borderColor: 'rgba(74,222,128,0.4)' },
        ]}>
          <Text style={[rootStyles.badgeText, filledCount === total && { color: '#4ADE80' }]}>
            {filledCount}/{total}
          </Text>
        </View>
      </View>

      {/* Plate wheel */}
      <PlateWheel filled={filledFlags} count={filledCount} total={total} mealConfig={mealConfig} />

      {/* Divider */}
      <View style={rootStyles.divider} />

      {/* Meal cards */}
      <View style={rootStyles.cards}>
        {displayList.map((item, i) => (
          <MealCard
            key={item.id ?? i}
            index={i}
            filled={filledFlags[i]}
            description={item.item_name ?? ''}
            onPress={handlePress}
            locked={locked}
            mealConfig={mealConfig}
          />
        ))}
      </View>

      {!locked && (
        <Text style={rootStyles.tip}>Tap a card to log your meal</Text>
      )}
    </View>
  );
}

const rootStyles = StyleSheet.create({
  root: {
    backgroundColor: 'rgba(8,12,28,0.98)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.25)',
    overflow: 'hidden',
    paddingBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(251,146,60,0.07)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251,146,60,0.12)',
  },
  headerIcon:  { fontSize: 18 },
  headerTitle: { fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: '#FB923C', flex: 1 },
  badge: {
    backgroundColor: 'rgba(251,146,60,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.35)',
  },
  badgeText: { fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: '#FB923C' },
  divider:   { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 16, marginBottom: 12 },
  cards:     { paddingHorizontal: 14 },
  tip: {
    fontSize: 10,
    fontFamily: THEME.fonts.sans,
    color: 'rgba(255,255,255,0.18)',
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 16,
  },
});
