import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAdminClientsList, ActivityFilter, AthleteFilterValue, PendingRehabFilterValue, ClientsSortBy } from '@/hooks/useAdmin';
import { THEME } from '@/constants/theme';

const ACTIVITY_OPTIONS: { value: ActivityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active <7d' },
  { value: 'inactive_7_14', label: 'Inactive 7-14d' },
  { value: 'inactive_14_plus', label: 'Inactive 14d+' },
  { value: 'never', label: 'Never' },
];

const SORT_OPTIONS: { value: ClientsSortBy; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'signup_desc', label: 'Newest' },
  { value: 'last_active_desc', label: 'Last active' },
  { value: 'adherence_desc', label: 'Adherence ↓' },
  { value: 'adherence_asc', label: 'Adherence ↑' },
];

const ACTIVITY_COLORS: Record<string, string> = {
  active: '#34D399',
  inactive_7_14: THEME.colors.amber,
  inactive_14_plus: '#F87171',
  never: THEME.colors.textMuted,
};

function Pill({ label, active, onPress, color }: { label: string; active: boolean; onPress: () => void; color?: string }) {
  const c = color ?? THEME.colors.teal;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: active ? c : THEME.colors.surface2, borderWidth: 0.5, borderColor: active ? c : THEME.colors.border }}
    >
      <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: active ? THEME.colors.background : THEME.colors.textSecondary }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ClientsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [athleteFilter, setAthleteFilter] = useState<AthleteFilterValue>('all');
  const [pendingRehabFilter, setPendingRehabFilter] = useState<PendingRehabFilterValue>('all');
  const [sortBy, setSortBy] = useState<ClientsSortBy>('name');

  const { data: clients = [], isLoading } = useAdminClientsList({ activityFilter, athleteFilter, pendingRehabFilter, sortBy });

  const filtered = useMemo(
    () => clients.filter((c: any) => c.full_name?.toLowerCase().includes(search.toLowerCase())),
    [clients, search]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
          >
            <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 28 }}>Clients</Text>
        </View>

        <TextInput
          style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 0.5, borderColor: THEME.colors.border, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, marginBottom: 12 }}
          placeholder="Search by name..."
          placeholderTextColor={THEME.colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 8 }}>
          {ACTIVITY_OPTIONS.map((o) => (
            <Pill key={o.value} label={o.label} active={activityFilter === o.value} onPress={() => setActivityFilter(o.value)} />
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, alignSelf: 'center', marginRight: 2 }}>Athlete:</Text>
          {(['all', 'yes', 'no'] as const).map((a) => (
            <Pill key={a} label={a} active={athleteFilter === a} onPress={() => setAthleteFilter(a)} color="#8b78e8" />
          ))}
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, alignSelf: 'center', marginLeft: 8, marginRight: 2 }}>Rehab:</Text>
          {(['all', 'yes', 'no'] as const).map((p) => (
            <Pill key={p} label={p} active={pendingRehabFilter === p} onPress={() => setPendingRehabFilter(p)} color={THEME.colors.amber} />
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, alignSelf: 'center', marginRight: 2 }}>Sort:</Text>
          {SORT_OPTIONS.map((o) => (
            <Pill key={o.value} label={o.label} active={sortBy === o.value} onPress={() => setSortBy(o.value)} />
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={THEME.colors.teal} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginBottom: 12 }}>
            {filtered.length} client{filtered.length !== 1 ? 's' : ''}
          </Text>

          <View style={{ gap: 10 }}>
            {filtered.map((c: any) => {
              const initials = c.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') ?? '?';
              const activityColor = ACTIVITY_COLORS[c.activity_status] ?? THEME.colors.textMuted;

              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => router.push({ pathname: '/(admin)/client-profile', params: { clientId: c.id, clientName: c.full_name } })}
                  activeOpacity={0.85}
                  style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${THEME.colors.teal}18`, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: `${THEME.colors.teal}30` }}>
                      <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 15 }}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 15 }}>{c.full_name}</Text>
                        {c.is_athlete === true && (
                          <View style={{ backgroundColor: '#8b78e818', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sansMedium, color: '#8b78e8' }}>🏆</Text>
                          </View>
                        )}
                        {c.has_pending_rehab_request && (
                          <View style={{ backgroundColor: `${THEME.colors.amber}18`, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>🩹</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11.5, marginTop: 2 }}>
                        Signed up {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}{c.assessment_status === 'none' ? 'No assessment' : c.assessment_status}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={{ backgroundColor: `${activityColor}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sansMedium, color: activityColor }}>
                          {c.activity_status === 'active' ? 'Active' : c.activity_status === 'never' ? 'Never' : c.activity_status === 'inactive_7_14' ? '7-14d' : '14d+'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                        {c.adherence_pct != null ? `${c.adherence_pct}% adherence` : '—'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {filtered.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>👥</Text>
                <Text style={{ fontSize: 16, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>No clients match these filters</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
