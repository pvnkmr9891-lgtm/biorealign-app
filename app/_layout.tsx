import '../src/global.css';

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '@/lib/queryClient';
import { useAuth, useAuthListener } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

// ---------------------------------------------------------------------------
// Auth guard — redirects based on session + role + onboarding state
// ---------------------------------------------------------------------------
function AuthGuard() {
  const { isAuthenticated, isInitialised, role, profile } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialised) return;

    const inAuthGroup      = segments[0] === '(auth)';
    const inClientGroup    = segments[0] === '(client)';
    const inCoachGroup     = segments[0] === '(coach)';
    const inAdminGroup     = segments[0] === '(admin)';
    const inOnboarding     = segments[0] === 'onboarding';

    // ── Not logged in ──────────────────────────────────────────────────────
    if (!isAuthenticated) {
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    if (!role) return;

    // ── Client: check onboarding first ────────────────────────────────────
   if (role === 'client') {
  const onboardingDone = profile?.onboarding_completed ?? false;

  // Never interfere with the onboarding flow —
  // let the screens handle their own navigation
  if (inOnboarding) return;

  // Outside onboarding: route based on completion status
  if (!onboardingDone) {
    router.replace('/onboarding');
    return;
  }

  if (!inClientGroup) {
    router.replace('/(client)');
    return;
  }
}

    // ── Coach ──────────────────────────────────────────────────────────────
    if (role === 'coach') {
      if (!inCoachGroup) router.replace('/(coach)');
      if (inAuthGroup)   router.replace('/(coach)');
      return;
    }

    // ── Admin ──────────────────────────────────────────────────────────────
    if (role === 'admin') {
      if (!inAdminGroup) router.replace('/(admin)');
      if (inAuthGroup)   router.replace('/(admin)');
      return;
    }
  }, [isAuthenticated, isInitialised, role, profile, segments, router]);

  return null;
}

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------
export default function RootLayout() {
  useAuthListener();

  const [fontsLoaded] = useFonts({
    'DMSerifDisplay-Regular': require('../assets/fonts/DMSerifDisplay-Regular.ttf'),
    'DMSans-Regular':         require('../assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium':          require('../assets/fonts/DMSans-Medium.ttf'),
    'DMSans-Bold':            require('../assets/fonts/DMSans-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="light" />
    </QueryClientProvider>
  );
}
