import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '@/constants/theme';
import { MAX_LENGTHS, sanitizePhone, isValidPhone } from '@/utils/validation';

// Shared by the client's own Profile screen and the admin profile drill-down
// (Part 1's "reuse the same update logic" requirement) — same fields, same
// validation, same save mutation underneath (useUpdateProfile).
export function EditProfileModal({ profile, visible, onClose, onSave }: {
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
    if (phone.trim() && !isValidPhone(phone)) { Alert.alert('Invalid phone', 'Enter a valid phone number (7-15 digits).'); return; }
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
            placeholderTextColor={THEME.colors.textMuted} maxLength={MAX_LENGTHS.personName}
          />
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Phone Number</Text>
          <TextInput
            style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 32 }}
            value={phone} onChangeText={(t) => setPhone(sanitizePhone(t))} placeholder="+91 98765 43210"
            placeholderTextColor={THEME.colors.textMuted} keyboardType="phone-pad" maxLength={20}
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
