import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ContentManager() {
  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={['top']}>
      <Text className="text-text-primary font-serif text-3xl mb-2">Content</Text>
      <Text className="text-text-secondary font-sans text-sm">Program & module manager — Phase 3</Text>
    </SafeAreaView>
  );
}
