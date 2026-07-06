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
import { Link, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    let result = await supabase.auth.signInWithPassword({ email, password });
    // Retry once on network failure — handles Supabase cold-start on free tier
    if (result.error?.message.includes('Network')) {
      await new Promise(r => setTimeout(r, 1000));
      result = await supabase.auth.signInWithPassword({ email, password });
    }
    setLoading(false);
    if (result.error) Alert.alert('Login failed', result.error.message);
    // On success, AuthGuard in _layout.tsx handles the redirect
  };

  return (
    <SafeAreaView testID="login-screen" className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-12 pb-8 justify-between">

            {/* Header */}
            <View className="items-center mb-12">
              <Text className="text-teal text-xs font-sans-medium tracking-widest uppercase mb-3">
                BioRealign
              </Text>
              <Text className="text-text-primary text-4xl font-serif text-center leading-tight">
                Welcome back
              </Text>
              <Text className="text-text-secondary text-base font-sans mt-3 text-center">
                Sign in to continue your transformation
              </Text>
            </View>

            {/* Form */}
            <View className="gap-4">
              <View>
                <Text className="text-text-secondary text-xs font-sans-medium uppercase tracking-wider mb-2">
                  Email
                </Text>
                <TextInput
                  testID="login-email-input"
                  className="bg-surface-2 text-text-primary font-sans text-base rounded-lg px-4 py-4 border border-border"
                  placeholder="you@example.com"
                  placeholderTextColor="#6B6965"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>

              <View>
                <Text className="text-text-secondary text-xs font-sans-medium uppercase tracking-wider mb-2">
                  Password
                </Text>
                <TextInput
                  testID="login-password-input"
                  className="bg-surface-2 text-text-primary font-sans text-base rounded-lg px-4 py-4 border border-border"
                  placeholder="••••••••"
                  placeholderTextColor="#6B6965"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                />
              </View>

              <TouchableOpacity
                testID="login-submit-button"
                className="bg-teal rounded-lg py-4 items-center mt-2"
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#0A0A0B" />
                ) : (
                  <Text className="text-background font-sans-semibold text-base">
                    Sign in
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity className="items-center py-2" onPress={() => router.push('/(auth)/forgot-password' as any)}>
                <Text className="text-text-secondary font-sans text-sm">
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View className="items-center mt-8">
              <Text className="text-text-muted font-sans text-sm">
                New to BioRealign?{' '}
                <Link href="/(auth)/register">
                  <Text className="text-teal font-sans-medium">Get started</Text>
                </Link>
              </Text>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
