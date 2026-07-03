import '../src/global.css';

import { useEffect } from 'react';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '@/lib/queryClient';
import { useAuth, useAuthListener } from '@/hooks/useAuth';
import { initMonitoring, wrapRoot, Sentry, monitoringEnabled } from '@/lib/monitoring';
import { trackScreen, identifyUser, resetAnalytics } from '@/lib/analytics';

initMonitoring();

SplashScreen.preventAutoHideAsync();

// ---------------------------------------------------------------------------
// Telemetry — screen views + user identity for Sentry/PostHog.
// Only user id + role are attached, never name/phone/email or health data.
// ---------------------------------------------------------------------------
function Telemetry() {
  const pathname = usePathname();
  const { user, role } = useAuth();

  useEffect(() => {
    trackScreen(pathname);
    if (monitoringEnabled) {
      Sentry.addBreadcrumb({ category: 'navigation', message: pathname, level: 'info' });
    }
  }, [pathname]);

  useEffect(() => {
    if (user?.id) {
      identifyUser(user.id, { role });
      if (monitoringEnabled) Sentry.setUser({ id: user.id, segment: role ?? undefined });
    } else {
      resetAnalytics();
      if (monitoringEnabled) Sentry.setUser(null);
    }
  }, [user?.id, role]);

  return null;
}

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

    // The email-OTP step of forgot-password grants a real session mid-flow
    // (supabase.auth.verifyOtp) before the user has actually set their new
    // password — never redirect away from this screen for any role/state,
    // or the role-based redirects below would yank them out before they can
    // finish resetting.
    if (segments[1] === 'forgot-password') return;

    if (!role) return;

    // ── Client: check onboarding first ────────────────────────────────────
  if (role === 'client') {
  const onboardingDone = profile?.onboarding_completed ?? false;

  // Never interfere with onboarding or the new auth-group intro screens
  if (inOnboarding) return;
  if (inAuthGroup && !onboardingDone) return;  // ← allows welcome, program-select etc.

  // Not yet in onboarding flow → send to welcome
  if (!onboardingDone) {
    router.replace('/(auth)/welcome' as any);  // ← was '/onboarding'
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
function RootLayout() {
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
      <Telemetry />
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="light" />
    </QueryClientProvider>
  );
}

export default wrapRoot(RootLayout);
