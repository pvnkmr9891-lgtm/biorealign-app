import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAdminMedicalRecordsOverview } from '@/hooks/useAdmin';
import { THEME } from '@/constants/theme';

export default function AdminMedicalRecordsScreen() {
  const router = useRouter();
  const { data, isLoading } = useAdminMedicalRecordsOverview();

  const stats = [
    { label: 'Clients with ≥1 document', value: data?.clientsWithDocs ?? 0, color: THEME.colors.teal },
    { label: 'Clients with an AI analysis', value: data?.clientsWithAnalysis ?? 0, color: THEME.colors.amber },
    { label: 'Sent to coach', value: data?.sentToCoachCount ?? 0, color: '#93C5FD' },
    { label: 'Sent for expert opinion', value: data?.sentToExpertCount ?? 0, color: '#C4B5FD' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 26 }}>Medical Records</Text>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12.5, marginTop: 1 }}>Platform-wide aggregate view</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {stats.map((s) => (
              <View key={s.label} style={{ width: '47%', backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginBottom: 8 }}>{s.label}</Text>
                <Text style={{ color: s.color, fontFamily: THEME.fonts.sansMedium, fontSize: 30 }}>{s.value}</Text>
              </View>
            ))}
          </View>

          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 20, lineHeight: 18 }}>
            "Sent to coach" and "sent for expert opinion" are independent actions a client can take per analysis —
            a single analysis can be sent to both, so these counts aren't mutually exclusive subsets of each other.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
