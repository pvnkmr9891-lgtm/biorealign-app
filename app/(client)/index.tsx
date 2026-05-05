import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import {
  useActiveEnrollment,
  useTodayCheckin,
  useLatestMetric,
  useTodayProtocol,
  useNextSession,
  useCheckinStreak,
} from '@/hooks/useClient';
import { useClientCoachInfo } from '@/hooks/useCoach';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { TodayPlanCard } from '@/components/client/TodayPlanCard';
import { THEME } from '@/constants/theme';
import type { ProgramContent } from '@/types';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

// ── Week stats hook ───────────────────────────────────────────────────────────
function useWeekStats(clientId: string) {
  return useQuery({
    queryKey: ['client', clientId, 'week_stats'],
    enabled: !!clientId,
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      const { data: checkins } = await supabase
        .from('daily_checkins')
        .select('id, date')
        .eq('client_id', clientId)
        .gte('date', weekAgoStr);

      // Get active plan items completed this week
      const { data: completions } = await supabase
        .from('plan_item_completions')
        .select('id')
        .eq('client_id', clientId)
        .gte('completed_date', weekAgoStr);

      // Get total plan items scheduled this week
      const { data: plans } = await supabase
        .from('plans')
        .select('id')
        .eq('client_id', clientId)
        .eq('status', 'active')
        .limit(1);

      let totalItems = 0;
      if (plans?.[0]) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const weekDays = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - 6 + i);
          return days[d.getDay()];
        });

        const { data: tracks } = await supabase
          .from('plan_tracks')
          .select('id')
          .eq('plan_id', plans[0].id);

        if (tracks?.length) {
          const { data: items } = await supabase
            .from('plan_items')
            .select('day_of_week')
            .in('track_id', tracks.map(t => t.id));

          totalItems = (items ?? []).reduce((count, item) => {
            const scheduled = (item.day_of_week ?? []).filter((d: string) => weekDays.includes(d));
            return count + scheduled.length;
          }, 0);
        }
      }

      return {
        checkins: checkins?.length ?? 0,
        completions: completions?.length ?? 0,
        totalItems: Math.max(totalItems, completions?.length ?? 0),
      };
    },
  });
}

// ── Score Panel with deltas ───────────────────────────────────────────────────
function ScorePanel({ metrics }: { metrics: any[] }) {
  const latest   = metrics[0] ?? null;
  const previous = metrics[1] ?? null;

  const scores = [
    { key: 'fitness_score',   label: 'Fitness',   color: THEME.scoreColors.fitness },
    { key: 'recovery_score',  label: 'Recovery',  color: THEME.scoreColors.recovery },
    { key: 'longevity_score', label: 'Longevity', color: THEME.scoreColors.longevity },
  ];

  if (!latest) {
    return (
      <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16, alignItems: 'center' }}>
        <Text style={{ fontSize: 28, marginBottom: 10 }}>📊</Text>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 14, textAlign: 'center', marginBottom: 4 }}>
          No scores yet
        </Text>
        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13, textAlign: 'center' }}>
          Complete your first check-in to unlock your scores
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
      <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 20 }}>
        Today's scores
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {scores.map(s => {
          const val   = latest[s.key] ?? 0;
          const prev  = previous?.[s.key] ?? null;
          const delta = prev != null ? val - prev : null;

          return (
            <View key={s.key} style={{ alignItems: 'center' }}>
              <ScoreRing score={val} label={s.label} color={s.color} size={82} strokeWidth={6} />
              {delta != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 }}>
                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: delta > 0 ? '#34D399' : delta < 0 ? '#F87171' : THEME.colors.textMuted }}>
                    {delta > 0 ? '↑' : delta < 0 ? '↓' : '—'}{Math.abs(delta)}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Weekly Progress Card ──────────────────────────────────────────────────────
function WeeklyProgressCard({ clientId }: { clientId: string }) {
  const { data: stats, isLoading } = useWeekStats(clientId);

  if (isLoading) return null;

  const checkinPct  = Math.min(Math.round(((stats?.checkins ?? 0) / 7) * 100), 100);
  const itemPct     = stats?.totalItems > 0
    ? Math.min(Math.round(((stats?.completions ?? 0) / stats.totalItems) * 100), 100)
    : 0;

  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
      <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 }}>
        This week
      </Text>

      {/* Check-in bar */}
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Check-ins</Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>
            {stats?.checkins ?? 0}/7 days
          </Text>
        </View>
        <View style={{ height: 6, backgroundColor: '#1A1A1E', borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${checkinPct}%`, backgroundColor: THEME.colors.teal, borderRadius: 3 }} />
        </View>
      </View>

      {/* Plan items bar */}
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Plan items</Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>
            {stats?.completions ?? 0}/{stats?.totalItems ?? 0} done
          </Text>
        </View>
        <View style={{ height: 6, backgroundColor: '#1A1A1E', borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${itemPct}%`, backgroundColor: THEME.colors.amber, borderRadius: 3 }} />
        </View>
      </View>
    </View>
  );
}

