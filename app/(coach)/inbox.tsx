import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCoachInbox } from '@/hooks/useCoach';
import { THEME } from '@/constants/theme';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);

  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function CoachInboxScreen() {
  const router = useRouter();
  const { data: conversations = [], isLoading, refetch } = useCoachInbox();

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>

      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 26 }}>Messages</Text>
          {totalUnread > 0 && (
            <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sans, fontSize: 13, marginTop: 2 }}>
              {totalUnread} unread message{totalUnread > 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => refetch()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ fontSize: 16 }}>↻</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={THEME.colors.teal} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>💬</Text>
          <Text style={{ fontSize: 20, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
            No conversations yet
          </Text>
          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', lineHeight: 22 }}>
            Conversations with your assigned clients will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {conversations.map((conv) => {
            const hasUnread  = conv.unreadCount > 0;
            const initials   = conv.clientName.split(' ').map((n: string) => n[0]).slice(0, 2).join('');
            const isMyMsg    = conv.lastMessage?.sender_id !== conv.clientId;

            return (
              <TouchableOpacity
                key={conv.clientId}
                onPress={() => router.push({
                  pathname: '/(coach)/messaging',
                  params: {
                    coachId: conv.coachId,
                    clientId: conv.clientId,
                    clientName: conv.clientName,
                  },
                })}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 24,
                  paddingVertical: 14,
                  borderBottomWidth: 0.5,
                  borderBottomColor: THEME.colors.border,
                  backgroundColor: hasUnread ? `${THEME.colors.teal}05` : 'transparent',
                }}
              >
                {/* Avatar */}
                <View style={{ position: 'relative', marginRight: 14 }}>
                  <View style={{
                    width: 50, height: 50, borderRadius: 25,
                    backgroundColor: `${THEME.colors.teal}20`,
                    borderWidth: 1.5,
                    borderColor: hasUnread ? THEME.colors.teal : `${THEME.colors.teal}30`,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>
                      {initials}
                    </Text>
                  </View>
                  {/* Online indicator */}
                  <View style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#34D399', borderWidth: 2, borderColor: THEME.colors.background }} />
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 15, fontFamily: hasUnread ? THEME.fonts.sansMedium : THEME.fonts.sans, color: THEME.colors.textPrimary }}>
                      {conv.clientName}
                    </Text>
                    {conv.lastMessage && (
                      <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: hasUnread ? THEME.colors.teal : THEME.colors.textMuted }}>
                        {timeAgo(conv.lastMessage.sent_at)}
                      </Text>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontFamily: hasUnread ? THEME.fonts.sansMedium : THEME.fonts.sans,
                        color: hasUnread ? THEME.colors.textPrimary : THEME.colors.textMuted,
                        marginRight: 8,
                      }}
                    >
                      {conv.lastMessage
                        ? `${isMyMsg ? 'You: ' : ''}${conv.lastMessage.body}`
                        : 'No messages yet — say hello!'
                      }
                    </Text>

                    {hasUnread && (
                      <View style={{ backgroundColor: THEME.colors.teal, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                        <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>
                          {conv.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
