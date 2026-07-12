import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { THEME } from '@/constants/theme';
import { MAX_LENGTHS, isValidEmail } from '@/utils/validation';

const INPUT_STYLE = {
  backgroundColor: THEME.colors.surface2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14.5,
  borderWidth: 0.5, borderColor: THEME.colors.border,
} as const;

function isTenDigitIndianNumber(value: string): boolean {
  const digits = value.replace(/[^0-9]/g, '');
  return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
}

export default function AddCoachScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdCoach, setCreatedCoach] = useState<{ name: string; phone: string } | null>(null);

  const handleCreate = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      Alert.alert('Missing fields', 'Please fill in name, email, and phone.');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (!isTenDigitIndianNumber(phone)) {
      Alert.alert('Invalid phone', 'Please enter a valid 10-digit phone number.');
      return;
    }
    const normalizedPhone = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.replace(/[^0-9]/g, '')}`;

    setLoading(true);
    const { data, error } = await supabase.functions.invoke('admin-create-coach', {
      body: { fullName: fullName.trim(), email: email.trim(), phone: normalizedPhone },
    });
    setLoading(false);

    if (error) {
      // supabase-js's default FunctionsHttpError.message is a generic
      // "Edge Function returned a non-2xx status code" — the actual reason
      // (e.g. "That email is already registered.") is JSON in the body.
      const body = await (error as any)?.context?.json?.().catch(() => null);
      Alert.alert('Could not create coach', body?.error ?? error.message);
      return;
    }
    if (data?.error) {
      Alert.alert('Could not create coach', data.error);
      return;
    }

    setCreatedCoach({ name: fullName.trim(), phone: normalizedPhone });
  };

  const handleAddAnother = () => {
    setCreatedCoach(null);
    setFullName('');
    setEmail('');
    setPhone('');
  };

  if (createdCoach) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
            <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 24 }}>Add Coach</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>✅</Text>
            <Text style={{ fontSize: 18, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center' }}>
              {createdCoach.name} is now a coach
            </Text>
          </View>

          <View style={{ backgroundColor: `${THEME.colors.teal}10`, borderRadius: 14, padding: 18, borderWidth: 0.5, borderColor: `${THEME.colors.teal}30`, marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, marginBottom: 10 }}>
              Next: tell them how to activate their account
            </Text>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 21 }}>
              No password was set — nobody needs to share one. Ask them to:
              {'\n\n'}1. Install the BioRealign app{'\n'}
              2. On the Sign In screen, tap <Text style={{ fontFamily: THEME.fonts.sansMedium }}>Forgot password?</Text>{'\n'}
              3. Choose <Text style={{ fontFamily: THEME.fonts.sansMedium }}>Phone</Text> and enter {createdCoach.phone}{'\n'}
              4. Verify the code and set their own password{'\n'}
              5. Sign in with their email + that password
            </Text>
          </View>

          <TouchableOpacity onPress={handleAddAnother} activeOpacity={0.85} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 10 }}>
            <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>+ Add another coach</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace('/(admin)/coaches' as any)} activeOpacity={0.85} style={{ backgroundColor: THEME.colors.teal, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>View coaches</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
            <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 24 }}>Add Coach</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 20, lineHeight: 19 }}>
            Creates the account and marks it as a coach — no password is ever set by you. The coach activates it themselves via a phone-verification flow after you invite them.
          </Text>

          <View style={{ gap: 16 }}>
            <View>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 7 }}>Full name</Text>
              <TextInput value={fullName} onChangeText={setFullName} placeholder="e.g. Rohan Kapoor" placeholderTextColor={THEME.colors.textMuted} style={INPUT_STYLE} maxLength={MAX_LENGTHS.personName} />
            </View>
            <View>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 7 }}>Email</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="coach@example.com" placeholderTextColor={THEME.colors.textMuted} style={INPUT_STYLE} autoCapitalize="none" keyboardType="email-address" />
            </View>
            <View>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 7 }}>Phone number</Text>
              <TextInput value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" placeholderTextColor={THEME.colors.textMuted} style={INPUT_STYLE} keyboardType="phone-pad" />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.85}
            style={{ backgroundColor: THEME.colors.teal, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 28, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <ActivityIndicator color={THEME.colors.background} /> : <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Create coach account</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
