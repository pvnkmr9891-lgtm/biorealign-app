// Coach home — redesigned around a priority gradient instead of equal-weight
// boxes: hero answers "how is my roster right now", the Brief answers "what
// should I do next", priority cards surface who needs help, and everything
// actionable lives in the FAB so the scroll stays informational.
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useCoachUnreadCount } from '@/hooks/useCoach';
import { usePendingCoachRequests } from '@/hooks/useCoachRequests';
import {
  useCoachAttentionItems, useCoachClientPulse, useCoachTodayCheckins,
  useCoachClientWins, useCoachWeekCheckinGrid, attentionItemRoute,
  AttentionItem, AttentionItemType,
} from '@/hooks/useCoachDashboard';
import { RadialProgress } from '@/components/ui/RadialProgress';
import { StatPill } from '@/components/ui/StatPill';
import { Sparkline } from '@/components/ui/Sparkline';
import { HeatStrip } from '@/components/ui/HeatStrip';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { Fab } from '@/components/ui/Fab';
import { THEME } from '@/constants/theme';

const GREEN = '#34D399';
const MAX_GRID_ROWS = 8;
const MAX_TIMELINE_ROWS = 8;
const MAX_PRIORITY_CARDS = 10;

function SectionLabel({ children, action, onAction }: { children: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: THEME.type.micro, letterSpacing: 1.2, textTransform: 'uppercase' }}>
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

// Borderless module — large radius, depth from shadow instead of borders.
function Module({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[{ backgroundColor: THEME.colors.surface2, borderRadius: THEME.radius['2xl'], padding: 20, ...THEME.glow.soft }, style]}>
      {children}
    </View>
  );
}

type Tier = 'red' | 'amber' | 'green' | 'neutral';
const TIER_COLOR: Record<Tier, string> = {
  red: THEME.colors.error,
  amber: THEME.colors.amber,
  green: GREEN,
  neutral: THEME.colors.textMuted,
};
const TIER_RANK: Record<Tier, number> = { red: 0, amber: 1, green: 2, neutral: 3 };

