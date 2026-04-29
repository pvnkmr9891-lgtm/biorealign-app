import { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useMessages, useSendMessage } from '@/hooks/useCoach';
import { THEME } from '@/constants/theme';

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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    await sendMessage({
      enrollmentId,
      receiverId: clientId,
      body,
    });
  };

  const isMine = (msg: any) => msg.sender_id === user?.id;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: THEME.colors.border }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
            <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.tealMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: `${THEME.colors.teal}30` }}>
            <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>
              {clientName?.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </Text>
          </View>
          <View>
            <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 16 }}>
              {clientName}
            </Text>
            <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sans, fontSize: 12 }}>
              Active client
            </Text>
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
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 20, gap: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
                <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 14, textAlign: 'center' }}>
                  No messages yet.{'\n'}Start the conversation with {clientName}.
                </Text>
              </View>
            ) : (
              messages.map((msg: any) => {
                const mine = isMine(msg);
                return (
                  <View key={msg.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                    {!mine && (
                      <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11, marginBottom: 4, marginLeft: 4 }}>
                        {msg.sender?.full_name}
                      </Text>
                    )}
                    <View style={{
                      maxWidth: '78%',
                      backgroundColor: mine ? THEME.colors.teal : THEME.colors.surface2,
                      borderRadius: 16,
                      borderBottomRightRadius: mine ? 4 : 16,
                      borderBottomLeftRadius:  mine ? 16 : 4,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderWidth: 0.5,
                      borderColor: mine ? THEME.colors.teal : THEME.colors.border,
                    }}>
                      <Text style={{ color: mine ? THEME.colors.background : THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 15, lineHeight: 22 }}>
                        {msg.body}
                      </Text>
                    </View>
                    <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 10, marginTop: 4, marginHorizontal: 4 }}>
                      {new Date(msg.sent_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Input */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 0.5, borderTopColor: THEME.colors.border, backgroundColor: THEME.colors.background }}>
          <TextInput
            style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 0.5, borderColor: THEME.colors.border, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 15, maxHeight: 100 }}
            placeholder="Type a message..."
            placeholderTextColor={THEME.colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={isPending || !text.trim()}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? THEME.colors.teal : THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: text.trim() ? THEME.colors.teal : THEME.colors.border }}
          >
            {isPending ? (
              <ActivityIndicator color={THEME.colors.background} size="small" />
            ) : (
              <Text style={{ fontSize: 18 }}>↑</Text>
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
