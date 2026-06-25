import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRehabPackages, useSubmitRehabRequest } from '@/hooks/useRehab';
import { useMedicalDocuments } from '@/hooks/useMedicalDocuments';
import { THEME } from '@/constants/theme';

export default function RecoveryRequestScreen() {
  const router = useRouter();
  const { data: packages = [], isLoading: packagesLoading } = useRehabPackages();
  const { data: documents = [] } = useMedicalDocuments();
  const { mutateAsync: submit, isPending } = useSubmitRehabRequest();

  const [issueDescription, setIssueDescription] = useState('');
  const [durationText, setDurationText] = useState('');
  const [packageId, setPackageId] = useState<string | null>(null);
  const [linkedDocumentId, setLinkedDocumentId] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!issueDescription.trim()) { Alert.alert('Required', 'Please describe the issue or injury.'); return; }
    if (!packageId) { Alert.alert('Required', 'Please choose a package.'); return; }
    try {
      await submit({ issueDescription: issueDescription.trim(), durationText: durationText.trim(), packageId, linkedDocumentId });
      router.replace('/(client)/recovery');
    } catch (e: any) {
      Alert.alert('Could not submit', e.message ?? 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>Request Treatment</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, marginBottom: 8 }}>
          Describe the issue or injury
        </Text>
        <TextInput
          value={issueDescription}
          onChangeText={setIssueDescription}
          placeholder="e.g. Persistent lower back pain when bending forward"
          placeholderTextColor={THEME.colors.textMuted}
          multiline
          style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14, minHeight: 90, textAlignVertical: 'top', color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 18 }}
        />

        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, marginBottom: 8 }}>
          How long has this been an issue?
        </Text>
        <TextInput
          value={durationText}
          onChangeText={setDurationText}
          placeholder="e.g. About 3 months"
          placeholderTextColor={THEME.colors.textMuted}
          style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 18 }}
        />

        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, marginBottom: 8 }}>
          Preferred package
        </Text>
        {packagesLoading ? (
          <ActivityIndicator color={THEME.colors.teal} style={{ marginBottom: 18 }} />
        ) : (
          <View style={{ gap: 8, marginBottom: 18 }}>
            {packages.map((p) => {
              const selected = packageId === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setPackageId(p.id)}
                  style={{ padding: 14, borderRadius: 12, backgroundColor: selected ? `${THEME.colors.teal}18` : THEME.colors.surface2, borderWidth: 1, borderColor: selected ? THEME.colors.teal : THEME.colors.border }}
                >
                  <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: selected ? THEME.colors.teal : THEME.colors.textPrimary }}>{p.label}</Text>
                  {p.description && <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 3 }}>{p.description}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {documents.length > 0 && (
          <>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, marginBottom: 8 }}>
              Link an existing medical document (optional)
            </Text>
            <View style={{ gap: 8, marginBottom: 18 }}>
              <TouchableOpacity
                onPress={() => setLinkedDocumentId(null)}
                style={{ padding: 12, borderRadius: 10, backgroundColor: !linkedDocumentId ? `${THEME.colors.teal}18` : THEME.colors.surface2, borderWidth: 0.5, borderColor: !linkedDocumentId ? THEME.colors.teal : THEME.colors.border }}
              >
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: !linkedDocumentId ? THEME.colors.teal : THEME.colors.textSecondary }}>None</Text>
              </TouchableOpacity>
              {documents.map((d) => {
                const selected = linkedDocumentId === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    onPress={() => setLinkedDocumentId(d.id)}
                    style={{ padding: 12, borderRadius: 10, backgroundColor: selected ? `${THEME.colors.teal}18` : THEME.colors.surface2, borderWidth: 0.5, borderColor: selected ? THEME.colors.teal : THEME.colors.border }}
                  >
                    <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: selected ? THEME.colors.teal : THEME.colors.textSecondary }}>{d.original_filename}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <TouchableOpacity
          onPress={onSubmit}
          disabled={isPending}
          activeOpacity={0.85}
          style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 }}
        >
          {isPending ? <ActivityIndicator color={THEME.colors.background} /> : (
            <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Send Request</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
