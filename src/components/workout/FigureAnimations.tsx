import { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';

const TEAL   = '#00C4B4';
const AMBER  = '#E8A44A';
const WHITE  = '#F0EEE8';
const MUTED  = '#6B6B70';

// ── Shared body parts ─────────────────────────────────────────────────────────
function Head({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, marginBottom: 2,
    }} />
  );
}

// ── Jogging Figure ────────────────────────────────────────────────────────────
export function JoggingFigure({ color = TEAL }: { color?: string }) {
  const bounce    = useRef(new Animated.Value(0)).current;
  const leftArm   = useRef(new Animated.Value(-40)).current;
  const rightArm  = useRef(new Animated.Value(40)).current;
  const leftLeg   = useRef(new Animated.Value(-50)).current;
  const rightLeg  = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Body bounce — fast
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -10, duration: 200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(bounce, { toValue: 0, duration: 200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    ).start();

    // Arms swing opposite
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(leftArm,  { toValue: 40,  duration: 200, useNativeDriver: true }),
          Animated.timing(rightArm, { toValue: -40, duration: 200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(leftArm,  { toValue: -40, duration: 200, useNativeDriver: true }),
          Animated.timing(rightArm, { toValue: 40,  duration: 200, useNativeDriver: true }),
        ]),
      ])
    ).start();

    // Legs alternate — high kick for jogging
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(leftLeg,  { toValue: 55,  duration: 200, useNativeDriver: true }),
          Animated.timing(rightLeg, { toValue: -55, duration: 200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(leftLeg,  { toValue: -55, duration: 200, useNativeDriver: true }),
          Animated.timing(rightLeg, { toValue: 55,  duration: 200, useNativeDriver: true }),
        ]),
      ])
    ).start();

    return () => { bounce.stopAnimation(); leftArm.stopAnimation(); rightArm.stopAnimation(); leftLeg.stopAnimation(); rightLeg.stopAnimation(); };
  }, []);

  return (
    <Animated.View style={{ alignItems: 'center', transform: [{ translateY: bounce }] }}>
      {/* Head */}
      <Head color={color} size={28} />

      {/* Torso + Arms */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
        {/* Left arm */}
        <Animated.View style={{
          width: 6, height: 28, backgroundColor: color,
          borderRadius: 3, marginRight: 2,
          transform: [{ rotate: leftArm.interpolate({ inputRange: [-60, 60], outputRange: ['-60deg', '60deg'] }) }],
          transformOrigin: 'top center',
        }} />

        {/* Torso */}
        <View style={{ width: 14, height: 36, backgroundColor: color, borderRadius: 4 }} />

        {/* Right arm */}
        <Animated.View style={{
          width: 6, height: 28, backgroundColor: color,
          borderRadius: 3, marginLeft: 2,
          transform: [{ rotate: rightArm.interpolate({ inputRange: [-60, 60], outputRange: ['-60deg', '60deg'] }) }],
          transformOrigin: 'top center',
        }} />
      </View>

      {/* Legs */}
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <Animated.View style={{
          width: 8, height: 34, backgroundColor: color,
          borderRadius: 4,
          transform: [{ rotate: leftLeg.interpolate({ inputRange: [-70, 70], outputRange: ['-70deg', '70deg'] }) }],
          transformOrigin: 'top center',
        }} />
        <Animated.View style={{
          width: 8, height: 34, backgroundColor: color,
          borderRadius: 4,
          transform: [{ rotate: rightLeg.interpolate({ inputRange: [-70, 70], outputRange: ['-70deg', '70deg'] }) }],
          transformOrigin: 'top center',
        }} />
      </View>
    </Animated.View>
  );
}

