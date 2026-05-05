import React, { useRef, useCallback } from 'react';
import { View, Text, PanResponder, Animated } from 'react-native';

const BRAND = {
  teal: '#00C4B4',
  amber: '#E8A44A',
  surface: '#141416',
  border: '#2A2A2E',
  text: '#F0EEE8',
  textMuted: '#6B6B70',
};

const TRACK_HEIGHT = 4;
const THUMB_SIZE = 24;
const TRACK_WIDTH_ESTIMATE = 300; // fallback; overridden by onLayout

interface SliderInputProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (val: number) => void;
  color?: 'teal' | 'amber';
  showLabels?: boolean;
  leftLabel?: string;
  rightLabel?: string;
}

export function SliderInput({
  value,
  min = 1,
  max = 10,
  step = 1,
  onChange,
  color = 'teal',
  showLabels = true,
  leftLabel,
  rightLabel,
}: SliderInputProps) {
  const accentColor = color === 'amber' ? BRAND.amber : BRAND.teal;
  const trackWidth = useRef(TRACK_WIDTH_ESTIMATE);
  const animX = useRef(new Animated.Value(((value - min) / (max - min)) * TRACK_WIDTH_ESTIMATE)).current;
  const currentValue = useRef(value);

  const clampedPct = (v: number) => Math.min(1, Math.max(0, (v - min) / (max - min)));

  const pctToValue = useCallback(
    (pct: number) => {
      const raw = pct * (max - min) + min;
      const stepped = Math.round(raw / step) * step;
      return Math.min(max, Math.max(min, stepped));
    },
    [min, max, step]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        const pct = Math.min(1, Math.max(0, x / trackWidth.current));
        const newVal = pctToValue(pct);
        currentValue.current = newVal;
        Animated.spring(animX, {
          toValue: pct * trackWidth.current,
          useNativeDriver: false,
          speed: 20,
          bounciness: 4,
        }).start();
        onChange(newVal);
      },
      onPanResponderMove: (_, state) => {
        const startPct = clampedPct(currentValue.current);
        const deltaPct = state.dx / trackWidth.current;
        const newPct = Math.min(1, Math.max(0, startPct + deltaPct));
        const newVal = pctToValue(newPct);
        if (newVal !== currentValue.current) {
          currentValue.current = newVal;
          animX.setValue(newPct * trackWidth.current);
          onChange(newVal);
        }
      },
    })
  ).current;

  const fillWidth = animX.interpolate({
    inputRange: [0, TRACK_WIDTH_ESTIMATE],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const thumbLeft = animX.interpolate({
    inputRange: [0, TRACK_WIDTH_ESTIMATE],
    outputRange: [0, trackWidth.current - THUMB_SIZE],
    extrapolate: 'clamp',
  });

  return (
    <View>
      {/* Value display */}
      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 32, fontFamily: 'DMSans-Bold', color: accentColor }}>
          {value}
        </Text>
        <Text style={{ fontSize: 11, fontFamily: 'DMSans-Regular', color: BRAND.textMuted }}>
          out of {max}
        </Text>
      </View>

      {/* Track container */}
      <View
        style={{ paddingHorizontal: THUMB_SIZE / 2 }}
        onLayout={(e) => {
          trackWidth.current = e.nativeEvent.layout.width - THUMB_SIZE;
          animX.setValue(clampedPct(value) * trackWidth.current);
        }}
      >
        <View
          style={{
            height: TRACK_HEIGHT,
            backgroundColor: BRAND.border,
            borderRadius: TRACK_HEIGHT / 2,
            position: 'relative',
          }}
          {...panResponder.panHandlers}
        >
          {/* Fill */}
          <Animated.View
            style={{
              height: '100%',
              width: fillWidth,
              backgroundColor: accentColor,
              borderRadius: TRACK_HEIGHT / 2,
            }}
            pointerEvents="none"
          />

          {/* Thumb */}
          <Animated.View
            style={{
              position: 'absolute',
              top: -(THUMB_SIZE - TRACK_HEIGHT) / 2,
              left: thumbLeft,
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: THUMB_SIZE / 2,
              backgroundColor: accentColor,
              shadowColor: accentColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 8,
              elevation: 4,
            }}
            pointerEvents="none"
          />
        </View>
      </View>

      {/* Labels */}
      {showLabels && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ fontSize: 11, fontFamily: 'DMSans-Regular', color: BRAND.textMuted }}>
            {leftLabel ?? min}
          </Text>
          <Text style={{ fontSize: 11, fontFamily: 'DMSans-Regular', color: BRAND.textMuted }}>
            {rightLabel ?? max}
          </Text>
        </View>
      )}
    </View>
  );
}
