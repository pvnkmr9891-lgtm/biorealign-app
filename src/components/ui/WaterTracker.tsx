import { useEffect, useRef, useCallback } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity, GestureResponderEvent } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { THEME } from '@/constants/theme';

const TOTAL    = 13;
const SIZE     = 295;
const CX       = SIZE / 2;   // 147.5
const CY       = SIZE / 2;
const OUTER_R  = 90;
const INNER_R  = 57;
const LABEL_R  = 113;         // 90 + 23px gap from ring edge
const GAP_DEG  = 2.5;

const WATER_LABELS = [
  'Wake-up', 'Morning', 'Pre-bfast', 'Breakfast',
  'Mid-morn', 'Pre-lunch', 'Lunch', 'Post-lunch',
  'Afternoon', 'Pre-wkt', 'During', 'Post-wkt', 'Bedtime',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startDeg: number, endDeg: number,
): string {
  const o1 = polar(cx, cy, outerR, startDeg);
  const o2 = polar(cx, cy, outerR, endDeg);
  const i1 = polar(cx, cy, innerR, endDeg);
  const i2 = polar(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)}`,
    `L ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

const SEGMENT_DEG = 360 / TOTAL;

const SEGMENTS = Array.from({ length: TOTAL }, (_, i) => {
  const startDeg = i * SEGMENT_DEG + GAP_DEG / 2;
  const endDeg   = (i + 1) * SEGMENT_DEG - GAP_DEG / 2;
  return { path: arcPath(CX, CY, OUTER_R, INNER_R, startDeg, endDeg) };
});

function segColor(i: number) {
  if (i >= 10) return '#34D399';
  if (i >= 7)  return '#60A5FA';
  return '#7DD3FC';
}

// ── Animated glass ────────────────────────────────────────────────────────────
const GW = 38;
const GH = 48;

function WaterGlass({ count }: { count: number }) {
  const levelAnim  = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;
  const wave1      = useRef(new Animated.Value(0)).current;
  const wave2      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(levelAnim, { toValue: count / TOTAL, useNativeDriver: false, tension: 50, friction: 9 }).start();
    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: 1.14, duration: 90, useNativeDriver: true }),
      Animated.spring(bounceAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 8 }),
    ]).start();
    Animated.timing(glowAnim, { toValue: count === TOTAL ? 1 : 0, duration: 500, useNativeDriver: false }).start();
  }, [count]);

  useEffect(() => {
    const w1 = Animated.loop(Animated.sequence([
      Animated.timing(wave1, { toValue: 1, duration: 2000, useNativeDriver: true }),
      Animated.timing(wave1, { toValue: 0, duration: 2000, useNativeDriver: true }),
    ]));
    const w2 = Animated.loop(Animated.sequence([
      Animated.timing(wave2, { toValue: 1, duration: 1600, useNativeDriver: true }),
      Animated.timing(wave2, { toValue: 0, duration: 1600, useNativeDriver: true }),
    ]));
    w1.start(); w2.start();
    return () => { w1.stop(); w2.stop(); };
  }, []);

  const waterColor  = count === TOTAL ? '#34D399' : count >= 9 ? '#60A5FA' : count >= 5 ? '#7DD3FC' : '#BAE6FD';
  const waterHeight = levelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, GH - 8] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });
  const wave1X      = wave1.interpolate({ inputRange: [0, 1], outputRange: [-8, 8] });
  const wave2X      = wave2.interpolate({ inputRange: [0, 1], outputRange: [6, -6] });

  const motivText =
    count === 0  ? 'Start hydrating!' :
    count <= 4   ? 'Keep going...'    :
    count <= 8   ? 'Halfway there!'   :
    count <= 11  ? 'Almost full!'     :
    count === 12 ? 'One more!'        :
                   '🌊 Fully hydrated!';

  return (
    <Animated.View style={[glassStyles.container, { transform: [{ scale: bounceAnim }] }]} pointerEvents="none">
      <Animated.View style={[glassStyles.glow, { opacity: glowOpacity }]} />
      <View style={glassStyles.glass}>
        <Animated.View style={[glassStyles.waterFill, { height: waterHeight, backgroundColor: waterColor }]}>
          {count > 0 && (
            <Animated.View style={[glassStyles.wave, { transform: [{ translateX: wave1X }] }]}>
              <View style={[glassStyles.waveBump, { backgroundColor: waterColor }]} />
            </Animated.View>
          )}
          {count > 0 && (
            <Animated.View style={[glassStyles.wave, { top: 3, opacity: 0.5, transform: [{ translateX: wave2X }] }]}>
              <View style={[glassStyles.waveBump, { backgroundColor: waterColor }]} />
            </Animated.View>
          )}
        </Animated.View>
        <View style={glassStyles.shine} />
      </View>
      <Text style={[glassStyles.motivLabel, { color: waterColor }]}>{motivText}</Text>
    </Animated.View>
  );
}

