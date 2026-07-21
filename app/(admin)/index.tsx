import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAnalytics, useAdminRehabCalendar, useAdminDailyPulse, useAdminWeekly, useAdminMonthly } from '@/hooks/useAdmin';
import { THEME } from '@/constants/theme';
import { RadialProgress } from '@/components/ui/RadialProgress';
import { FadeInUp } from '@/components/ui/FadeInUp';

type DashTab = 'today' | 'week' | 'month';
const DASH_TABS: { key: DashTab; label: string; icon: string }[] = [
  { key: 'today', label: 'Today', icon: '☀️' },
  { key: 'week',  label: 'Week',  icon: '📅' },
  { key: 'month', label: 'Month', icon: '📈' },
];

function PanelCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: THEME.radius.xl, padding: 16, marginBottom: 14, ...THEME.glow.soft }}>
      <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: THEME.type.micro, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

// Collapsible variant of PanelCard — used for the heavy Tier-3 lists so the
// screen doesn't read as one long unbroken scroll. Collapsed by default;
// tap the header to expand. Count badge is tone-colored so the header alone
// still communicates "how much is in here" without opening it.
function Accordion({
  title, icon, count, tone = 'neutral', defaultExpanded = false, children,
}: {
  title: string; icon?: string; count?: number; tone?: 'red' | 'amber' | 'neutral'; defaultExpanded?: boolean; children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const toneColor = tone === 'red' ? '#F87171' : tone === 'amber' ? THEME.colors.amber : THEME.colors.textSecondary;
  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: THEME.radius.xl, marginBottom: 14, overflow: 'hidden', ...THEME.glow.soft }}>
      <TouchableOpacity onPress={() => setExpanded((e) => !e)} activeOpacity={0.75} style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        {icon && <Text style={{ fontSize: 15, marginRight: 8 }}>{icon}</Text>}
        <Text style={{ flex: 1, color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: THEME.type.micro, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          {title}
        </Text>
        {count != null && count > 0 && (
          <View style={{ backgroundColor: `${toneColor}20`, borderRadius: THEME.radius.full, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 }}>
            <Text style={{ color: toneColor, fontFamily: THEME.fonts.sansMedium, fontSize: 11 }}>{count}</Text>
          </View>
        )}
        <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {expanded && <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>{children}</View>}
    </View>
  );
}

function StatCell({ value, label, color, sub, delta }: { value: string | number; label: string; color: string; sub?: string; delta?: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: THEME.radius.xl, padding: 14, alignItems: 'center', ...THEME.glow.soft }}>
      <Text style={{ fontSize: THEME.type.h2, fontFamily: THEME.fonts.sansSemibold, color }}>{value}</Text>
      <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 3, textAlign: 'center' }}>{label}</Text>
      {sub != null && (
        <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, marginTop: 2, textAlign: 'center' }}>{sub}</Text>
      )}
      {delta != null && <View style={{ marginTop: 5 }}>{delta}</View>}
    </View>
  );
}

// Radial-gauge score display — replaces the old hand-drawn bordered circle
// with the same animated RadialProgress used across the coach dashboard, so
// score rings look and feel identical wherever they show up in the app.
function ScoreRing({ label, value, color, deltaNode }: { label: string; value: number; color: string; deltaNode?: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <RadialProgress size={72} strokeWidth={7} progress={value / 100} color={color} glow={false}>
        <Text style={{ color, fontFamily: THEME.fonts.sansSemibold, fontSize: THEME.type.h2 }}>{value}</Text>
      </RadialProgress>
      <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11, marginTop: 8 }}>{label}</Text>
      {deltaNode}
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

