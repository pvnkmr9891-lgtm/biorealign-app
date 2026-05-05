import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useCoachClients, useTodaySessions } from '@/hooks/useCoach';
import { THEME } from '@/constants/theme';

const SESSION_TYPE_LABELS: Record<string, string> = {
  assessment: 'Assessment',
  coaching:   'Coaching',
  follow_up:  'Follow-up',
  check_in:   'Check-in',
};

export default function CoachDashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Coach';

  const { data: clients = [],  isLoading: clientsLoading } = useCoachClients();
  const { data: sessions = [], isLoading: sessionsLoading } = useTodaySessions();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
          <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 14 }}>
                Coach portal
              </Text>
              <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 32, marginTop: 2 }}>
                {greeting}, {firstName}
              </Text>
            </View>

  {/* Profile button — ADD THIS */}
  <TouchableOpacity
    onPress={() => router.push('/(coach)/profile')}
    style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: `${THEME.colors.amber}20`, borderWidth: 1, borderColor: `${THEME.colors.amber}40`, alignItems: 'center', justifyContent: 'center' }}
  >
    <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>
      {firstName[0]}
    </Text>
  </TouchableOpacity>
</View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 12, marginHorizontal: 24, marginBottom: 24 }}>
          {[
            { label: 'Active clients',   value: clientsLoading  ? '–' : String(clients.length) },
            { label: 'Sessions today',   value: sessionsLoading ? '–' : String(sessions.length) },
            { label: 'Pending reviews',  value: '0' },
          ].map((s) => (
            <View key={s.label} style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
              <Text style={{ color: THEME.colors.amber, fontFamily: THEME.fonts.sansMedium, fontSize: 24 }}>{s.value}</Text>
              <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11, marginTop: 4, textAlign: 'center' }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Today's sessions */}
        <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
            Today's sessions
          </Text>

          {sessionsLoading ? (
            <ActivityIndicator color={THEME.colors.amber} />
          ) : sessions.length === 0 ? (
            <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
              <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13 }}>
                No sessions scheduled for today
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {sessions.map((s: any) => (
                <TouchableOpacity
                  key={s.id}
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/(coach)/session-notes', params: { sessionId: s.id, clientName: s.client?.full_name } })}
                  style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <View>
                    <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 15 }}>
                      {s.client?.full_name}
                    </Text>
                    <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>
                      {SESSION_TYPE_LABELS[s.type] ?? s.type} · {s.duration_min} min
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: THEME.colors.amber, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>
                      {new Date(s.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11, marginTop: 2 }}>
                      Tap for notes ›
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>


        {/* Enrollment requests */}
<TouchableOpacity
  onPress={() => router.push('/(coach)/enrollment-requests')}
  style={{ marginHorizontal: 24, marginBottom: 24, backgroundColor: `${THEME.colors.amber}12`, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: `${THEME.colors.amber}30`, flexDirection: 'row', alignItems: 'center', gap: 12 }}
  activeOpacity={0.8}
>
  <Text style={{ fontSize: 22 }}>📋</Text>
  <View style={{ flex: 1 }}>
    <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>
      Enrollment Requests
    </Text>
    <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
      Review and approve client program requests
    </Text>
  </View>
  <Text style={{ color: THEME.colors.amber, fontSize: 18 }}>›</Text>
</TouchableOpacity>

        {/* Recent clients */}
        <View style={{ marginHorizontal: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Active clients
            </Text>
            <TouchableOpacity onPress={() => router.push('/(coach)/inbox')}>
              <Text style={{ color: THEME.colors.amber, fontFamily: THEME.fonts.sans, fontSize: 12 }}>
                View all ›
              </Text>
            </TouchableOpacity>
          </View>

          {clientsLoading ? (
            <ActivityIndicator color={THEME.colors.amber} />
          ) : clients.length === 0 ? (
            <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
              <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13 }}>
                No active clients yet
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {clients.slice(0, 4).map((e: any) => (
                <TouchableOpacity
                  key={e.id}
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/(coach)/client-detail', params: { enrollmentId: e.id, clientId: e.client?.id, clientName: e.client?.full_name } })}
                  style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${THEME.colors.amber}20`, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: `${THEME.colors.amber}30` }}>
                    <Text style={{ color: THEME.colors.amber, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>
                      {e.client?.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>
                      {e.client?.full_name}
                    </Text>
                    <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>
                      {e.program?.name} · Wk {e.current_week}
                    </Text>
                  </View>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.colors.success }} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
