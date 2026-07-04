import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="welcome"          options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="program-select"   options={{ headerShown: false }} />
      <Stack.Screen name="program-detail"   options={{ headerShown: false }} />
      <Stack.Screen name="intensity-select" options={{ headerShown: false }} />
    </Stack>
  );
}
