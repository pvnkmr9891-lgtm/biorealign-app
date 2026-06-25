import { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { THEME } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ── Single animated arc ───────────────────────────────────────────────────────
function Arc({
  pct, cx, cy, radius, strokeWidth, color,
}: {
  pct: number; cx: number; cy: number; radius: number;
  strokeWidth: number; color: string;
}) {
  const circumference = 2 * Math.PI * radius;
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: Math.max(0, Math.min(100, pct)) / 100,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const strokeDashoffset = animVal.interpolate({
    inputRange:  [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <>
      {/* Track */}
      <Circle
        cx={cx} cy={cy} r={radius}
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Fill */}
      <AnimatedCircle
        cx={cx} cy={cy} r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
      />
    </>
  );
}

// ── Concentric rings — Apple Watch style ──────────────────────────────────────
// Outer → Workout (teal)  |  Middle → Water (blue)  |  Inner → Food (amber)
export function AlignmentRing({
  composite, workoutPct, waterPct, foodPct, insight,
  size = 170,
}: {
  composite:  number;
  workoutPct: number;
  waterPct:   number;
  foodPct:    number;
  insight:    string;
  size?:      number;
}) {
  const cx = size / 2;
  const cy = size / 2;

  // Ring geometry — 3 concentric rings with equal gap
  const STROKE  = size * 0.085;  // stroke width scales with size
  const GAP     = size * 0.015;  // gap between rings
  const outerR  = (size / 2) - (STROKE / 2) - GAP;
  const middleR = outerR - STROKE - GAP * 3;
  const innerR  = middleR - STROKE - GAP * 3;

  const scoreColor = composite >= 75 ? '#34D399'
                   : composite >= 45 ? THEME.colors.amber
                   : composite > 0   ? '#F87171'
                   : THEME.colors.textMuted;

  return (
    <View style={{ alignItems: 'center' }}>
      {/* SVG canvas rotated so arcs start from top */}
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <G>
            {/* Outer: Workout */}
            <Arc pct={workoutPct}  cx={cx} cy={cy} radius={outerR}  strokeWidth={STROKE} color={THEME.colors.teal} />
            {/* Middle: Water */}
            <Arc pct={waterPct}   cx={cx} cy={cy} radius={middleR} strokeWidth={STROKE} color="#60A5FA" />
            {/* Inner: Food */}
            <Arc pct={foodPct}    cx={cx} cy={cy} radius={innerR}  strokeWidth={STROKE} color={THEME.colors.amber} />
          </G>
        </Svg>

        {/* Centre overlay — score + label (not rotated) */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: size * 0.2, fontFamily: THEME.fonts.sansMedium, color: scoreColor, lineHeight: size * 0.22 }}>
            {composite}
          </Text>
          <Text style={{ fontSize: size * 0.07, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            align
          </Text>
        </View>
      </View>

      {/* Legend row */}
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 12, justifyContent: 'center' }}>
        {[
          { label: 'Workout', icon: '💪', pct: workoutPct, color: THEME.colors.teal },
          { label: 'Water',   icon: '💧', pct: waterPct,   color: '#60A5FA' },
          { label: 'Food',    icon: '🥗', pct: foodPct,    color: THEME.colors.amber },
        ].map(r => (
          <View key={r.label} style={{ alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: r.color }}>{r.pct}%</Text>
            <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{r.icon} {r.label}</Text>
          </View>
        ))}
      </View>

      {/* Insight */}
      {!!insight && (
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', marginTop: 10, lineHeight: 18, paddingHorizontal: 4 }}>
          {insight}
        </Text>
      )}
    </View>
  );
}
