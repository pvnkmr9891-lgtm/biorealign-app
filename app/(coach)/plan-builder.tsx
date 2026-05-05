import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useCreatePlan, useAddTrack, useAddPlanItem,
  usePublishPlan, usePlanDetail, useDeleteTrack,
  useDeletePlanItem,
} from '@/hooks/usePlans';
import { useAISuggestions, type AISuggestedTrack } from '@/hooks/useAISuggestions';
import { THEME } from '@/constants/theme';

// ── Constants ─────────────────────────────────────────────────────────────────
const TRACK_OPTIONS = [
  { type: 'workout',       label: 'Workout',       emoji: '🏋️', color: '#00C4B4' },
  { type: 'nutrition',     label: 'Nutrition',     emoji: '🥗', color: '#E8A44A' },
  { type: 'recovery',      label: 'Recovery',      emoji: '😴', color: '#A78BFA' },
  { type: 'lifestyle',     label: 'Lifestyle',     emoji: '🌿', color: '#34D399' },
  { type: 'posture_rehab', label: 'Posture/Rehab', emoji: '🩺', color: '#F87171' },
  { type: 'mindset',       label: 'Mindset',       emoji: '🧘', color: '#60A5FA' },
];

const ITEM_TYPES = [
  { type: 'exercise',   label: 'Exercise' },
  { type: 'meal_guide', label: 'Meal Guide' },
  { type: 'protocol',   label: 'Protocol' },
  { type: 'habit',      label: 'Habit' },
  { type: 'note',       label: 'Note' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const BRAND = {
  bg: '#0A0A0B', surface: '#141416', border: '#2A2A2E',
  text: '#F0EEE8', textMuted: '#6B6B70', teal: '#00C4B4', amber: '#E8A44A',
};

// ── Add Item Sheet ─────────────────────────────────────────────────────────────
function AddItemSheet({ trackId, planId, phase, onClose }: {
  trackId: string; planId: string; phase: number; onClose: () => void;
}) {
  const addItem = useAddPlanItem();
  const [title, setTitle]           = useState('');
  const [itemType, setItemType]     = useState('exercise');
  const [description, setDescription] = useState('');
  const [sets, setSets]             = useState('');
  const [reps, setReps]             = useState('');
  const [duration, setDuration]     = useState('');
  const [coachNote, setCoachNote]   = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [weekNumber, setWeekNumber] = useState('1');

  const toggleDay = (day: string) =>
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  const handleAdd = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a title.'); return; }
    if (selectedDays.length === 0) { Alert.alert('Required', 'Select at least one day.'); return; }
    await addItem.mutateAsync({
      track_id: trackId, plan_id: planId, title: title.trim(),
      item_type: itemType, phase, week_number: parseInt(weekNumber) || 1,
      day_of_week: selectedDays,
      description: description.trim() || undefined,
      sets: parseInt(sets) || undefined, reps: reps.trim() || undefined,
      duration_minutes: parseInt(duration) || undefined,
      coach_note: coachNote.trim() || undefined, sort_order: 0,
    });
    onClose();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ backgroundColor: BRAND.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' }}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text }}>Add Item</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 20, color: BRAND.textMuted }}>✕</Text></TouchableOpacity>
          </View>

          <Text style={{ fontSize: 11, color: BRAND.textMuted, fontFamily: 'DMSans-Medium', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {ITEM_TYPES.map(t => (
              <TouchableOpacity key={t.type} onPress={() => setItemType(t.type)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: itemType === t.type ? BRAND.teal : BRAND.border, backgroundColor: itemType === t.type ? `${BRAND.teal}18` : 'transparent' }}>
                <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: itemType === t.type ? BRAND.teal : BRAND.textMuted }}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: 11, color: BRAND.textMuted, fontFamily: 'DMSans-Medium', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Title *</Text>
          <TextInput style={{ backgroundColor: '#1A1A1E', borderRadius: 10, borderWidth: 1, borderColor: BRAND.border, paddingHorizontal: 14, paddingVertical: 12, color: BRAND.text, fontFamily: 'DMSans-Regular', fontSize: 15, marginBottom: 16 }} value={title} onChangeText={setTitle} placeholder="e.g. Goblet Squat" placeholderTextColor={BRAND.textMuted} />

          <Text style={{ fontSize: 11, color: BRAND.textMuted, fontFamily: 'DMSans-Medium', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Description</Text>
          <TextInput style={{ backgroundColor: '#1A1A1E', borderRadius: 10, borderWidth: 1, borderColor: BRAND.border, paddingHorizontal: 14, paddingVertical: 12, color: BRAND.text, fontFamily: 'DMSans-Regular', fontSize: 14, marginBottom: 16, minHeight: 70 }} value={description} onChangeText={setDescription} placeholder="Instructions..." placeholderTextColor={BRAND.textMuted} multiline textAlignVertical="top" />

          {itemType === 'exercise' && (
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: BRAND.textMuted, fontFamily: 'DMSans-Medium', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Sets</Text>
                <TextInput style={{ backgroundColor: '#1A1A1E', borderRadius: 10, borderWidth: 1, borderColor: BRAND.border, paddingHorizontal: 14, paddingVertical: 12, color: BRAND.text, fontFamily: 'DMSans-Regular', fontSize: 15 }} value={sets} onChangeText={setSets} placeholder="3" placeholderTextColor={BRAND.textMuted} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: BRAND.textMuted, fontFamily: 'DMSans-Medium', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Reps</Text>
                <TextInput style={{ backgroundColor: '#1A1A1E', borderRadius: 10, borderWidth: 1, borderColor: BRAND.border, paddingHorizontal: 14, paddingVertical: 12, color: BRAND.text, fontFamily: 'DMSans-Regular', fontSize: 15 }} value={reps} onChangeText={setReps} placeholder="12" placeholderTextColor={BRAND.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: BRAND.textMuted, fontFamily: 'DMSans-Medium', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Min</Text>
                <TextInput style={{ backgroundColor: '#1A1A1E', borderRadius: 10, borderWidth: 1, borderColor: BRAND.border, paddingHorizontal: 14, paddingVertical: 12, color: BRAND.text, fontFamily: 'DMSans-Regular', fontSize: 15 }} value={duration} onChangeText={setDuration} placeholder="30" placeholderTextColor={BRAND.textMuted} keyboardType="numeric" />
              </View>
            </View>
          )}

          <Text style={{ fontSize: 11, color: BRAND.textMuted, fontFamily: 'DMSans-Medium', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Days *</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {DAYS.map(day => (
              <TouchableOpacity key={day} onPress={() => toggleDay(day)}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: selectedDays.includes(day) ? BRAND.teal : BRAND.border, backgroundColor: selectedDays.includes(day) ? `${BRAND.teal}18` : 'transparent' }}>
                <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: selectedDays.includes(day) ? BRAND.teal : BRAND.textMuted }}>{day.slice(0, 3)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: 11, color: BRAND.textMuted, fontFamily: 'DMSans-Medium', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Week</Text>
          <TextInput style={{ backgroundColor: '#1A1A1E', borderRadius: 10, borderWidth: 1, borderColor: BRAND.border, paddingHorizontal: 14, paddingVertical: 12, color: BRAND.text, fontFamily: 'DMSans-Regular', fontSize: 15, marginBottom: 16 }} value={weekNumber} onChangeText={setWeekNumber} placeholder="1" placeholderTextColor={BRAND.textMuted} keyboardType="numeric" />

          <Text style={{ fontSize: 11, color: BRAND.textMuted, fontFamily: 'DMSans-Medium', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Coach Note</Text>
          <TextInput style={{ backgroundColor: '#1A1A1E', borderRadius: 10, borderWidth: 1, borderColor: BRAND.border, paddingHorizontal: 14, paddingVertical: 12, color: BRAND.text, fontFamily: 'DMSans-Regular', fontSize: 14, marginBottom: 24, minHeight: 60 }} value={coachNote} onChangeText={setCoachNote} placeholder="Tip for the client..." placeholderTextColor={BRAND.textMuted} multiline textAlignVertical="top" />

          <TouchableOpacity onPress={handleAdd} disabled={addItem.isPending}
            style={{ backgroundColor: BRAND.teal, borderRadius: 12, paddingVertical: 16, alignItems: 'center' }}>
            {addItem.isPending ? <ActivityIndicator color="#0A0A0B" /> : <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: '#0A0A0B' }}>Add Item</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── AI Suggestion Panel ────────────────────────────────────────────────────────
function AISuggestionPanel({
  clientId, clientName, onApplyTrack, onDismiss,
}: {
  clientId: string; clientName: string;
  onApplyTrack: (track: AISuggestedTrack) => void; onDismiss: () => void;
}) {
  const { generate, isLoading, error, suggestion, reset } = useAISuggestions();
  const [acceptedTracks, setAcceptedTracks] = useState<Set<number>>(new Set());
  const [rejectedTracks, setRejectedTracks] = useState<Set<number>>(new Set());

  const trackMeta = (type: string) => TRACK_OPTIONS.find(t => t.type === type) ?? TRACK_OPTIONS[0];

  // Initial CTA
  if (!suggestion && !isLoading && !error) {
    return (
      <View style={{ marginHorizontal: 16, marginBottom: 20, backgroundColor: `${BRAND.teal}10`, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: `${BRAND.teal}30` }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Text style={{ fontSize: 22 }}>🤖</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: BRAND.teal }}>AI Plan Suggestions</Text>
            <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, marginTop: 2 }}>
              Claude reads {clientName}'s full assessment and suggests a personalised plan
            </Text>
          </View>
          <TouchableOpacity onPress={onDismiss}><Text style={{ color: BRAND.textMuted, fontSize: 16 }}>✕</Text></TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => generate(clientId, clientName)}
          style={{ backgroundColor: BRAND.teal, borderRadius: 12, paddingVertical: 14, alignItems: 'center', shadowColor: BRAND.teal, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 }}>
          <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: '#0A0A0B' }}>✨ Generate suggestions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={{ marginHorizontal: 16, marginBottom: 20, backgroundColor: `${BRAND.teal}10`, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: `${BRAND.teal}30`, alignItems: 'center' }}>
        <ActivityIndicator color={BRAND.teal} size="large" style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 15, fontFamily: 'DMSans-Medium', color: BRAND.teal, textAlign: 'center', marginBottom: 6 }}>
          Analysing {clientName}'s assessment...
        </Text>
        <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, textAlign: 'center' }}>
          Reading all 55+ data points to build personalised suggestions
        </Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={{ marginHorizontal: 16, marginBottom: 20, backgroundColor: '#F8717115', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#F8717130' }}>
        <Text style={{ fontSize: 14, fontFamily: 'DMSans-Medium', color: '#F87171', marginBottom: 12 }}>⚠️ {error}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={() => generate(clientId, clientName)}
            style={{ flex: 1, backgroundColor: BRAND.teal, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: '#0A0A0B' }}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { reset(); onDismiss(); }}
            style={{ flex: 1, backgroundColor: BRAND.surface, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: BRAND.border }}>
            <Text style={{ fontSize: 14, fontFamily: 'DMSans-Medium', color: BRAND.textMuted }}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!suggestion) return null;

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
      {/* Summary card */}
      <View style={{ backgroundColor: `${BRAND.teal}12`, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: `${BRAND.teal}30`, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: BRAND.teal, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>🤖 AI Suggestion</Text>
            <Text style={{ fontSize: 16, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text }}>{suggestion.plan_title}</Text>
          </View>
          <TouchableOpacity onPress={() => { reset(); onDismiss(); }}>
            <Text style={{ color: BRAND.textMuted, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, lineHeight: 20, marginBottom: 10 }}>{suggestion.plan_overview}</Text>
        <View style={{ backgroundColor: `${BRAND.amber}15`, borderRadius: 8, padding: 10, borderLeftWidth: 2, borderLeftColor: BRAND.amber }}>
          <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: BRAND.amber }}>🎯 Phase 1: {suggestion.phase_1_goal}</Text>
        </View>
        {suggestion.red_flags?.length > 0 && (
          <View style={{ backgroundColor: '#F8717115', borderRadius: 8, padding: 10, marginTop: 8, borderLeftWidth: 2, borderLeftColor: '#F87171' }}>
            <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: '#F87171', marginBottom: 4 }}>⚠️ Coach alerts:</Text>
            {suggestion.red_flags.map((flag: string, i: number) => (
              <Text key={i} style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: '#F87171', lineHeight: 18 }}>• {flag}</Text>
            ))}
          </View>
        )}
      </View>

      {/* Track suggestions */}
      <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: BRAND.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
        Suggested tracks — tap to add
      </Text>

      {suggestion.tracks.map((track: AISuggestedTrack, trackIdx: number) => {
        const meta     = trackMeta(track.track_type);
        const accepted = acceptedTracks.has(trackIdx);
        const rejected = rejectedTracks.has(trackIdx);

        return (
          <View key={trackIdx} style={{ backgroundColor: BRAND.surface, borderRadius: 14, marginBottom: 10, borderWidth: 1.5, borderColor: accepted ? BRAND.teal : rejected ? '#F8717130' : BRAND.border, overflow: 'hidden', opacity: rejected ? 0.4 : 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 0.5, borderBottomColor: BRAND.border }}>
              <View style={{ width: 4, height: 32, borderRadius: 2, backgroundColor: meta.color, marginRight: 10 }} />
              <Text style={{ fontSize: 16, marginRight: 8 }}>{meta.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: BRAND.text }}>{track.title}</Text>
                <Text style={{ fontSize: 11, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, marginTop: 2 }}>{track.rationale}</Text>
              </View>
            </View>

            <View style={{ padding: 10, gap: 6 }}>
              {track.items.map((item: any, i: number) => (
                <View key={i} style={{ backgroundColor: '#1A1A1E', borderRadius: 8, padding: 10 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: BRAND.text }}>{item.title}</Text>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, marginTop: 2 }}>
                    {item.day_of_week?.slice(0, 3).map((d: string) => d.slice(0, 3)).join(', ')}
                    {item.sets ? ` · ${item.sets}×${item.reps}` : ''}
                    {item.duration_minutes ? ` · ${item.duration_minutes}min` : ''}
                  </Text>
                  {item.coach_note ? <Text style={{ fontSize: 11, fontFamily: 'DMSans-Regular', color: `${BRAND.amber}99`, marginTop: 3 }}>💬 {item.coach_note}</Text> : null}
                </View>
              ))}
            </View>

            {!rejected && (
              <View style={{ flexDirection: 'row', gap: 8, padding: 10, paddingTop: 0 }}>
                <TouchableOpacity
                  onPress={() => { setAcceptedTracks(prev => { const s = new Set(prev); s.add(trackIdx); return s; }); onApplyTrack(track); }}
                  disabled={accepted}
                  style={{ flex: 1, backgroundColor: accepted ? `${BRAND.teal}30` : BRAND.teal, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontFamily: 'DMSans-Bold', color: accepted ? BRAND.teal : '#0A0A0B' }}>
                    {accepted ? '✓ Added to plan' : '+ Add this track'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setRejectedTracks(prev => { const s = new Set(prev); s.add(trackIdx); return s; })}
                  style={{ backgroundColor: BRAND.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 0.5, borderColor: BRAND.border }}>
                  <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: BRAND.textMuted }}>Skip</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      {/* Nutrition notes */}
      {suggestion.nutrition_notes && (
        <View style={{ backgroundColor: `${BRAND.amber}10`, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: `${BRAND.amber}25`, marginTop: 4 }}>
          <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: BRAND.amber, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>🥗 Nutrition guidance</Text>
          <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.text, lineHeight: 20 }}>{suggestion.nutrition_notes}</Text>
        </View>
      )}

      <TouchableOpacity onPress={() => { reset(); generate(clientId, clientName); }} style={{ marginTop: 12, paddingVertical: 10, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: BRAND.textMuted, textDecorationLine: 'underline' }}>↻ Regenerate suggestions</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main Plan Builder ─────────────────────────────────────────────────────────
