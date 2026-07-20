import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMyLiteClients } from '@/hooks/useCoachRequests';
import { useCoachClientPulse } from '@/hooks/useCoachDashboard';
import { Sparkline } from '@/components/ui/Sparkline';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { THEME } from '@/constants/theme';

const GREEN = '#34D399';

function lastActiveLabel(iso: string | null): string {
  if (!iso) return 'No activity yet';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'Active today';
  if (days === 1) return 'Active yesterday';
  return `Active ${days}d ago`;
}

// Same tier thresholds as the home screen's priority cards, so a client
// reads the same color wherever they show up.
function tierColor(pct: number | null): string {
  if (pct == null) return THEME.colors.textMuted;
  if (pct >= 70) return GREEN;
  if (pct >= 40) return THEME.colors.amber;
  return THEME.colors.error;
}

export default function LiteClientsScreen() {
  const router = useRouter();
  const { data: clients = [], isLoading } = useMyLiteClients();
  const { data: pulse = [] } = useCoachClientPulse();
  const pulseByClient = new Map(pulse.map((p) => [p.clientId, p]));

  return (
    <SafeAreaView testID="lite-clients-screen" style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <FadeInUp delay={0} style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          testID="back-button"
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: THEME.type.h1, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>My Clients</Text>
          <Text style={{ fontSize: THEME.type.caption, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{clients.length} assigned</Text>
        </View>
      </FadeInUp>

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
          {(clients as any[]).map((c, idx) => {
            const p = pulseByClient.get(c.id);
            const pct = p?.adherencePct ?? null;
            const color = tierColor(pct);
            return (
              <FadeInUp key={c.id} delay={Math.min(idx, 8) * 40}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/(coach)/client-overview', params: { clientId: c.id, clientName: c.full_name } })}
                  style={{ backgroundColor: THEME.colors.surface2, borderRadius: THEME.radius.xl, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, ...THEME.glow.soft }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: color, backgroundColor: `${color}18`, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color }}>
                      {c.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{c.full_name}</Text>
                    <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
                      {lastActiveLabel(p?.lastActiveAt ?? null)}
                    </Text>
                  </View>
                  {p && p.dailyDone.some((d) => d > 0) && (
                    <Sparkline data={p.dailyDone} width={52} height={20} color={color} />
                  )}
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color }}>
                      {pct == null ? '—' : `${pct}%`}
                    </Text>
                    <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>7d adherence</Text>
                  </View>
                  <Text style={{ color: THEME.colors.textMuted, fontSize: 18 }}>›</Text>
                </TouchableOpacity>
              </FadeInUp>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
