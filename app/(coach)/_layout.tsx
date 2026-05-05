import { Stack } from 'expo-router';
import { THEME } from '@/constants/theme';

export default function CoachLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: THEME.colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="clients" />
      <Stack.Screen name="client-detail" />
      <Stack.Screen name="session-notes" />
      <Stack.Screen name="messaging" />
      <Stack.Screen name="inbox" />
      <Stack.Screen name="enrollment-requests" />
      <Stack.Screen name="plan-builder" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
