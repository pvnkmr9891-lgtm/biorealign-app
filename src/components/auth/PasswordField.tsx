import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { THEME } from '@/constants/theme';

// Policy: min 8 chars, at least one letter and one number.
export function isPasswordValid(password: string): boolean {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

type Strength = 'empty' | 'weak' | 'medium' | 'strong';

function getStrength(password: string): Strength {
  if (!password) return 'empty';
  if (!isPasswordValid(password)) return 'weak';
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  if (password.length >= 12 && hasSymbol && hasMixedCase) return 'strong';
  if (password.length >= 10 || hasSymbol || hasMixedCase) return 'medium';
  return 'weak'; // meets the floor policy but nothing more
}

const STRENGTH_META: Record<Strength, { label: string; color: string; fill: number }> = {
  empty:  { label: '',        color: THEME.colors.border,  fill: 0 },
  weak:   { label: 'Weak',    color: THEME.colors.error,   fill: 0.33 },
  medium: { label: 'Medium',  color: THEME.colors.warning, fill: 0.66 },
  strong: { label: 'Strong',  color: THEME.colors.success, fill: 1 },
};

export function PasswordField({ value, onChangeText, placeholder = 'Min. 8 characters, 1 letter & 1 number', showStrength = true }: {
  value: string; onChangeText: (v: string) => void; placeholder?: string; showStrength?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const strength = getStrength(value);
  const meta = STRENGTH_META[strength];

  return (
    <View>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={THEME.colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setVisible((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.eye}>{visible ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>
      {showStrength && value.length > 0 && (
        <View style={styles.strengthRow}>
          <View style={styles.strengthTrack}>
            <View style={[styles.strengthFill, { width: `${meta.fill * 100}%`, backgroundColor: meta.color }]} />
          </View>
          <Text style={[styles.strengthLabel, { color: meta.color }]}>{meta.label}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.colors.surface2,
    borderRadius: 12, borderWidth: 1, borderColor: THEME.colors.border, paddingRight: 14,
  },
  input: {
    flex: 1, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 15,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  eye: { fontSize: 17 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
  strengthTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: THEME.colors.surface3, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontFamily: THEME.fonts.sansMedium, width: 50 },
});
