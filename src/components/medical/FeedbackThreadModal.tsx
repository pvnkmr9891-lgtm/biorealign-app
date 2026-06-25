import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentFeedback, useSendDocumentFeedback, useMarkFeedbackRead } from '@/hooks/useMedicalDocuments';
import { THEME } from '@/constants/theme';

// Tracks which open document threads have already been marked read this
// session, so re-renders don't keep re-firing the mark-read mutation.
const markedRead = new Set<string>();

export function FeedbackThreadModal({
  visible, onClose, documentId, clientId, coachId, filename,
}: {
  visible: boolean; onClose: () => void;
  documentId: string | null; clientId: string; coachId?: string; filename?: string;
}) {
  const { role } = useAuth();
  const { data: thread = [], isLoading } = useDocumentFeedback(documentId ?? '');
  const { mutateAsync: send, isPending: sending } = useSendDocumentFeedback();
  const { mutate: markRead } = useMarkFeedbackRead();
  const [message, setMessage] = useState('');

  if (visible && documentId && !markedRead.has(documentId)) {
    markedRead.add(documentId);
    markRead({ documentId, clientId });
  }

  async function onSend() {
    if (!documentId || !message.trim()) return;
    const text = message.trim();
    setMessage('');
    try {
      await send({ documentId, clientId, coachId, message: text });
    } catch {
      setMessage(text);
    }
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '85%' }}>
        <View style={{ backgroundColor: THEME.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 24, maxHeight: '85%' }}>
          <Text numberOfLines={1} style={{ fontSize: 16, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginBottom: 12 }}>
            💬 Feedback {filename ? `· ${filename}` : ''}
          </Text>

          {isLoading ? (
            <ActivityIndicator color={THEME.colors.teal} style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {thread.length === 0 ? (
                <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', paddingVertical: 16 }}>
                  No messages yet.
                </Text>
              ) : (
                thread.map((m, i) => {
                  const isMine = m.sender_role === role;
                  const created = new Date(m.created_at);
                  const prevCreated = i > 0 ? new Date(thread[i - 1].created_at) : null;
                  const isNewDay = !prevCreated || created.toDateString() !== prevCreated.toDateString();
                  return (
                    <View key={m.id}>
                      {isNewDay && (
                        <View style={{ alignItems: 'center', marginVertical: 10 }}>
                          <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, backgroundColor: THEME.colors.surface2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                            {created.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </Text>
                        </View>
                      )}
                      <View style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '85%', marginBottom: 10 }}>
                        <View style={{ backgroundColor: isMine ? THEME.colors.teal : THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: isMine ? 0 : 0.5, borderColor: THEME.colors.border }}>
                          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: isMine ? THEME.colors.background : THEME.colors.textPrimary, lineHeight: 19 }}>{m.message}</Text>
                        </View>
                        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 3, textAlign: isMine ? 'right' : 'left' }}>
                          {m.sender_role === 'coach' ? 'Coach' : 'You'} · {created.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 14 }}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Write a message..."
              placeholderTextColor={THEME.colors.textMuted}
              multiline
              style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, color: THEME.colors.textPrimary, fontSize: 13, fontFamily: THEME.fonts.sans, maxHeight: 100, borderWidth: 0.5, borderColor: THEME.colors.border }}
            />
            <TouchableOpacity onPress={onSend} disabled={sending || !message.trim()} style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, opacity: sending || !message.trim() ? 0.5 : 1 }}>
              {sending ? <ActivityIndicator color={THEME.colors.background} size="small" /> : <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Send</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
