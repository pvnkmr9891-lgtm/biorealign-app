import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCoachClients } from '@/hooks/useCoach';
import { THEME } from '@/constants/theme';

export default function ClientsScreen() {
  const router = useRouter();
  const { data: clients = [], isLoading } = useCoachClients();
  const [search, setSearch] = useState('');

  const filtered = clients.filter((e: any) =>
    e.client?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.program?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 }}>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 32, marginBottom: 16 }}>
          Clients
        </Text>
        <TextInput
          style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 0.5, borderColor: THEME.colors.border, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14 }}
          placeholder="Search clients or programs..."
          placeholderTextColor={THEME.colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={THEME.colors.amber} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginBottom: 12 }}>
            {filtered.length} active client{filtered.length !== 1 ? 's' : ''}
          </Text>

          {filtered.length === 0 ? (
            <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
              <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 14 }}>
                {search ? 'No results found' : 'No active clients yet'}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {filtered.map((e: any) => {
                const programColor = THEME.programColors[e.program?.slug] ?? THEME.colors.teal;
                const progress = Math.round((e.current_week / (e.program?.duration_weeks ?? 1)) * 100);

                return (
                  <TouchableOpacity
                    key={e.id}
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/(coach)/client-detail', params: { enrollmentId: e.id, clientId: e.client?.id, clientName: e.client?.full_name } })}
                    style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${programColor}20`, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: `${programColor}30` }}>
                        <Text style={{ color: programColor, fontFamily: THEME.fonts.sansMedium, fontSize: 15 }}>
                          {e.client?.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 15 }}>
                          {e.client?.full_name}
                        </Text>
                        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>
                          {e.program?.name}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: programColor, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>
                          Wk {e.current_week}/{e.program?.duration_weeks}
                        </Text>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.colors.success, marginTop: 4 }} />
                      </View>
                    </View>

                    {/* Progress bar */}
                    <View style={{ height: 3, backgroundColor: THEME.colors.surface3, borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${progress}%`, backgroundColor: programColor, borderRadius: 2 }} />
                    </View>
                    <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11, marginTop: 6 }}>
                      {progress}% complete
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
