import { View, Text, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useCoachProfile } from '@/hooks/useCoachDirectory';
import { CoachProfileView } from '@/components/coach/CoachProfileView';
import { THEME } from '@/constants/theme';

export default function CoachProfile() {
  const router = useRouter();
  const { profile, user, signOut } = useAuth();
  const { data: coach, isLoading: coachLoading } = useCoachProfile(user?.id ?? '');

  const handleSignOut = () => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('') ?? 'C';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
          >
            <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 26 }}>
            My Profile
          </Text>
        </View>

        {/* Avatar + name */}
        <View style={{ alignItems: 'center', paddingVertical: 24, marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 24 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: `${THEME.colors.amber}20`, borderWidth: 2, borderColor: `${THEME.colors.amber}50`, alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden' }}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Text style={{ fontSize: 28, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>
                {initials}
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 22, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginBottom: 4 }}>
            {profile?.full_name}
          </Text>
          <View style={{ backgroundColor: `${THEME.colors.amber}20`, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 0.5, borderColor: `${THEME.colors.amber}40` }}>
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber, textTransform: 'uppercase', letterSpacing: 1 }}>
              Coach
            </Text>
          </View>
        </View>

        {/* Edit resume link */}
        <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => router.push('/(coach)/edit-profile' as any)}
            activeOpacity={0.85}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: `${THEME.colors.amber}12`, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: `${THEME.colors.amber}30` }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 18 }}>✏️</Text>
              <View>
                <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Edit my resume / portfolio</Text>
                <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 1 }}>
                  Bio, certifications, education, experience & more
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 16, color: THEME.colors.amber }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Info rows */}
        <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 24, overflow: 'hidden' }}>
          {[
            { label: 'Email', value: user?.email ?? '—' },
            { label: 'Phone', value: profile?.phone ?? '—' },
            { label: 'Member since', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
          ].map((row, i, arr) => (
            <View
              key={row.label}
              style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: THEME.colors.border }}
            >
              <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>
                {row.label}
              </Text>
              <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Resume / portfolio — exactly what clients see on your public
            profile, updates live as you save edits above */}
        <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
            My resume — as clients see it
          </Text>
          {coachLoading ? (
            <ActivityIndicator color={THEME.colors.amber} style={{ marginTop: 20 }} />
          ) : coach ? (
            <CoachProfileView coach={coach} showHeader={false} />
          ) : null}
        </View>

        {/* Sign out */}
        <View style={{ marginHorizontal: 24 }}>
          <TouchableOpacity
            onPress={handleSignOut}
            activeOpacity={0.85}
            style={{ backgroundColor: '#F8717120', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F8717140' }}
          >
            <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: '#F87171' }}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
