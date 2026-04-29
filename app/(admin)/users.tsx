import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAdminUsers, useUpdateUserRole } from '@/hooks/useAdmin';
import { THEME } from '@/constants/theme';

const ROLES = ['client', 'coach', 'admin'];

const ROLE_COLORS: Record<string, string> = {
  client: THEME.colors.teal,
  coach:  THEME.colors.amber,
  admin:  '#8b78e8',
};

export default function UsersScreen() {
  const router = useRouter();
  const { data: users = [], isLoading, refetch } = useAdminUsers();
  const { mutateAsync: updateRole } = useUpdateUserRole();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'client' | 'coach' | 'admin'>('all');

  const filtered = users.filter((u: any) => {
    const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || u.role === filter;
    return matchSearch && matchFilter;
  });

  const handleRoleChange = (userId: string, currentRole: string, name: string) => {
    Alert.alert(
      'Change role',
      `Update ${name}'s role:`,
      [
        ...ROLES.filter((r) => r !== currentRole).map((r) => ({
          text: r.charAt(0).toUpperCase() + r.slice(1),
          onPress: async () => {
            await updateRole({ userId, role: r });
            refetch();
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

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
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 28 }}>Users</Text>
        </View>

        <TextInput
          style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 0.5, borderColor: THEME.colors.border, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, marginBottom: 12 }}
          placeholder="Search by name..."
          placeholderTextColor={THEME.colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />

        {/* Role filter pills */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['all', 'client', 'coach', 'admin'] as const).map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setFilter(r)}
              style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: filter === r ? THEME.colors.textPrimary : THEME.colors.surface2, borderWidth: 0.5, borderColor: filter === r ? THEME.colors.textPrimary : THEME.colors.border }}
            >
              <Text style={{ color: filter === r ? THEME.colors.background : THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 12, textTransform: 'capitalize' }}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={THEME.colors.teal} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginBottom: 12 }}>
            {filtered.length} user{filtered.length !== 1 ? 's' : ''}
          </Text>

          <View style={{ gap: 10 }}>
            {filtered.map((u: any) => {
              const roleColor    = ROLE_COLORS[u.role] ?? THEME.colors.teal;
              const activeEnroll = u.enrollments?.find((e: any) => e.status === 'active');
              const initials     = u.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') ?? '?';

              return (
                <View
                  key={u.id}
                  style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${roleColor}18`, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: `${roleColor}30` }}>
                      <Text style={{ color: roleColor, fontFamily: THEME.fonts.sansMedium, fontSize: 15 }}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 15 }}>
                        {u.full_name}
                      </Text>
                      {activeEnroll && (
                        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>
                          {activeEnroll.program?.name} · Wk {activeEnroll.current_week}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRoleChange(u.id, u.role, u.full_name)}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: `${roleColor}18`, borderWidth: 0.5, borderColor: `${roleColor}40` }}
                    >
                      <Text style={{ color: roleColor, fontFamily: THEME.fonts.sansMedium, fontSize: 12, textTransform: 'capitalize' }}>
                        {u.role}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {u.phone && (
                    <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: THEME.colors.border }}>
                      📱 {u.phone}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
