import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAnalytics, useAdminRehabCalendar, useAdminRehabMonthSnapshot, useAdminDailyPulse } from '@/hooks/useAdmin';
import { THEME } from '@/constants/theme';

type DashTab = 'today' | 'week' | 'month';
const DASH_TABS: { key: DashTab; label: string; icon: string }[] = [
  { key: 'today', label: 'Today', icon: '☀️' },
  { key: 'week',  label: 'Week',  icon: '📅' },
  { key: 'month', label: 'Month', icon: '📈' },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12, marginHorizontal: 24 }}>
      {children}
    </Text>
  );
}

function PanelCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 14 }}>
      <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function StatCell({ value, label, color, sub }: { value: string | number; label: string; color: string; sub?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
      <Text style={{ fontSize: 22, fontFamily: THEME.fonts.sansMedium, color }}>{value}</Text>
      <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2, textAlign: 'center' }}>{label}</Text>
      {sub != null && (
        <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, marginTop: 2, textAlign: 'center' }}>{sub}</Text>
      )}
    </View>
  );
}

function timeAgo(iso: string | null) {
  if (!iso) return 'never';
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function todayRangeIso() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

// ── TODAY tab ────────────────────────────────────────────────────────────────
function TodayTab({ analytics, todaysAppointments }: { analytics: any; todaysAppointments: any[] }) {
  const router = useRouter();
  const { data: pulse, isLoading } = useAdminDailyPulse();

  if (isLoading) return <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />;

  return (
    <View>
      {/* Headline pulse */}
      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 24, marginBottom: 10 }}>
        <StatCell
          value={pulse?.checkinsToday ?? 0}
          label="Check-ins today"
          sub={`yesterday ${pulse?.checkinsYesterday ?? 0} · norm ${pulse?.checkinDailyNorm ?? 0}/day`}
          color={(pulse?.checkinsToday ?? 0) >= (pulse?.checkinDailyNorm ?? 0) ? '#6EE7B7' : THEME.colors.amber}
        />
        <StatCell
          value={pulse?.activeToday ?? 0}
          label="Clients logged activity"
          sub={`norm ${pulse?.activeDailyNorm ?? 0}/day`}
          color={(pulse?.activeToday ?? 0) >= (pulse?.activeDailyNorm ?? 0) ? THEME.colors.teal : THEME.colors.amber}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 24, marginBottom: 14 }}>
        <StatCell value={`+${pulse?.signupsToday ?? 0}`} label="Signups today" color={THEME.colors.amber} />
        <TouchableOpacity
          onPress={() => router.push('/(admin)/rehab-queue')}
          activeOpacity={0.85}
          style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ fontSize: 22, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>{todaysAppointments.length}</Text>
          <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>Recovery sessions →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push((analytics?.pendingRehabRequests ?? 0) > 0 ? '/(admin)/rehab-queue' : '/(admin)/clients')}
          activeOpacity={0.85}
          style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ fontSize: 22, fontFamily: THEME.fonts.sansMedium, color: (analytics?.pendingItemsCount ?? 0) > 0 ? '#F87171' : THEME.colors.textMuted }}>
            {analytics?.pendingItemsCount ?? 0}
          </Text>
          <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>Need action →</Text>
        </TouchableOpacity>
      </View>

      {/* Red flags */}
      {(pulse?.redFlags?.length ?? 0) > 0 && (
        <PanelCard title="🚨 Red flags — high pain / very low energy (48h)">
          <View style={{ gap: 8 }}>
            {pulse!.redFlags.map((f) => (
              <TouchableOpacity
                key={f.clientId}
                onPress={() => router.push({ pathname: '/(admin)/client-profile', params: { clientId: f.clientId, clientName: f.clientName } })}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 }}
              >
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>{f.clientName}</Text>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: '#F87171' }}>
                  {f.painLevel != null && f.painLevel >= 7 ? `Pain ${f.painLevel}/10` : `Energy ${f.energy}/10`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </PanelCard>
      )}

      {/* Coach message backlog */}
      {(pulse?.messageBacklog?.length ?? 0) > 0 && (
        <PanelCard title="💬 Unread client messages · older than 24h">
          <View style={{ gap: 8 }}>
            {pulse!.messageBacklog.map((b) => (
              <View key={b.coachId} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 }}>
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>{b.coachName}</Text>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                  <Text style={{ color: THEME.colors.amber, fontFamily: THEME.fonts.sansMedium }}>{b.unreadCount}</Text>
                  {'  '}oldest {timeAgo(b.oldestSentAt)}
                </Text>
              </View>
            ))}
          </View>
        </PanelCard>
      )}

      {/* Coaches inactive today */}
      {(pulse?.coachesInactiveToday?.length ?? 0) > 0 && (
        <PanelCard title="🧑‍🏫 Coaches not seen today">
          <View style={{ gap: 8 }}>
            {pulse!.coachesInactiveToday.map((c: any) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => router.push({ pathname: '/(admin)/coach-profile', params: { coachId: c.id, coachName: c.full_name } })}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 }}
              >
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>{c.full_name}</Text>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>last seen {timeAgo(c.last_seen_at)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </PanelCard>
      )}
    </View>
  );
}

