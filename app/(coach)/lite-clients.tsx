import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMyLiteClients } from '@/hooks/useCoachRequests';
import { useCoachClientPulse } from '@/hooks/useCoachDashboard';
import { THEME } from '@/constants/theme';

function lastActiveLabel(iso: string | null): string {
  if (!iso) return 'No activity yet';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'Active today';
  if (days === 1) return 'Active yesterday';
  return `Active ${days}d ago`;
}

export default function LiteClientsScreen() {
  const router = useRouter();
  const { data: clients = [], isLoading } = useMyLiteClients();
  const { data: pulse = [] } = useCoachClientPulse();
  const pulseByClient = new Map(pulse.map((p) => [p.clientId, p]));

  return (
    <SafeAreaView testID="lite-clients-screen" style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          testID="back-button"
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 26, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>My Clients</Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{clients.length} assigned</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />
      ) : clients.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🙋</Text>
          <Text style={{ fontSize: 18, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center' }}>No clients yet</Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', marginTop: 6 }}>
            Approved coach requests will show up here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, gap: 10 }} showsVerticalScrollIndicator={false}>
          {(clients as any[]).map((c) => {
            const p = pulseByClient.get(c.id);
            const pct = p?.adherencePct ?? null;
            const pctColor = pct == null ? THEME.colors.textMuted : pct >= 70 ? (THEME.colors.success ?? '#4CC986') : pct >= 40 ? THEME.colors.amber : THEME.colors.error;
            return (
              <TouchableOpacity
                key={c.id}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/(coach)/client-overview', params: { clientId: c.id, clientName: c.full_name } })}
                style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${THEME.colors.teal}20`, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>
                    {c.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{c.full_name}</Text>
                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
                    {lastActiveLabel(p?.lastActiveAt ?? null)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: pctColor }}>
                    {pct == null ? '—' : `${pct}%`}
                  </Text>
                  <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>7d adherence</Text>
                </View>
                <Text style={{ color: THEME.colors.textMuted, fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
