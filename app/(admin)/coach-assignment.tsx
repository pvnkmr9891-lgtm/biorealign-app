import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAdminClients, useAdminCoaches, useAssignCoach } from '@/hooks/useAdmin';
import { THEME } from '@/constants/theme';

const PLAN_STATUS_COLOR: Record<string, string> = {
  active:    '#00C4B4',
  draft:     '#E8A44A',
  completed: '#34D399',
};

const PLAN_STATUS_LABEL: Record<string, string> = {
  active:    '✓ Plan active',
  draft:     '⏳ Plan draft',
  completed: '✅ Completed',
};

export default function CoachAssignmentScreen() {
  const router = useRouter();
  const { data: clients = [], isLoading: clientsLoading } = useAdminClients();
  const { data: coaches = [], isLoading: coachesLoading } = useAdminCoaches();
  const assignCoach = useAssignCoach();

  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showCoachPicker, setShowCoachPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'clients' | 'coaches'>('clients');

  const handleAssign = (client: any) => {
    setSelectedClient(client);
    setShowCoachPicker(true);
  };

  const confirmAssign = (coachId: string | null, coachName: string | null) => {
    if (!selectedClient) return;

    const message = coachId
      ? `Assign ${selectedClient.full_name} to ${coachName}?`
      : `Remove coach assignment from ${selectedClient.full_name}?`;

    Alert.alert('Confirm assignment', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          await assignCoach.mutateAsync({
            clientId: selectedClient.id,
            coachId,
          });
          setShowCoachPicker(false);
          setSelectedClient(null);
        },
      },
    ]);
  };

  const unassignedClients = clients.filter((c: any) => !c.assigned_coach_id);
  const assignedClients   = clients.filter((c: any) => c.assigned_coach_id);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>

      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 26 }}>Coach Assignment</Text>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13, marginTop: 2 }}>
            {unassignedClients.length} unassigned · {assignedClients.length} assigned
          </Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={{ flexDirection: 'row', marginHorizontal: 24, marginBottom: 20, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 4, borderWidth: 0.5, borderColor: THEME.colors.border }}>
        {[
          { key: 'clients', label: 'Clients' },
          { key: 'coaches', label: 'Coach Workload' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: activeTab === tab.key ? THEME.colors.teal : 'transparent' }}
          >
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: activeTab === tab.key ? THEME.colors.background : THEME.colors.textMuted }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {clientsLoading || coachesLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />
      ) : activeTab === 'clients' ? (

        // ── Clients tab ──────────────────────────────────────────────────────
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {/* Unassigned alert */}
          {unassignedClients.length > 0 && (
            <View style={{ backgroundColor: `${THEME.colors.amber}15`, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: `${THEME.colors.amber}30`, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 18 }}>⚠️</Text>
              <Text style={{ flex: 1, fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>
                {unassignedClients.length} client{unassignedClients.length > 1 ? 's' : ''} without a coach
              </Text>
            </View>
          )}

          {/* Unassigned clients */}
          {unassignedClients.length > 0 && (
            <>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>
                Needs Assignment
              </Text>
              <View style={{ gap: 10, marginBottom: 24 }}>
                {unassignedClients.map((client: any) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    onAssign={() => handleAssign(client)}
                    urgent
                  />
                ))}
              </View>
            </>
          )}

          {/* Assigned clients */}
          {assignedClients.length > 0 && (
            <>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>
                Assigned
              </Text>
              <View style={{ gap: 10 }}>
                {assignedClients.map((client: any) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    onAssign={() => handleAssign(client)}
                  />
                ))}
              </View>
            </>
          )}
        </ScrollView>

      ) : (

        // ── Coach workload tab ────────────────────────────────────────────────
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 14 }}>
            {coaches.map((coach: any) => {
              const coachClients = clients.filter((c: any) => c.assigned_coach_id === coach.id);
              const withPlan  = coachClients.filter((c: any) => c.plan_status === 'active').length;
              const withoutPlan = coachClients.length - withPlan;
              const loadColor = coach.clientCount >= 8 ? '#F87171' : coach.clientCount >= 5 ? THEME.colors.amber : '#34D399';

              return (
                <View key={coach.id} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                  {/* Coach header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${THEME.colors.amber}20`, borderWidth: 1, borderColor: `${THEME.colors.amber}40`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>
                        {coach.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{coach.full_name}</Text>
                      <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>Coach</Text>
                    </View>
                    <View style={{ backgroundColor: `${loadColor}20`, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: `${loadColor}40` }}>
                      <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: loadColor }}>
                        {coach.clientCount} clients
                      </Text>
                    </View>
                  </View>

                  {/* Load bar */}
                  <View style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Client load (max 10 recommended)</Text>
                      <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: loadColor }}>{coach.clientCount}/10</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: '#1A1A1E', borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${Math.min((coach.clientCount / 10) * 100, 100)}%`, backgroundColor: loadColor, borderRadius: 3 }} />
                    </View>
                  </View>

                  {/* Stats row */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1, backgroundColor: '#1A1A1E', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                      <Text style={{ fontSize: 18, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>{withPlan}</Text>
                      <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>With active plan</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#1A1A1E', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                      <Text style={{ fontSize: 18, fontFamily: THEME.fonts.sansMedium, color: withoutPlan > 0 ? THEME.colors.amber : THEME.colors.textMuted }}>{withoutPlan}</Text>
                      <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>Need plan</Text>
                    </View>
                  </View>

                  {/* Client list */}
                  {coachClients.length > 0 && (
                    <View style={{ marginTop: 14, gap: 6 }}>
                      {coachClients.map((c: any) => (
                        <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1E', borderRadius: 8, padding: 10 }}>
                          <Text style={{ flex: 1, fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{c.full_name}</Text>
                          {c.plan_status && (
                            <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: PLAN_STATUS_COLOR[c.plan_status] ?? THEME.colors.textMuted }}>
                              {PLAN_STATUS_LABEL[c.plan_status] ?? c.plan_status}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}

            {coaches.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>👥</Text>
                <Text style={{ fontSize: 16, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center' }}>
                  No coaches yet
                </Text>
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', marginTop: 8 }}>
                  Go to User Management and change a user's role to "coach"
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Coach picker modal */}
      <Modal visible={showCoachPicker} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: THEME.colors.surface2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '70%' }}>
            <Text style={{ fontSize: 18, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginBottom: 6 }}>
              Assign coach
            </Text>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 20 }}>
              Select a coach for {selectedClient?.full_name}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Remove assignment option */}
              <TouchableOpacity
                onPress={() => confirmAssign(null, null)}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#F8717140', backgroundColor: '#F8717110', marginBottom: 12 }}
              >
                <Text style={{ fontSize: 16, marginRight: 12 }}>✕</Text>
                <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: '#F87171' }}>Remove coach assignment</Text>
              </TouchableOpacity>

              <View style={{ gap: 10 }}>
                {coaches.map((coach: any) => {
                  const isCurrentCoach = selectedClient?.assigned_coach_id === coach.id;
                  const loadColor = coach.clientCount >= 8 ? '#F87171' : coach.clientCount >= 5 ? THEME.colors.amber : '#34D399';

                  return (
                    <TouchableOpacity
                      key={coach.id}
                      onPress={() => confirmAssign(coach.id, coach.full_name)}
                      style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: isCurrentCoach ? THEME.colors.teal : THEME.colors.border, backgroundColor: isCurrentCoach ? `${THEME.colors.teal}10` : '#1A1A1E' }}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${THEME.colors.amber}20`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>
                          {coach.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: isCurrentCoach ? THEME.colors.teal : THEME.colors.textPrimary }}>
                          {coach.full_name} {isCurrentCoach ? '(current)' : ''}
                        </Text>
                        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
                          {coach.clientCount} client{coach.clientCount !== 1 ? 's' : ''} assigned
                        </Text>
                      </View>
                      <View style={{ backgroundColor: `${loadColor}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: loadColor }}>
                          {coach.clientCount >= 8 ? 'Full' : coach.clientCount >= 5 ? 'Busy' : 'Available'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => { setShowCoachPicker(false); setSelectedClient(null); }}
              style={{ marginTop: 16, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Client card component ─────────────────────────────────────────────────────
function ClientCard({ client, onAssign, urgent = false }: {
  client: any; onAssign: () => void; urgent?: boolean;
}) {
  const initials = client.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') ?? '?';

  return (
    <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: urgent ? 1 : 0.5, borderColor: urgent ? `${THEME.colors.amber}50` : THEME.colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: urgent ? `${THEME.colors.amber}20` : `${THEME.colors.teal}20`, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: urgent ? `${THEME.colors.amber}40` : `${THEME.colors.teal}30`, marginRight: 12 }}>
          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: urgent ? THEME.colors.amber : THEME.colors.teal }}>{initials}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{client.full_name}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            {client.coach_name && (
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.teal }}>
                👤 {client.coach_name}
              </Text>
            )}
            {!client.coach_name && (
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.amber }}>
                No coach assigned
              </Text>
            )}
            {client.plan_status && (
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: PLAN_STATUS_COLOR[client.plan_status] ?? THEME.colors.textMuted }}>
                · {PLAN_STATUS_LABEL[client.plan_status] ?? client.plan_status}
              </Text>
            )}
            {client.active_enrollment && (
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                · {client.active_enrollment.program?.name}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={onAssign}
          style={{ backgroundColor: urgent ? THEME.colors.amber : THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: urgent ? THEME.colors.amber : THEME.colors.border, marginLeft: 8 }}
        >
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: urgent ? THEME.colors.background : THEME.colors.textSecondary }}>
            {client.coach_name ? 'Change' : 'Assign'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
