import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAnalytics } from '@/hooks/useAdmin';
import { LineChart } from '@/components/ui/LineChart';
import { THEME } from '@/constants/theme';

const PROGRAM_COLORS: Record<string, string> = {
  'peak-performance-lab':        THEME.colors.teal,
  'posture-recode-protocol':     '#93C5FD',
  'metabolic-reversal-system':   '#FCA5A5',
  'longevity-vitality-engine':   THEME.colors.amber,
  'rebuild-rehab-system':        '#C4B5FD',
  'corporate-performance-reset': '#FDE68A',
  'future-body-reset':           '#6EE7B7',
};

export default function AdminDashboard() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { data: analytics, isLoading } = useAdminAnalytics();

  const KPIs = analytics ? [
    { label: 'Total clients',      value: String(analytics.totalClients),      color: THEME.colors.teal },
    { label: 'Active programs',    value: String(analytics.activeEnrollments), color: THEME.colors.amber },
    { label: 'Sessions this week', value: String(analytics.sessionsThisWeek),  color: '#93C5FD' },
    { label: 'Check-in rate',      value: `${analytics.checkinRate}%`,         color: '#6EE7B7' },
  ] : [];

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

  const maxCount = analytics?.programBreakdown?.[0]?.count ?? 1;

  const ADMIN_ACTIONS = [
    {
      emoji: '👥',
      title: 'User management',
      subtitle: 'Manage roles, view all users',
      route: '/(admin)/users',
      color: THEME.colors.teal,
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
              Analytics
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
            {/* KPI grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginHorizontal: 24, marginBottom: 20 }}>
              {KPIs.map((k) => (
                <View key={k.label} style={{ width: '47%', backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                  <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginBottom: 8 }}>{k.label}</Text>
                  <Text style={{ color: k.color, fontFamily: THEME.fonts.sansMedium, fontSize: 32 }}>{k.value}</Text>
                </View>
              ))}
            </View>

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

            {/* Program breakdown */}
            {analytics?.programBreakdown && analytics.programBreakdown.length > 0 && (
              <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 20 }}>
                <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 16 }}>
                  Clients by program
                </Text>
                <View style={{ gap: 12 }}>
                  {analytics.programBreakdown.map((p) => {
                    const colorKey = Object.keys(PROGRAM_COLORS).find(k => p.name.toLowerCase().includes(k.split('-')[0]));
                    const color = colorKey ? PROGRAM_COLORS[colorKey] : THEME.colors.teal;
                    return (
                      <View key={p.name}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 13, flex: 1 }}>{p.name}</Text>
                          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>{p.count}</Text>
                        </View>
                        <View style={{ height: 6, backgroundColor: THEME.colors.surface2, borderRadius: 3, overflow: 'hidden', borderWidth: 0.5, borderColor: THEME.colors.border }}>
                          <View style={{ height: '100%', width: `${(p.count / maxCount) * 100}%`, backgroundColor: color, borderRadius: 3 }} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

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
