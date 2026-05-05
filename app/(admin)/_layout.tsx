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
    </Stack>
  );
}
