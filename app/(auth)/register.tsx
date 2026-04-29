import { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);

    // 1. Create auth user
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });

    if (authError) {
      setLoading(false);
      Alert.alert('Registration failed', authError.message);
      return;
    }

    // 2. Create profile row (role defaults to 'client')
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        role: 'client',
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        health_goals: [],
        conditions: [],
      });

      if (profileError) {
        console.error('[Register] profile insert error:', profileError.message);
      }
    }

    setLoading(false);
    // AuthGuard handles redirect on session change
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-12 pb-8">

            {/* Header */}
            <View className="items-center mb-10">
              <Text className="text-teal text-xs font-sans-medium tracking-widest uppercase mb-3">
                BioRealign
              </Text>
              <Text className="text-text-primary text-4xl font-serif text-center leading-tight">
                Begin your reset
              </Text>
              <Text className="text-text-secondary text-base font-sans mt-3 text-center">
                Create your account to get started
              </Text>
            </View>

            {/* Form */}
            <View className="gap-4">
              <View>
                <Text className="text-text-secondary text-xs font-sans-medium uppercase tracking-wider mb-2">
                  Full name
                </Text>
                <TextInput
                  className="bg-surface-2 text-text-primary font-sans text-base rounded-lg px-4 py-4 border border-border"
                  placeholder="Eswar Reddy"
                  placeholderTextColor="#6B6965"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>

              <View>
                <Text className="text-text-secondary text-xs font-sans-medium uppercase tracking-wider mb-2">
                  Email
                </Text>
                <TextInput
                  className="bg-surface-2 text-text-primary font-sans text-base rounded-lg px-4 py-4 border border-border"
                  placeholder="you@example.com"
                  placeholderTextColor="#6B6965"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View>
                <Text className="text-text-secondary text-xs font-sans-medium uppercase tracking-wider mb-2">
                  Phone{' '}
                  <Text className="text-text-muted normal-case">(optional)</Text>
                </Text>
                <TextInput
                  className="bg-surface-2 text-text-primary font-sans text-base rounded-lg px-4 py-4 border border-border"
                  placeholder="+91 98765 43210"
                  placeholderTextColor="#6B6965"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View>
                <Text className="text-text-secondary text-xs font-sans-medium uppercase tracking-wider mb-2">
                  Password
                </Text>
                <TextInput
                  className="bg-surface-2 text-text-primary font-sans text-base rounded-lg px-4 py-4 border border-border"
                  placeholder="Min. 8 characters"
                  placeholderTextColor="#6B6965"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                className="bg-teal rounded-lg py-4 items-center mt-2"
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#0A0A0B" />
                ) : (
                  <Text className="text-background font-sans-semibold text-base">
                    Create account
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View className="items-center mt-8">
              <Text className="text-text-muted font-sans text-sm">
                Already have an account?{' '}
                <Link href="/(auth)/login">
                  <Text className="text-teal font-sans-medium">Sign in</Text>
                </Link>
              </Text>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
