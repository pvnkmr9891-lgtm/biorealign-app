import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePendingCoachRequests, useRespondToCoachRequest } from '@/hooks/useCoachRequests';
import { THEME } from '@/constants/theme';

export default function CoachRequestsScreen() {
  const router = useRouter();
  const { data: requests = [], isLoading, refetch } = usePendingCoachRequests();
  const { mutateAsync: respond, isPending } = useRespondToCoachRequest();

  const onApprove = (req: any) => {
    Alert.alert('Approve request', `Take on ${req.client?.full_name} as your client?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve', onPress: async () => {
          await respond({ requestId: req.id, clientId: req.client_id, action: 'approve' });
          refetch();
        },
      },
    ]);
  };

  const onDecline = (req: any) => {
    Alert.alert('Decline request', `Decline ${req.client?.full_name}'s request?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive', onPress: async () => {
          await respond({ requestId: req.id, clientId: req.client_id, action: 'decline' });
          refetch();
        },
      },
    ]);
  };

  return (
    <SafeAreaView testID="coach-requests-screen" style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          testID="back-button"
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 26, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>Coach Requests</Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{requests.length} pending</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />
      ) : requests.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🧑‍🏫</Text>
          <Text style={{ fontSize: 18, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center' }}>No pending requests</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, gap: 14 }} showsVerticalScrollIndicator={false}>
          {(requests as any[]).map((req) => (
            <View key={req.id} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: `${THEME.colors.amber}30` }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${THEME.colors.teal}20`, borderWidth: 1, borderColor: `${THEME.colors.teal}30`, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>
                    {req.client?.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{req.client?.full_name}</Text>
                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
                    Requested {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <View style={{ backgroundColor: `${THEME.colors.amber}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>Pending</Text>
                </View>
              </View>

              {req.message && (
                <View style={{ backgroundColor: `${THEME.colors.teal}08`, borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 0.5, borderColor: `${THEME.colors.teal}20` }}>
                  <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 20, fontStyle: 'italic' }}>"{req.message}"</Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  testID="approve-request-button"
                  onPress={() => onApprove(req)}
                  disabled={isPending}
                  style={{ flex: 1, backgroundColor: THEME.colors.teal, borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>✓ Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onDecline(req)}
                  disabled={isPending}
                  style={{ flex: 1, backgroundColor: '#F8717115', borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: '#F8717130' }}
                >
                  <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: '#F87171' }}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
