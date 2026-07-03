import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCoachMedicalOpinionRequests } from '@/hooks/useCoachDashboard';
import { THEME } from '@/constants/theme';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);

  if (hours < 1)  return 'just now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function MedicalOpinionRequestsScreen() {
  const router = useRouter();
  const { data: requests = [], isLoading } = useCoachMedicalOpinionRequests();
  const unreadCount = requests.filter((r) => !r.viewed).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 26, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>Medical opinion requests</Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
            {unreadCount > 0 ? `${unreadCount} unviewed` : `${requests.length} total`}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />
      ) : requests.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🩺</Text>
          <Text style={{ fontSize: 18, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center' }}>No requests yet</Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', marginTop: 6 }}>
            When a client sends you their AI medical analysis for review, it'll show up here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, gap: 10 }} showsVerticalScrollIndicator={false}>
          {requests.map((r) => (
            <TouchableOpacity
              key={r.analysisId}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/(coach)/client-overview', params: { clientId: r.clientId, clientName: r.clientName, tab: 'medical' } })}
              style={{
                backgroundColor: THEME.colors.surface2,
                borderRadius: 14,
                padding: 16,
                borderWidth: r.viewed ? 0.5 : 1,
                borderColor: r.viewed ? THEME.colors.border : `${THEME.colors.amber}40`,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${THEME.colors.amber}20`, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>
                    {r.clientName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{r.clientName}</Text>
                    {!r.viewed && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: THEME.colors.amber }} />}
                  </View>
                  <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
                    Sent {timeAgo(r.sentToCoachAt)}
                  </Text>
                </View>
                <Text style={{ color: THEME.colors.textMuted, fontSize: 18 }}>›</Text>
              </View>
              <Text numberOfLines={2} style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, marginTop: 10, lineHeight: 18 }}>
                {r.summaryText}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
