import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useSaveSessionNotes } from '@/hooks/useCoach';
import { THEME } from '@/constants/theme';
import { MAX_LENGTHS } from '@/utils/validation';

const STATUS_OPTIONS = ['scheduled', 'completed', 'cancelled', 'no_show'];

export default function SessionNotesScreen() {
  const router = useRouter();
  const { sessionId, clientName } = useLocalSearchParams<{ sessionId: string; clientName: string }>();

  const [session, setSession]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [notesPre, setNotesPre] = useState('');
  const [notesPost, setNotesPost] = useState('');
  const [status, setStatus]     = useState('scheduled');
  const [saved, setSaved]       = useState(false);

  const { mutateAsync: saveNotes, isPending } = useSaveSessionNotes();

  useEffect(() => {
    if (!sessionId) return;
    supabase.from('sessions').select('*').eq('id', sessionId).single()
      .then(({ data }) => {
        if (data) {
          setSession(data);
          setNotesPre(data.notes_pre ?? '');
          setNotesPost(data.notes_post ?? '');
          setStatus(data.status ?? 'scheduled');
        }
        setLoading(false);
      });
  }, [sessionId]);

  const handleSave = async () => {
    await saveNotes({ sessionId, notes_pre: notesPre, notes_post: notesPost, status });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator color={THEME.colors.amber} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
            <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 24 }}>Session notes</Text>
            <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13 }}>
              {clientName} · {session ? new Date(session.scheduled_at).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
            </Text>
          </View>
        </View>

        {/* Session info */}
        {session && (
          <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11 }}>Time</Text>
                <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 15, marginTop: 2 }}>
                  {new Date(session.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View>
                <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11 }}>Duration</Text>
                <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 15, marginTop: 2 }}>
                  {session.duration_min} min
                </Text>
              </View>
              <View>
                <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11 }}>Type</Text>
                <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 15, marginTop: 2, textTransform: 'capitalize' }}>
                  {session.type?.replace('_', ' ')}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Status */}
        <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
            Status
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setStatus(s)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: status === s ? THEME.colors.amber : THEME.colors.surface2, borderWidth: 0.5, borderColor: status === s ? THEME.colors.amber : THEME.colors.border }}
              >
                <Text style={{ color: status === s ? THEME.colors.background : THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 13, textTransform: 'capitalize' }}>
                  {s.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pre-session notes */}
        <View style={{ marginHorizontal: 24, marginBottom: 20 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
            Pre-session notes
          </Text>
          <TextInput
            style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, minHeight: 100, textAlignVertical: 'top' }}
            placeholder="Goals for this session, client's current state, areas to focus on..."
            placeholderTextColor={THEME.colors.textMuted}
            value={notesPre}
            onChangeText={setNotesPre}
            multiline
            maxLength={MAX_LENGTHS.longNote}
          />
        </View>

        {/* Post-session notes */}
        <View style={{ marginHorizontal: 24, marginBottom: 28 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
            Post-session notes
          </Text>
          <TextInput
            style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, minHeight: 120, textAlignVertical: 'top' }}
            placeholder="What was covered, client response, homework assigned, follow-up actions..."
            placeholderTextColor={THEME.colors.textMuted}
            value={notesPost}
            onChangeText={setNotesPost}
            multiline
            maxLength={MAX_LENGTHS.longNote}
          />
        </View>

        {/* Save */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending}
          activeOpacity={0.85}
          style={{ marginHorizontal: 24, backgroundColor: saved ? THEME.colors.success : THEME.colors.amber, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
        >
          {isPending ? (
            <ActivityIndicator color={THEME.colors.background} />
          ) : (
            <Text style={{ color: THEME.colors.background, fontFamily: THEME.fonts.sansMedium, fontSize: 16 }}>
              {saved ? '✓ Saved' : 'Save notes'}
            </Text>
          )}
        </TouchableOpacity>

      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
