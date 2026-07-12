import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { THEME } from '@/constants/theme';
import { PasswordField, isPasswordValid } from '@/components/auth/PasswordField';
import { OtpInput } from '@/components/auth/OtpInput';
import { usePhoneOtp, resetPasswordWithPhone } from '@/hooks/usePhoneOtp';
import { isValidEmail, isValidPhone } from '@/utils/validation';

// profiles.phone is always stored as "+91XXXXXXXXXX" — no spaces, no
// leading-zero — and the lookup inside reset-password-with-phone is an
// exact string match, so anything typed differently (missing country code,
// spaces from the placeholder style "+91 98765 43210") silently matches
// zero rows. Strip to digits first so any input shape normalizes the same.
function normalizeIndianPhone(value: string): string {
  const digits = value.trim().replace(/[^0-9]/g, '');
  const withCountryCode = digits.length === 12 && digits.startsWith('91') ? digits : `91${digits}`;
  return `+${withCountryCode}`;
}

type Method = 'email' | 'phone';
type Step = 'identify' | 'otp' | 'newPassword' | 'done';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { sendOtp, sending } = usePhoneOtp();

  const [method, setMethod] = useState<Method>('email');
  const [step, setStep] = useState<Step>('identify');
  const [identifier, setIdentifier] = useState(''); // email or phone, depending on method
  const [otp, setOtp] = useState('000000'); // DEV BYPASS — remove before launch
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode() {
    if (!identifier.trim()) {
      Alert.alert('Required', method === 'email' ? 'Please enter your email.' : 'Please enter your phone number.');
      return;
    }
    if (method === 'email' && !isValidEmail(identifier)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (method === 'phone' && !isValidPhone(identifier)) {
      Alert.alert('Invalid phone', 'Please enter a valid phone number.');
      return;
    }
    setLoading(true);
    setError(null);

    if (method === 'email') {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: identifier.trim(),
        options: { shouldCreateUser: false },
      });
      setLoading(false);
      if (otpError) {
        Alert.alert('Could not send code', otpError.message);
        return;
      }
    } else {
      // Normalize + persist so the final reset call (which re-reads
      // `identifier`) uses the exact "+91XXXXXXXXXX" format stored in the DB.
      const normalizedPhone = normalizeIndianPhone(identifier);
      setIdentifier(normalizedPhone);
      const result = await sendOtp(normalizedPhone);
      setLoading(false);
      if (!result.ok) {
        Alert.alert('Could not send code', result.error ?? 'Please try again.');
        return;
      }
    }
    setStep('otp');
  }

  async function handleConfirmOtp() {
    if (otp.length !== 6) return;
    setError(null);

    if (method === 'email') {
      // Email path verifies right away — it gives us a real session, which
      // is what lets the next step call auth.updateUser() for the password.
      setLoading(true);
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: identifier.trim(), token: otp, type: 'email',
      });
      setLoading(false);
      if (verifyError) {
        setError(verifyError.message);
        return;
      }
    }
    // Phone path: the code isn't checked yet — Twilio Verify codes are
    // single-use, so we defer the actual check to the final reset call
    // (reset-password-with-phone) rather than consuming it here.
    setStep('newPassword');
  }

  async function handleSetNewPassword() {
    if (!isPasswordValid(newPassword)) {
      Alert.alert('Weak password', 'Password must be at least 8 characters with a letter and a number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords don't match", 'Please make sure both fields match.');
      return;
    }

    setLoading(true);
    setError(null);

    if (method === 'email') {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      setLoading(false);
      if (updateError) {
        setError(updateError.message);
        return;
      }
    } else {
      const result = await resetPasswordWithPhone(identifier.trim(), otp, newPassword);
      setLoading(false);
      if (!result.ok) {
        setError(result.error ?? 'Could not reset password.');
        return;
      }
    }
    setStep('done');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">

          {step === 'identify' && (
            <>
              <Text style={styles.title}>Reset your password</Text>
              <Text style={styles.subtitle}>Choose how you'd like to receive your recovery code</Text>

              <View style={styles.methodRow}>
                {(['email', 'phone'] as const).map((m) => {
                  const selected = method === m;
                  return (
                    <TouchableOpacity key={m} onPress={() => { setMethod(m); setIdentifier(''); }} style={[styles.methodBtn, selected && styles.methodBtnActive]}>
                      <Text style={[styles.methodBtnText, selected && styles.methodBtnTextActive]}>{m === 'email' ? '✉️ Email' : '📱 Phone'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>{method === 'email' ? 'Email' : 'Phone number'}</Text>
              <TextInput
                style={styles.input}
                placeholder={method === 'email' ? 'you@example.com' : '+91 98765 43210'}
                placeholderTextColor={THEME.colors.textMuted}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                keyboardType={method === 'email' ? 'email-address' : 'phone-pad'}
              />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleSendCode} disabled={loading || sending} activeOpacity={0.85}>
                {(loading || sending) ? <ActivityIndicator color={THEME.colors.background} /> : <Text style={styles.primaryBtnText}>Send code</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={styles.title}>Enter your code</Text>
              <Text style={styles.subtitle}>We sent a 6-digit code to {identifier}</Text>

              <View style={{ marginTop: 28, marginBottom: 12 }}>
                <OtpInput value={otp} onChange={setOtp} />
              </View>
              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirmOtp} disabled={loading || otp.length !== 6} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color={THEME.colors.background} /> : <Text style={styles.primaryBtnText}>Continue</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSendCode} disabled={loading || sending} style={{ marginTop: 18, alignItems: 'center' }}>
                <Text style={styles.resendText}>Resend code</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'newPassword' && (
            <>
              <Text style={styles.title}>Set a new password</Text>
              <Text style={styles.subtitle}>Choose a strong password for your account</Text>

              <View style={{ marginTop: 24, gap: 14 }}>
                <PasswordField value={newPassword} onChangeText={setNewPassword} />
                <PasswordField value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm password" showStrength={false} />
              </View>
              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity style={[styles.primaryBtn, { marginTop: 18 }]} onPress={handleSetNewPassword} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color={THEME.colors.background} /> : <Text style={styles.primaryBtnText}>Reset password</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === 'done' && (
            <>
              <Text style={styles.title}>Password updated</Text>
              <Text style={styles.subtitle}>You can now sign in with your new password.</Text>
              <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24 }]} onPress={() => router.replace('/(auth)/login' as any)} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Back to sign in</Text>
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  title: { color: THEME.colors.textPrimary, fontSize: 26, fontFamily: THEME.fonts.serif, textAlign: 'center' },
  subtitle: { color: THEME.colors.textSecondary, fontSize: 14, fontFamily: THEME.fonts.sans, marginTop: 8, textAlign: 'center' },
  methodRow: { flexDirection: 'row', gap: 10, marginTop: 24, marginBottom: 24 },
  methodBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: THEME.colors.border, backgroundColor: THEME.colors.surface2, alignItems: 'center' },
  methodBtnActive: { borderColor: THEME.colors.teal, backgroundColor: THEME.colors.tealMuted },
  methodBtnText: { color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 13.5 },
  methodBtnTextActive: { color: THEME.colors.teal },
  label: { color: THEME.colors.textSecondary, fontSize: 11, fontFamily: THEME.fonts.sansMedium, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 7 },
  input: { backgroundColor: THEME.colors.surface2, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 15, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: THEME.colors.border, marginBottom: 20 },
  primaryBtn: { backgroundColor: THEME.colors.teal, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: THEME.colors.background, fontFamily: THEME.fonts.sansSemibold, fontSize: 15 },
  errorText: { color: THEME.colors.error, fontFamily: THEME.fonts.sans, fontSize: 12.5, marginBottom: 12, textAlign: 'center' },
  resendText: { color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 13 },
});
