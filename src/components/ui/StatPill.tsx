// Borderless floating stat capsule — Apple Fitness style. Large number,
// small label, optional glow when the stat needs attention. Count-up
// animation on the number (JS-driven text swap; values are tiny).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { THEME } from '@/constants/theme';

export function StatPill({
  icon,
  value,
  label,
  color = THEME.colors.textPrimary,
  glowColor,
  onPress,
  testID,
}: {
  icon: string;
  value: string;
  label: string;
  color?: string;
  /** When set, the pill lifts with a colored glow — use for "needs attention" states */
  glowColor?: string;
  onPress?: () => void;
  testID?: string;
}) {
  // Count-up only when the value is a plain number (or "n/m" first part)
  const numericTarget = /^\d+/.test(value) ? parseInt(value, 10) : null;
  const suffix = numericTarget != null ? value.replace(/^\d+/, '') : '';
  const [display, setDisplay] = useState(numericTarget != null ? '0' : value);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (numericTarget == null) { setDisplay(value); return; }
    anim.setValue(0);
    const id = anim.addListener(({ value: v }) => setDisplay(String(Math.round(v * numericTarget))));
    Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: false }).start(() => {
      setDisplay(String(numericTarget));
      anim.removeListener(id);
    });
    return () => anim.removeListener(id);
  }, [value]);

  const inner = (
    <View
      style={[
        {
          backgroundColor: THEME.colors.surface2,
          borderRadius: THEME.radius.full,
          paddingHorizontal: 16,
          paddingVertical: 12,
          alignItems: 'center',
          minWidth: 74,
        },
        glowColor ? [THEME.glow.amber, { shadowColor: glowColor, backgroundColor: `${glowColor}14` }] : null,
      ]}
    >
      <Text style={{ fontSize: 14, marginBottom: 2 }}>{icon}</Text>
      <Text style={{ fontSize: THEME.type.h2, fontFamily: THEME.fonts.sansSemibold, color }}>
        {display}{suffix}
      </Text>
      <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 1 }}>
        {label}
      </Text>
    </View>
  );

  if (!onPress) return inner;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} testID={testID}>
      {inner}
    </TouchableOpacity>
  );
}
