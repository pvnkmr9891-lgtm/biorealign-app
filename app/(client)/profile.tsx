import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

const MENU_ITEMS = [
  { section: 'Account', items: ['Personal details', 'Health profile', 'Goals & conditions'] },
  { section: 'Program', items: ['My enrollment', 'Session history', 'Achievements'] },
  { section: 'Settings', items: ['Notifications', 'Privacy', 'Support'] },
];

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Avatar + name */}
        <View className="items-center pt-8 pb-6 px-6">
          <View className="w-20 h-20 rounded-full bg-teal-muted border border-teal/30 items-center justify-center mb-3">
            <Text className="text-teal font-serif text-2xl">{initials}</Text>
          </View>
          <Text className="text-text-primary font-serif text-2xl">{profile?.full_name}</Text>
          <Text className="text-text-secondary font-sans text-sm mt-1 capitalize">{profile?.role}</Text>
        </View>

        {/* Stats row */}
        <View className="mx-6 flex-row gap-3 mb-6">
          {[
            { label: 'Week', value: '5' },
            { label: 'Check-ins', value: '23' },
            { label: 'Sessions', value: '8' },
          ].map((s) => (
            <View key={s.label} className="flex-1 bg-surface-2 rounded-xl py-4 items-center border border-border">
              <Text className="text-text-primary font-sans-semibold text-xl">{s.value}</Text>
              <Text className="text-text-muted font-sans text-xs mt-1">{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu */}
        <View className="px-6 gap-5">
          {MENU_ITEMS.map((section) => (
            <View key={section.section}>
              <Text className="text-text-muted font-sans-medium text-xs uppercase tracking-wider mb-2">
                {section.section}
              </Text>
              <View className="bg-surface-2 rounded-xl border border-border overflow-hidden">
                {section.items.map((item, i) => (
                  <TouchableOpacity
                    key={item}
                    activeOpacity={0.7}
                    className="px-4 py-4 flex-row items-center justify-between"
                    style={{ borderTopWidth: i > 0 ? 0.5 : 0, borderTopColor: '#2A2A32' }}
                  >
                    <Text className="text-text-primary font-sans text-sm">{item}</Text>
                    <Text className="text-text-muted text-sm">›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Sign out */}
        <View className="px-6 mt-6">
          <TouchableOpacity
            onPress={signOut}
            className="bg-surface-2 rounded-xl py-4 items-center border border-border"
            activeOpacity={0.8}
          >
            <Text className="text-error font-sans-medium text-sm">Sign out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
