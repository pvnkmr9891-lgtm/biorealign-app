import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ClientProfileView } from '@/components/profile/ClientProfileView';
import { THEME } from '@/constants/theme';

export default function AdminClientProfileScreen() {
  const router = useRouter();
  const { clientId, clientName, initialTab } = useLocalSearchParams<{ clientId: string; clientName: string; initialTab?: string }>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ClientProfileView
        clientId={clientId}
        clientName={clientName}
        ownerLabel="Client"
        onBack={() => router.back()}
        showRecoveryTab
        initialTab={initialTab as any}
      />
    </SafeAreaView>
  );
}