// ── WEEK tab (existing weekly content; upgraded in Phase 2) ──────────────────
function WeekTab({ analytics }: { analytics: any }) {
  const router = useRouter();

  const PLAN_STATS = analytics ? [
    { label: 'Active plans', value: analytics.activePlans,              color: THEME.colors.teal },
    { label: 'Draft plans',  value: analytics.draftPlans,               color: THEME.colors.amber },
    { label: 'Need plan',    value: analytics.clientsWithoutPlan ?? 0,  color: '#F87171' },
  ] : [];

  const AVG_SCORES = analytics ? [
    { label: 'Avg Fitness',   value: analytics.avgFitness,   color: THEME.scoreColors.fitness },
    { label: 'Avg Recovery',  value: analytics.avgRecovery,  color: THEME.scoreColors.recovery },
    { label: 'Avg Longevity', value: analytics.avgLongevity, color: THEME.scoreColors.longevity },
  ] : [];

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 24, marginBottom: 14 }}>
        <StatCell value={`${analytics?.clientEngagementRate ?? 0}%`} label="Client engagement" color="#6EE7B7" />
        <StatCell value={`${analytics?.avgWorkoutAdherence ?? 0}%`} label="Avg adherence" color={THEME.colors.teal} />
        <StatCell value={analytics?.sessionsThisWeek ?? 0} label="Sessions" color="#93C5FD" />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 24, marginBottom: 14 }}>
        <StatCell value={analytics?.totalClients ?? 0} label="Total clients" color={THEME.colors.teal} />
        <StatCell value={`+${analytics?.newSignupsThisWeek ?? 0}`} label="New signups (7d)" color={THEME.colors.amber} />
      </View>

      {analytics?.disengagedClients && analytics.disengagedClients.length > 0 && (
        <PanelCard title="Disengaged clients (no activity in 14d)">
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
        </PanelCard>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 24, marginBottom: 14 }}>
        {PLAN_STATS.map(s => <StatCell key={s.label} value={s.value} label={s.label} color={s.color} />)}
      </View>

      <PanelCard title="Platform average scores">
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: 6 }}>
          {AVG_SCORES.map((s) => (
            <View key={s.label} style={{ alignItems: 'center' }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: s.color, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Text style={{ color: s.color, fontFamily: THEME.fonts.sansMedium, fontSize: 20 }}>{s.value}</Text>
              </View>
              <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </PanelCard>
    </View>
  );
}

// ── MONTH tab (existing monthly content; upgraded in Phase 3) ────────────────
function MonthTab({ analytics }: { analytics: any }) {
  const { data: monthSnapshot } = useAdminRehabMonthSnapshot();

  return (
    <View>
      <PanelCard title="Recovery business snapshot (30d)">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[
            { label: 'Received',  value: monthSnapshot?.requestsReceived ?? 0,      color: '#93C5FD' },
            { label: 'Accepted',  value: monthSnapshot?.requestsAccepted ?? 0,      color: '#6EE7B7' },
            { label: 'Declined',  value: monthSnapshot?.requestsDeclined ?? 0,      color: '#F87171' },
            { label: 'Completed', value: monthSnapshot?.appointmentsCompleted ?? 0, color: THEME.colors.teal },
            { label: 'No-show',   value: monthSnapshot?.appointmentsNoShow ?? 0,    color: THEME.colors.amber },
          ].map((s) => (
            <View key={s.label} style={{ width: '30%', alignItems: 'center', paddingVertical: 6 }}>
              <Text style={{ fontSize: 18, fontFamily: THEME.fonts.sansMedium, color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </PanelCard>

      {analytics?.featureUsageBreakdown && analytics.featureUsageBreakdown.length > 0 && (
        <PanelCard title="Feature usage (30d, distinct clients)">
          <View style={{ gap: 12, paddingTop: 4 }}>
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
        </PanelCard>
      )}
    </View>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { signOut, profile } = useAuth();
  const { data: analytics, isLoading } = useAdminAnalytics();
  const { startDate, endDate } = todayRangeIso();
  const { data: todaysAppointments = [] } = useAdminRehabCalendar({ startDate, endDate });
  const [tab, setTab] = useState<DashTab>('today');
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Eshwar';

  const ADMIN_ACTIONS = [
    { emoji: '🧑‍🤝‍🧑', title: 'Clients', subtitle: 'Filter & sort the full client roster', route: '/(admin)/clients', color: THEME.colors.teal },
    { emoji: '🧑‍🏫', title: 'Coaches', subtitle: 'Roster, client counts, adherence', route: '/(admin)/coaches', color: THEME.colors.amber },
    { emoji: '🔗', title: 'Coach assignment', subtitle: 'Assign clients to coaches', route: '/(admin)/coach-assignment', color: THEME.colors.amber, badge: analytics?.clientsWithoutPlan },
    { emoji: '📋', title: 'Assessments', subtitle: 'View submitted client assessments', route: '/(admin)/assessments', color: '#C4B5FD' },
    { emoji: '📢', title: 'Broadcast notification', subtitle: 'Send push to all clients', route: '/(admin)/broadcast', color: '#93C5FD' },
    { emoji: '🩹', title: 'Recovery', subtitle: 'Requests, sessions & availability', route: '/(admin)/rehab-queue', color: THEME.colors.amber, badge: analytics?.pendingRehabRequests },
    { emoji: '🩺', title: 'Medical records', subtitle: 'Platform-wide upload & analysis stats', route: '/(admin)/medical-records', color: '#93C5FD' },
    { emoji: '🏋️', title: 'Fitness analytics', subtitle: 'Avg domain scores by athlete status & age band', route: '/(admin)/fitness-analytics', color: '#34D399' },
    { emoji: '📚', title: 'Clients by Goals', subtitle: 'Client distribution by selected goal', route: '/(admin)/clients-by-goals', color: '#FDE68A' },
    { emoji: '⚙️', title: 'Settings', subtitle: 'Contact info, rehab packages, supplements', route: '/(admin)/settings', color: THEME.colors.textSecondary },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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

        {/* Today / Week / Month tabs */}
        <View style={{ flexDirection: 'row', marginHorizontal: 24, marginBottom: 18, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 4, gap: 4, borderWidth: 0.5, borderColor: THEME.colors.border }}>
          {DASH_TABS.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTab(t.key)}
                activeOpacity={0.8}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10, backgroundColor: active ? THEME.colors.teal : 'transparent' }}
              >
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: active ? THEME.colors.background : THEME.colors.textMuted }}>
                  {t.icon} {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
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
            {tab === 'today' && <TodayTab analytics={analytics} todaysAppointments={todaysAppointments} />}
            {tab === 'week'  && <WeekTab analytics={analytics} />}
            {tab === 'month' && <MonthTab analytics={analytics} />}

            {/* Admin actions */}
            <View style={{ marginHorizontal: 24, marginTop: 8 }}>
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
