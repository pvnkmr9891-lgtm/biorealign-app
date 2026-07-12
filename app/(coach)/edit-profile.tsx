import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateProfile } from '@/hooks/useClient';
import { supabase } from '@/lib/supabase';
import {
  useCoachProfile, useUpdateCoachProfile, coachDirectoryKeys,
  CoachCertification, CoachEducation, CoachExperience, CoachAchievement, CoachSocialLinks,
} from '@/hooks/useCoachDirectory';
import { EditList, EditFieldLabel, SaveCancelBar } from '@/components/profile/ClientProfileView';
import { THEME } from '@/constants/theme';

const INPUT_STYLE = {
  backgroundColor: THEME.colors.surface3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 13.5,
  borderWidth: 0.5, borderColor: THEME.colors.border,
} as const;

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 14, letterSpacing: 0.4 }}>{icon} {title}</Text>
      {children}
    </View>
  );
}

// ── Generic repeater: add/remove cards of structured fields ──────────────
function Repeater<T>({ items, onChange, empty, addLabel, renderCard, newItem }: {
  items: T[]; onChange: (v: T[]) => void; empty: string; addLabel: string;
  renderCard: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  newItem: T;
}) {
  return (
    <View style={{ gap: 10 }}>
      {items.length === 0 && (
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, fontStyle: 'italic' }}>{empty}</Text>
      )}
      {items.map((item, idx) => (
        <View key={idx} style={{ backgroundColor: THEME.colors.surface3, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: THEME.colors.border, gap: 8 }}>
          {renderCard(item, (patch) => {
            const next = [...items];
            next[idx] = { ...next[idx], ...patch };
            onChange(next);
          })}
          <TouchableOpacity onPress={() => onChange(items.filter((_, i) => i !== idx))} style={{ alignSelf: 'flex-end' }}>
            <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: '#F87171' }}>✕ Remove</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity
        onPress={() => onChange([...items, newItem])}
        style={{ paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: `${THEME.colors.teal}15`, borderWidth: 0.5, borderColor: `${THEME.colors.teal}30` }}
      >
        <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>+ {addLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function buildDraft(coach: any) {
  return {
    tagline: coach?.tagline ?? '',
    location: coach?.location ?? '',
    years_experience: coach?.years_experience != null ? String(coach.years_experience) : '',
    specialties: Array.isArray(coach?.specialties) ? coach.specialties : [],
    bio: coach?.bio ?? '',
    coaching_philosophy: coach?.coaching_philosophy ?? '',
    social_links: (coach?.social_links ?? {}) as CoachSocialLinks,
    certifications: (coach?.certifications ?? []) as CoachCertification[],
    education: (coach?.education ?? []) as CoachEducation[],
    experience_timeline: (coach?.experience_timeline ?? []) as CoachExperience[],
    achievements: (coach?.achievements ?? []) as CoachAchievement[],
  };
}

export default function EditCoachProfileScreen() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const { data: coach, isLoading } = useCoachProfile(user?.id ?? '');
  const { mutateAsync: updateCoach, isPending: isSaving } = useUpdateCoachProfile();
  const { mutateAsync: updateAvatar } = useUpdateProfile();
  const qc = useQueryClient();

  const [draft, setDraft] = useState(() => buildDraft(coach));
  const [hydrated, setHydrated] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Hydrate the draft once the coach row has loaded (query resolves after
  // first render), without clobbering in-progress edits on refetch.
  if (!hydrated && coach) {
    setDraft(buildDraft(coach));
    setHydrated(true);
  }

  const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  const uploadAvatar = async (uri: string) => {
    if (!user?.id) return;
    setUploadingAvatar(true);
    try {
      const ext = uri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
      const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      const path = `${user.id}/avatar_${Date.now()}.${ext}`;

      const formData = new FormData();
      formData.append('file', { uri, name: `avatar.${ext}`, type: contentType } as any);

      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/avatars/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'x-upsert': 'true' },
        body: formData,
      });
      if (!uploadRes.ok) throw new Error(`Upload failed: ${await uploadRes.text()}`);

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      await updateAvatar({ data: { avatar_url: data.publicUrl } });
      qc.invalidateQueries({ queryKey: coachDirectoryKeys.list });
      qc.invalidateQueries({ queryKey: coachDirectoryKeys.detail(user.id) });
    } catch (err) {
      console.error('Coach avatar upload error:', err);
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarPress = () => {
    const options: any[] = [
      {
        text: 'Take Photo',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { Alert.alert('Permission needed', 'Please allow camera access to take a photo.'); return; }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
          if (!result.canceled) uploadAvatar(result.assets[0].uri);
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) { Alert.alert('Permission needed', 'Please allow photo access to choose a photo.'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
          if (!result.canceled) uploadAvatar(result.assets[0].uri);
        },
      },
    ];
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Profile Photo', undefined, options);
  };

  const handleSave = async () => {
    try {
      await updateCoach({
        tagline: draft.tagline.trim() || null,
        location: draft.location.trim() || null,
        years_experience: draft.years_experience ? Number(draft.years_experience) : null,
        specialties: draft.specialties,
        bio: draft.bio.trim() || null,
        coaching_philosophy: draft.coaching_philosophy.trim() || null,
        social_links: draft.social_links,
        certifications: draft.certifications,
        education: draft.education,
        experience_timeline: draft.experience_timeline,
        achievements: draft.achievements,
      });
      Alert.alert('Saved ✓', 'Your profile has been updated.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save. Please try again.');
    }
  };

  if (isLoading || !hydrated) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 24 }}>Edit My Resume</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.85} disabled={uploadingAvatar}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: `${THEME.colors.amber}20`, borderWidth: 2, borderColor: `${THEME.colors.amber}40`, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {uploadingAvatar ? (
                <ActivityIndicator color={THEME.colors.amber} />
              ) : profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <Text style={{ fontSize: 28, fontFamily: THEME.fonts.serif, color: THEME.colors.amber }}>{initials}</Text>
              )}
            </View>
            <View style={{ position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: THEME.colors.amber, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: THEME.colors.background }}>
              <Text style={{ fontSize: 11 }}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 10 }}>
            This is exactly what clients see on your public profile.
          </Text>
        </View>

        {/* Basics */}
        <SectionCard title="Basics" icon="✨">
          <View style={{ gap: 12 }}>
            <View>
              <EditFieldLabel label="Tagline" />
              <TextInput value={draft.tagline} onChangeText={(t) => setDraft((d) => ({ ...d, tagline: t }))} placeholder="e.g. Movement-first strength coach" placeholderTextColor={THEME.colors.textMuted} style={INPUT_STYLE} maxLength={100} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <EditFieldLabel label="Location" />
                <TextInput value={draft.location} onChangeText={(t) => setDraft((d) => ({ ...d, location: t }))} placeholder="City, State" placeholderTextColor={THEME.colors.textMuted} style={INPUT_STYLE} maxLength={60} />
              </View>
              <View style={{ width: 110 }}>
                <EditFieldLabel label="Years exp." />
                <TextInput value={draft.years_experience} onChangeText={(t) => setDraft((d) => ({ ...d, years_experience: t.replace(/[^0-9]/g, '').slice(0, 2) }))} keyboardType="numeric" placeholderTextColor={THEME.colors.textMuted} style={INPUT_STYLE} maxLength={2} />
              </View>
            </View>
            <View>
              <EditFieldLabel label="Core strengths / specialties" />
              <EditList value={draft.specialties} onChange={(v) => setDraft((d) => ({ ...d, specialties: v }))} color={THEME.colors.amber} />
            </View>
          </View>
        </SectionCard>

        {/* About */}
        <SectionCard title="About" icon="📝">
          <View style={{ gap: 12 }}>
            <View>
              <EditFieldLabel label="Bio" />
              <TextInput
                value={draft.bio} onChangeText={(t) => setDraft((d) => ({ ...d, bio: t }))}
                placeholder="Tell clients about yourself and your approach"
                placeholderTextColor={THEME.colors.textMuted} style={[INPUT_STYLE, { minHeight: 90, textAlignVertical: 'top' }]}
                multiline maxLength={800}
              />
            </View>
            <View>
              <EditFieldLabel label="Coaching philosophy" />
              <TextInput
                value={draft.coaching_philosophy} onChangeText={(t) => setDraft((d) => ({ ...d, coaching_philosophy: t }))}
                placeholder="Your one-line coaching belief"
                placeholderTextColor={THEME.colors.textMuted} style={[INPUT_STYLE, { minHeight: 60, textAlignVertical: 'top' }]}
                multiline maxLength={200}
              />
            </View>
          </View>
        </SectionCard>

        {/* Certifications */}
        <SectionCard title="Certifications" icon="🎓">
          <Repeater<CoachCertification>
            items={draft.certifications}
            onChange={(v) => setDraft((d) => ({ ...d, certifications: v }))}
            empty="No certifications added yet."
            addLabel="Add certification"
            newItem={{ name: '', issuer: '', year: new Date().getFullYear() }}
            renderCard={(item, update) => (
              <>
                <TextInput value={item.name} onChangeText={(t) => update({ name: t })} placeholder="Certification name" placeholderTextColor={THEME.colors.textMuted} style={INPUT_STYLE} maxLength={100} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput value={item.issuer} onChangeText={(t) => update({ issuer: t })} placeholder="Issuing body" placeholderTextColor={THEME.colors.textMuted} style={[INPUT_STYLE, { flex: 1 }]} maxLength={60} />
                  <TextInput value={String(item.year ?? '')} onChangeText={(t) => update({ year: Number(t.replace(/[^0-9]/g, '').slice(0, 4)) || 0 })} keyboardType="numeric" placeholder="Year" placeholderTextColor={THEME.colors.textMuted} style={[INPUT_STYLE, { width: 80 }]} maxLength={4} />
                </View>
              </>
            )}
          />
        </SectionCard>

        {/* Education */}
        <SectionCard title="Education" icon="📚">
          <Repeater<CoachEducation>
            items={draft.education}
            onChange={(v) => setDraft((d) => ({ ...d, education: v }))}
            empty="No education added yet."
            addLabel="Add education"
            newItem={{ degree: '', institution: '', year: new Date().getFullYear() }}
            renderCard={(item, update) => (
              <>
                <TextInput value={item.degree} onChangeText={(t) => update({ degree: t })} placeholder="Degree" placeholderTextColor={THEME.colors.textMuted} style={INPUT_STYLE} maxLength={100} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput value={item.institution} onChangeText={(t) => update({ institution: t })} placeholder="Institution" placeholderTextColor={THEME.colors.textMuted} style={[INPUT_STYLE, { flex: 1 }]} maxLength={80} />
                  <TextInput value={String(item.year ?? '')} onChangeText={(t) => update({ year: Number(t.replace(/[^0-9]/g, '').slice(0, 4)) || 0 })} keyboardType="numeric" placeholder="Year" placeholderTextColor={THEME.colors.textMuted} style={[INPUT_STYLE, { width: 80 }]} maxLength={4} />
                </View>
              </>
            )}
          />
        </SectionCard>

        {/* Experience */}
        <SectionCard title="Experience" icon="💼">
          <Repeater<CoachExperience>
            items={draft.experience_timeline}
            onChange={(v) => setDraft((d) => ({ ...d, experience_timeline: v }))}
            empty="No experience added yet."
            addLabel="Add experience"
            newItem={{ role: '', organization: '', start_year: new Date().getFullYear(), end_year: null, description: '' }}
            renderCard={(item, update) => (
              <>
                <TextInput value={item.role} onChangeText={(t) => update({ role: t })} placeholder="Role / title" placeholderTextColor={THEME.colors.textMuted} style={INPUT_STYLE} maxLength={80} />
                <TextInput value={item.organization} onChangeText={(t) => update({ organization: t })} placeholder="Organization" placeholderTextColor={THEME.colors.textMuted} style={INPUT_STYLE} maxLength={80} />
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput value={String(item.start_year ?? '')} onChangeText={(t) => update({ start_year: Number(t.replace(/[^0-9]/g, '').slice(0, 4)) || 0 })} keyboardType="numeric" placeholder="Start yr" placeholderTextColor={THEME.colors.textMuted} style={[INPUT_STYLE, { width: 90 }]} maxLength={4} />
                  <Text style={{ color: THEME.colors.textMuted }}>–</Text>
                  <TextInput value={item.end_year != null ? String(item.end_year) : ''} onChangeText={(t) => update({ end_year: t ? Number(t.replace(/[^0-9]/g, '').slice(0, 4)) || null : null })} keyboardType="numeric" placeholder="End yr (blank = present)" placeholderTextColor={THEME.colors.textMuted} style={[INPUT_STYLE, { flex: 1 }]} maxLength={4} />
                </View>
                <TextInput value={item.description} onChangeText={(t) => update({ description: t })} placeholder="Brief description" placeholderTextColor={THEME.colors.textMuted} style={[INPUT_STYLE, { minHeight: 50, textAlignVertical: 'top' }]} multiline maxLength={300} />
              </>
            )}
          />
        </SectionCard>

        {/* Achievements */}
        <SectionCard title="Achievements & Recognition" icon="🏅">
          <Repeater<CoachAchievement>
            items={draft.achievements}
            onChange={(v) => setDraft((d) => ({ ...d, achievements: v }))}
            empty="No achievements added yet."
            addLabel="Add achievement"
            newItem={{ icon: '🏅', title: '', year: new Date().getFullYear(), description: '' }}
            renderCard={(item, update) => (
              <>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput value={item.icon} onChangeText={(t) => update({ icon: t.slice(0, 2) })} placeholder="🏅" placeholderTextColor={THEME.colors.textMuted} style={[INPUT_STYLE, { width: 56, textAlign: 'center' }]} maxLength={2} />
                  <TextInput value={item.title} onChangeText={(t) => update({ title: t })} placeholder="Title" placeholderTextColor={THEME.colors.textMuted} style={[INPUT_STYLE, { flex: 1 }]} maxLength={80} />
                  <TextInput value={item.year != null ? String(item.year) : ''} onChangeText={(t) => update({ year: t ? Number(t.replace(/[^0-9]/g, '').slice(0, 4)) || null : null })} keyboardType="numeric" placeholder="Year" placeholderTextColor={THEME.colors.textMuted} style={[INPUT_STYLE, { width: 70 }]} maxLength={4} />
                </View>
                <TextInput value={item.description} onChangeText={(t) => update({ description: t })} placeholder="Brief description" placeholderTextColor={THEME.colors.textMuted} style={[INPUT_STYLE, { minHeight: 50, textAlignVertical: 'top' }]} multiline maxLength={200} />
              </>
            )}
          />
        </SectionCard>

        {/* Social links */}
        <SectionCard title="Social links" icon="🔗">
          <View style={{ gap: 10 }}>
            {([
              { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
              { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/...' },
              { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@...' },
              { key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/...' },
              { key: 'website', label: 'Website', placeholder: 'https://...' },
            ] as const).map((s) => (
              <View key={s.key}>
                <EditFieldLabel label={s.label} />
                <TextInput
                  value={draft.social_links[s.key] ?? ''}
                  onChangeText={(t) => setDraft((d) => ({ ...d, social_links: { ...d.social_links, [s.key]: t || undefined } }))}
                  placeholder={s.placeholder} placeholderTextColor={THEME.colors.textMuted}
                  style={INPUT_STYLE} autoCapitalize="none" keyboardType="url" maxLength={200}
                />
              </View>
            ))}
          </View>
        </SectionCard>

        <View style={{ marginHorizontal: 24 }}>
          <SaveCancelBar onCancel={() => router.back()} onSave={handleSave} saving={isSaving} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
