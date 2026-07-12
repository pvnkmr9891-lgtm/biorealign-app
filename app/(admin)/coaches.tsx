import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAdminCoachesList } from '@/hooks/useAdmin';
import { THEME } from '@/constants/theme';

function timeAgo(iso: string | null) {
  if (!iso) return 'Never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function CoachesScreen() {
  const router = useRouter();
  const { data: coaches = [], isLoading } = useAdminCoachesList();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 28, flex: 1 }}>Coaches</Text>
        <TouchableOpacity
          onPress={() => router.push('/(admin)/add-coach' as any)}
          activeOpacity={0.85}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${THEME.colors.teal}18`, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 0.5, borderColor: `${THEME.colors.teal}35` }}
        >
          <Text style={{ fontSize: 13, color: THEME.colors.teal }}>＋</Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Add</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={THEME.colors.teal} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginBottom: 12 }}>
            {coaches.length} coach{coaches.length !== 1 ? 'es' : ''}
          </Text>

          <View style={{ gap: 10 }}>
            {coaches.map((c: any) => {
              const initials = c.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') ?? '?';
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => router.push({ pathname: '/(admin)/coach-profile', params: { coachId: c.id, coachName: c.full_name } })}
                  activeOpacity={0.85}
                  style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${THEME.colors.amber}18`, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: `${THEME.colors.amber}30` }}>
                      <Text style={{ color: THEME.colors.amber, fontFamily: THEME.fonts.sansMedium, fontSize: 15 }}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 15 }}>{c.full_name}</Text>
                      <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11.5, marginTop: 2 }}>
                        {c.clientCount} client{c.clientCount !== 1 ? 's' : ''} · Last active {timeAgo(c.lastSeenAt)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 18, fontFamily: THEME.fonts.sansMedium, color: c.avgClientAdherence != null ? THEME.colors.teal : THEME.colors.textMuted }}>
                        {c.avgClientAdherence != null ? `${c.avgClientAdherence}%` : '—'}
                      </Text>
                      <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>avg adherence</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {coaches.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>🧑‍🏫</Text>
                <Text style={{ fontSize: 16, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>No coaches yet</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
