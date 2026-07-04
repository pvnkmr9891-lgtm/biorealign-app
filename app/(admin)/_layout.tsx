import { Stack } from 'expo-router';
import { THEME } from '@/constants/theme';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: THEME.colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="users" />
      <Stack.Screen name="broadcast" />
      <Stack.Screen name="coach-assignment" />
      <Stack.Screen name="assessments" />
      <Stack.Screen name="assessment-detail" />
      <Stack.Screen name="client-profile" />
      <Stack.Screen name="coach-profile" />
      <Stack.Screen name="clients" />
      <Stack.Screen name="coaches" />
      <Stack.Screen name="rehab-queue" />
      <Stack.Screen name="clients-by-goals" />
      <Stack.Screen name="goal-clients" />
      <Stack.Screen name="medical-records" />
      <Stack.Screen name="medical-records-clients" />
      <Stack.Screen name="fitness-assessment-new" />
      <Stack.Screen name="fitness-analytics" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
