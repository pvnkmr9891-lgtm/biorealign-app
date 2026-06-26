import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAdminMedicalRecordsClients, MedicalRecordsClientFilter } from '@/hooks/useAdmin';
import { THEME } from '@/constants/theme';

const TITLES: Record<MedicalRecordsClientFilter, string> = {
  has_docs: 'Clients with documents',
  has_analysis: 'Clients with an AI analysis',
  sent_to_coach: 'Sent to coach',
  sent_to_expert: 'Sent for expert opinion',
};

export default function MedicalRecordsClientsScreen() {
  const router = useRouter();
  const { filter } = useLocalSearchParams<{ filter: MedicalRecordsClientFilter }>();
  const { data: clients = [], isLoading } = useAdminMedicalRecordsClients(filter ?? null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 22 }}>
          {TITLES[filter as MedicalRecordsClientFilter] ?? 'Clients'}
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginBottom: 12 }}>
            {clients.length} client{clients.length !== 1 ? 's' : ''}
          </Text>
          <View style={{ gap: 10 }}>
            {clients.map((c: any) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => router.push({ pathname: '/(admin)/client-profile', params: { clientId: c.id, clientName: c.full_name, initialTab: 'medical' } })}
                activeOpacity={0.85}
                style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 15 }}>{c.full_name}</Text>
                <Text style={{ color: THEME.colors.textMuted, fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            ))}
            {clients.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>🩺</Text>
                <Text style={{ fontSize: 16, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>No clients yet</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