const glassStyles = StyleSheet.create({
  container: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  glow: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: '#34D399' },
  glass: {
    width: GW, height: GH, borderRadius: 5,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden', justifyContent: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  waterFill: { width: '100%', borderRadius: 4, overflow: 'hidden' },
  wave:     { position: 'absolute', top: -5, left: -8, right: -8, height: 10, overflow: 'hidden' },
  waveBump: { width: '150%', height: 10, borderRadius: 5, opacity: 0.6 },
  shine:    { position: 'absolute', top: 4, left: 5, width: 3, height: GH - 12, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  motivLabel: { fontSize: 9, fontFamily: THEME.fonts.sansMedium, letterSpacing: 0.2, textAlign: 'center', paddingHorizontal: 2 },
});

// ── Time labels around the ring ───────────────────────────────────────────────
function RingTextLabels({ filledStates }: { filledStates: boolean[] }) {
  return (
    <>
      {WATER_LABELS.map((label, i) => {
        const midDeg = (i + 0.5) * SEGMENT_DEG;
        const { x, y } = polar(CX, CY, LABEL_R, midDeg);
        const filled = filledStates[i];
        return (
          <Text
            key={i}
            numberOfLines={1}
            style={{
              position: 'absolute',
              left: x - 27,
              top: y - 7,
              width: 54,
              textAlign: 'center',
              fontSize: 9,
              fontFamily: THEME.fonts.sansMedium,
              color: filled ? '#FFFFFF' : 'rgba(255,255,255,0.28)',
            }}
          >
            {label}
          </Text>
        );
      })}
    </>
  );
}

// ── Main WaterTracker ─────────────────────────────────────────────────────────
export function WaterTracker({
  items,
  onToggle,
  locked,   // only true for future days — past days always editable
}: {
  items: any[];
  onToggle: (id: string, checked: boolean) => void;
  locked?: boolean;
}) {
  const sorted       = [...items].sort((a, b) => (a.item_order ?? 0) - (b.item_order ?? 0)).slice(0, TOTAL);
  const filledStates = sorted.map(it => !!it.completed);
  const filledCount  = filledStates.filter(Boolean).length;
  const allDone      = sorted.length > 0 && filledCount === sorted.length;

  const handlePress = useCallback((idx: number) => {
    if (locked) return;
    const item = sorted[idx];
    if (item) onToggle(item.id, item.completed);
  }, [sorted, locked, onToggle]);

  // Tap anywhere on the ring → calculate which segment by angle + distance
  const handleRingPress = useCallback((e: GestureResponderEvent) => {
    if (locked) return;
    const { locationX, locationY } = e.nativeEvent;
    const dx   = locationX - CX;
    const dy   = locationY - CY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Accept touches slightly inside/outside the ring for easier tapping
    if (dist < INNER_R - 6 || dist > OUTER_R + 6) return;

    // Angle from 12-o'clock, clockwise (0°–360°)
    let angle = (Math.atan2(dy, dx) * 180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    if (angle >= 360) angle -= 360;

    const segIdx = Math.floor(angle / SEGMENT_DEG);
    if (segIdx >= 0 && segIdx < TOTAL) handlePress(segIdx);
  }, [locked, handlePress]);

  // Select-all / clear-all
  const handleSelectAll = useCallback(() => {
    if (locked) return;
    const target = !allDone;
    sorted.forEach(item => {
      if (!!item.completed !== target) onToggle(item.id, item.completed);
    });
  }, [sorted, allDone, locked, onToggle]);

  return (
    <View style={trackerStyles.root}>
      {/* Header */}
      <View style={trackerStyles.header}>
        <Text style={trackerStyles.headerIcon}>💧</Text>
        <Text style={trackerStyles.headerTitle}>Water Intake</Text>
        {!locked && (
          <TouchableOpacity onPress={handleSelectAll} style={trackerStyles.selectAllBtn} activeOpacity={0.7}>
            <Text style={trackerStyles.selectAllText}>{allDone ? 'Clear all' : 'All done'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Ring */}
      <View style={trackerStyles.ringWrapper}>
        {/* Single TouchableOpacity covers the ring; onPress calculates segment from angle */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleRingPress}
          style={{ width: SIZE, height: SIZE }}
        >
          <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
            {/* Track background */}
            <Circle
              cx={CX} cy={CY}
              r={(OUTER_R + INNER_R) / 2}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={OUTER_R - INNER_R}
              fill="none"
            />
            {/* Inner dark fill */}
            <Circle cx={CX} cy={CY} r={INNER_R - 4} fill="rgba(8,12,28,0.95)" />
            {/* Segment arcs */}
            {SEGMENTS.map((seg, i) => (
              <Path
                key={i}
                d={seg.path}
                fill={filledStates[i] ? segColor(i) : 'rgba(255,255,255,0.07)'}
                stroke={filledStates[i] ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.07)'}
                strokeWidth={0.8}
              />
            ))}
          </Svg>

          {/* Time labels — non-interactive */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <RingTextLabels filledStates={filledStates} />
          </View>

          {/* Animated glass — non-interactive */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <WaterGlass count={filledCount} />
          </View>
        </TouchableOpacity>

        {/* Count below ring */}
        <View style={trackerStyles.countRow}>
          <Text style={trackerStyles.countFilled}>{filledCount}</Text>
          <Text style={trackerStyles.countSep}> / </Text>
          <Text style={trackerStyles.countTotal}>{TOTAL} glasses</Text>
        </View>

        {filledCount === TOTAL && (
          <View style={trackerStyles.sparkle} pointerEvents="none">
            {['✨', '💦', '✨'].map((e, i) => <Text key={i} style={{ fontSize: 18 }}>{e}</Text>)}
          </View>
        )}
      </View>

      <Text style={trackerStyles.tip}>Tap a segment to log · tap again to undo</Text>
    </View>
  );
}

const trackerStyles = StyleSheet.create({
  root: {
    backgroundColor: 'rgba(8,12,28,0.98)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.2)',
    overflow: 'hidden',
    paddingBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(96,165,250,0.07)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(96,165,250,0.12)',
  },
  headerIcon:    { fontSize: 18 },
  headerTitle:   { fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: '#60A5FA', flex: 1 },
  selectAllBtn:  {
    backgroundColor: 'rgba(96,165,250,0.14)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.3)',
  },
  selectAllText: { fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: '#60A5FA' },
  ringWrapper:   { alignItems: 'center', paddingTop: 14, paddingBottom: 4 },
  countRow:      { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
  countFilled:   { fontSize: 22, fontFamily: THEME.fonts.sansMedium, color: '#60A5FA' },
  countSep:      { fontSize: 16, fontFamily: THEME.fonts.sans, color: 'rgba(255,255,255,0.35)' },
  countTotal:    { fontSize: 13, fontFamily: THEME.fonts.sans, color: 'rgba(255,255,255,0.45)' },
  sparkle:       { flexDirection: 'row', gap: 8, marginTop: 6 },
  tip: {
    fontSize: 10,
    fontFamily: THEME.fonts.sans,
    color: 'rgba(255,255,255,0.18)',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
});
