import { useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { THEME } from '@/constants/theme';

const TOTAL    = 13;
const SIZE     = 260;
const CX       = SIZE / 2;
const CY       = SIZE / 2;
const OUTER_R  = 118;
const INNER_R  = 72;
const GAP_DEG  = 2.5;

const WATER_LABELS = [
  'Wake-up', 'Morning', 'Pre-bfast', 'Breakfast',
  'Mid-morn', 'Pre-lunch', 'Lunch', 'Post-lunch',
  'Afternoon', 'Pre-wkt', 'During', 'Post-wkt', 'Bedtime',
];

// ── Polar / arc helpers ───────────────────────────────────────────────────────
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

// Segment color by index
function segColor(i: number) {
  if (i >= 10) return '#34D399'; // green for last 3
  if (i >= 7)  return '#60A5FA'; // bright blue for middle
  return '#7DD3FC';              // light blue for first 7
}

// ── View-based animated glass ─────────────────────────────────────────────────
const GW = 52;
const GH = 64;

function WaterGlass({ count }: { count: number }) {
  const levelAnim  = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;
  const wave1      = useRef(new Animated.Value(0)).current;
  const wave2      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(levelAnim, {
      toValue: count / TOTAL,
      useNativeDriver: false,
      tension: 50,
      friction: 9,
    }).start();

    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.spring(bounceAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 8 }),
    ]).start();

    Animated.timing(glowAnim, {
      toValue: count === TOTAL ? 1 : 0,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [count]);

  // Wave animation
  useEffect(() => {
    const w1 = Animated.loop(
      Animated.sequence([
        Animated.timing(wave1, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(wave1, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    const w2 = Animated.loop(
      Animated.sequence([
        Animated.timing(wave2, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(wave2, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    w1.start(); w2.start();
    return () => { w1.stop(); w2.stop(); };
  }, []);

  const waterColor = count === TOTAL ? '#34D399' : count >= 9 ? '#60A5FA' : count >= 5 ? '#7DD3FC' : '#BAE6FD';

  // Height of the water fill inside the glass
  const waterHeight = levelAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, GH - 8],
  });

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] });

  const wave1X = wave1.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] });
  const wave2X = wave2.interpolate({ inputRange: [0, 1], outputRange: [8, -8] });

  const motivText =
    count === 0   ? 'Start hydrating!' :
    count <= 4    ? 'Keep going...'    :
    count <= 8    ? 'Halfway there!'   :
    count <= 11   ? 'Almost full!'     :
    count === 12  ? 'One more!'        :
                    'Fully hydrated!';

  return (
    <Animated.View style={[glassStyles.container, { transform: [{ scale: bounceAnim }] }]}>
      {/* Outer glow when full */}
      <Animated.View style={[glassStyles.glow, { opacity: glowOpacity }]} />

      {/* Count */}
      <Text style={glassStyles.countText}>{count >= TOTAL ? '🌊' : String(count)}</Text>
      <Text style={glassStyles.totalText}>/ {TOTAL} glasses</Text>

      {/* Glass body */}
      <View style={glassStyles.glass}>
        {/* Water fill — grows from bottom */}
        <Animated.View style={[
          glassStyles.waterFill,
          { height: waterHeight, backgroundColor: waterColor },
        ]}>
          {/* Wave 1 */}
          {count > 0 && (
            <Animated.View style={[glassStyles.wave, { transform: [{ translateX: wave1X }] }]}>
              <View style={[glassStyles.waveBump, { backgroundColor: waterColor }]} />
            </Animated.View>
          )}
          {/* Wave 2 */}
          {count > 0 && (
            <Animated.View style={[glassStyles.wave, { top: 4, opacity: 0.5, transform: [{ translateX: wave2X }] }]}>
              <View style={[glassStyles.waveBump, { backgroundColor: waterColor }]} />
            </Animated.View>
          )}
        </Animated.View>

        {/* Glass shine overlay */}
        <View style={glassStyles.shine} />
      </View>

      {/* Motiv label */}
      <Text style={[glassStyles.motivLabel, { color: waterColor }]}>{motivText}</Text>
    </Animated.View>
  );
}

const glassStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  glow: {
    position: 'absolute',
    width: 130, height: 130,
    borderRadius: 65,
    backgroundColor: '#34D399',
  },
  countText: {
    fontSize: 22,
    fontFamily: THEME.fonts.sansMedium,
    color: '#FFFFFF',
    lineHeight: 26,
  },
  totalText: {
    fontSize: 10,
    fontFamily: THEME.fonts.sans,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 6,
  },
  glass: {
    width: GW,
    height: GH,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  waterFill: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  wave: {
    position: 'absolute',
    top: -6,
    left: -10,
    right: -10,
    height: 12,
    overflow: 'hidden',
  },
  waveBump: {
    width: '150%',
    height: 12,
    borderRadius: 6,
    opacity: 0.6,
  },
  shine: {
    position: 'absolute',
    top: 6,
    left: 7,
    width: 4,
    height: GH - 16,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  motivLabel: {
    fontSize: 10,
    fontFamily: THEME.fonts.sansMedium,
    letterSpacing: 0.3,
    marginTop: 4,
  },
});

// ── Number labels around the ring ─────────────────────────────────────────────
function RingLabels({ filledCount }: { filledCount: number }) {
  const LABEL_R = OUTER_R + 14;
  return (
    <>
      {Array.from({ length: TOTAL }, (_, i) => {
        const midDeg = (i + 0.5) * SEGMENT_DEG;
        const { x, y } = polar(CX, CY, LABEL_R, midDeg);
        const filled = i < filledCount;
        return (
          <Text
            key={i}
            style={{
              position: 'absolute',
              left: x - 8,
              top:  y - 7,
              width: 16,
              textAlign: 'center',
              fontSize: 9,
              fontFamily: THEME.fonts.sansMedium,
              color: filled ? '#FFFFFF' : 'rgba(255,255,255,0.28)',
            }}
          >
            {i + 1}
          </Text>
        );
      })}
    </>
  );
}

// ── Bottom drop checkbox ───────────────────────────────────────────────────────
function DropCheckbox({
  index, filled, label, onPress,
}: {
  index: number; filled: boolean; label: string; onPress: (i: number) => void;
}) {
  const scale = useRef(new Animated.Value(filled ? 1 : 0.85)).current;
  const glow  = useRef(new Animated.Value(filled ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: filled ? 1 : 0.85, useNativeDriver: true, tension: 200, friction: 8 }),
      Animated.timing(glow,  { toValue: filled ? 1 : 0,    duration: 200, useNativeDriver: false }),
    ]).start();
  }, [filled]);

  const color = filled ? segColor(index) : 'rgba(255,255,255,0.1)';
  const shadowOp = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] });

  return (
    <TouchableOpacity onPress={() => onPress(index)} activeOpacity={0.7} style={dropStyles.wrapper}>
      {/* JS-driver: shadow/glow — separate node so it doesn't conflict with native-driver scale */}
      <Animated.View style={{
        borderRadius: 15,
        shadowColor: filled ? segColor(index) : 'transparent',
        shadowOpacity: shadowOp as any,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: filled ? 4 : 0,
      }}>
        {/* Native-driver: scale only */}
        <Animated.View style={[dropStyles.drop, { backgroundColor: color, transform: [{ scale }] }]}>
          <Text style={[dropStyles.num, { color: filled ? '#000' : 'rgba(255,255,255,0.3)' }]}>
            {index + 1}
          </Text>
        </Animated.View>
      </Animated.View>
      <Text
        style={[dropStyles.label, { color: filled ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.22)' }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const dropStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 3, width: 48 },
  drop: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  num:   { fontSize: 11, fontFamily: THEME.fonts.sansMedium },
  label: { fontSize: 8, fontFamily: THEME.fonts.sans, textAlign: 'center', letterSpacing: 0.2 },
});

// ── Main WaterTracker ─────────────────────────────────────────────────────────
export function WaterTracker({
  items,
  onToggle,
  locked,
}: {
  items: any[];
  onToggle: (id: string, checked: boolean) => void;
  locked?: boolean;
}) {
  const sorted      = [...items].sort((a, b) => (a.item_order ?? 0) - (b.item_order ?? 0)).slice(0, TOTAL);
  const filledStates = sorted.map(it => !!it.completed);
  const filledCount  = filledStates.filter(Boolean).length;

  const handlePress = useCallback((idx: number) => {
    if (locked) return;
    const item = sorted[idx];
    if (item) onToggle(item.id, item.completed);
  }, [sorted, locked, onToggle]);

  return (
    <View style={trackerStyles.root}>
      {/* Header */}
      <View style={trackerStyles.header}>
        <Text style={trackerStyles.headerIcon}>💧</Text>
        <Text style={trackerStyles.headerTitle}>Water Intake</Text>
        <View style={trackerStyles.badge}>
          <Text style={trackerStyles.badgeText}>{filledCount}/{TOTAL}</Text>
        </View>
      </View>

      {/* Ring */}
      <View style={trackerStyles.ringWrapper}>
        {/* Static background */}
        <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
          <Circle
            cx={CX} cy={CY}
            r={(OUTER_R + INNER_R) / 2}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={OUTER_R - INNER_R}
            fill="none"
          />
          <Circle cx={CX} cy={CY} r={INNER_R - 4} fill="rgba(8,12,28,0.95)" />
        </Svg>

        {/* Segments */}
        <View style={{ width: SIZE, height: SIZE }}>
          {SEGMENTS.map((seg, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => handlePress(i)}
              activeOpacity={0.75}
              style={StyleSheet.absoluteFill}
            >
              <Svg width={SIZE} height={SIZE}>
                <Path
                  d={seg.path}
                  fill={filledStates[i] ? segColor(i) : 'rgba(255,255,255,0.07)'}
                  stroke={filledStates[i] ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}
                  strokeWidth="0.8"
                />
              </Svg>
            </TouchableOpacity>
          ))}

          {/* Number labels (non-interactive overlay) */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <RingLabels filledCount={filledCount} />
          </View>

          {/* Animated glass centre */}
          <WaterGlass count={filledCount} />
        </View>

        {filledCount === TOTAL && (
          <View style={trackerStyles.sparkle} pointerEvents="none">
            {['✨', '💦', '✨'].map((e, i) => <Text key={i} style={{ fontSize: 18 }}>{e}</Text>)}
          </View>
        )}
      </View>

      {/* Drop checkboxes */}
      <View style={trackerStyles.drops}>
        <View style={trackerStyles.dropsRow}>
          {sorted.slice(0, 5).map((it, i) => (
            <DropCheckbox key={it.id ?? i} index={i} filled={filledStates[i]} label={WATER_LABELS[i]} onPress={handlePress} />
          ))}
        </View>
        <View style={trackerStyles.dropsRow}>
          {sorted.slice(5, 10).map((it, i) => (
            <DropCheckbox key={it.id ?? (i+5)} index={i+5} filled={filledStates[i+5]} label={WATER_LABELS[i+5]} onPress={handlePress} />
          ))}
        </View>
        <View style={[trackerStyles.dropsRow, { justifyContent: 'center', gap: 20 }]}>
          {sorted.slice(10, 13).map((it, i) => (
            <DropCheckbox key={it.id ?? (i+10)} index={i+10} filled={filledStates[i+10]} label={WATER_LABELS[i+10]} onPress={handlePress} />
          ))}
        </View>
      </View>

      <Text style={trackerStyles.tip}>Tap a segment or a circle to log — ring & drops stay in sync</Text>
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
    paddingBottom: 16,
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
  headerIcon:  { fontSize: 18 },
  headerTitle: { fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: '#60A5FA', flex: 1 },
  badge: {
    backgroundColor: 'rgba(96,165,250,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.3)',
  },
  badgeText: { fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: '#60A5FA' },
  ringWrapper: { alignItems: 'center', paddingTop: 16, paddingBottom: 8 },
  sparkle: { flexDirection: 'row', gap: 8, marginTop: 8 },
  drops: { paddingHorizontal: 12, gap: 10 },
  dropsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  tip: {
    fontSize: 10,
    fontFamily: THEME.fonts.sans,
    color: 'rgba(255,255,255,0.18)',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 16,
  },
});
