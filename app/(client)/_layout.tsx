import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { THEME } from '@/constants/theme';

// Simple icon placeholder — replace with a proper icon library (e.g. lucide-react-native)
function TabIcon({ active, color }: { active: boolean; color: string }) {
  return (
    <View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: active ? THEME.colors.teal : 'transparent',
        marginTop: 2,
      }}
    />
  );
}

export default function ClientLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: THEME.colors.surface,
          borderTopColor: THEME.colors.border,
          borderTopWidth: 0.5,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: THEME.colors.teal,
        tabBarInactiveTintColor: THEME.colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: 'DMSans_500Medium',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ focused, color }) => <TabIcon active={focused} color={color} /> }}
      />
      <Tabs.Screen
        name="programs"
        options={{ title: 'Programs', tabBarIcon: ({ focused, color }) => <TabIcon active={focused} color={color} /> }}
      />
      <Tabs.Screen
        name="checkin"
        options={{ title: 'Check-in', tabBarIcon: ({ focused, color }) => <TabIcon active={focused} color={color} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Progress', tabBarIcon: ({ focused, color }) => <TabIcon active={focused} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ focused, color }) => <TabIcon active={focused} color={color} /> }}
      />
    </Tabs>
  );
}
