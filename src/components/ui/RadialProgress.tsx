// Animated radial progress ring — the hero focal element of the redesigned
// dashboards. Draws itself in on mount/value-change (stroke-dashoffset
// animation; JS-driven since SVG props can't use the native driver — one
// short one-shot tween, so no perf concern). Children render centered
// inside the ring (big number, label, etc.).
import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { THEME } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function RadialProgress({
  size = 180,
  strokeWidth = 12,
  progress,           // 0–1
  color = THEME.colors.teal,
  trackColor = THEME.colors.surface3,
  glow = true,
  duration = 900,
  children,
}: {
  size?: number;
  strokeWidth?: number;
  progress: number;
  color?: string;
  trackColor?: string;
  glow?: boolean;
  duration?: number;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration,
      useNativeDriver: false, // SVG props aren't native-driver animatable
    }).start();
  }, [clamped]);

  const dashOffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, glow && THEME.glow.teal, glow && { shadowColor: color }]}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={trackColor} strokeWidth={strokeWidth} fill="none"
        />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
        />
      </Svg>
      {children}
    </View>
  );
}
