import { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '@/hooks/useAuth';
import { useMessages, useSendMessage, useMarkMessagesRead, uploadChatAttachment } from '@/hooks/useCoach';
import { FadeInUp } from '@/components/ui/FadeInUp';
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
  const { coachId, clientId, clientName, prefill } = useLocalSearchParams<{
    coachId: string;
    clientId: string;
    clientName: string;
    prefill?: string;
  }>();

  // Prefill (kudos / check-in nudge from the dashboard) — editable, not
  // auto-sent, so the coach can personalize before hitting send.
  const [text, setText] = useState(typeof prefill === 'string' ? prefill : '');
  const scrollRef = useRef<ScrollView>(null);

  const { data: messages = [], isLoading } = useMessages(coachId, clientId);
  const { mutateAsync: sendMessage, isPending } = useSendMessage();
  const { mutate: markRead } = useMarkMessagesRead();

  // Mark messages as read when screen opens
  useEffect(() => {
    if (coachId && clientId && messages.length > 0) {
      markRead({ coachId, clientId });
    }
  }, [coachId, clientId, messages.length]);

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
    await sendMessage({ coachId, clientId, receiverId: clientId, body });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const [attaching, setAttaching] = useState(false);
  const handleAttach = async () => {
    if (attaching || !coachId || !clientId || !user?.id) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled || !res.assets?.[0]) return;
    setAttaching(true);
    try {
      const small = await ImageManipulator.manipulateAsync(res.assets[0].uri, [{ resize: { width: 1280 } }], { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG });
      const path = await uploadChatAttachment(user.id, small.uri);
      const caption = text.trim();
      setText('');
      await sendMessage({ coachId, clientId, receiverId: clientId, body: caption, attachmentPath: path });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      Alert.alert('Could not send photo', e?.message ?? 'Please try again.');
    } finally {
      setAttaching(false);
    }
  };

  const isMine = (msg: any) => msg.sender_id === user?.id;
  const grouped = groupByDate(messages);

  const initials = (clientName ?? '')
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('');

  return (
    <SafeAreaView testID="coach-messaging-screen" style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >

        {/* Header */}
        <FadeInUp delay={0} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: THEME.colors.background, ...THEME.glow.soft, shadowOpacity: 0.15 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
          >
            <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
          </TouchableOpacity>

          {/* Avatar */}
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: `${THEME.colors.teal}18`, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: THEME.colors.teal, ...THEME.glow.teal }}>
            <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>{initials}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: THEME.type.h2 * 0.73 }}>
              {clientName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#34D399' }} />
              <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sans, fontSize: THEME.type.caption - 1 }}>Active client</Text>
            </View>
          </View>
        </FadeInUp>

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
                    <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: THEME.radius.full, paddingHorizontal: 12, paddingVertical: 4 }}>
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
                          borderRadius: 20,
                          borderBottomRightRadius: mine ? 4 : 20,
                          borderBottomLeftRadius:  mine ? 20 : 4,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          shadowColor: mine ? THEME.colors.teal : '#000',
                          shadowOffset: { width: 0, height: mine ? 0 : 3 },
                          shadowOpacity: mine ? 0.35 : 0.2,
                          shadowRadius: mine ? 10 : 6,
                          elevation: mine ? 4 : 1,
                        }}>
                          {msg.attachmentUrl && (
                            <TouchableOpacity activeOpacity={0.9} onPress={() => Linking.openURL(msg.attachmentUrl)}>
                              <Image source={{ uri: msg.attachmentUrl }} style={{ width: 210, height: 210, borderRadius: 12, marginBottom: msg.body ? 8 : 0 }} resizeMode="cover" />
                            </TouchableOpacity>
                          )}
                          {!!msg.body && (
                            <Text style={{
                              color: mine ? THEME.colors.background : THEME.colors.textPrimary,
                              fontFamily: THEME.fonts.sans,
                              fontSize: 15,
                              lineHeight: 22,
                            }}>
                              {msg.body}
                            </Text>
                          )}
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
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12, backgroundColor: THEME.colors.background, ...THEME.glow.soft, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15 }}>
          <TouchableOpacity
            onPress={handleAttach}
            disabled={attaching}
            activeOpacity={0.8}
            style={{ width: 46, height: 46, borderRadius: THEME.radius.full, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center' }}
          >
            {attaching
              ? <ActivityIndicator color={THEME.colors.teal} size="small" />
              : <Text style={{ fontSize: 17 }}>📷</Text>}
          </TouchableOpacity>
          <TextInput
            testID="message-input"
            style={{
              flex: 1,
              backgroundColor: THEME.colors.surface2,
              borderRadius: THEME.radius.full,
              paddingHorizontal: 18,
              paddingVertical: 12,
              borderWidth: 1.5,
              borderColor: text.trim() ? `${THEME.colors.teal}80` : 'transparent',
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
            testID="message-send-button"
            onPress={handleSend}
            disabled={isPending || !text.trim()}
            activeOpacity={0.8}
            style={[
              { width: 46, height: 46, borderRadius: THEME.radius.full, backgroundColor: text.trim() ? THEME.colors.teal : THEME.colors.surface2, alignItems: 'center', justifyContent: 'center' },
              !!text.trim() && THEME.glow.teal,
            ]}
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
