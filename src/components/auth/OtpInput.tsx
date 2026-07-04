import { useRef, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { THEME } from '@/constants/theme';

// Reusable 6-digit OTP entry — shared by signup phone verification and both
// forgot-password recovery paths (email + phone), so the UX stays identical
// no matter which flow lands the user here.
export function OtpInput({ length = 6, value, onChange, autoFocus = true }: {
  length?: number; value: string; onChange: (v: string) => void; autoFocus?: boolean;
}) {
  const inputs = useRef<(TextInput | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  function setDigit(i: number, raw: string) {
    // Handle a full paste landing in one box — split it across all boxes.
    const clean = raw.replace(/[^0-9]/g, '');
    if (clean.length > 1) {
      onChange(clean.slice(0, length));
      inputs.current[Math.min(clean.length, length - 1)]?.focus();
      return;
    }
    const next = digits.slice();
    next[i] = clean;
    onChange(next.join(''));
    if (clean && i < length - 1) inputs.current[i + 1]?.focus();
  }

  function handleKeyPress(i: number, key: string) {
    if (key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  return (
    <View style={styles.row}>
      {digits.map((d, i) => (
        <TextInput
          key={i}
          ref={(r) => { inputs.current[i] = r; }}
          value={d}
          onChangeText={(t) => setDigit(i, t)}
          onKeyPress={(e) => handleKeyPress(i, e.nativeEvent.key)}
          keyboardType="number-pad"
          maxLength={length} // allows paste-into-one-box to work on Android
          autoFocus={autoFocus && i === 0}
          style={[styles.box, d && styles.boxFilled]}
          textAlign="center"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: {
    flex: 1, height: 54, borderRadius: 12, borderWidth: 1.5,
    borderColor: THEME.colors.border, backgroundColor: THEME.colors.surface2,
    color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 20,
  },
  boxFilled: { borderColor: THEME.colors.teal },
});
