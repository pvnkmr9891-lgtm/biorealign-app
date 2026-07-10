import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const BRAND = {
  teal: '#00C4B4',
  amber: '#E8A44A',
  bg: '#0A0A0B',
  surface: '#141416',
  border: '#2A2A2E',
  text: '#F0EEE8',
  textMuted: '#6B6B70',
};

type PhotoType = 'front' | 'side' | 'back';

interface PhotoEntry {
  uri: string;
  type: PhotoType;
}

const PHOTO_SLOTS: { type: PhotoType; label: string; emoji: string; hint: string }[] = [
  { type: 'front', label: 'Front', emoji: '🧍', hint: 'Stand straight, arms at sides' },
  { type: 'side', label: 'Side', emoji: '🚶', hint: 'Stand sideways to camera' },
  { type: 'back', label: 'Back', emoji: '🪞', hint: 'Face away from camera' },
];

export default function PhotosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Partial<Record<PhotoType, string>>>({});
  const [uploading, setUploading] = useState(false);

  const pickPhoto = async (type: PhotoType) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      const galleryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!galleryPermission.granted) {
        Alert.alert('Permission needed', 'Please allow photo access to upload posture photos.');
        return;
      }
    }

    Alert.alert(
      'Add photo',
      'Take a new photo or choose from your gallery.',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [3, 4],
              quality: 0.7,
            });
            if (!result.canceled) {
              setPhotos((prev) => ({ ...prev, [type]: result.assets[0].uri }));
            }
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [3, 4],
              quality: 0.7,
            });
            if (!result.canceled) {
              setPhotos((prev) => ({ ...prev, [type]: result.assets[0].uri }));
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const uploadPhotos = async () => {
    if (!user?.id) return;
    setUploading(true);

    try {
      for (const [type, uri] of Object.entries(photos)) {
        // FormData + direct REST fetch — the upload pattern proven to work on
        // this stack (see useUploadProgressPhoto). RN's fetch(uri).blob()
        // sends a malformed body and the upload 400s.
        const ext = uri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
        const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        const path = `${user.id}/onboarding/${type}_${Date.now()}.${ext}`;

        const formData = new FormData();
        formData.append('file', { uri, name: `photo.${ext}`, type: contentType } as any);

        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
        const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/progress-photos/${path}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session?.access_token}`, 'x-upsert': 'true' },
          body: formData,
        });
        if (!uploadRes.ok) throw new Error(`Upload failed: ${await uploadRes.text()}`);

        // Record in DB
        await supabase.from('progress_photos').insert({
          client_id: user.id,
          photo_type: type,
          storage_path: path,
          photo_date: new Date().toISOString().split('T')[0],
          week_number: 0,
          phase: 0,
        });
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      // Non-blocking — photos are optional
    } finally {
      setUploading(false);
    }
  };

  const handleContinue = async () => {
    const hasPhotos = Object.keys(photos).length > 0;
    if (hasPhotos) {
      await uploadPhotos();
    }
    router.push('/onboarding/complete');
  };

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 28, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: BRAND.textMuted }}>← Back</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: BRAND.teal, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
          Optional — but recommended
        </Text>
        <Text style={{ fontSize: 28, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text, marginBottom: 12 }}>
          Posture Photos
        </Text>
        <Text style={{ fontSize: 14, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, lineHeight: 22, marginBottom: 32 }}>
          These photos help your coach visually assess your posture and track your transformation over time. They are completely private.
        </Text>

        {/* Tips card */}
        <View style={{ backgroundColor: `${BRAND.amber}12`, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: `${BRAND.amber}25`, marginBottom: 28 }}>
          <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: BRAND.amber, marginBottom: 8 }}>📸 Tips for good posture photos</Text>
          <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, lineHeight: 20 }}>
            • Wear fitted clothing or sports attire{'\n'}
            • Stand naturally — don't try to correct your posture{'\n'}
            • Good lighting, plain background if possible{'\n'}
            • Full-body shot from head to toe
          </Text>
        </View>

        {/* Photo slots */}
        {PHOTO_SLOTS.map((slot) => {
          const uri = photos[slot.type];
          return (
            <TouchableOpacity
              key={slot.type}
              onPress={() => pickPhoto(slot.type)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: BRAND.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1.5,
                borderColor: uri ? BRAND.teal : BRAND.border,
                marginBottom: 12,
              }}
            >
              {/* Photo preview or placeholder */}
              <View
                style={{
                  width: 72,
                  height: 96,
                  borderRadius: 10,
                  backgroundColor: '#1A1A1E',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  marginRight: 16,
                }}
              >
                {uri ? (
                  <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <Text style={{ fontSize: 28 }}>{slot.emoji}</Text>
                )}
              </View>

              {/* Info */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: uri ? BRAND.teal : BRAND.text, marginBottom: 4 }}>
                  {slot.label} view {uri ? '✓' : ''}
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.textMuted }}>
                  {uri ? 'Tap to replace' : slot.hint}
                </Text>
              </View>

              <Text style={{ fontSize: 20, color: BRAND.textMuted }}>›</Text>
            </TouchableOpacity>
          );
        })}

        {/* Skip note */}
        <Text style={{ textAlign: 'center', fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, marginTop: 16 }}>
          You can add or update photos anytime from your profile.
        </Text>

      </ScrollView>

      {/* Bottom nav */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: BRAND.bg, borderTopWidth: 1, borderTopColor: BRAND.border, paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 32, gap: 12 }}>
        <TouchableOpacity
          onPress={handleContinue}
          activeOpacity={0.85}
          disabled={uploading}
          style={{ backgroundColor: BRAND.teal, borderRadius: 12, paddingVertical: 16, alignItems: 'center', shadowColor: BRAND.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 4 }}
        >
          <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: '#0A0A0B' }}>
            {uploading ? 'Uploading...' : Object.keys(photos).length > 0 ? 'Save & Continue →' : 'Continue without photos →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
