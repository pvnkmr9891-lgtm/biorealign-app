import { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useMessages, useSendMessage, useMarkMessagesRead } from '@/hooks/useCoach';
import { THEME } from '@/constants/theme';

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

// Group messages by date
function groupByDate(messages: any[]) {
  const groups: { date: string; messages: any[] }[] = [];
  let currentDate = '';

  messages.forEach(msg => {
    const msgDate = new Date(msg.sent_at).toDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groups.push({ date: msg.sent_at, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  });

  return groups;
}

export default function MessagingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { enrollmentId, clientId, clientName } = useLocalSearchParams<{
    enrollmentId: string;
    clientId: string;
    clientName: string;
  }>();

  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const { data: messages = [], isLoading } = useMessages(enrollmentId);
  const { mutateAsync: sendMessage, isPending } = useSendMessage();
  const { mutate: markRead } = useMarkMessagesRead();

  // Mark messages as read when screen opens
  useEffect(() => {
    if (enrollmentId && messages.length > 0) {
      markRead(enrollmentId);
    }
  }, [enrollmentId, messages.length]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || isPending) return;
    setText('');
    await sendMessage({ enrollmentId, receiverId: clientId, body });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const isMine = (msg: any) => msg.sender_id === user?.id;
  const grouped = groupByDate(messages);

  const initials = (clientName ?? '')
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: THEME.colors.border, backgroundColor: THEME.colors.background }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
          >
            <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
          </TouchableOpacity>

          {/* Avatar */}
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${THEME.colors.teal}20`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${THEME.colors.teal}40` }}>
            <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>{initials}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 16 }}>
              {clientName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#34D399' }} />
              <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sans, fontSize: 12 }}>Active client</Text>
            </View>
          </View>
        </View>

        {/* Messages */}
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={THEME.colors.teal} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 }}>
                <Text style={{ fontSize: 40, marginBottom: 16 }}>👋</Text>
                <Text style={{ fontSize: 18, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
                  Start the conversation
                </Text>
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
                  Send {clientName} a message to kick off their coaching journey.
                </Text>
              </View>
            ) : (
              grouped.map((group) => (
                <View key={group.date}>
                  {/* Date divider */}
                  <View style={{ alignItems: 'center', marginVertical: 16 }}>
                    <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                      <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>
                        {formatDateDivider(group.date)}
                      </Text>
                    </View>
                  </View>

                  {/* Messages in this group */}
                  {group.messages.map((msg: any, idx: number) => {
                    const mine = isMine(msg);
                    const isRead = mine && msg.read_at;
                    const showAvatar = !mine && (idx === 0 || group.messages[idx - 1]?.sender_id !== msg.sender_id);

                    return (
                      <View key={msg.id} style={{ marginBottom: 4, alignItems: mine ? 'flex-end' : 'flex-start' }}>
                        {/* Sender name for non-mine consecutive messages */}
                        {showAvatar && (
                          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 4, marginLeft: 4 }}>
                            {clientName}
                          </Text>
                        )}

                        <View style={{
                          maxWidth: '78%',
                          backgroundColor: mine ? THEME.colors.teal : THEME.colors.surface2,
                          borderRadius: 18,
                          borderBottomRightRadius: mine ? 4 : 18,
                          borderBottomLeftRadius:  mine ? 18 : 4,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderWidth: 0.5,
                          borderColor: mine ? THEME.colors.teal : THEME.colors.border,
                          shadowColor: mine ? THEME.colors.teal : 'transparent',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: mine ? 2 : 0,
                        }}>
                          <Text style={{
                            color: mine ? THEME.colors.background : THEME.colors.textPrimary,
                            fontFamily: THEME.fonts.sans,
                            fontSize: 15,
                            lineHeight: 22,
                          }}>
                            {msg.body}
                          </Text>
                        </View>

                        {/* Time + read receipt */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, marginHorizontal: 4 }}>
                          <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                            {formatTime(msg.sent_at)}
                          </Text>
                          {mine && (
                            <Text style={{ fontSize: 10, color: isRead ? THEME.colors.teal : THEME.colors.textMuted }}>
                              {isRead ? '✓✓' : '✓'}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* Input bar */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12, borderTopWidth: 0.5, borderTopColor: THEME.colors.border, backgroundColor: THEME.colors.background }}>
          <TextInput
            style={{
              flex: 1,
              backgroundColor: THEME.colors.surface2,
              borderRadius: 24,
              paddingHorizontal: 18,
              paddingVertical: 12,
              borderWidth: 0.5,
              borderColor: text.trim() ? `${THEME.colors.teal}60` : THEME.colors.border,
              color: THEME.colors.textPrimary,
              fontFamily: THEME.fonts.sans,
              fontSize: 15,
              maxHeight: 100,
            }}
            placeholder="Type a message..."
            placeholderTextColor={THEME.colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={isPending || !text.trim()}
            activeOpacity={0.8}
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: text.trim() ? THEME.colors.teal : THEME.colors.surface2,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 0.5,
              borderColor: text.trim() ? THEME.colors.teal : THEME.colors.border,
              shadowColor: text.trim() ? THEME.colors.teal : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: text.trim() ? 4 : 0,
            }}
          >
            {isPending ? (
              <ActivityIndicator color={THEME.colors.background} size="small" />
            ) : (
              <Text style={{ fontSize: 18, color: text.trim() ? THEME.colors.background : THEME.colors.textMuted }}>↑</Text>
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
