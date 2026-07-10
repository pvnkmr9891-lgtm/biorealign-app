import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useCoachUnreadCount } from '@/hooks/useCoach';
import { usePendingCoachRequests } from '@/hooks/useCoachRequests';
import {
  useCoachAttentionItems, useCoachClientPulse, useCoachTodayCheckins,
  useCoachClientWins, ATTENTION_META, attentionItemRoute,
} from '@/hooks/useCoachDashboard';
import { THEME } from '@/constants/theme';

const MAX_ATTENTION_ITEMS = 3;
const MAX_PULSE_ROWS = 4;
const MAX_WIN_ROWS = 3;

function SectionLabel({ children, action, onAction }: { children: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
        {children}
      </Text>
      {action && onAction && (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 12 }}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── KPI strip — roster state at a glance ─────────────────────────────────────
function KpiStrip({ clientCount, checkedInToday, avgAdherence, attentionCount }: {
  clientCount: number; checkedInToday: number; avgAdherence: number | null; attentionCount: number;
}) {
  const kpis = [
    { label: 'Clients', value: String(clientCount), color: THEME.colors.teal },
    { label: 'Checked in', value: `${checkedInToday}/${clientCount}`, color: '#34D399' },
    { label: 'Adherence', value: avgAdherence == null ? '—' : `${avgAdherence}%`, color: avgAdherence == null ? THEME.colors.textMuted : avgAdherence >= 70 ? '#34D399' : avgAdherence >= 40 ? THEME.colors.amber : THEME.colors.error },
    { label: 'Attention', value: String(attentionCount), color: attentionCount > 0 ? THEME.colors.amber : THEME.colors.textMuted },
  ];
  return (
    <View style={{ flexDirection: 'row', marginHorizontal: 24, marginBottom: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, borderWidth: 0.5, borderColor: THEME.colors.border, paddingVertical: 14 }}>
      {kpis.map((kpi, i) => (
        <View key={kpi.label} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i > 0 ? 0.5 : 0, borderLeftColor: THEME.colors.border }}>
          <Text style={{ fontSize: 18, fontFamily: THEME.fonts.sansMedium, color: kpi.color }}>{kpi.value}</Text>
          <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 3 }}>{kpi.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Today's check-ins — per-client daily readiness ───────────────────────────
function CheckinMetric({ icon, value, color }: { icon: string; value: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Text style={{ fontSize: 11 }}>{icon}</Text>
      <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color }}>{value}</Text>
    </View>
  );
}

export default function CoachDashboard() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Coach';

  const { data: coachRequests = [] } = usePendingCoachRequests();
  const { data: attentionItems = [] } = useCoachAttentionItems();
  const { data: clientPulse = [] } = useCoachClientPulse();
  const { data: todayCheckins = [] } = useCoachTodayCheckins();
  const { data: clientWins = [] } = useCoachClientWins();
  const { data: unreadCount = 0 } = useCoachUnreadCount();

  const unviewedAnalysisCount = attentionItems.filter((i) => i.type === 'unviewed_analysis').length;
  const visibleAttentionItems = attentionItems.slice(0, MAX_ATTENTION_ITEMS);
  const extraAttentionCount = attentionItems.length - visibleAttentionItems.length;

  const checkedIn = todayCheckins.filter((r) => r.checkin);
  const notCheckedIn = todayCheckins.filter((r) => !r.checkin);
  const scoredPulse = clientPulse.filter((r) => r.adherencePct != null);
  const avgAdherence = scoredPulse.length
    ? Math.round(scoredPulse.reduce((s, r) => s + (r.adherencePct ?? 0), 0) / scoredPulse.length)
    : null;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  function sendKudos(win: { clientId: string; clientName: string; icon: string; label: string }) {
    router.push({
      pathname: '/(coach)/messaging',
      params: {
        coachId: user?.id,
        clientId: win.clientId,
        clientName: win.clientName,
        prefill: `${win.icon} ${win.label} — amazing work, keep it up! 👏`,
      },
    });
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

        {/* KPI strip */}
        <KpiStrip
          clientCount={todayCheckins.length}
          checkedInToday={checkedIn.length}
          avgAdherence={avgAdherence}
          attentionCount={attentionItems.length}
        />

        {/* Needs attention */}
        {visibleAttentionItems.length > 0 && (
          <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
            <SectionLabel
              action={attentionItems.length > MAX_ATTENTION_ITEMS ? 'View all ›' : undefined}
              onAction={() => router.push('/(coach)/attention-items' as any)}
            >
              Needs attention
            </SectionLabel>
            <View style={{ gap: 8 }}>
              {visibleAttentionItems.map((item) => {
                const meta = ATTENTION_META[item.type];
                return (
                  <TouchableOpacity
                    key={item.id}
                    testID={`attention-item-${item.type}`}
                    activeOpacity={0.8}
                    onPress={() => router.push(attentionItemRoute(item, user?.id) as any)}
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
                <TouchableOpacity
                  onPress={() => router.push('/(coach)/attention-items' as any)}
                  activeOpacity={0.7}
                  style={{ paddingVertical: 8, alignItems: 'center', backgroundColor: THEME.colors.surface2, borderRadius: 10, borderWidth: 0.5, borderColor: THEME.colors.border }}
                >
                  <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 12 }}>
                    +{extraAttentionCount} more ›
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Today's check-ins — daily readiness */}
        <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
          <SectionLabel>Today's check-ins</SectionLabel>

          {todayCheckins.length === 0 ? (
            <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
              <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13 }}>
                No clients assigned yet — approved coach requests will show up here.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {checkedIn.length === 0 && (
                <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                  <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13 }}>
                    No one has checked in yet today
                  </Text>
                </View>
              )}
              {checkedIn.map((row) => {
                const ci = row.checkin!;
                const painColor = ci.pain_level >= 7 ? THEME.colors.error : ci.pain_level >= 4 ? THEME.colors.amber : '#34D399';
                const sleepColor = ci.sleep_hrs >= 7 ? '#34D399' : ci.sleep_hrs >= 5 ? THEME.colors.amber : THEME.colors.error;
                return (
                  <TouchableOpacity
                    key={row.clientId}
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/(coach)/client-overview', params: { clientId: row.clientId, clientName: row.clientName } })}
                    style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                  >
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: `${THEME.colors.teal}20`, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>
                        {row.clientName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </Text>
                    </View>
                    <Text numberOfLines={1} style={{ flex: 1, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 13.5 }}>
                      {row.clientName}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <CheckinMetric icon="😊" value={String(ci.mood)} color={THEME.colors.textSecondary} />
                      <CheckinMetric icon="⚡" value={String(ci.energy)} color={THEME.colors.textSecondary} />
                      <CheckinMetric icon="🌙" value={`${ci.sleep_hrs}h`} color={sleepColor} />
                      <CheckinMetric icon="💊" value={String(ci.pain_level)} color={painColor} />
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Who hasn't checked in yet — tap a chip to nudge them in chat */}
              {notCheckedIn.length > 0 && (
                <View style={{ marginTop: 4 }}>
                  <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11.5, marginBottom: 8 }}>
                    Not checked in yet — tap to nudge
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {notCheckedIn.map((row) => (
                      <TouchableOpacity
                        key={row.clientId}
                        activeOpacity={0.8}
                        onPress={() => router.push({
                          pathname: '/(coach)/messaging',
                          params: {
                            coachId: user?.id, clientId: row.clientId, clientName: row.clientName,
                            prefill: `Hi ${row.clientName.split(' ')[0]}! Just checking in — don't forget today's Daily Pulse 📝`,
                          },
                        })}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: THEME.colors.surface2, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6, borderWidth: 0.5, borderColor: THEME.colors.border }}
                      >
                        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary }}>{row.clientName}</Text>
                        <Text style={{ fontSize: 11 }}>💬</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Client wins — celebrate, don't just firefight */}
        {clientWins.length > 0 && (
          <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
            <SectionLabel>🎉 Wins this week</SectionLabel>
            <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
              {clientWins.slice(0, MAX_WIN_ROWS).map((win, idx) => {
                const isLast = idx === Math.min(clientWins.length, MAX_WIN_ROWS) - 1;
                return (
                  <View
                    key={win.id}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: isLast ? 0 : 0.5, borderBottomColor: THEME.colors.border }}
                  >
                    <Text style={{ fontSize: 18 }}>{win.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 13.5 }}>
                        {win.clientName}
                      </Text>
                      <Text numberOfLines={1} style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 1 }}>
                        {win.label} · {new Date(win.achievedOn + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => sendKudos(win)}
                      activeOpacity={0.8}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${THEME.colors.teal}15`, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 0.5, borderColor: `${THEME.colors.teal}30` }}
                    >
                      <Text style={{ fontSize: 12 }}>👏</Text>
                      <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Kudos</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Client pulse */}
        {clientPulse.length > 0 && (
          <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
            <SectionLabel
              action={clientPulse.length > MAX_PULSE_ROWS ? 'View all ›' : undefined}
              onAction={() => router.push('/(coach)/lite-clients')}
            >
              Client pulse · 7-day adherence
            </SectionLabel>
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
          <SectionLabel>Quick actions</SectionLabel>
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
