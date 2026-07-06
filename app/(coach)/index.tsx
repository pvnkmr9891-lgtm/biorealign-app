import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useTodaySessions, useCoachUnreadCount } from '@/hooks/useCoach';
import { usePendingCoachRequests } from '@/hooks/useCoachRequests';
import { useCoachAttentionItems, useCoachClientPulse, AttentionItem, AttentionItemType } from '@/hooks/useCoachDashboard';
import { THEME } from '@/constants/theme';

const SESSION_TYPE_LABELS: Record<string, string> = {
  assessment: 'Assessment',
  coaching:   'Coaching',
  follow_up:  'Follow-up',
  check_in:   'Check-in',
};

const ATTENTION_META: Record<AttentionItemType, { icon: string; color: string }> = {
  supplement_flag:     { icon: '⚠️', color: THEME.colors.error },
  unviewed_analysis:   { icon: '🩺', color: THEME.colors.amber },
  no_log:              { icon: '📅', color: THEME.colors.teal },
  declining_adherence: { icon: '📉', color: THEME.colors.amber },
  assessment_due:      { icon: '🏋️', color: '#34D399' },
};

const MAX_ATTENTION_ITEMS = 3;
const MAX_PULSE_ROWS = 4;

export default function CoachDashboard() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Coach';

  const { data: sessions = [], isLoading: sessionsLoading } = useTodaySessions();
  const { data: coachRequests = [] } = usePendingCoachRequests();
  const { data: attentionItems = [] } = useCoachAttentionItems();
  const { data: clientPulse = [] } = useCoachClientPulse();
  const { data: unreadCount = 0 } = useCoachUnreadCount();

  const unviewedAnalysisCount = attentionItems.filter((i) => i.type === 'unviewed_analysis').length;
  const visibleAttentionItems = attentionItems.slice(0, MAX_ATTENTION_ITEMS);
  const extraAttentionCount = attentionItems.length - visibleAttentionItems.length;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  function openAttentionItem(item: AttentionItem) {
    switch (item.type) {
      case 'supplement_flag':
        router.push({ pathname: '/(coach)/client-workouts', params: { clientId: item.clientId, clientName: item.clientName } });
        break;
      case 'unviewed_analysis':
        router.push({ pathname: '/(coach)/client-overview', params: { clientId: item.clientId, clientName: item.clientName, tab: 'medical' } });
        break;
      case 'no_log':
        router.push({ pathname: '/(coach)/messaging', params: { coachId: user?.id, clientId: item.clientId, clientName: item.clientName } });
        break;
      case 'declining_adherence':
        router.push({ pathname: '/(coach)/client-overview', params: { clientId: item.clientId, clientName: item.clientName } });
        break;
      case 'assessment_due':
        router.push({ pathname: '/(coach)/client-overview', params: { clientId: item.clientId, clientName: item.clientName, tab: 'fitness' } });
        break;
    }
  }

  return (
    <SafeAreaView testID="coach-home-screen" style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
          <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 14 }}>
                Coach portal
              </Text>
              <Text numberOfLines={1} style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 32, marginTop: 2 }}>
                {greeting}, {firstName}
              </Text>
            </View>

            {/* Profile button */}
            <TouchableOpacity
              onPress={() => router.push('/(coach)/profile')}
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: `${THEME.colors.amber}20`, borderWidth: 1, borderColor: `${THEME.colors.amber}40`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>
                {firstName[0]}
              </Text>
            </TouchableOpacity>
          </View>

        {/* Needs attention */}
        {visibleAttentionItems.length > 0 && (
          <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
            <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
              Needs attention
            </Text>
            <View style={{ gap: 8 }}>
              {visibleAttentionItems.map((item) => {
                const meta = ATTENTION_META[item.type];
                return (
                  <TouchableOpacity
                    key={item.id}
                    testID={`attention-item-${item.type}`}
                    activeOpacity={0.8}
                    onPress={() => openAttentionItem(item)}
                    style={{
                      backgroundColor: `${meta.color}10`,
                      borderRadius: 14,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: `${meta.color}40`,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{meta.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>
                        {item.title}
                      </Text>
                      <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>
                        {item.subtitle}
                      </Text>
                    </View>
                    <Text style={{ color: THEME.colors.textMuted, fontSize: 16, marginTop: 2 }}>›</Text>
                  </TouchableOpacity>
                );
              })}
              {extraAttentionCount > 0 && (
                <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>
                  +{extraAttentionCount} more
                </Text>
              )}
            </View>
          </View>
        )}

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

        {/* Client pulse */}
        {clientPulse.length > 0 && (
          <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
            <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
              Client pulse · 7-day adherence
            </Text>
            <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
              {clientPulse.slice(0, MAX_PULSE_ROWS).map((row, idx) => {
                const pct = row.adherencePct;
                const pctColor = pct == null ? THEME.colors.textMuted : pct >= 70 ? THEME.colors.success : pct >= 40 ? THEME.colors.amber : THEME.colors.error;
                const initials = row.clientName.split(' ').map((n) => n[0]).slice(0, 2).join('');
                const isLast = idx === Math.min(clientPulse.length, MAX_PULSE_ROWS) - 1;
                return (
                  <TouchableOpacity
                    key={row.clientId}
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/(coach)/client-overview', params: { clientId: row.clientId, clientName: row.clientName } })}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: isLast ? 0 : 0.5, borderBottomColor: THEME.colors.border }}
                  >
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: `${pctColor}20`, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: pctColor }}>{initials}</Text>
                    </View>
                    <Text style={{ flex: 1, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 13 }}>
                      {row.clientName}
                    </Text>
                    <Text style={{ color: pctColor, fontFamily: THEME.fonts.sansMedium, fontSize: 12 }}>
                      {pct == null ? 'No data' : `${pct}%`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Quick actions */}
        <View style={{ marginHorizontal: 24 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
            Quick actions
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[
              { id: 'my-clients', icon: '🙋', label: 'My Clients', onPress: () => router.push('/(coach)/lite-clients'), badge: 0 },
              { id: 'messages', icon: '💬', label: 'Messages', onPress: () => router.push('/(coach)/inbox'), badge: unreadCount },
              { id: 'coach-requests', icon: '🧑‍🏫', label: 'Coach Requests', onPress: () => router.push('/(coach)/coach-requests'), badge: coachRequests.length },
              { id: 'medical-opinion-requests', icon: '🩺', label: 'Medical Opinion Requests', onPress: () => router.push('/(coach)/medical-opinion-requests'), badge: unviewedAnalysisCount },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                testID={`quick-action-${action.id}`}
                onPress={action.onPress}
                activeOpacity={0.8}
                style={{ width: '47%', backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text style={{ fontSize: 18 }}>{action.icon}</Text>
                <Text numberOfLines={2} style={{ flex: 1, fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
                  {action.label}
                </Text>
                {action.badge > 0 && (
                  <View style={{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: THEME.colors.amber, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>
                      {action.badge}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
