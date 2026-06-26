import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAnalytics, useAdminRehabCalendar, useAdminRehabMonthSnapshot } from '@/hooks/useAdmin';
import { THEME } from '@/constants/theme';

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12, marginHorizontal: 24 }}>
      {children}
    </Text>
  );
}

function todayRangeIso() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export default function AdminDashboard() {
  const router = useRouter();
  const { signOut, profile } = useAuth();
  const { data: analytics, isLoading } = useAdminAnalytics();
  const { startDate, endDate } = todayRangeIso();
  const { data: todaysAppointments = [] } = useAdminRehabCalendar({ startDate, endDate });
  const { data: monthSnapshot } = useAdminRehabMonthSnapshot();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Eshwar';

  const PLAN_STATS = analytics ? [
    { label: 'Active plans',    value: analytics.activePlans,       color: THEME.colors.teal },
    { label: 'Draft plans',     value: analytics.draftPlans,        color: THEME.colors.amber },
    { label: 'Need plan',       value: analytics.clientsWithoutPlan ?? 0, color: '#F87171' },
  ] : [];

  const AVG_SCORES = analytics ? [
    { label: 'Avg Fitness',   value: analytics.avgFitness,   color: THEME.scoreColors.fitness },
    { label: 'Avg Recovery',  value: analytics.avgRecovery,  color: THEME.scoreColors.recovery },
    { label: 'Avg Longevity', value: analytics.avgLongevity, color: THEME.scoreColors.longevity },
  ] : [];

  const ADMIN_ACTIONS = [
    {
      emoji: '🧑‍🤝‍🧑',
      title: 'Clients',
      subtitle: 'Filter & sort the full client roster',
      route: '/(admin)/clients',
      color: THEME.colors.teal,
    },
    {
      emoji: '🧑‍🏫',
      title: 'Coaches',
      subtitle: 'Roster, client counts, adherence',
      route: '/(admin)/coaches',
      color: THEME.colors.amber,
    },
    {
      emoji: '🔗',
      title: 'Coach assignment',
      subtitle: 'Assign clients to coaches',
      route: '/(admin)/coach-assignment',
      color: THEME.colors.amber,
      badge: analytics?.clientsWithoutPlan,
    },
    {
      emoji: '📋',
      title: 'Assessments',
      subtitle: 'View submitted client assessments',
      route: '/(admin)/assessments',
      color: '#C4B5FD',
    },
    {
      emoji: '📢',
      title: 'Broadcast notification',
      subtitle: 'Send push to all clients',
      route: '/(admin)/broadcast',
      color: '#93C5FD',
    },
    {
      emoji: '🩹',
      title: 'Recovery',
      subtitle: 'Requests, sessions & availability',
      route: '/(admin)/rehab-queue',
      color: THEME.colors.amber,
      badge: analytics?.pendingRehabRequests,
    },
    {
      emoji: '🩺',
      title: 'Medical records',
      subtitle: 'Platform-wide upload & analysis stats',
      route: '/(admin)/medical-records',
      color: '#93C5FD',
    },
    {
      emoji: '📚',
      title: 'Clients by Goals',
      subtitle: 'Client distribution by selected goal',
      route: '/(admin)/clients-by-goals',
      color: '#FDE68A',
    },
    {
      emoji: '⚙️',
      title: 'Settings',
      subtitle: 'Contact info, rehab packages, supplements',
      route: '/(admin)/settings',
      color: THEME.colors.textSecondary,
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 13 }}>
              Admin · BioRealign
            </Text>
            <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 32, marginTop: 2 }}>
              Welcome, <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.cormorantSemibold }}>{firstName}</Text>
            </Text>
          </View>
          <TouchableOpacity
            onPress={signOut}
            style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 0.5, borderColor: THEME.colors.border, marginTop: 8 }}
          >
            <Text style={{ color: THEME.colors.error, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <ActivityIndicator color={THEME.colors.teal} size="large" />
            <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 14, marginTop: 16 }}>
              Loading analytics...
            </Text>
          </View>
        ) : (
          <>
            {/* ── TODAY ─────────────────────────────────────────────────── */}
            <SectionLabel>Today</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginHorizontal: 24, marginBottom: 10 }}>
              <View style={{ width: '47%', backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginBottom: 8 }}>Total clients</Text>
                <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 32 }}>{analytics?.totalClients ?? 0}</Text>
              </View>
              <View style={{ width: '47%', backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginBottom: 8 }}>New signups (7d)</Text>
                <Text style={{ color: THEME.colors.amber, fontFamily: THEME.fonts.sansMedium, fontSize: 32 }}>+{analytics?.newSignupsThisWeek ?? 0}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 24, marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => router.push((analytics?.pendingRehabRequests ?? 0) > 0 ? '/(admin)/rehab-queue' : '/(admin)/clients')}
                activeOpacity={0.85}
                style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}
              >
                <Text style={{ fontSize: 22, fontFamily: THEME.fonts.sansMedium, color: (analytics?.pendingItemsCount ?? 0) > 0 ? '#F87171' : THEME.colors.textMuted }}>
                  {analytics?.pendingItemsCount ?? 0}
                </Text>
                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>Items needing action</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(admin)/rehab-queue')}
                activeOpacity={0.85}
                style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}
              >
                <Text style={{ fontSize: 22, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>{todaysAppointments.length}</Text>
                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>Recovery sessions today · view schedule →</Text>
              </TouchableOpacity>
            </View>

            {/* ── THIS WEEK ─────────────────────────────────────────────── */}
            <SectionLabel>This week</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 24, marginBottom: 14 }}>
              <View style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
                <Text style={{ fontSize: 22, fontFamily: THEME.fonts.sansMedium, color: '#6EE7B7' }}>{analytics?.clientEngagementRate ?? 0}%</Text>
                <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2, textAlign: 'center' }}>Client engagement</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
                <Text style={{ fontSize: 22, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>{analytics?.avgWorkoutAdherence ?? 0}%</Text>
                <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2, textAlign: 'center' }}>Avg adherence</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
                <Text style={{ fontSize: 22, fontFamily: THEME.fonts.sansMedium, color: '#93C5FD' }}>{analytics?.sessionsThisWeek ?? 0}</Text>
                <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2, textAlign: 'center' }}>Sessions</Text>
              </View>
            </View>

            {analytics?.disengagedClients && analytics.disengagedClients.length > 0 && (
              <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 20 }}>
                <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
                  Disengaged clients (no activity in 14d)
                </Text>
                <View style={{ gap: 8 }}>
                  {analytics.disengagedClients.slice(0, 6).map((c: any) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => router.push({ pathname: '/(admin)/client-profile', params: { clientId: c.id, clientName: c.full_name } })}
                      activeOpacity={0.8}
                      style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>{c.full_name}</Text>
                      <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                        {c.last_activity ? new Date(c.last_activity).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Never active'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {analytics.disengagedClients.length > 6 && (
                  <TouchableOpacity onPress={() => router.push('/(admin)/clients')} style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>
                      View all {analytics.disengagedClients.length} →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ── THIS MONTH ────────────────────────────────────────────── */}
            <SectionLabel>This month</SectionLabel>
            <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 14 }}>
              <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
                Recovery business snapshot (30d)
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { label: 'Received', value: monthSnapshot?.requestsReceived ?? 0, color: '#93C5FD' },
                  { label: 'Accepted', value: monthSnapshot?.requestsAccepted ?? 0, color: '#6EE7B7' },
                  { label: 'Declined', value: monthSnapshot?.requestsDeclined ?? 0, color: '#F87171' },
                  { label: 'Completed', value: monthSnapshot?.appointmentsCompleted ?? 0, color: THEME.colors.teal },
                  { label: 'No-show', value: monthSnapshot?.appointmentsNoShow ?? 0, color: THEME.colors.amber },
                ].map((s) => (
                  <View key={s.label} style={{ width: '30%', alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontFamily: THEME.fonts.sansMedium, color: s.color }}>{s.value}</Text>
                    <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {analytics?.featureUsageBreakdown && analytics.featureUsageBreakdown.length > 0 && (
              <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 20 }}>
                <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 16 }}>
                  Feature usage (30d, distinct clients)
                </Text>
                <View style={{ gap: 12 }}>
                  {analytics.featureUsageBreakdown.map((f: any) => {
                    const maxUsage = analytics.featureUsageBreakdown[0]?.clientCount ?? 1;
                    return (
                      <View key={f.item_type}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 13, flex: 1, textTransform: 'capitalize' }}>{f.item_type}</Text>
                          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>{f.clientCount}</Text>
                        </View>
                        <View style={{ height: 6, backgroundColor: THEME.colors.surface3, borderRadius: 3, overflow: 'hidden', borderWidth: 0.5, borderColor: THEME.colors.border }}>
                          <View style={{ height: '100%', width: `${(f.clientCount / maxUsage) * 100}%`, backgroundColor: THEME.colors.teal, borderRadius: 3 }} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Plan stats */}
            <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 24, marginBottom: 20 }}>
              {PLAN_STATS.map(s => (
                <View key={s.label} style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
                  <Text style={{ fontSize: 22, fontFamily: THEME.fonts.sansMedium, color: s.color }}>{s.value}</Text>
                  <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Avg platform scores */}
            <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 20 }}>
              <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 16 }}>
                Platform average scores
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                {AVG_SCORES.map((s) => (
                  <View key={s.label} style={{ alignItems: 'center' }}>
                    <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: s.color, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                      <Text style={{ color: s.color, fontFamily: THEME.fonts.sansMedium, fontSize: 20 }}>{s.value}</Text>
                    </View>
                    <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11 }}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Admin actions */}
            <View style={{ marginHorizontal: 24 }}>
              <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
                Admin actions
              </Text>
              <View style={{ gap: 10 }}>
                {ADMIN_ACTIONS.map((action) => (
                  <TouchableOpacity
                    key={action.route}
                    onPress={() => router.push(action.route as any)}
                    activeOpacity={0.8}
                    style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${action.color}15`, borderWidth: 0.5, borderColor: `${action.color}30`, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 18 }}>{action.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 15 }}>
                          {action.title}
                        </Text>
                        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>
                          {action.subtitle}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {action.badge != null && action.badge > 0 && (
                        <View style={{ backgroundColor: '#F87171', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: '#fff' }}>{action.badge}</Text>
                        </View>
                      )}
                      <Text style={{ color: THEME.colors.textMuted, fontSize: 18 }}>›</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
