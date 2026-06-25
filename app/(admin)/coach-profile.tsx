import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAdminCoachDetail } from '@/hooks/useAdmin';
import { useUpdateProfile } from '@/hooks/useClient';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { THEME } from '@/constants/theme';

export default function AdminCoachProfileScreen() {
  const router = useRouter();
  const { coachId, coachName } = useLocalSearchParams<{ coachId: string; coachName: string }>();
  const { data, isLoading, refetch } = useAdminCoachDetail(coachId);
  const { mutateAsync: updateProfile } = useUpdateProfile();
  const [editVisible, setEditVisible] = useState(false);

  const coach = data?.coach;
  const clients = data?.clients ?? [];

  const handleSave = async (fields: { full_name: string; phone: string }) => {
    try {
      await updateProfile({ targetUserId: coachId, data: fields });
      refetch();
    } catch {
      Alert.alert('Error', 'Failed to save coach profile. Please try again.');
    }
  };

  const initials = coach?.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') ?? coachName?.[0] ?? '?';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${THEME.colors.amber}20`, borderWidth: 1, borderColor: `${THEME.colors.amber}30`, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>{coach?.full_name ?? coachName}</Text>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 1 }}>Coach</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Account Info</Text>
              <TouchableOpacity onPress={() => setEditVisible(true)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: `${THEME.colors.teal}18` }}>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Edit</Text>
              </TouchableOpacity>
            </View>
            {[
              { label: 'Name', value: coach?.full_name },
              { label: 'Phone', value: coach?.phone },
              { label: 'Member since', value: coach?.created_at ? new Date(coach.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null },
            ].map((row) => (
              <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, flex: 1 }}>{row.label}</Text>
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, textAlign: 'right', flex: 1 }}>{row.value ?? '—'}</Text>
              </View>
            ))}
          </View>

          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 10 }}>
            ASSIGNED CLIENTS ({clients.length})
          </Text>

          {clients.length === 0 ? (
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', marginTop: 12 }}>
              No clients assigned to this coach yet.
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {clients.map((c: any) => {
                const clientInitials = c.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') ?? '?';
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => router.push({ pathname: '/(admin)/client-profile', params: { clientId: c.id, clientName: c.full_name } })}
                    activeOpacity={0.85}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}
                  >
                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: `${THEME.colors.teal}18`, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: `${THEME.colors.teal}30` }}>
                      <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>{clientInitials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{c.full_name}</Text>
                      {c.phone && <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 1 }}>{c.phone}</Text>}
                    </View>
                    <Text style={{ fontSize: 16, color: THEME.colors.textMuted }}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      <EditProfileModal profile={coach} visible={editVisible} onClose={() => setEditVisible(false)} onSave={handleSave} />
    </SafeAreaView>
  );
}
