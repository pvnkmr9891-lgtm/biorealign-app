import { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { THEME } from '@/constants/theme';

interface ScoreRingProps {
  score: number;
  label: string;
  color?: string;
  size?: number;
  strokeWidth?: number;
}

export function ScoreRing({
  score,
  label,
  color = THEME.colors.teal,
  size = 80,
  strokeWidth = 6,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: score / 100,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const strokeDashoffset = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <Svg
          width={size}
          height={size}
          style={{ transform: [{ rotate: '-90deg' }] }}
        >
          <Circle
            cx={center} cy={center} r={radius}
            stroke={THEME.colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={center} cy={center} r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color, fontFamily: THEME.fonts.sansMedium, fontSize: size * 0.24 }}>
            {score}
          </Text>
        </View>
      </View>
      <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 6 }}>
        {label}
      </Text>
    </View>
  );
}