export default function PlanBuilder() {
  const router = useRouter();
  const { clientId, clientName, planId: existingPlanId } = useLocalSearchParams<{
    clientId: string; clientName: string; planId?: string;
  }>();

  const createPlan  = useCreatePlan();
  const addTrack    = useAddTrack();
  const addPlanItem = useAddPlanItem();
  const publishPlan = usePublishPlan();
  const deleteTrack = useDeleteTrack();
  const deleteItem  = useDeletePlanItem();

  const [planTitle, setPlanTitle]   = useState('');
  const [overview, setOverview]     = useState('');
  const [startDate, setStartDate]   = useState('');
  const [currentPlanId, setCurrentPlanId] = useState(existingPlanId ?? '');
  const [phase, setPhase]           = useState(1);
  const [step, setStep]             = useState<'create' | 'build'>(existingPlanId ? 'build' : 'create');
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [showAddItem, setShowAddItem]     = useState(false);
  const [showAI, setShowAI]               = useState(true);

  const { data: planDetail, isLoading: planLoading } = usePlanDetail(currentPlanId);

  const handleCreatePlan = async () => {
    if (!planTitle.trim()) { Alert.alert('Required', 'Enter a plan title.'); return; }
    const plan = await createPlan.mutateAsync({
      client_id: clientId, title: planTitle.trim(),
      coach_overview: overview.trim() || undefined,
      start_date: startDate || undefined,
    });
    setCurrentPlanId(plan.id);
    setStep('build');
  };

  const handleAddTrack = async (trackType: string) => {
    const meta = TRACK_OPTIONS.find(t => t.type === trackType)!;
    await addTrack.mutateAsync({
      plan_id: currentPlanId, track_type: trackType,
      title: meta.label, sort_order: planDetail?.plan_tracks?.length ?? 0,
    });
  };

  // Apply AI suggested track with all its items
  const handleApplyAITrack = async (track: AISuggestedTrack) => {
    try {
      const newTrack = await addTrack.mutateAsync({
        plan_id: currentPlanId, track_type: track.track_type,
        title: track.title, sort_order: planDetail?.plan_tracks?.length ?? 0,
      });
      for (const item of track.items) {
        await addPlanItem.mutateAsync({
          track_id: newTrack.id, plan_id: currentPlanId,
          title: item.title, item_type: item.item_type,
          phase, week_number: 1,
          day_of_week: item.day_of_week ?? [],
          description: item.description || undefined,
          sets: item.sets || undefined, reps: item.reps || undefined,
          duration_minutes: item.duration_minutes || undefined,
          coach_note: item.coach_note || undefined, sort_order: 0,
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to add track. Please try manually.');
    }
  };

  const handlePublish = () => {
    Alert.alert('Publish Plan', `Make this plan visible to ${clientName}?`, [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Publish now', onPress: async () => {
          await publishPlan.mutateAsync({ planId: currentPlanId, clientId });
          Alert.alert('Published! 🎉', `${clientName} has been notified.`);
          router.back();
        },
      },
    ]);
  };

  const existingTrackTypes = planDetail?.plan_tracks?.map((t: any) => t.track_type) ?? [];
  const availableTracks    = TRACK_OPTIONS.filter(t => !existingTrackTypes.includes(t.type));

  // ── STEP 1: Create plan ──────────────────────────────────────────────────
  if (step === 'create') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.bg }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 24 }}>
              <Text style={{ color: BRAND.textMuted, fontFamily: 'DMSans-Medium', fontSize: 13 }}>← Back</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 11, color: BRAND.teal, fontFamily: 'DMSans-Medium', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>New Plan</Text>
            <Text style={{ fontSize: 28, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text, marginBottom: 4 }}>Build a plan for</Text>
            <Text style={{ fontSize: 28, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.teal, marginBottom: 32 }}>{clientName}</Text>

            <Text style={{ fontSize: 11, color: BRAND.textMuted, fontFamily: 'DMSans-Medium', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Plan Title *</Text>
            <TextInput style={{ backgroundColor: BRAND.surface, borderRadius: 12, borderWidth: 1, borderColor: BRAND.border, paddingHorizontal: 16, paddingVertical: 14, color: BRAND.text, fontFamily: 'DMSans-Regular', fontSize: 16, marginBottom: 20 }}
              value={planTitle} onChangeText={setPlanTitle} placeholder="e.g. 12-Week Posture Reset" placeholderTextColor={BRAND.textMuted} />

            <Text style={{ fontSize: 11, color: BRAND.textMuted, fontFamily: 'DMSans-Medium', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Start Date</Text>
            <TextInput style={{ backgroundColor: BRAND.surface, borderRadius: 12, borderWidth: 1, borderColor: BRAND.border, paddingHorizontal: 16, paddingVertical: 14, color: BRAND.text, fontFamily: 'DMSans-Regular', fontSize: 16, marginBottom: 20 }}
              value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" placeholderTextColor={BRAND.textMuted} />

            <Text style={{ fontSize: 11, color: BRAND.textMuted, fontFamily: 'DMSans-Medium', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Coach Overview</Text>
            <TextInput style={{ backgroundColor: BRAND.surface, borderRadius: 12, borderWidth: 1, borderColor: BRAND.border, paddingHorizontal: 16, paddingVertical: 14, color: BRAND.text, fontFamily: 'DMSans-Regular', fontSize: 15, minHeight: 100, marginBottom: 32 }}
              value={overview} onChangeText={setOverview} placeholder="Overall approach for this client..." placeholderTextColor={BRAND.textMuted} multiline textAlignVertical="top" />

            <TouchableOpacity onPress={handleCreatePlan} disabled={createPlan.isPending}
              style={{ backgroundColor: BRAND.teal, borderRadius: 14, paddingVertical: 18, alignItems: 'center', shadowColor: BRAND.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 4 }}>
              {createPlan.isPending ? <ActivityIndicator color="#0A0A0B" /> : <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: '#0A0A0B' }}>Create Plan & Add Tracks →</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── STEP 2: Build tracks ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Header */}
        <View style={{ padding: 24, paddingBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
            <Text style={{ color: BRAND.textMuted, fontFamily: 'DMSans-Medium', fontSize: 13 }}>← Back</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: planDetail?.status === 'active' ? BRAND.teal : BRAND.amber, fontFamily: 'DMSans-Medium', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
                {planDetail?.status === 'active' ? '✓ Published' : 'Draft'}
              </Text>
              <Text style={{ fontSize: 22, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text }}>{planDetail?.title ?? planTitle}</Text>
              <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, marginTop: 4 }}>{clientName}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[1, 2, 3].map(p => (
                <TouchableOpacity key={p} onPress={() => setPhase(p)}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: phase === p ? BRAND.teal : BRAND.surface, borderWidth: 1, borderColor: phase === p ? BRAND.teal : BRAND.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans-Bold', color: phase === p ? '#0A0A0B' : BRAND.textMuted }}>P{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* AI Panel */}
        {showAI && planDetail?.status !== 'active' && (
          <AISuggestionPanel
            clientId={clientId}
            clientName={clientName}
            onApplyTrack={handleApplyAITrack}
            onDismiss={() => setShowAI(false)}
          />
        )}

        {!showAI && planDetail?.status !== 'active' && (
          <TouchableOpacity onPress={() => setShowAI(true)}
            style={{ marginHorizontal: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${BRAND.teal}10`, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 0.5, borderColor: `${BRAND.teal}30` }}>
            <Text style={{ fontSize: 14 }}>🤖</Text>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: BRAND.teal }}>Show AI suggestions</Text>
          </TouchableOpacity>
        )}

        {/* Tracks */}
        {planLoading ? (
          <ActivityIndicator color={BRAND.teal} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            {(planDetail?.plan_tracks ?? []).map((track: any) => {
              const meta       = TRACK_OPTIONS.find(t => t.type === track.track_type)!;
              const trackItems = (track.plan_items ?? []).filter((i: any) => i.phase === phase);

              return (
                <View key={track.id} style={{ backgroundColor: BRAND.surface, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: BRAND.border, overflow: 'hidden' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: BRAND.border }}>
                    <View style={{ width: 4, height: 36, borderRadius: 2, backgroundColor: meta?.color ?? BRAND.teal, marginRight: 12 }} />
                    <Text style={{ fontSize: 16, marginRight: 8 }}>{meta?.emoji}</Text>
                    <Text style={{ flex: 1, fontSize: 15, fontFamily: 'DMSans-Bold', color: BRAND.text }}>{track.title}</Text>
                    <TouchableOpacity onPress={() => { setActiveTrackId(track.id); setShowAddItem(true); }}
                      style={{ backgroundColor: `${BRAND.teal}20`, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 }}>
                      <Text style={{ fontSize: 12, fontFamily: 'DMSans-Bold', color: BRAND.teal }}>+ Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => Alert.alert('Delete Track', 'Remove this track?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteTrack.mutate({ trackId: track.id, planId: currentPlanId }) },
                    ])}>
                      <Text style={{ color: '#F87171', fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {trackItems.length === 0 ? (
                    <View style={{ padding: 16 }}>
                      <Text style={{ color: BRAND.textMuted, fontFamily: 'DMSans-Regular', fontSize: 13 }}>No items for Phase {phase}. Tap "+ Add".</Text>
                    </View>
                  ) : (
                    <View style={{ padding: 12, gap: 8 }}>
                      {trackItems.map((item: any) => (
                        <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1E', borderRadius: 10, padding: 12 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontFamily: 'DMSans-Medium', color: BRAND.text }}>{item.title}</Text>
                            <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, marginTop: 2 }}>
                              {item.day_of_week?.join(', ')}{item.sets ? ` · ${item.sets}×${item.reps}` : ''}{item.duration_minutes ? ` · ${item.duration_minutes}min` : ''}
                            </Text>
                            {item.coach_note ? <Text style={{ fontSize: 11, fontFamily: 'DMSans-Regular', color: `${BRAND.amber}99`, marginTop: 4 }}>💬 {item.coach_note}</Text> : null}
                          </View>
                          <TouchableOpacity onPress={() => deleteItem.mutate({ itemId: item.id, planId: currentPlanId })}>
                            <Text style={{ color: '#6B6B70', fontSize: 16, paddingLeft: 12 }}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}

            {availableTracks.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 11, color: BRAND.textMuted, fontFamily: 'DMSans-Medium', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>Add Track Manually</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {availableTracks.map(t => (
                    <TouchableOpacity key={t.type} onPress={() => handleAddTrack(t.type)} disabled={addTrack.isPending}
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: BRAND.border, gap: 6 }}>
                      <Text style={{ fontSize: 16 }}>{t.emoji}</Text>
                      <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: BRAND.textMuted }}>+ {t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Publish button */}
      {planDetail?.status !== 'active' && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: BRAND.bg, borderTopWidth: 1, borderTopColor: BRAND.border, padding: 24, paddingBottom: 36 }}>
          <TouchableOpacity onPress={handlePublish} disabled={publishPlan.isPending || !planDetail?.plan_tracks?.length}
            style={{ backgroundColor: BRAND.teal, borderRadius: 14, paddingVertical: 18, alignItems: 'center', shadowColor: BRAND.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 4, opacity: planDetail?.plan_tracks?.length ? 1 : 0.5 }}>
            {publishPlan.isPending ? <ActivityIndicator color="#0A0A0B" /> : <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: '#0A0A0B' }}>Publish Plan to Client 🚀</Text>}
          </TouchableOpacity>
          <Text style={{ textAlign: 'center', color: BRAND.textMuted, fontFamily: 'DMSans-Regular', fontSize: 12, marginTop: 10 }}>Client will be notified once published</Text>
        </View>
      )}

      {/* Add item sheet */}
      {showAddItem && activeTrackId && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <AddItemSheet trackId={activeTrackId} planId={currentPlanId} phase={phase}
            onClose={() => { setShowAddItem(false); setActiveTrackId(null); }} />
        </View>
      )}
    </SafeAreaView>
  );
}
