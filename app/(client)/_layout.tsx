import { Stack } from 'expo-router';
import { View } from 'react-native';
import { THEME } from '@/constants/theme';
import { SlidingTabBar } from '@/components/ui/SlidingTabBar';

export default function ClientLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: THEME.colors.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: THEME.colors.background,
            // Add bottom padding so content doesn't hide behind dock
            paddingBottom: 100,
          },
          animation: 'fade',
        }}
      >
        {/* Main tabs */}
        <Stack.Screen name="index" />
        <Stack.Screen name="workout-plan" />
        <Stack.Screen name="checkin" />
        <Stack.Screen name="progress" />
        <Stack.Screen name="programs" />
        <Stack.Screen name="my-plan" />
        <Stack.Screen name="messages" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="routine-new"          options={{ contentStyle: { backgroundColor: THEME.colors.background, paddingBottom: 0 } }} />
        <Stack.Screen name="routine-category" options={{ contentStyle: { backgroundColor: THEME.colors.background, paddingBottom: 0 } }} />
        <Stack.Screen name="routine-add-exercise" options={{ contentStyle: { backgroundColor: THEME.colors.background, paddingBottom: 0 } }} />
        <Stack.Screen name="routine-explore" options={{ contentStyle: { backgroundColor: THEME.colors.background, paddingBottom: 0 } }} />
        <Stack.Screen name="recovery" options={{ contentStyle: { backgroundColor: THEME.colors.background, paddingBottom: 0 } }} />
        <Stack.Screen name="recovery-request" options={{ contentStyle: { backgroundColor: THEME.colors.background, paddingBottom: 0 } }} />
        <Stack.Screen name="fitness-assessment" options={{ contentStyle: { backgroundColor: THEME.colors.background, paddingBottom: 0 } }} />
        {/* Sub-screens — no bottom padding needed */}
        <Stack.Screen
          name="workout-detail"
          options={{ contentStyle: { backgroundColor: THEME.colors.background, paddingBottom: 0 } }}
        />
        <Stack.Screen
          name="workout-player"
          options={{ contentStyle: { backgroundColor: THEME.colors.background, paddingBottom: 0 } }}
        />
        <Stack.Screen
          name="workout-interval"
          options={{ contentStyle: { backgroundColor: THEME.colors.background, paddingBottom: 0 } }}
        />
        <Stack.Screen
          name="content/player"
          options={{ contentStyle: { backgroundColor: THEME.colors.background, paddingBottom: 0 }, animation: 'slide_from_bottom' }}
        />
      </Stack>

      {/* Floating tab bar — hidden on workout player and interval screens */}
      <SlidingTabBar />
    </View>
  );
}