export default function CoachDashboard() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Coach';

  const { data: coachRequests = [] } = usePendingCoachRequests();
  const { data: attentionItems = [] } = useCoachAttentionItems();
  const { data: clientPulse = [] } = useCoachClientPulse();
  const { data: todayCheckins = [] } = useCoachTodayCheckins();
  const { data: clientWins = [] } = useCoachClientWins();
  const { data: weekGrid = [] } = useCoachWeekCheckinGrid();
  const { data: unreadCount = 0 } = useCoachUnreadCount();

  const unviewedAnalysisCount = attentionItems.filter((i) => i.type === 'unviewed_analysis').length;
  const checkedIn = todayCheckins.filter((r) => r.checkin);
  const clientCount = todayCheckins.length;

  // ── On-track today: checked in OR logged activity in the last 24h.
  // Computable from real data — deliberately NOT an invented "coach score".
  const activeIds = new Set(
    clientPulse
      .filter((r) => r.lastActiveAt && Date.now() - new Date(r.lastActiveAt).getTime() < 24 * 3600000)
      .map((r) => r.clientId)
  );
  checkedIn.forEach((r) => activeIds.add(r.clientId));
  const onTrack = todayCheckins.filter((r) => activeIds.has(r.clientId)).length;
  const onTrackPct = clientCount > 0 ? onTrack / clientCount : 0;
  const ringColor = onTrackPct >= 0.7 ? THEME.colors.teal : onTrackPct >= 0.4 ? THEME.colors.amber : THEME.colors.error;

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

  // ── Today's Brief — one verb-first line per attention TYPE (top item of
  // each, severity order is already baked into attentionItems), plus coach
  // requests and unread messages. Rule-based and fully explainable.
  const topByType = new Map<AttentionItemType, AttentionItem>();
  attentionItems.forEach((i) => { if (!topByType.has(i.type)) topByType.set(i.type, i); });

  const briefVerb: Record<AttentionItemType, (item: AttentionItem, count: number) => string> = {
    supplement_flag:     (i)    => `Review ${i.clientName.split(' ')[0]}'s supplement flag`,
    unviewed_analysis:   (_, n) => n > 1 ? `Review ${n} new AI analyses` : `Review 1 new AI analysis`,
    no_log:              (i, n) => n > 1 ? `Message ${i.clientName.split(' ')[0]} — inactive (+${n - 1} more)` : `Message ${i.clientName.split(' ')[0]} — inactive`,
    declining_adherence: (i)    => `Check on ${i.clientName.split(' ')[0]} — adherence dropping`,
    assessment_due:      (_, n) => n > 1 ? `Book ${n} fitness assessments` : `Book 1 fitness assessment`,
  };

  const briefRows: { id: string; testID?: string; title: string; subtitle: string; onPress: () => void }[] = [];
  topByType.forEach((item, type) => {
    const count = attentionItems.filter((i) => i.type === type).length;
    briefRows.push({
      id: `brief-${type}`,
      testID: `attention-item-${type}`,
      title: briefVerb[type](item, count),
      subtitle: item.subtitle,
      onPress: () => router.push(attentionItemRoute(item, user?.id) as any),
    });
  });
  if (coachRequests.length > 0) {
    briefRows.push({
      id: 'brief-coach-requests',
      title: `Respond to ${coachRequests.length} coach request${coachRequests.length > 1 ? 's' : ''}`,
      subtitle: 'New clients waiting for approval',
      onPress: () => router.push('/(coach)/coach-requests'),
    });
  }
  if (unreadCount > 0) {
    briefRows.push({
      id: 'brief-unread',
      title: `Reply to ${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`,
      subtitle: 'In your inbox',
      onPress: () => router.push('/(coach)/inbox'),
    });
  }
  const workloadMins = briefRows.length * 5 + Math.max(0, attentionItems.length - topByType.size) * 2;

  // ── Priority clients — tiered from real signals.
  const winsByClient = new Set(clientWins.map((w) => w.clientId));
  const itemsByClient = new Map<string, AttentionItem>();
  attentionItems.forEach((i) => { if (!itemsByClient.has(i.clientId)) itemsByClient.set(i.clientId, i); });

  const priorityCards = clientPulse
    .map((row) => {
      const item = itemsByClient.get(row.clientId);
      let tier: Tier = 'neutral';
      let reason = row.adherencePct != null ? `${row.adherencePct}% adherence this week` : 'No plan activity yet';
      if (item && (item.type === 'no_log' || item.type === 'supplement_flag')) {
        tier = 'red';
        reason = item.type === 'no_log' ? item.title.split('— ')[1] ?? 'inactive' : 'Supplement flag';
      } else if ((item && item.type === 'declining_adherence') || (row.adherencePct != null && row.adherencePct < 50)) {
        tier = 'amber';
        reason = item?.type === 'declining_adherence' ? item.subtitle : `${row.adherencePct}% adherence this week`;
      } else if ((row.adherencePct != null && row.adherencePct >= 80) || winsByClient.has(row.clientId)) {
        tier = 'green';
        reason = winsByClient.has(row.clientId)
          ? clientWins.find((w) => w.clientId === row.clientId)!.label
          : `${row.adherencePct}% adherence — strong week`;
      }
      return { ...row, tier, reason, item };
    })
    .sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier])
    .slice(0, MAX_PRIORITY_CARDS);

  // ── Today's timeline — check-ins + wins, newest first.
  const timeline = [
    ...checkedIn.map((r) => ({
      id: `ci-${r.clientId}`,
      at: r.checkin!.created_at,
      icon: '💓',
      text: `${r.clientName.split(' ')[0]} checked in — mood ${r.checkin!.mood}, energy ${r.checkin!.energy}`,
      onPress: () => router.push({ pathname: '/(coach)/client-overview', params: { clientId: r.clientId, clientName: r.clientName } }),
    })),
    ...clientWins
      .filter((w) => {
        const d = new Date();
        const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return w.achievedOn === localToday;
      })
      .map((w) => ({
        id: `win-${w.id}`,
        at: `${w.achievedOn}T12:00:00Z`,
        icon: w.icon,
        text: `${w.clientName.split(' ')[0]} — ${w.label}`,
        onPress: () => router.push({ pathname: '/(coach)/client-overview', params: { clientId: w.clientId, clientName: w.clientName } }),
      })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MAX_TIMELINE_ROWS);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

  const dowToday = (new Date().getDay() + 6) % 7; // Mon=0

  return (
    <SafeAreaView testID="coach-home-screen" style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <FadeInUp delay={0} style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: THEME.type.micro, letterSpacing: 2, textTransform: 'uppercase' }}>
              Coach portal
            </Text>
            <Text numberOfLines={1} style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: THEME.type.h1, marginTop: 4 }}>
              {greeting}, {firstName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(coach)/profile')}
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: `${THEME.colors.amber}20`, borderWidth: 1, borderColor: `${THEME.colors.amber}40`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>
              {firstName[0]}
            </Text>
          </TouchableOpacity>
        </FadeInUp>

        {clientCount === 0 ? (
          <FadeInUp delay={60} style={{ marginHorizontal: 24, marginTop: 24 }}>
            <Module>
              <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>🌱</Text>
              <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: THEME.type.body, textAlign: 'center' }}>
                No clients assigned yet
              </Text>
              <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: THEME.type.caption, textAlign: 'center', marginTop: 6, lineHeight: 19 }}>
                Approved coach requests will appear here — your roster, priorities, and daily brief all build themselves from client activity.
              </Text>
            </Module>
          </FadeInUp>
        ) : (
          <>
            {/* ── Hero ring ── */}
            <FadeInUp delay={40} style={{ alignItems: 'center', paddingVertical: 24 }}>
              <RadialProgress progress={onTrackPct} color={ringColor} size={190} strokeWidth={13}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: THEME.type.display, fontFamily: THEME.fonts.sansSemibold, color: THEME.colors.textPrimary, lineHeight: THEME.type.display + 4 }}>
                    {Math.round(onTrackPct * 100)}
                    <Text style={{ fontSize: 24, color: THEME.colors.textSecondary }}>%</Text>
                  </Text>
                  <Text style={{ fontSize: THEME.type.caption, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, marginTop: 2 }}>
                    on track today
                  </Text>
                  <Text style={{ fontSize: THEME.type.micro, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
                    {onTrack} of {clientCount} clients
                  </Text>
                </View>
              </RadialProgress>
            </FadeInUp>

            {/* ── Floating stat pills ── */}
            <FadeInUp delay={90} style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, paddingHorizontal: 24, marginBottom: 28, flexWrap: 'wrap' }}>
              <StatPill icon="👥" value={String(clientCount)} label="Clients" onPress={() => router.push('/(coach)/lite-clients')} />
              <StatPill icon="✅" value={String(checkedIn.length)} label="Checked in" color={checkedIn.length > 0 ? GREEN : THEME.colors.textMuted} />
              <StatPill icon="🔥" value={avgAdherence == null ? '—' : `${avgAdherence}%`} label="Adherence"
                color={avgAdherence == null ? THEME.colors.textMuted : avgAdherence >= 70 ? GREEN : avgAdherence >= 40 ? THEME.colors.amber : THEME.colors.error} />
              <StatPill icon="⚠️" value={String(attentionItems.length)} label="Attention"
                color={attentionItems.length > 0 ? THEME.colors.amber : THEME.colors.textMuted}
                glowColor={attentionItems.length > 0 ? THEME.colors.amber : undefined}
                onPress={() => router.push('/(coach)/attention-items' as any)} />
            </FadeInUp>

            {/* ── Today's Brief ── */}
            {briefRows.length > 0 && (
              <FadeInUp delay={140} style={{ marginHorizontal: 24, marginBottom: 28 }}>
                <Module>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: THEME.type.micro, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                      ✨ Today's Brief
                    </Text>
                    <View style={{ backgroundColor: THEME.colors.tealMuted, borderRadius: THEME.radius.full, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 11 }}>
                        ~{workloadMins} min
                      </Text>
                    </View>
                  </View>
                  <View style={{ gap: 2 }}>
                    {briefRows.map((row, i) => (
                      <TouchableOpacity
                        key={row.id}
                        testID={row.testID}
                        onPress={row.onPress}
                        activeOpacity={0.75}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i > 0 ? 0.5 : 0, borderTopColor: THEME.colors.surface3 }}
                      >
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.colors.teal }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>
                            {row.title}
                          </Text>
                          <Text numberOfLines={1} style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 1 }}>
                            {row.subtitle}
                          </Text>
                        </View>
                        <Text style={{ color: THEME.colors.textMuted, fontSize: 15 }}>›</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Module>
              </FadeInUp>
            )}

            {/* ── Priority clients ── */}
            {priorityCards.length > 0 && (
              <FadeInUp delay={190} style={{ marginBottom: 28 }}>
                <View style={{ marginHorizontal: 24 }}>
                  <SectionLabel action="View all ›" onAction={() => router.push('/(coach)/lite-clients')}>
                    Priority clients
                  </SectionLabel>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}>
                  {priorityCards.map((card) => {
                    const color = TIER_COLOR[card.tier];
                    const initials = card.clientName.split(' ').map((n) => n[0]).slice(0, 2).join('');
                    return (
                      <TouchableOpacity
                        key={card.clientId}
                        activeOpacity={0.85}
                        onPress={() =>
                          card.item && card.tier !== 'green'
                            ? router.push(attentionItemRoute(card.item, user?.id) as any)
                            : router.push({ pathname: '/(coach)/client-overview', params: { clientId: card.clientId, clientName: card.clientName } })
                        }
                        style={{
                          width: 168, backgroundColor: THEME.colors.surface2, borderRadius: THEME.radius.xl,
                          padding: 14, ...THEME.glow.soft,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: color, backgroundColor: `${color}18`, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color }}>{initials}</Text>
                          </View>
                          <Text numberOfLines={1} style={{ flex: 1, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>
                            {card.clientName.split(' ')[0]}
                          </Text>
                        </View>
                        <Sparkline data={card.dailyDone} width={140} height={26} color={color} />
                        <Text numberOfLines={2} style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11, marginTop: 8, lineHeight: 15 }}>
                          {card.reason}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </FadeInUp>
            )}

            {/* ── Week check-in grid ── */}
            {weekGrid.length > 0 && (
              <FadeInUp delay={240} style={{ marginHorizontal: 24, marginBottom: 28 }}>
                <SectionLabel action={weekGrid.length > MAX_GRID_ROWS ? 'View all ›' : undefined} onAction={() => router.push('/(coach)/lite-clients')}>
                  Check-ins this week
                </SectionLabel>
                <Module>
                  {/* Column header — widths mirror the 16px cells + 4px gaps below */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ flex: 1 }} />
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                        <Text key={i} style={{ width: 16, textAlign: 'center', fontSize: 9, fontFamily: THEME.fonts.sansMedium, color: i === dowToday ? THEME.colors.teal : THEME.colors.textMuted }}>
                          {d}
                        </Text>
                      ))}
                    </View>
                  </View>
                  <View style={{ gap: 10 }}>
                    {weekGrid.slice(0, MAX_GRID_ROWS).map((row) => {
                      const missedToday = row.days[dowToday] === 0;
                      return (
                        <TouchableOpacity
                          key={row.clientId}
                          activeOpacity={0.75}
                          onPress={() =>
                            missedToday
                              ? router.push({
                                  pathname: '/(coach)/messaging',
                                  params: {
                                    coachId: user?.id, clientId: row.clientId, clientName: row.clientName,
                                    prefill: `Hi ${row.clientName.split(' ')[0]}! Just checking in — don't forget today's Daily Pulse 📝`,
                                  },
                                })
                              : router.push({ pathname: '/(coach)/client-overview', params: { clientId: row.clientId, clientName: row.clientName } })
                          }
                          style={{ flexDirection: 'row', alignItems: 'center' }}
                        >
                          <Text numberOfLines={1} style={{ flex: 1, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 13, paddingRight: 8 }}>
                            {row.clientName.split(' ')[0]}
                            {missedToday && <Text style={{ color: THEME.colors.textMuted, fontSize: 11 }}>  💬</Text>}
                          </Text>
                          <HeatStrip values={row.days} cellSize={16} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 10.5, marginTop: 12 }}>
                    Tap a client to open — 💬 = not checked in today, opens a nudge
                  </Text>
                </Module>
              </FadeInUp>
            )}

            {/* ── Today's readiness (checked-in clients) ── */}
            {checkedIn.length > 0 && (
              <FadeInUp delay={280} style={{ marginHorizontal: 24, marginBottom: 28 }}>
                <SectionLabel>Today's readiness</SectionLabel>
                <Module style={{ paddingVertical: 6 }}>
                  {checkedIn.map((row, idx) => {
                    const ci = row.checkin!;
                    const painColor = ci.pain_level >= 7 ? THEME.colors.error : ci.pain_level >= 4 ? THEME.colors.amber : GREEN;
                    const sleepColor = ci.sleep_hrs >= 7 ? GREEN : ci.sleep_hrs >= 5 ? THEME.colors.amber : THEME.colors.error;
                    return (
                      <TouchableOpacity
                        key={row.clientId}
                        activeOpacity={0.75}
                        onPress={() => router.push({ pathname: '/(coach)/client-overview', params: { clientId: row.clientId, clientName: row.clientName } })}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderTopWidth: idx > 0 ? 0.5 : 0, borderTopColor: THEME.colors.surface3 }}
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
                          <Text style={{ fontSize: 12, color: THEME.colors.textSecondary }}>😊 {ci.mood}</Text>
                          <Text style={{ fontSize: 12, color: THEME.colors.textSecondary }}>⚡ {ci.energy}</Text>
                          <Text style={{ fontSize: 12, color: sleepColor }}>🌙 {ci.sleep_hrs}h</Text>
                          <Text style={{ fontSize: 12, color: painColor }}>💊 {ci.pain_level}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </Module>
              </FadeInUp>
            )}

            {/* ── Wins ── */}
            {clientWins.length > 0 && (
              <FadeInUp delay={320} style={{ marginHorizontal: 24, marginBottom: 28 }}>
                <SectionLabel>🎉 Wins this week</SectionLabel>
                <Module style={{ paddingVertical: 6 }}>
                  {clientWins.slice(0, 3).map((win, idx) => (
                    <View
                      key={win.id}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderTopWidth: idx > 0 ? 0.5 : 0, borderTopColor: THEME.colors.surface3 }}
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
                        onPress={() => router.push({
                          pathname: '/(coach)/messaging',
                          params: {
                            coachId: user?.id, clientId: win.clientId, clientName: win.clientName,
                            prefill: `${win.icon} ${win.label} — amazing work, keep it up! 👏`,
                          },
                        })}
                        activeOpacity={0.8}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: THEME.colors.tealMuted, borderRadius: THEME.radius.full, paddingHorizontal: 10, paddingVertical: 6 }}
                      >
                        <Text style={{ fontSize: 12 }}>👏</Text>
                        <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Kudos</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </Module>
              </FadeInUp>
            )}

            {/* ── Today's timeline ── */}
            <FadeInUp delay={360} style={{ marginHorizontal: 24, marginBottom: 12 }}>
              <SectionLabel>Today's activity</SectionLabel>
              {timeline.length === 0 ? (
                <Module>
                  <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: THEME.type.caption }}>
                    Nothing yet today — check-ins and client wins will appear here as they happen.
                  </Text>
                </Module>
              ) : (
                <Module style={{ paddingVertical: 8 }}>
                  {timeline.map((ev, idx) => (
                    <TouchableOpacity
                      key={ev.id}
                      onPress={ev.onPress}
                      activeOpacity={0.75}
                      style={{ flexDirection: 'row', gap: 12, paddingVertical: 9 }}
                    >
                      <View style={{ alignItems: 'center', width: 52 }}>
                        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sansMedium, fontSize: 10.5 }}>
                          {fmtTime(ev.at)}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.colors.teal, marginTop: 3 }} />
                        {idx < timeline.length - 1 && <View style={{ width: 1, flex: 1, backgroundColor: THEME.colors.surface3, marginTop: 2 }} />}
                      </View>
                      <Text numberOfLines={2} style={{ flex: 1, color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 12.5, lineHeight: 17, paddingBottom: 4 }}>
                        {ev.icon} {ev.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </Module>
              )}
            </FadeInUp>
          </>
        )}

      </ScrollView>

      {/* ── Floating actions — every "do something" verb in one spot ── */}
      <Fab
        actions={[
          { id: 'my-clients', icon: '🙋', label: 'My Clients', onPress: () => router.push('/(coach)/lite-clients') },
          { id: 'messages', icon: '💬', label: 'Messages', onPress: () => router.push('/(coach)/inbox'), badge: unreadCount },
          { id: 'coach-requests', icon: '🧑‍🏫', label: 'Coach Requests', onPress: () => router.push('/(coach)/coach-requests'), badge: coachRequests.length },
          { id: 'medical-opinion-requests', icon: '🩺', label: 'Medical Opinions', onPress: () => router.push('/(coach)/medical-opinion-requests'), badge: unviewedAnalysisCount },
        ]}
      />
    </SafeAreaView>
  );
}