// ── Action Center — Tier 1 ───────────────────────────────────────────────────
// Always visible above the Today/Week/Month toggle, independent of which tab
// is selected: red flags, unread coach message backlog, admin-review queue,
// and the longest-waiting onboarding outliers. Previously these only showed
// up on the Today tab, so switching to Week/Month hid every urgent item.
function ActionCenterCard({ tone, icon, title, children }: { tone: 'red' | 'amber'; icon: string; title: string; children: React.ReactNode }) {
  const toneColor = tone === 'red' ? '#F87171' : THEME.colors.amber;
  return (
    <View
      style={{
        marginHorizontal: 24, backgroundColor: `${toneColor}12`, borderRadius: THEME.radius.xl, padding: 16, marginBottom: 12,
        shadowColor: toneColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 5,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Text style={{ fontSize: 15 }}>{icon}</Text>
        <Text style={{ color: toneColor, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function WaitingOnPlanList({ waiting, router }: { waiting: { clientId: string; clientName: string; assessedAt: string }[]; router: ReturnType<typeof useRouter> }) {
  const [expanded, setExpanded] = useState(false);
  const days = (assessedAt: string) => Math.floor((Date.now() - new Date(assessedAt).getTime()) / 86400000);
  const longest = Math.max(...waiting.map((w) => days(w.assessedAt)));
  const shown = expanded ? waiting : waiting.slice(0, 3);

  return (
    <View>
      <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary, marginBottom: 10 }}>
        <Text style={{ fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>{waiting.length}</Text> client{waiting.length !== 1 ? 's' : ''} waiting
        {' · longest '}
        <Text style={{ fontFamily: THEME.fonts.sansMedium, color: '#F87171' }}>{longest}d</Text>
      </Text>
      <View style={{ gap: 7 }}>
        {shown.map((w) => {
          const d = days(w.assessedAt);
          return (
            <TouchableOpacity
              key={w.clientId}
              onPress={() => router.push({ pathname: '/(admin)/client-profile', params: { clientId: w.clientId, clientName: w.clientName } })}
              activeOpacity={0.8}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>{w.clientName}</Text>
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: d >= 14 ? '#F87171' : THEME.colors.amber }}>
                {d <= 0 ? 'assessed today' : `waiting ${d}d`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {waiting.length > 3 && (
        <TouchableOpacity onPress={() => setExpanded((e) => !e)} style={{ marginTop: 10 }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>
            {expanded ? 'Show less' : `+${waiting.length - 3} more`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ActionCenter({ pulse, loading }: { pulse: any; loading: boolean }) {
  const router = useRouter();
  if (loading || !pulse) return null;

  const redFlags: any[] = pulse.redFlags ?? [];
  const messageBacklog: any[] = pulse.messageBacklog ?? [];
  const needAction = [
    { label: 'Recovery quotes awaiting your response', count: pulse.pendingRehabList?.length ?? 0, route: '/(admin)/rehab-queue' },
    { label: 'Detailed assessments awaiting coach review', count: pulse.pendingAssessmentsList?.length ?? 0, route: '/(admin)/assessments' },
    { label: 'Client feedback unread by coach', count: pulse.unreadFeedbackList?.length ?? 0, route: '/(admin)/medical-records' },
  ].filter((i) => i.count > 0);
  const waiting: any[] = pulse.waitingOnFirstPlan ?? [];
  const unreadTotal = messageBacklog.reduce((s, b) => s + b.unreadCount, 0);

  const totalUrgent = redFlags.length + unreadTotal + needAction.reduce((s, i) => s + i.count, 0) + waiting.length;

  if (totalUrgent === 0) {
    return (
      <FadeInUp delay={0} style={{ marginHorizontal: 24, marginBottom: 18 }}>
        <View style={{ backgroundColor: `${THEME.colors.teal}12`, borderRadius: THEME.radius.xl, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, ...THEME.glow.teal }}>
          <Text style={{ fontSize: 18 }}>✅</Text>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>All clear — nothing urgent right now.</Text>
        </View>
      </FadeInUp>
    );
  }

  return (
    <FadeInUp delay={0} style={{ marginBottom: 4 }}>
      <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: THEME.type.micro, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12, marginHorizontal: 24 }}>
        ⚡ Action Center
      </Text>

      {redFlags.length > 0 && (
        <ActionCenterCard tone="red" icon="🚨" title={`Red flags (${redFlags.length})`}>
          <View style={{ gap: 8 }}>
            {redFlags.slice(0, 5).map((f) => (
              <TouchableOpacity
                key={f.clientId}
                onPress={() => router.push({ pathname: '/(admin)/client-profile', params: { clientId: f.clientId, clientName: f.clientName } })}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>{f.clientName}</Text>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: '#F87171' }}>{f.reason}</Text>
              </TouchableOpacity>
            ))}
            {redFlags.length > 5 && (
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>+{redFlags.length - 5} more</Text>
            )}
          </View>
        </ActionCenterCard>
      )}

      {messageBacklog.length > 0 && (
        <ActionCenterCard tone="red" icon="💬" title="Unread client messages · older than 24h">
          <View style={{ gap: 8 }}>
            {messageBacklog.map((b) => (
              <View key={b.coachId} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>{b.coachName}</Text>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                  <Text style={{ color: '#F87171', fontFamily: THEME.fonts.sansMedium }}>{b.unreadCount}</Text>
                  {'  '}oldest {timeAgo(b.oldestSentAt)}
                </Text>
              </View>
            ))}
          </View>
        </ActionCenterCard>
      )}

      {needAction.length > 0 && (
        <ActionCenterCard tone="amber" icon="📌" title="Need your action">
          <View style={{ gap: 10 }}>
            {needAction.map((i) => (
              <TouchableOpacity key={i.label} onPress={() => router.push(i.route as any)} activeOpacity={0.8} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>{i.label}</Text>
                <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>{i.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ActionCenterCard>
      )}

      {waiting.length > 0 && (
        <ActionCenterCard tone="amber" icon="🚀" title="Waiting on their first plan">
          <WaitingOnPlanList waiting={waiting} router={router} />
        </ActionCenterCard>
      )}
    </FadeInUp>
  );
}

// ── TODAY tab — Tier 2, informational (Tier-1 items moved to ActionCenter) ──
function TodayTab({ pulse, loading, todaysAppointments }: { pulse: any; loading: boolean; todaysAppointments: any[] }) {
  const router = useRouter();
  if (loading) return <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />;

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

      {/* Signups today — names, not just a count */}
      {(pulse?.signupsTodayList?.length ?? 0) > 0 && (
        <View style={{ marginHorizontal: 24, backgroundColor: `${THEME.colors.amber}12`, borderRadius: THEME.radius.xl, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <Text style={{ fontSize: 13 }}>✨</Text>
          <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>
            New today:{' '}
            {pulse!.signupsTodayList.map((c: any, i: number) => (
              <Text key={c.id} onPress={() => router.push({ pathname: '/(admin)/client-profile', params: { clientId: c.id, clientName: c.full_name } })} style={{ fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>
                {c.full_name}{i < pulse!.signupsTodayList.length - 1 ? ', ' : ''}
              </Text>
            ))}
          </Text>
        </View>
      )}

      {/* Today's Recovery agenda */}
      <PanelCard title={`🩹 Recovery sessions today (${todaysAppointments.length})`}>
        {todaysAppointments.length === 0 ? (
          <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Nothing scheduled today.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {todaysAppointments.slice(0, 6).map((a: any) => (
              <TouchableOpacity
                key={a.id}
                onPress={() => router.push('/(admin)/rehab-queue')}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}
              >
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>{a.client?.full_name ?? 'Unknown'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>
                    {new Date(a.scheduled_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: a.status === 'completed' ? '#6EE7B7' : a.status === 'cancelled' || a.status === 'no_show' ? '#F87171' : THEME.colors.textMuted, textTransform: 'capitalize' }}>
                    {a.status ?? 'scheduled'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </PanelCard>

      {/* Wins of the day */}
      {(pulse?.streakMilestonesToday?.length ?? 0) > 0 && (
        <PanelCard title="🎉 Wins today">
          <View style={{ gap: 8 }}>
            {pulse!.streakMilestonesToday.map((w: any) => (
              <TouchableOpacity
                key={w.clientId}
                onPress={() => router.push({ pathname: '/(admin)/client-profile', params: { clientId: w.clientId, clientName: w.clientName } })}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 }}
              >
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>{w.clientName}</Text>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: '#6EE7B7' }}>🔥 {w.streak}-day streak</Text>
              </TouchableOpacity>
            ))}
          </View>
        </PanelCard>
      )}

      {/* Recovery payments pending */}
      {(pulse?.paymentsPending?.length ?? 0) > 0 && (
        <PanelCard title="💳 Recovery payments pending">
          <View style={{ gap: 8 }}>
            {pulse!.paymentsPending.map((p: any) => (
              <TouchableOpacity
                key={p.requestId}
                onPress={() => router.push('/(admin)/rehab-queue')}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 }}
              >
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>{p.clientName}</Text>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>
                  {p.amount != null ? `₹${p.amount.toLocaleString('en-IN')} pending` : 'Awaiting payment'}
                </Text>
              </TouchableOpacity>
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

// ── 14-day trend — paired daily bars: check-ins & distinct active clients ────
function TrendChart({ data }: { data: { date: string; checkins: number; active: number }[] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.checkins, d.active)));
  const BAR_AREA_H = 72;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: BAR_AREA_H, gap: 4 }}>
        {data.map((d) => (
          <View key={d.date} style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 1.5 }}>
            <View style={{ flex: 1, height: Math.max(2, (d.checkins / max) * BAR_AREA_H), backgroundColor: '#93C5FD', borderTopLeftRadius: 2, borderTopRightRadius: 2, opacity: d.checkins === 0 ? 0.25 : 1 }} />
            <View style={{ flex: 1, height: Math.max(2, (d.active / max) * BAR_AREA_H), backgroundColor: THEME.colors.teal, borderTopLeftRadius: 2, borderTopRightRadius: 2, opacity: d.active === 0 ? 0.25 : 1 }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
          {new Date(data[0]?.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </Text>
        <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Today</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
        {[{ label: 'Check-ins', color: '#93C5FD' }, { label: 'Active clients', color: THEME.colors.teal }].map((l) => (
          <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: l.color }} />
            <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Horizontal proportional bars — replaces a plain number list with an actual
// visual funnel, so the biggest bottleneck is obvious at a glance instead of
// requiring a read-every-row comparison.
function FunnelBar({ stages, router }: { stages: { label: string; value: number; route: string }[]; router: ReturnType<typeof useRouter> }) {
  const max = Math.max(1, ...stages.map((s) => s.value));
  return (
    <View style={{ gap: 12 }}>
      {stages.map((s) => (
        <TouchableOpacity key={s.label} onPress={() => router.push(s.route as any)} activeOpacity={0.8}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>{s.label}</Text>
            <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: s.value > 0 ? THEME.colors.amber : THEME.colors.textMuted }}>{s.value}</Text>
          </View>
          <View style={{ height: 7, backgroundColor: THEME.colors.surface3, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${Math.max(3, (s.value / max) * 100)}%`, backgroundColor: s.value > 0 ? THEME.colors.amber : THEME.colors.border, borderRadius: 4 }} />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── WEEK tab ─────────────────────────────────────────────────────────────────
function DeltaBadge({ now, prev, suffix = 'pts vs last wk' }: { now: number; prev: number; suffix?: string }) {
  const delta = now - prev;
  const color = delta > 0 ? '#6EE7B7' : delta < 0 ? '#F87171' : THEME.colors.textMuted;
  const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '—';
  return (
    <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color }}>
      {arrow} {Math.abs(delta)}{suffix}
    </Text>
  );
}

function WeekTab({ analytics }: { analytics: any }) {
  const router = useRouter();
  const { data: weekly, isLoading } = useAdminWeekly();

  const PLAN_STATS = analytics ? [
    { label: 'Active plans', value: analytics.activePlans,              color: THEME.colors.teal },
    { label: 'Draft plans',  value: analytics.draftPlans,               color: THEME.colors.amber },
    { label: 'Need plan',    value: analytics.clientsWithoutPlan ?? 0,  color: '#F87171' },
  ] : [];

  const AVG_SCORES = analytics ? [
    { label: 'Fitness',   value: analytics.avgFitness,   color: THEME.scoreColors.fitness },
    { label: 'Recovery',  value: analytics.avgRecovery,  color: THEME.scoreColors.recovery },
    { label: 'Longevity', value: analytics.avgLongevity, color: THEME.scoreColors.longevity },
  ] : [];

  if (isLoading) return <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />;

  const FUNNEL_STAGES = weekly ? [
    { label: 'No assessment yet',        value: weekly.funnel.noAssessment,    route: '/(admin)/clients' },
    { label: 'Assessed, no coach',       value: weekly.funnel.assessedNoCoach, route: '/(admin)/coach-assignment' },
    { label: 'Coach, no active plan',    value: weekly.funnel.coachNoPlan,     route: '/(admin)/coach-assignment' },
    { label: 'Plan, inactive this week', value: weekly.funnel.planButInactive, route: '/(admin)/clients' },
  ] : [];

  return (
    <View>
      {/* WoW KPIs — delta embedded in the same card, not a separate row */}
      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 24, marginBottom: 14 }}>
        <StatCell value={`${weekly?.engagementThisWeek ?? 0}%`} label="Engagement" color="#6EE7B7"
          delta={<DeltaBadge now={weekly?.engagementThisWeek ?? 0} prev={weekly?.engagementPrevWeek ?? 0} />} />
        <StatCell value={`${weekly?.adherenceThisWeek ?? 0}%`} label="Adherence" color={THEME.colors.teal}
          delta={<DeltaBadge now={weekly?.adherenceThisWeek ?? 0} prev={weekly?.adherencePrevWeek ?? 0} />} />
        <StatCell value={`${weekly?.checkinRateThisWeek ?? 0}%`} label="Check-in rate" color="#93C5FD"
          delta={<DeltaBadge now={weekly?.checkinRateThisWeek ?? 0} prev={weekly?.checkinRatePrevWeek ?? 0} />} />
      </View>

      {/* 14-day daily trend */}
      {(weekly?.dailyTrend?.length ?? 0) > 0 && (
        <PanelCard title="📊 Daily activity — last 14 days">
          <TrendChart data={weekly!.dailyTrend} />
        </PanelCard>
      )}

      {/* Onboarding funnel — always visible, it's a compact diagnostic, not a heavy list */}
      {weekly && (
        <PanelCard title={`🧭 Where clients are stuck (${weekly.funnel.healthy}/${weekly.funnel.totalClients} healthy)`}>
          <FunnelBar stages={FUNNEL_STAGES} router={router} />
        </PanelCard>
      )}

      {/* Coach leaderboard */}
      {(weekly?.leaderboard?.length ?? 0) > 0 && (
        <Accordion title="Coach leaderboard (7d)" icon="🧑‍🏫" count={weekly!.leaderboard.length}>
          <View style={{ gap: 12 }}>
            {weekly!.leaderboard.map((c) => (
              <TouchableOpacity
                key={c.coachId}
                onPress={() => router.push({ pathname: '/(admin)/coach-profile', params: { coachId: c.coachId, coachName: c.coachName } })}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 13.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{c.coachName}</Text>
                  <Text style={{ fontSize: 13.5, fontFamily: THEME.fonts.sansMedium, color: c.avgAdherence != null ? THEME.colors.teal : THEME.colors.textMuted }}>
                    {c.avgAdherence != null ? `${c.avgAdherence}%` : '—'}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                  {c.clientCount} clients
                  {c.disengagedCount > 0 && <Text style={{ color: '#F87171' }}>  · {c.disengagedCount} disengaged</Text>}
                  {c.unreadOver24h > 0 && <Text style={{ color: THEME.colors.amber }}>  · {c.unreadOver24h} unread &gt;24h</Text>}
                  {c.avgReadHours != null && `  · reads in ${c.avgReadHours}h`}
                  {`  · ${c.digests7d} digests`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Accordion>
      )}

      {/* Client movers */}
      {((weekly?.topGainers?.length ?? 0) > 0 || (weekly?.topDecliners?.length ?? 0) > 0) && (
        <Accordion title="Client movers — composite score (14d)" icon="📈" count={(weekly?.topGainers?.length ?? 0) + (weekly?.topDecliners?.length ?? 0)}>
          <View style={{ gap: 6 }}>
            {weekly!.topGainers.map((m) => (
              <TouchableOpacity key={m.clientId} activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/(admin)/client-profile', params: { clientId: m.clientId, clientName: m.clientName } })}
                style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>{m.clientName}</Text>
                <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: '#6EE7B7' }}>▲ {m.delta} → {m.current}</Text>
              </TouchableOpacity>
            ))}
            {weekly!.topDecliners.map((m) => (
              <TouchableOpacity key={m.clientId} activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/(admin)/client-profile', params: { clientId: m.clientId, clientName: m.clientName } })}
                style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>{m.clientName}</Text>
                <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: '#F87171' }}>▼ {Math.abs(m.delta)} → {m.current}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Accordion>
      )}

      {/* Churn risk */}
      {(weekly?.churnRisk?.length ?? 0) > 0 && (
        <Accordion title="Churn risk — active last week, silent this week" icon="⚠️" tone="amber" count={weekly!.churnRisk.length}>
          <View style={{ gap: 8 }}>
            {weekly!.churnRisk.slice(0, 8).map((c) => (
              <TouchableOpacity key={c.clientId} activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/(admin)/client-profile', params: { clientId: c.clientId, clientName: c.clientName } })}
                style={{ paddingVertical: 3 }}>
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>{c.clientName}</Text>
              </TouchableOpacity>
            ))}
            {weekly!.churnRisk.length > 8 && (
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                +{weekly!.churnRisk.length - 8} more
              </Text>
            )}
          </View>
        </Accordion>
      )}

      {analytics?.disengagedClients && analytics.disengagedClients.length > 0 && (
        <Accordion title="Disengaged clients (no activity in 14d)" icon="😴" tone="amber" count={analytics.disengagedClients.length}>
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
        </Accordion>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 24, marginBottom: 14 }}>
        {PLAN_STATS.map(s => <StatCell key={s.label} value={s.value} label={s.label} color={s.color} />)}
      </View>

      {/* All-time — deliberately unqualified by any date range, unlike Month
          tab's "Outcome scores" (30D vs prior), so the two don't read as the
          same widget with different numbers. */}
      <PanelCard title="Platform averages · all-time">
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: 6 }}>
          {AVG_SCORES.map((s) => (
            <ScoreRing key={s.label} label={s.label} value={s.value} color={s.color} />
          ))}
        </View>
      </PanelCard>
    </View>
  );
}

// ── MONTH tab ────────────────────────────────────────────────────────────────
function MonthTab({ analytics }: { analytics: any }) {
  const { data: monthly, isLoading } = useAdminMonthly();

  if (isLoading) return <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />;

  const scoreColorFor = (label: string) =>
    label === 'Fitness' ? THEME.scoreColors.fitness : label === 'Recovery' ? THEME.scoreColors.recovery : THEME.scoreColors.longevity;

  return (
    <View>
      {/* Growth */}
      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 24, marginBottom: 14 }}>
        <StatCell
          value={`+${monthly?.signupsThis30 ?? 0}`}
          label="Signups (30d)"
          color={THEME.colors.amber}
          delta={<DeltaBadge now={monthly?.signupsThis30 ?? 0} prev={monthly?.signupsPrev30 ?? 0} suffix=" vs prior 30d" />}
        />
        <StatCell
          value={monthly?.activationRate != null ? `${monthly.activationRate}%` : '—'}
          label="Activation"
          sub="new signups who got active"
          color="#6EE7B7"
        />
        <StatCell
          value={monthly?.retention30 != null ? `${monthly.retention30}%` : '—'}
          label="30d retention"
          sub="prior cohort still active"
          color={THEME.colors.teal}
        />
      </View>

      {/* Outcomes — 30D vs prior, distinct from Week tab's all-time averages */}
      <PanelCard title="Outcome scores · 30d vs prior">
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: 6 }}>
          {(monthly?.outcomes ?? []).map((o) => (
            <ScoreRing
              key={o.key}
              label={o.label}
              value={o.current}
              color={scoreColorFor(o.label)}
              deltaNode={<View style={{ marginTop: 3 }}><DeltaBadge now={o.current} prev={o.previous} suffix="" /></View>}
            />
          ))}
        </View>
      </PanelCard>

      {/* Revenue */}
      <PanelCard title="💰 Revenue — recovery sessions">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
            <Text style={{ fontSize: 20, fontFamily: THEME.fonts.sansSemibold, color: '#6EE7B7' }}>
              ₹{(monthly?.rehab.revenueThis30 ?? 0).toLocaleString('en-IN')}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 3 }}>Collected (30d)</Text>
            <DeltaBadge now={monthly?.rehab.revenueThis30 ?? 0} prev={monthly?.rehab.revenuePrev30 ?? 0} suffix=" vs prior" />
          </View>
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
            <Text style={{ fontSize: 20, fontFamily: THEME.fonts.sansSemibold, color: THEME.colors.amber }}>
              ₹{(monthly?.rehab.pendingCollections ?? 0).toLocaleString('en-IN')}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 3 }}>
              Pending ({monthly?.rehab.pendingCollectionsCount ?? 0} quote{(monthly?.rehab.pendingCollectionsCount ?? 0) === 1 ? '' : 's'})
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
            <Text style={{ fontSize: 20, fontFamily: THEME.fonts.sansSemibold, color: THEME.colors.teal }}>
              {monthly?.rehab.avgTicket != null ? `₹${monthly.rehab.avgTicket.toLocaleString('en-IN')}` : '—'}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 3 }}>Avg ticket</Text>
          </View>
        </View>
      </PanelCard>

      {/* Recovery business */}
      <PanelCard title="Recovery business (30d)">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[
            { label: 'Received',  value: monthly?.rehab.received ?? 0,  color: '#93C5FD' },
            { label: 'Accepted',  value: monthly?.rehab.accepted ?? 0,  color: '#6EE7B7' },
            { label: 'Declined',  value: monthly?.rehab.declined ?? 0,  color: '#F87171' },
            { label: 'Completed', value: monthly?.rehab.completed ?? 0, color: THEME.colors.teal },
            { label: 'No-show',   value: monthly?.rehab.noShow ?? 0,    color: THEME.colors.amber },
          ].map((s) => (
            <View key={s.label} style={{ width: '30%', alignItems: 'center', paddingVertical: 6 }}>
              <Text style={{ fontSize: 18, fontFamily: THEME.fonts.sansSemibold, color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: THEME.colors.border }}>
          <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary }}>
            Accept rate <Text style={{ color: '#6EE7B7', fontFamily: THEME.fonts.sansMedium }}>{monthly?.rehab.acceptRate != null ? `${monthly.rehab.acceptRate}%` : '—'}</Text>
          </Text>
          <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary }}>
            No-show rate <Text style={{ color: THEME.colors.amber, fontFamily: THEME.fonts.sansMedium }}>{monthly?.rehab.noShowRate != null ? `${monthly.rehab.noShowRate}%` : '—'}</Text>
          </Text>
          <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary }}>
            Requests <Text style={{ color: '#93C5FD', fontFamily: THEME.fonts.sansMedium }}>{(monthly?.rehab.received ?? 0) >= (monthly?.rehab.receivedPrev ?? 0) ? '▲' : '▼'} {Math.abs((monthly?.rehab.received ?? 0) - (monthly?.rehab.receivedPrev ?? 0))}</Text>
          </Text>
        </View>
      </PanelCard>

      {/* Feature usage with deltas */}
      {(monthly?.featureUsage?.length ?? 0) > 0 && (
        <PanelCard title="Feature usage (30d, distinct clients)">
          <View style={{ gap: 12, paddingTop: 4 }}>
            {monthly!.featureUsage.map((f) => {
              const maxUsage = monthly!.featureUsage[0]?.clientCount ?? 1;
              const delta = f.clientCount - f.prevCount;
              return (
                <View key={f.item_type}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 13, flex: 1, textTransform: 'capitalize' }}>{f.item_type}</Text>
                    <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>
                      {f.clientCount}
                      {'  '}
                      <Text style={{ fontSize: 10.5, color: delta > 0 ? '#6EE7B7' : delta < 0 ? '#F87171' : THEME.colors.textMuted }}>
                        {delta > 0 ? `▲${delta}` : delta < 0 ? `▼${Math.abs(delta)}` : '—'}
                      </Text>
                    </Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: THEME.colors.surface3, borderRadius: 3, overflow: 'hidden' }}>
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
  // Fetched once here (not inside TodayTab) so the Action Center can stay
  // visible regardless of which of the Today/Week/Month tabs is selected.
  const { data: pulse, isLoading: pulseLoading } = useAdminDailyPulse();
  const [tab, setTab] = useState<DashTab>('today');
  const [menuVisible, setMenuVisible] = useState(false);
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Eshwar';

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'Sign out of the admin portal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  const ADMIN_ACTIONS = [
    { emoji: '🧑‍🤝‍🧑', title: 'Clients', subtitle: 'Filter & sort the full client roster', route: '/(admin)/clients', color: THEME.colors.teal },
    { emoji: '🧑‍🏫', title: 'Coaches', subtitle: 'Roster, client counts, adherence', route: '/(admin)/coaches', color: THEME.colors.amber },
    { emoji: '➕', title: 'Add Coach', subtitle: 'Create a new coach account', route: '/(admin)/add-coach', color: THEME.colors.amber },
    { emoji: '🔗', title: 'Coach assignment', subtitle: 'Assign clients to coaches', route: '/(admin)/coach-assignment', color: THEME.colors.amber, badge: analytics?.clientsWithoutPlan },
    { emoji: '📋', title: 'Assessments', subtitle: 'View submitted client assessments', route: '/(admin)/assessments', color: '#C4B5FD' },
    { emoji: '📢', title: 'Broadcast notification', subtitle: 'Send push to all clients', route: '/(admin)/broadcast', color: '#93C5FD' },
    { emoji: '🩹', title: 'Recovery', subtitle: 'Requests, sessions & availability', route: '/(admin)/rehab-queue', color: THEME.colors.amber, badge: analytics?.pendingRehabRequests },
    { emoji: '🩺', title: 'Medical records', subtitle: 'Platform-wide upload & analysis stats', route: '/(admin)/medical-records', color: '#93C5FD' },
    { emoji: '🏋️', title: 'Fitness analytics', subtitle: 'Avg domain scores by athlete status & age band', route: '/(admin)/fitness-analytics', color: '#34D399' },
    { emoji: '📚', title: 'Clients by Goals', subtitle: 'Client distribution by selected goal', route: '/(admin)/clients-by-goals', color: '#FDE68A' },
    { emoji: '🛡️', title: 'User roles', subtitle: 'Promote or change client / coach / admin roles', route: '/(admin)/users', color: '#8b78e8' },
    { emoji: '⚙️', title: 'Settings', subtitle: 'Contact info, rehab packages, supplements', route: '/(admin)/settings', color: THEME.colors.textSecondary },
  ];

  return (
    <SafeAreaView testID="admin-home-screen" style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 13 }}>
              Admin · BioRealign
            </Text>
            <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: THEME.type.h1, marginTop: 2 }}>
              Welcome, <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.cormorantSemibold }}>{firstName}</Text>
            </Text>
          </View>
          <View style={{ gap: 10, marginTop: 4, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              style={{ width: 42, height: 42, borderRadius: THEME.radius.lg, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', ...THEME.glow.soft }}
            >
              <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>☰</Text>
              {ADMIN_ACTIONS.some((a) => (a.badge ?? 0) > 0) && (
                <View style={{ position: 'absolute', top: 7, right: 7, width: 9, height: 9, borderRadius: 5, backgroundColor: '#F87171', borderWidth: 1.5, borderColor: THEME.colors.surface2 }} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={confirmSignOut}
              style={{ width: 42, height: 42, borderRadius: THEME.radius.lg, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', ...THEME.glow.soft }}
            >
              <Text style={{ color: THEME.colors.error, fontSize: 17 }}>⏻</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Center — Tier 1, always visible regardless of tab */}
        <ActionCenter pulse={pulse} loading={pulseLoading} />

        {/* Today / Week / Month tabs — global time-range filter for Tier 2 */}
        <View style={{ flexDirection: 'row', marginHorizontal: 24, marginBottom: 18, backgroundColor: THEME.colors.surface2, borderRadius: THEME.radius.xl, padding: 4, gap: 4, ...THEME.glow.soft }}>
          {DASH_TABS.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTab(t.key)}
                activeOpacity={0.8}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: THEME.radius.lg, backgroundColor: active ? THEME.colors.teal : 'transparent' }}
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
            {tab === 'today' && <TodayTab pulse={pulse} loading={pulseLoading} todaysAppointments={todaysAppointments} />}
            {tab === 'week'  && <WeekTab analytics={analytics} />}
            {tab === 'month' && <MonthTab analytics={analytics} />}
          </>
        )}
      </ScrollView>

      {/* Admin actions — bottom-sheet menu behind the ☰ header button */}
      <Modal transparent visible={menuVisible} animationType="slide" onRequestClose={() => setMenuVisible(false)} statusBarTranslucent>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }} onPress={() => setMenuVisible(false)} />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '82%', backgroundColor: THEME.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingBottom: 36 }}>
          <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: THEME.colors.border, alignSelf: 'center', marginBottom: 14 }} />
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12, marginHorizontal: 24 }}>
            Admin actions
          </Text>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, gap: 10 }} showsVerticalScrollIndicator={false}>
            {ADMIN_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.route}
                onPress={() => { setMenuVisible(false); router.push(action.route as any); }}
                activeOpacity={0.8}
                style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: `${action.color}15`, borderWidth: 0.5, borderColor: `${action.color}30`, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 17 }}>{action.emoji}</Text>
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
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
