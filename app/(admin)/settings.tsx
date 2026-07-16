import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Switch, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  useAdminRehabPackages, useAdminAddRehabPackage, useAdminUpdateRehabPackage,
} from '@/hooks/useAdmin';
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP_DISPLAY } from '@/constants/contact';
import { SUPPLEMENT_ITEMS } from '@/constants/supplementItems';
import { useSupplementCatalogImages, useUploadSupplementCatalogImage, useDeleteSupplementCatalogImage } from '@/hooks/useSupplementCatalogImages';
import { THEME } from '@/constants/theme';
import { clampToRange } from '@/utils/validation';

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 18 }}>
      <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: subtitle ? 2 : 12 }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 12 }}>{subtitle}</Text>}
      {children}
    </View>
  );
}

function ContactInfoSection() {
  return (
    <SectionCard title="Contact info" subtitle="Read-only for now — edit in code (src/constants/contact.ts)">
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Support email</Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{SUPPORT_EMAIL}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>WhatsApp</Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{SUPPORT_WHATSAPP_DISPLAY}</Text>
        </View>
      </View>
    </SectionCard>
  );
}

function RehabPackagesSection() {
  const { data: packages = [], isLoading } = useAdminRehabPackages();
  const { mutateAsync: addPackage, isPending: adding } = useAdminAddRehabPackage();
  const { mutateAsync: updatePackage } = useAdminUpdateRehabPackage();
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ key: '', label: '', sessions_per_term: '' });

  const handleAdd = async () => {
    if (!draft.key.trim() || !draft.label.trim() || !Number(draft.sessions_per_term)) {
      Alert.alert('Missing fields', 'Key, label, and sessions per term are all required.');
      return;
    }
    try {
      await addPackage({
        key: draft.key.trim(),
        label: draft.label.trim(),
        sessions_per_term: clampToRange(Number(draft.sessions_per_term), { min: 1, max: 365 }),
        display_order: packages.length,
      });
      setDraft({ key: '', label: '', sessions_per_term: '' });
      setShowAdd(false);
    } catch (e: any) {
      Alert.alert('Failed to add package', e?.message ?? 'Please try again.');
    }
  };

  return (
    <SectionCard title="Rehab package types" subtitle="Shown to clients when requesting a Recovery session">
      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} />
      ) : (
        <View style={{ gap: 10 }}>
          {packages.map((p: any) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.colors.surface3, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: THEME.colors.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{p.label}</Text>
                <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{p.sessions_per_term} sessions / term</Text>
              </View>
              <Switch
                value={p.active}
                onValueChange={(v) => updatePackage({ id: p.id, active: v })}
                trackColor={{ true: THEME.colors.teal, false: THEME.colors.border }}
              />
            </View>
          ))}

          {showAdd ? (
            <View style={{ gap: 8, marginTop: 4 }}>
              <TextInput
                value={draft.key}
                onChangeText={(v) => setDraft((d) => ({ ...d, key: v }))}
                placeholder="key (e.g. fortnightly)"
                placeholderTextColor={THEME.colors.textMuted}
                style={{ backgroundColor: THEME.colors.surface3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 13, borderWidth: 0.5, borderColor: THEME.colors.border }}
              />
              <TextInput
                value={draft.label}
                onChangeText={(v) => setDraft((d) => ({ ...d, label: v }))}
                placeholder="Display label"
                placeholderTextColor={THEME.colors.textMuted}
                style={{ backgroundColor: THEME.colors.surface3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 13, borderWidth: 0.5, borderColor: THEME.colors.border }}
              />
              <TextInput
                value={draft.sessions_per_term}
                onChangeText={(v) => setDraft((d) => ({ ...d, sessions_per_term: v.replace(/[^0-9]/g, '') }))}
                placeholder="Sessions per term"
                placeholderTextColor={THEME.colors.textMuted}
                keyboardType="numeric"
                maxLength={3}
                style={{ backgroundColor: THEME.colors.surface3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 13, borderWidth: 0.5, borderColor: THEME.colors.border }}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={handleAdd} disabled={adding} style={{ flex: 1, backgroundColor: THEME.colors.teal, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowAdd(false)} style={{ flex: 1, backgroundColor: THEME.colors.surface3, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
                  <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setShowAdd(true)} style={{ marginTop: 4, paddingVertical: 10, alignItems: 'center', borderRadius: 10, borderWidth: 0.5, borderColor: THEME.colors.border, borderStyle: 'dashed' }}>
              <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>+ Add package type</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SectionCard>
  );
}

function SupplementImageRow({ supplementId, name, defaultQuantity, imageUrl }: { supplementId: string; name: string; defaultQuantity: string; imageUrl?: string }) {
  const { mutateAsync: upload, isPending: uploading } = useUploadSupplementCatalogImage();
  const { mutateAsync: remove, isPending: removing } = useDeleteSupplementCatalogImage();
  const busy = uploading || removing;

  async function pickAndUpload() {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) { Alert.alert('Permission needed', 'Please allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (result.canceled || !result.assets.length) return;
    try {
      await upload({ supplementId, uri: result.assets[0].uri });
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Please try again.');
    }
  }

  function confirmRemove() {
    Alert.alert('Remove photo?', `"${name}" will fall back to the default icon for clients.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove(supplementId) },
    ]);
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
      <TouchableOpacity onPress={pickAndUpload} disabled={busy} style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: THEME.colors.surface3, borderWidth: 0.5, borderColor: THEME.colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {busy ? (
          <ActivityIndicator size="small" color={THEME.colors.teal} />
        ) : imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: 52, height: 52 }} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: 20 }}>💊</Text>
        )}
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{name}</Text>
        <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 1 }}>{defaultQuantity}</Text>
      </View>
      <TouchableOpacity onPress={pickAndUpload} disabled={busy} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: `${THEME.colors.teal}18` }}>
        <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>{imageUrl ? 'Replace' : 'Upload'}</Text>
      </TouchableOpacity>
      {imageUrl && (
        <TouchableOpacity onPress={confirmRemove} disabled={busy} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 16 }}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function SupplementCatalogSection() {
  const { data: images = {}, isLoading } = useSupplementCatalogImages();
  return (
    <SectionCard title="Supplement catalog" subtitle="Tap a thumbnail to upload a product photo — auto-resized before storing. Clients see this image in their supplement grid.">
      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} />
      ) : (
        <View>
          {SUPPLEMENT_ITEMS.map((s) => (
            <SupplementImageRow key={s.id} supplementId={s.id} name={s.name} defaultQuantity={s.defaultQuantity} imageUrl={images[s.id]} />
          ))}
        </View>
      )}
    </SectionCard>
  );
}

export default function AdminSettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 26 }}>Settings</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <ContactInfoSection />
        <RehabPackagesSection />
        <SupplementCatalogSection />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
