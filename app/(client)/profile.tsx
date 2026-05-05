import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useClientAssessment } from '@/hooks/useClientAssessment';
import { useClientEnrollments } from '@/hooks/usePrograms';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { THEME } from '@/constants/theme';

// ── Edit Profile Modal ────────────────────────────────────────────────────────
function EditProfileModal({ profile, visible, onClose, onSave }: {
  profile: any; visible: boolean; onClose: () => void;
  onSave: (data: { full_name: string; phone: string }) => void;
}) {
  const [name, setName]   = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(profile?.full_name ?? '');
      setPhone(profile?.phone ?? '');
    }
  }, [visible, profile]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Name cannot be empty.'); return; }
    setSaving(true);
    await onSave({ full_name: name.trim(), phone: phone.trim() });
    setSaving(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 22, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>Edit Profile</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Full Name</Text>
          <TextInput
            style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 20 }}
            value={name} onChangeText={setName} placeholder="Your full name"
            placeholderTextColor={THEME.colors.textMuted}
          />

          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Phone Number</Text>
          <TextInput
            style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 32 }}
            value={phone} onChangeText={setPhone} placeholder="+91 98765 43210"
            placeholderTextColor={THEME.colors.textMuted} keyboardType="phone-pad"
          />

          <TouchableOpacity
            onPress={handleSave} disabled={saving}
            style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
          >
            {saving ? <ActivityIndicator color={THEME.colors.background} /> : (
              <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Save changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Assessment Summary Card ───────────────────────────────────────────────────
function AssessmentSummaryCard({ clientId }: { clientId: string }) {
  const { data: assessment, isLoading } = useClientAssessment(clientId);

  if (isLoading) return <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 12 }} />;

  if (!assessment) {
    return (
      <View style={{ backgroundColor: `${THEME.colors.amber}10`, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: `${THEME.colors.amber}25` }}>
        <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber, marginBottom: 4 }}>
          📋 Assessment not submitted
        </Text>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 20 }}>
          Complete your onboarding assessment so your coach can build a personalised plan for you.
        </Text>
      </View>
    );
  }

  const energyAvg = Math.round(
    ((assessment.energy_morning ?? 0) + (assessment.energy_afternoon ?? 0) + (assessment.energy_evening ?? 0)) / 3
  );

  return (
    <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Assessment Summary</Text>
        <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
          {new Date(assessment.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>

      {/* Quick stats */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Energy', value: `${energyAvg}/10`, color: energyAvg >= 7 ? '#34D399' : energyAvg >= 5 ? THEME.colors.amber : '#F87171' },
          { label: 'Sleep', value: `${assessment.sleep_hours_avg ?? '?'}h`, color: THEME.colors.teal },
          { label: 'Stress', value: `${assessment.stress_level ?? '?'}/10`, color: (assessment.stress_level ?? 0) >= 7 ? '#F87171' : THEME.colors.amber },
        ].map(s => (
          <View key={s.label} style={{ flex: 1, backgroundColor: '#1A1A1E', borderRadius: 10, padding: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: s.color }}>{s.value}</Text>
            <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Primary goal */}
      {assessment.primary_goal && (
        <View style={{ backgroundColor: `${THEME.colors.teal}10`, borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 0.5, borderColor: `${THEME.colors.teal}20` }}>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, marginBottom: 4 }}>Primary Goal</Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, textTransform: 'capitalize' }}>
            {assessment.primary_goal?.replace(/_/g, ' ')}
          </Text>
        </View>
      )}

      {/* Complaints tags */}
      {assessment.complaints?.length > 0 && (
        <View>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 6 }}>Reported complaints</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {assessment.complaints.map((c: string) => (
              <View key={c} style={{ backgroundColor: '#F8717115', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 0.5, borderColor: '#F8717130' }}>
                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: '#F87171', textTransform: 'capitalize' }}>{c.replace(/_/g, ' ')}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ── Enrollment Card ───────────────────────────────────────────────────────────
function EnrollmentCard() {
  const { data: enrollments = [] } = useClientEnrollments();

  if (!enrollments.length) {
    return (
      <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
        <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, textAlign: 'center' }}>
          Not enrolled in any program yet
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {(enrollments as any[]).map((enroll: any) => (
        <View key={enroll.id} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, flex: 1 }}>
              {enroll.program?.name}
            </Text>
            <View style={{ backgroundColor: `${THEME.colors.teal}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Active</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Current week</Text>
              <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginTop: 2 }}>
                {enroll.current_week} / {enroll.program?.duration_weeks}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Started</Text>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary, marginTop: 2 }}>
                {new Date(enroll.started_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          </View>
          {/* Progress bar */}
          <View style={{ marginTop: 12 }}>
            <View style={{ height: 4, backgroundColor: '#1A1A1E', borderRadius: 2, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${Math.round((enroll.current_week / (enroll.program?.duration_weeks ?? 1)) * 100)}%`, backgroundColor: THEME.colors.teal, borderRadius: 2 }} />
            </View>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 4 }}>
              {Math.round((enroll.current_week / (enroll.program?.duration_weeks ?? 1)) * 100)}% complete
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Main Profile Screen ───────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { profile, signOut, user } = useAuth();
  const qc = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'assessment' | 'enrollments'>('overview');

  const initials = profile?.full_name
    ?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  const handleSaveProfile = async (data: { full_name: string; phone: string }) => {
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user!.id);

    if (error) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
      return;
    }

    qc.invalidateQueries({ queryKey: ['profile'] });
    Alert.alert('Saved ✓', 'Your profile has been updated.');
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '—';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 24, paddingHorizontal: 24 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: `${THEME.colors.teal}20`, borderWidth: 2, borderColor: `${THEME.colors.teal}40`, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 30, fontFamily: THEME.fonts.serif, color: THEME.colors.teal }}>{initials}</Text>
          </View>
          <Text style={{ fontSize: 24, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginBottom: 4 }}>
            {profile?.full_name}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 16 }}>
            Member since {memberSince}
          </Text>
          <TouchableOpacity
            onPress={() => setShowEdit(true)}
            style={{ backgroundColor: THEME.colors.surface2, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary }}>✏️ Edit profile</Text>
          </TouchableOpacity>
        </View>

        {/* Info row */}
        <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 24, overflow: 'hidden' }}>
          {[
            { label: 'Phone', value: profile?.phone ?? '—' },
            { label: 'Role', value: profile?.role ?? '—' },
            { label: 'Member since', value: memberSince },
          ].map((row, i, arr) => (
            <View key={row.label} style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: THEME.colors.border }}>
              <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>{row.label}</Text>
              <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary, textTransform: 'capitalize' }}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Section tabs */}
        <View style={{ flexDirection: 'row', marginHorizontal: 24, marginBottom: 20, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 4, borderWidth: 0.5, borderColor: THEME.colors.border }}>
          {[
            { key: 'overview',    label: 'Overview' },
            { key: 'assessment',  label: 'Assessment' },
            { key: 'enrollments', label: 'Programs' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveSection(tab.key as any)}
              style={{ flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10, backgroundColor: activeSection === tab.key ? THEME.colors.teal : 'transparent' }}
            >
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: activeSection === tab.key ? THEME.colors.background : THEME.colors.textMuted }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        <View style={{ paddingHorizontal: 24 }}>

          {/* Overview tab */}
          {activeSection === 'overview' && (
            <View style={{ gap: 12 }}>
              {/* Quick info cards */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[
                  { label: 'Fitness', value: '—', color: THEME.scoreColors?.fitness ?? THEME.colors.teal },
                  { label: 'Recovery', value: '—', color: THEME.scoreColors?.recovery ?? '#60A5FA' },
                  { label: 'Longevity', value: '—', color: THEME.scoreColors?.longevity ?? THEME.colors.amber },
                ].map(s => (
                  <View key={s.label} style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
                    <Text style={{ fontSize: 20, fontFamily: THEME.fonts.sansMedium, color: s.color }}>{s.value}</Text>
                    <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {/* Support links */}
              <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, borderWidth: 0.5, borderColor: THEME.colors.border, overflow: 'hidden' }}>
                {[
                  { label: '📋 My Assessment', action: () => setActiveSection('assessment') },
                  { label: '🎯 My Programs', action: () => setActiveSection('enrollments') },
                  { label: '🔒 Privacy Policy', action: () => {} },
                  { label: '💬 Support', action: () => {} },
                ].map((item, i, arr) => (
                  <TouchableOpacity
                    key={item.label}
                    onPress={item.action}
                    activeOpacity={0.7}
                    style={{ paddingHorizontal: 16, paddingVertical: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: i > 0 ? 0.5 : 0, borderTopColor: THEME.colors.border }}
                  >
                    <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}>{item.label}</Text>
                    <Text style={{ color: THEME.colors.textMuted, fontSize: 16 }}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Assessment tab */}
          {activeSection === 'assessment' && user?.id && (
            <AssessmentSummaryCard clientId={user.id} />
          )}

          {/* Enrollments tab */}
          {activeSection === 'enrollments' && (
            <EnrollmentCard />
          )}
        </View>

        {/* Sign out */}
        <View style={{ paddingHorizontal: 24, marginTop: 32 }}>
          <TouchableOpacity
            onPress={handleSignOut}
            activeOpacity={0.85}
            style={{ backgroundColor: '#F8717115', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F8717130' }}
          >
            <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: '#F87171' }}>Sign Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Edit modal */}
      <EditProfileModal
        profile={profile}
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        onSave={handleSaveProfile}
      />
    </SafeAreaView>
  );
}
