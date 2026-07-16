import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCoachProfile, useMyCoachStatus, useRequestCoach, useCancelCoachRequest } from '@/hooks/useCoachDirectory';
import { CoachProfileView } from '@/components/coach/CoachProfileView';
import { THEME } from '@/constants/theme';

export default function CoachDetailScreen() {
  const router = useRouter();
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { data: coach, isLoading } = useCoachProfile(coachId);
  const { data: status } = useMyCoachStatus();
  const { mutateAsync: requestCoach, isPending: isRequesting } = useRequestCoach();
  const { mutateAsync: cancelRequest, isPending: isCancelling } = useCancelCoachRequest();
  const [message, setMessage] = useState('');

  if (isLoading || !coach) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }}>
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const isThisCoachPending  = status?.state === 'pending'  && status.request.coach_id === coachId;
  const isThisCoachAssigned = status?.state === 'assigned' && status.coachId === coachId;
  const hasOtherPending     = status?.state === 'pending'  && status.request.coach_id !== coachId;
  const hasOtherAssigned    = status?.state === 'assigned' && status.coachId !== coachId;

  const onRequest = async () => {
    try {
      await requestCoach({ coachId, message });
      Alert.alert('Request sent', `${coach.full_name} has been notified. You'll see an update here once they respond.`);
    } catch (e: any) {
      Alert.alert('Could not send request', e.message ?? 'Please try again.');
    }
  };

  const onCancel = async () => {
    if (status?.state !== 'pending') return;
    await cancelRequest(status.request.id);
  };

  return (
    <SafeAreaView testID="coach-detail-screen" style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <CoachProfileView coach={coach} />

        {/* Request state */}
        {isThisCoachAssigned ? (
          <View style={{ backgroundColor: `${THEME.colors.success ?? '#4CC986'}15`, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: `${THEME.colors.success ?? '#4CC986'}30` }}>
            <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.success ?? '#4CC986' }}>✓ This is your coach</Text>
          </View>
        ) : isThisCoachPending ? (
          <View style={{ gap: 12 }}>
            <View style={{ backgroundColor: `${THEME.colors.amber}15`, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: `${THEME.colors.amber}30` }}>
              <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>⏳ Waiting for approval</Text>
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                We'll let you know as soon as {coach.full_name} responds.
              </Text>
            </View>
            <TouchableOpacity
              onPress={onCancel}
              disabled={isCancelling}
              style={{ alignItems: 'center', paddingVertical: 10 }}
            >
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>Cancel request</Text>
            </TouchableOpacity>
          </View>
        ) : hasOtherAssigned ? (
          <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center' }}>
              You already have an assigned coach.
            </Text>
          </View>
        ) : hasOtherPending ? (
          <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center' }}>
              You have a pending request with another coach. Cancel it first to request {coach.full_name}.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Optional: tell them what you're looking for..."
              placeholderTextColor={THEME.colors.textMuted}
              multiline
              style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14, minHeight: 70, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, borderWidth: 0.5, borderColor: THEME.colors.border, textAlignVertical: 'top' }}
            />
            <TouchableOpacity
              testID="request-coach-button"
              onPress={onRequest}
              disabled={isRequesting}
              activeOpacity={0.85}
              style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
            >
              {isRequesting
                ? <ActivityIndicator color={THEME.colors.background} />
                : <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Request This Coach</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
