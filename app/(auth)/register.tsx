import { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import PhoneInput from 'react-native-phone-number-input';
import { supabase } from '@/lib/supabase';
import { THEME } from '@/constants/theme';
import { PasswordField, isPasswordValid } from '@/components/auth/PasswordField';
import { OtpInput } from '@/components/auth/OtpInput';
import { usePhoneOtp } from '@/hooks/usePhoneOtp';
import { isValidEmail, isValidPhone, MAX_LENGTHS } from '@/utils/validation';

type Step = 'form' | 'otp';

export default function RegisterScreen() {
  const router = useRouter();
  const phoneInputRef = useRef<PhoneInput>(null);
  const { sendOtp, verifyOtp, sending, verifying } = usePhoneOtp();

  const [step, setStep] = useState<Step>('form');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(''); // formatted, e.g. +91 98765 43210
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [otp, setOtp] = useState('000000'); // DEV BYPASS — remove before launch
  const [otpError, setOtpError] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  function handleUsernameChange(text: string) {
    // Real-time filtering — strip anything that isn't a letter or digit,
    // so pasting a symbol-laden string just silently drops the bad chars
    // instead of needing a submit-time error round-trip.
    setUsername(text.replace(/[^a-zA-Z0-9]/g, ''));
  }

  async function handleRegister() {
    if (!fullName.trim() || !username.trim() || !email.trim() || !password) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    if (username.trim().length < 3) {
      Alert.alert('Username too short', 'Username must be at least 3 characters.');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    // The react-native-phone-number-input ref's own isValidNumber() depends on
    // an async country-calling-code lookup inside that library resolving
    // before the first keystroke — when it hasn't, a genuinely valid 10-digit
    // number gets rejected. Fall back to the app's own digit-count check
    // (already used for phone validation on forgot-password) whenever the
    // library says invalid, so a real number is never blocked by that race.
    const libraryValid = phoneInputRef.current?.isValidNumber(phone) ?? false;
    if (!libraryValid && !isValidPhone(phone)) {
      Alert.alert('Invalid phone number', 'Please enter a valid phone number.');
      return;
    }
    if (!isPasswordValid(password)) {
      Alert.alert('Weak password', 'Password must be at least 8 characters with a letter and a number.');
      return;
    }

    // Same async race can leave `phone` without its "+91" prefix (see above) —
    // normalize before it's ever sent to the DB or an OTP provider, and persist
    // it back to state so the later OTP-verify/resend calls use it too.
    const normalizedPhone = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim()}`;
    setPhone(normalizedPhone);

    setLoading(true);

    // Retry once on network failure — handles Supabase cold-start on free tier
    let signUpData: Awaited<ReturnType<typeof supabase.auth.signUp>> | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      signUpData = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (!signUpData.error || !signUpData.error.message.includes('Network')) break;
      await new Promise(r => setTimeout(r, 1000));
    }
    const { data, error: authError } = signUpData!;

    if (authError || !data.user) {
      setLoading(false);
      Alert.alert('Registration failed', authError?.message ?? 'Please try again.');
      return;
    }

    // Small delay for the handle_new_user trigger to commit the profile row
    // before we update it — trigger runs async relative to signUp returning.
    await new Promise(r => setTimeout(r, 500));

    // Profile row already exists (handle_new_user trigger) — fill in the
    // fields this screen owns. username/phone uniqueness is enforced by DB
    // constraints, so a collision surfaces here as a clear error.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ username: username.trim(), phone: normalizedPhone })
      .eq('id', data.user.id);

    if (profileError) {
      setLoading(false);
      const friendly = profileError.message.includes('username')
        ? 'That username is already taken.'
        : profileError.message.includes('phone')
        ? 'That phone number is already registered.'
        : profileError.message;
      Alert.alert('Could not save details', friendly);
      return;
    }

    const otpResult = await sendOtp(normalizedPhone);
    setLoading(false);

    if (!otpResult.ok) {
      Alert.alert('Could not send code', otpResult.error ?? 'Please try again.');
      return;
    }

    setPendingUserId(data.user.id);
    setStep('otp');
  }

  async function handleVerifyOtp() {
    if (otp.length !== 6 || !pendingUserId) return;
    setOtpError(null);
    const result = await verifyOtp(phone, otp);
    if (!result.ok) {
      setOtpError(result.error ?? 'Incorrect code. Please try again.');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ phone_verified: true, phone_verified_at: new Date().toISOString() })
      .eq('id', pendingUserId);

    if (error) {
      setOtpError(error.message);
      return;
    }

    router.replace('/(auth)/welcome' as any);
    // AuthGuard handles redirect on session change
  }

  async function handleResend() {
    setOtpError(null);
    const result = await sendOtp(phone);
    if (!result.ok) setOtpError(result.error ?? 'Could not resend code.');
  }

  if (step === 'otp') {
    return (
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
            <Text style={styles.headerTitle}>Verify your phone</Text>
            <Text style={styles.headerSubtitle}>Enter the 6-digit code sent to {phone}</Text>

            <View style={{ marginTop: 28, marginBottom: 12 }}>
              <OtpInput value={otp} onChange={setOtp} />
            </View>
            {otpError && <Text style={styles.errorText}>{otpError}</Text>}

            <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyOtp} disabled={verifying || otp.length !== 6} activeOpacity={0.85}>
              {verifying ? <ActivityIndicator color={THEME.colors.background} /> : <Text style={styles.primaryBtnText}>Verify</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleResend} disabled={sending} style={{ marginTop: 18, alignItems: 'center' }}>
              <Text style={styles.resendText}>{sending ? 'Resending…' : "Didn't get a code? Resend"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 }}>

            <Text style={styles.brand}>BioRealign</Text>

            {/* Brand tagline — matches welcome.tsx's founder-card tagline styling */}
            <View style={{ marginBottom: 22 }}>
              <Text style={styles.tagline}>"I don't train bodies.{'\n'}I rebuild humans."</Text>
            </View>

            <Text style={styles.headerTitle}>Begin your reset</Text>
            <Text style={styles.headerSubtitle}>Create your account to get started</Text>

            <View style={{ gap: 16, marginTop: 28 }}>
              <View>
                <Text style={styles.label}>Full name</Text>
                <TextInput style={styles.input} placeholder="Eswar Reddy" placeholderTextColor={THEME.colors.textMuted} value={fullName} onChangeText={setFullName} autoCapitalize="words" maxLength={MAX_LENGTHS.personName} />
              </View>

              <View>
                <Text style={styles.label}>Username</Text>
                <TextInput style={styles.input} placeholder="eswarreddy" placeholderTextColor={THEME.colors.textMuted} value={username} onChangeText={handleUsernameChange} autoCapitalize="none" maxLength={MAX_LENGTHS.username} />
                <Text style={styles.hint}>Letters and numbers only</Text>
              </View>

              <View>
                <Text style={styles.label}>Email</Text>
                <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={THEME.colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" maxLength={254} />
              </View>

              <View>
                <Text style={styles.label}>Phone number</Text>
                <PhoneInput
                  ref={phoneInputRef}
                  defaultCode="IN"
                  layout="second"
                  value={phone}
                  onChangeFormattedText={setPhone}
                  containerStyle={styles.phoneContainer}
                  textContainerStyle={styles.phoneTextContainer}
                  textInputStyle={styles.phoneTextInput}
                  codeTextStyle={{ color: THEME.colors.textPrimary }}
                  withDarkTheme
                  placeholder="98765 43210"
                />
              </View>

              <View>
                <Text style={styles.label}>Password</Text>
                <PasswordField value={password} onChangeText={setPassword} />
              </View>

              <TouchableOpacity style={[styles.primaryBtn, { marginTop: 4 }]} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color={THEME.colors.background} /> : <Text style={styles.primaryBtnText}>Create account</Text>}
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: 'center', marginTop: 28 }}>
              <Text style={styles.footerText}>
                Already have an account?{' '}
                <Link href="/(auth)/login">
                  <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium }}>Sign in</Text>
                </Link>
              </Text>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  brand: { color: THEME.colors.teal, fontSize: 12, fontFamily: THEME.fonts.sansMedium, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 18, textAlign: 'center' },
  tagline: { fontSize: 20, fontFamily: THEME.fonts.serif, color: THEME.colors.textSecondary, lineHeight: 30, fontStyle: 'italic', textAlign: 'center' },
  headerTitle: { color: THEME.colors.textPrimary, fontSize: 28, fontFamily: THEME.fonts.serif, textAlign: 'center' },
  headerSubtitle: { color: THEME.colors.textSecondary, fontSize: 14, fontFamily: THEME.fonts.sans, marginTop: 8, textAlign: 'center' },
  label: { color: THEME.colors.textSecondary, fontSize: 11, fontFamily: THEME.fonts.sansMedium, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 7 },
  hint: { color: THEME.colors.textMuted, fontSize: 11, fontFamily: THEME.fonts.sans, marginTop: 5 },
  input: { backgroundColor: THEME.colors.surface2, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 15, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: THEME.colors.border },
  phoneContainer: { width: '100%', backgroundColor: THEME.colors.surface2, borderRadius: 12, borderWidth: 1, borderColor: THEME.colors.border, height: 52 },
  phoneTextContainer: { backgroundColor: THEME.colors.surface2, borderRadius: 12, paddingVertical: 0 },
  phoneTextInput: { color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 15, height: 50 },
  primaryBtn: { backgroundColor: THEME.colors.teal, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: THEME.colors.background, fontFamily: THEME.fonts.sansSemibold, fontSize: 15 },
  footerText: { color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13 },
  errorText: { color: THEME.colors.error, fontFamily: THEME.fonts.sans, fontSize: 12.5, marginBottom: 12, textAlign: 'center' },
  resendText: { color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 13 },
});