// ── Walking Figure ─────────────────────────────────────────────────────────────
export function WalkingFigure({ color = AMBER }: { color?: string }) {
  const bounce   = useRef(new Animated.Value(0)).current;
  const leftArm  = useRef(new Animated.Value(-20)).current;
  const rightArm = useRef(new Animated.Value(20)).current;
  const leftLeg  = useRef(new Animated.Value(-25)).current;
  const rightLeg = useRef(new Animated.Value(25)).current;

  useEffect(() => {
    // Gentle bounce — slow
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -5, duration: 400, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(bounce, { toValue: 0, duration: 400, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    ).start();

    // Arms swing slowly
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(leftArm,  { toValue: 25,  duration: 450, useNativeDriver: true }),
          Animated.timing(rightArm, { toValue: -25, duration: 450, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(leftArm,  { toValue: -25, duration: 450, useNativeDriver: true }),
          Animated.timing(rightArm, { toValue: 25,  duration: 450, useNativeDriver: true }),
        ]),
      ])
    ).start();

    // Legs — smaller stride for walking
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(leftLeg,  { toValue: 30,  duration: 450, useNativeDriver: true }),
          Animated.timing(rightLeg, { toValue: -30, duration: 450, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(leftLeg,  { toValue: -30, duration: 450, useNativeDriver: true }),
          Animated.timing(rightLeg, { toValue: 30,  duration: 450, useNativeDriver: true }),
        ]),
      ])
    ).start();

    return () => { bounce.stopAnimation(); leftArm.stopAnimation(); rightArm.stopAnimation(); leftLeg.stopAnimation(); rightLeg.stopAnimation(); };
  }, []);

  return (
    <Animated.View style={{ alignItems: 'center', transform: [{ translateY: bounce }] }}>
      <Head color={color} size={28} />

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
        <Animated.View style={{
          width: 6, height: 28, backgroundColor: color, borderRadius: 3, marginRight: 2,
          transform: [{ rotate: leftArm.interpolate({ inputRange: [-40, 40], outputRange: ['-40deg', '40deg'] }) }],
          transformOrigin: 'top center',
        }} />
        <View style={{ width: 14, height: 36, backgroundColor: color, borderRadius: 4 }} />
        <Animated.View style={{
          width: 6, height: 28, backgroundColor: color, borderRadius: 3, marginLeft: 2,
          transform: [{ rotate: rightArm.interpolate({ inputRange: [-40, 40], outputRange: ['-40deg', '40deg'] }) }],
          transformOrigin: 'top center',
        }} />
      </View>

      <View style={{ flexDirection: 'row', gap: 4 }}>
        <Animated.View style={{
          width: 8, height: 34, backgroundColor: color, borderRadius: 4,
          transform: [{ rotate: leftLeg.interpolate({ inputRange: [-45, 45], outputRange: ['-45deg', '45deg'] }) }],
          transformOrigin: 'top center',
        }} />
        <Animated.View style={{
          width: 8, height: 34, backgroundColor: color, borderRadius: 4,
          transform: [{ rotate: rightLeg.interpolate({ inputRange: [-45, 45], outputRange: ['-45deg', '45deg'] }) }],
          transformOrigin: 'top center',
        }} />
      </View>
    </Animated.View>
  );
}

// ── Resting Figure (standing) ─────────────────────────────────────────────────
export function RestingFigure({ color = '#6EE7B7' }: { color?: string }) {
  const breathe = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.04, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(breathe, { toValue: 1,    duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    ).start();
    return () => breathe.stopAnimation();
  }, []);

  return (
    <Animated.View style={{ alignItems: 'center', transform: [{ scale: breathe }] }}>
      <Head color={color} size={28} />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
        <View style={{ width: 6, height: 28, backgroundColor: color, borderRadius: 3, marginRight: 2, transform: [{ rotate: '20deg' }] }} />
        <View style={{ width: 14, height: 36, backgroundColor: color, borderRadius: 4 }} />
        <View style={{ width: 6, height: 28, backgroundColor: color, borderRadius: 3, marginLeft: 2, transform: [{ rotate: '-20deg' }] }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <View style={{ width: 8, height: 34, backgroundColor: color, borderRadius: 4 }} />
        <View style={{ width: 8, height: 34, backgroundColor: color, borderRadius: 4 }} />
      </View>
    </Animated.View>
  );
}