// ── Coach Card ────────────────────────────────────────────────────────────────
function CoachCard() {
  const router  = useRouter();
  const { data: coachInfo } = useClientCoachInfo();

  if (!coachInfo || !(coachInfo as any).coach) return null;

  const coach    = (coachInfo as any).coach;
  const initials = coach.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') ?? 'C';

  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${THEME.colors.amber}20`, borderWidth: 1, borderColor: `${THEME.colors.amber}40`, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 2 }}>Your coach</Text>
        <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{coach.full_name}</Text>
      </View>
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/(client)/messages' })}
        style={{ backgroundColor: `${THEME.colors.teal}20`, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 0.5, borderColor: `${THEME.colors.teal}30` }}
      >
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>💬 Message</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Recent Check-in Card ──────────────────────────────────────────────────────
function RecentCheckinCard({ checkin }: { checkin: any }) {
  if (!checkin) return null;

  const painColor = checkin.pain_level >= 7 ? '#F87171' : checkin.pain_level >= 4 ? THEME.colors.amber : '#34D399';
  const date = new Date(checkin.date);
  const today = new Date();
  const isYesterday = date.toDateString() === new Date(today.setDate(today.getDate() - 1)).toDateString();
  const label = isYesterday ? 'Yesterday' : date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          Last check-in
        </Text>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {[
          { label: 'Mood', value: `${checkin.mood}/10`, color: THEME.colors.teal },
          { label: 'Energy', value: `${checkin.energy}/10`, color: THEME.colors.amber },
          { label: 'Sleep', value: `${checkin.sleep_hrs}h`, color: '#60A5FA' },
          { label: 'Pain', value: `${checkin.pain_level}/10`, color: painColor },
        ].map(s => (
          <View key={s.label} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontFamily: THEME.fonts.sansMedium, color: s.color }}>{s.value}</Text>
            <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{s.label}</Text>
          </View>
        ))}
      </View>
      {checkin.notes && (
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, fontStyle: 'italic', marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: THEME.colors.border }}>
          "{checkin.notes}"
        </Text>
      )}
    </View>
  );
}

// ── Protocol list ─────────────────────────────────────────────────────────────
const TYPE_ACCENT: Record<string, string> = {
  exercise:   THEME.scoreColors.fitness,
  video:      THEME.scoreColors.recovery,
  assessment: THEME.colors.amber,
  article:    THEME.colors.textSecondary,
  audio:      '#C4B5FD',
};

const PILLAR_SHORT: Record<string, string> = {
  activation_mind:       'Activation',
  body_awareness:        'Body Awareness',
  training_architecture: 'Training',
  performance_recovery:  'Recovery',
  nutrition_lifestyle:   'Nutrition',
  goal_progression:      'Goals',
};

function ProtocolList({ items, loading }: { items: ProgramContent[]; loading: boolean }) {
  const router = useRouter();

  if (loading) return (
    <View style={{ marginHorizontal: 24, paddingVertical: 20, alignItems: 'center' }}>
      <ActivityIndicator color={THEME.colors.teal} />
    </View>
  );

  if (!items.length) return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={{ fontSize: 24 }}>🌿</Text>
      <View>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>Rest day</Text>
        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13, marginTop: 2 }}>
          No protocol today — recover well
        </Text>
      </View>
    </View>
  );

  return (
    <View style={{ gap: 8, marginHorizontal: 24 }}>
      {items.slice(0, 4).map(item => (
        <TouchableOpacity
          key={item.id}
          activeOpacity={0.8}
          onPress={() => router.push({ pathname: '/(client)/content/player', params: { id: item.id, title: item.title, description: item.description ?? '', type: item.type, pillar: item.pillar, duration_min: String(item.duration_min ?? ''), is_required: String(item.is_required), week_num: String(item.week_num), day_num: String(item.day_num ?? '') } })}
          style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <View style={{ width: 3, height: 36, borderRadius: 2, backgroundColor: TYPE_ACCENT[item.type] ?? THEME.colors.teal }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>{item.title}</Text>
            <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>
              {PILLAR_SHORT[item.pillar] ?? item.pillar}
            </Text>
          </View>
          {item.duration_min && (
            <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 12 }}>
              {item.duration_min} min
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function ClientDashboard() {
  const router   = useRouter();
  const { profile, user } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  const { data: enrollment }   = useActiveEnrollment();
  const { data: todayCheckin } = useTodayCheckin();
  const { data: streak = 0 }   = useCheckinStreak();
  const { data: nextSession }  = useNextSession();

  // Fetch last 2 metrics for delta
  const { data: recentMetrics = [] } = useQuery({
    queryKey: ['client', user?.id, 'recent_metrics'],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('progress_metrics')
        .select('*')
        .eq('client_id', user!.id)
        .order('recorded_at', { ascending: false })
        .limit(2);
      return data ?? [];
    },
  });

  // Fetch last check-in (not today)
  const { data: lastCheckin } = useQuery({
    queryKey: ['client', user?.id, 'last_checkin'],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('client_id', user!.id)
        .order('date', { ascending: false })
        .limit(2);
      // Return the most recent that isn't today
      const today = new Date().toISOString().split('T')[0];
      return data?.find(c => c.date !== today) ?? data?.[0] ?? null;
    },
  });

  const { data: protocol = [], isLoading: protocolLoading } = useTodayProtocol(
    enrollment?.program_id,
    enrollment?.current_week,
  );

  const checkinDone = !!todayCheckin;
  const sessionLabel = nextSession
    ? new Date(nextSession.scheduled_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    : null;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 14 }}>
            {greeting},
          </Text>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 32, marginTop: 2 }}>
            {firstName}
          </Text>

          {/* Pills */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {streak > 0 && (
              <View style={{ backgroundColor: THEME.colors.tealMuted, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 0.5, borderColor: `${THEME.colors.teal}30` }}>
                <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 12 }}>
                  🔥 {streak} day streak
                </Text>
              </View>
            )}
            {enrollment && (
              <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 12 }}>
                  {enrollment.program?.name ?? 'Active Program'} · Wk {enrollment.current_week}
                </Text>
              </View>
            )}
            {checkinDone && (
              <View style={{ backgroundColor: '#34D39920', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 0.5, borderColor: '#34D39930' }}>
                <Text style={{ color: '#34D399', fontFamily: THEME.fonts.sansMedium, fontSize: 12 }}>
                  ✓ Checked in today
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Score rings with deltas */}
        <ScorePanel metrics={recentMetrics} />

        {/* Weekly progress */}
        {user?.id && <WeeklyProgressCard clientId={user.id} />}

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', gap: 12, marginHorizontal: 24, marginBottom: 16 }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(client)/checkin')}
            style={{ flex: 1, borderRadius: 12, padding: 16, backgroundColor: checkinDone ? THEME.colors.surface2 : THEME.colors.tealMuted, borderWidth: 0.5, borderColor: checkinDone ? THEME.colors.border : `${THEME.colors.teal}40` }}
          >
            <Text style={{ color: checkinDone ? THEME.colors.textMuted : THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>
              {checkinDone ? '✓ Checked in' : 'Daily check-in'}
            </Text>
            <Text style={{ color: checkinDone ? THEME.colors.textMuted : `${THEME.colors.teal}99`, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>
              {checkinDone ? 'Tap to update' : "Log today's metrics"}
            </Text>
          </TouchableOpacity>

          <View style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
            <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>Next session</Text>
            <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>
              {sessionLabel ?? 'None scheduled'}
            </Text>
          </View>
        </View>

        {/* Today's plan */}
        <TodayPlanCard />

        {/* Coach card */}
        <CoachCard />

        {/* Last check-in snapshot */}
        {!checkinDone && <RecentCheckinCard checkin={lastCheckin} />}

        {/* Today's protocol */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 24, marginBottom: 12 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Today's protocol
          </Text>
          {protocol.length > 4 && (
            <TouchableOpacity>
              <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sans, fontSize: 12 }}>All {protocol.length}</Text>
            </TouchableOpacity>
          )}
        </View>
        <ProtocolList items={protocol} loading={protocolLoading} />

      </ScrollView>
    </SafeAreaView>
  );
}
