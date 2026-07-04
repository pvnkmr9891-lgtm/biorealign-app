import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ClientProfileView } from '@/components/profile/ClientProfileView';
import { THEME } from '@/constants/theme';

export default function ClientOverviewScreen() {
  const router = useRouter();
  const { clientId, clientName, tab } = useLocalSearchParams<{ clientId: string; clientName: string; tab?: string }>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ClientProfileView clientId={clientId} clientName={clientName} ownerLabel="Your client" onBack={() => router.back()} initialTab={tab as any} />
    </SafeAreaView>
  );
}
