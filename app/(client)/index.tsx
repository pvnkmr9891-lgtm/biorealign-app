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
import { ScoreRing } from '@/components/ui/ScoreRing';
import { THEME } from '@/constants/theme';
import type { ProgramContent } from '@/types';

// ---------------------------------------------------------------------------
// Score rings panel
// ---------------------------------------------------------------------------
function ScorePanel({ metric }: { metric: any }) {
  const scores = [
    { key: 'fitness_score',   label: 'Fitness',   color: THEME.scoreColors.fitness },
    { key: 'recovery_score',  label: 'Recovery',  color: THEME.scoreColors.recovery },
    { key: 'longevity_score', label: 'Longevity', color: THEME.scoreColors.longevity },
  ];

  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
      <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 20 }}>
        Today's scores
      </Text>

      {metric ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          {scores.map((s) => (
            <ScoreRing
              key={s.key}
              score={metric[s.key] ?? 0}
              label={s.label}
              color={s.color}
              size={82}
              strokeWidth={6}
            />
          ))}
        </View>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13, textAlign: 'center' }}>
            Complete your first check-in to see your scores
          </Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Protocol card
// ---------------------------------------------------------------------------
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
  if (loading) {
    return (
      <View style={{ marginHorizontal: 24, paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator color={THEME.colors.teal} />
      </View>
    );
  }
  if (!items.length) {
    return (
      <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 10, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13 }}>
          No protocol scheduled for today — rest day!
        </Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 8, marginHorizontal: 24 }}>
      {items.slice(0, 4).map((item) => (
        <TouchableOpacity
          key={item.id}
          activeOpacity={0.8}
          onPress={() => router.push({ pathname: '/(client)/content/player', params: { id: item.id, title: item.title, description: item.description ?? '', type: item.type, pillar: item.pillar, duration_min: String(item.duration_min ?? ''), is_required: String(item.is_required), week_num: String(item.week_num), day_num: String(item.day_num ?? '') } })}
          style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <View style={{ width: 3, height: 36, borderRadius: 2, backgroundColor: TYPE_ACCENT[item.type] ?? THEME.colors.teal }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>
              {item.title}
            </Text>
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

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------
export default function ClientDashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  const { data: enrollment }                     = useActiveEnrollment();
  const { data: todayCheckin }                   = useTodayCheckin();
  const { data: latestMetric }                   = useLatestMetric();
  const { data: streak = 0 }                     = useCheckinStreak();
  const { data: nextSession }                    = useNextSession();
  const { data: protocol = [], isLoading: protocolLoading } = useTodayProtocol(
    enrollment?.program_id,
    enrollment?.current_week,
  );

  const checkinDone = !!todayCheckin;

  const sessionLabel = nextSession
    ? new Date(nextSession.scheduled_at).toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short',
      })
    : null;

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
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 14 }}>
            {greeting},
          </Text>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 32, marginTop: 2 }}>
            {firstName}
          </Text>

          {/* Streak + program pills */}
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
          </View>
        </View>

        {/* Score rings */}
        <ScorePanel metric={latestMetric} />

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', gap: 12, marginHorizontal: 24, marginBottom: 24 }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(client)/checkin')}
            style={{
              flex: 1, borderRadius: 12, padding: 16,
              backgroundColor: checkinDone ? THEME.colors.surface2 : THEME.colors.tealMuted,
              borderWidth: 0.5,
              borderColor: checkinDone ? THEME.colors.border : `${THEME.colors.teal}40`,
            }}
          >
            <Text style={{ color: checkinDone ? THEME.colors.textMuted : THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>
              {checkinDone ? '✓ Checked in' : 'Daily check-in'}
            </Text>
            <Text style={{ color: checkinDone ? THEME.colors.textMuted : `${THEME.colors.teal}99`, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>
              {checkinDone ? 'Tap to update' : 'Log today\'s metrics'}
            </Text>
          </TouchableOpacity>

          <View style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
            <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>
              Next session
            </Text>
            <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>
              {sessionLabel ?? 'None scheduled'}
            </Text>
          </View>
        </View>

        {/* Today's protocol */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 24, marginBottom: 12 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Today's protocol
          </Text>
          {protocol.length > 4 && (
            <TouchableOpacity>
              <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sans, fontSize: 12 }}>
                All {protocol.length}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <ProtocolList items={protocol} loading={protocolLoading} />

      </ScrollView>
    </SafeAreaView>
  );
}
