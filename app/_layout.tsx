import '../src/global.css';
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
} from '@expo-google-fonts/dm-serif-display';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_400Regular_Italic,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { queryClient } from '@/lib/queryClient';
import { useAuth, useAuthListener } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

// ---------------------------------------------------------------------------
// Auth guard — redirects based on session + role
// ---------------------------------------------------------------------------
function AuthGuard() {
  const { isAuthenticated, isInitialised, role } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialised || !role) return;

    const inAuthGroup    = segments[0] === '(auth)';
    const inClientGroup  = segments[0] === '(client)';
    const inCoachGroup   = segments[0] === '(coach)';
    const inAdminGroup   = segments[0] === '(admin)';

    if (!isAuthenticated) {
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    // Wrong portal — redirect to correct one
    if (role === 'admin' && !inAdminGroup) {
      router.replace('/(admin)');
    } else if (role === 'coach' && !inCoachGroup) {
      router.replace('/(coach)');
    } else if (role === 'client' && !inClientGroup) {
      if (inAuthGroup) router.replace('/(client)');
    } else if (inAuthGroup) {
      // Fallback from login screen
      if (role === 'admin') router.replace('/(admin)');
      else if (role === 'coach') router.replace('/(coach)');
      else router.replace('/(client)');
    }
  }, [isAuthenticated, isInitialised, role]);

  return null;
}

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------
export default function RootLayout() {
  useAuthListener();

  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    CormorantGaramond_400Regular,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <AuthGuard />
      <Slot />
    </QueryClientProvider>
  );
}
