import { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSendBroadcast } from '@/hooks/useAdmin';
import { THEME } from '@/constants/theme';

const TEMPLATES = [
  { label: 'Check-in reminder',    title: 'Daily check-in',        body: "Don't forget to log today's metrics. Your consistency is your protocol." },
  { label: 'Session reminder',     title: 'Session coming up',     body: 'You have a coaching session scheduled. Be ready 5 minutes early.' },
  { label: 'Weekly motivation',    title: 'Weekly progress update', body: "Another week of transformation. Review your progress and keep going." },
  { label: 'Protocol reminder',    title: 'Complete your protocol', body: "Your daily protocol is waiting. Even 20 minutes today compounds over weeks." },
];

export default function BroadcastScreen() {
  const router = useRouter();
  const { mutateAsync: sendBroadcast, isPending } = useSendBroadcast();
  const [title, setTitle]     = useState('');
  const [body, setBody]       = useState('');
  const [segment, setSegment] = useState<'all' | 'active'>('active');
  const [sent, setSent]       = useState(false);

  const handleSend = () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Missing fields', 'Please fill in both title and message.');
      return;
    }
    Alert.alert(
      'Confirm broadcast',
      `Send "${title}" to all ${segment} clients?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            await sendBroadcast({ title: title.trim(), body: body.trim(), segment });
            setSent(true);
            setTitle('');
            setBody('');
            setTimeout(() => setSent(false), 3000);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
          >
            <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 28 }}>Broadcast</Text>
            <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13 }}>Send push notification to clients</Text>
          </View>
        </View>

        {/* Segment selector */}
        <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
            Recipients
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['active', 'all'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setSegment(s)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: segment === s ? THEME.colors.textPrimary : THEME.colors.surface2, borderWidth: 0.5, borderColor: segment === s ? THEME.colors.textPrimary : THEME.colors.border, alignItems: 'center' }}
              >
                <Text style={{ color: segment === s ? THEME.colors.background : THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>
                  {s === 'active' ? 'Active clients' : 'All users'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Templates */}
        <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
            Quick templates
          </Text>
          <View style={{ gap: 8 }}>
            {TEMPLATES.map((t) => (
              <TouchableOpacity
                key={t.label}
                onPress={() => { setTitle(t.title); setBody(t.body); }}
                activeOpacity={0.8}
                style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}
              >
                <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>{t.label}</Text>
                <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>{t.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Compose */}
        <View style={{ marginHorizontal: 24, marginBottom: 20 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
            Notification title
          </Text>
          <TextInput
            style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 13, borderWidth: 0.5, borderColor: THEME.colors.border, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 15 }}
            placeholder="e.g. Daily check-in reminder"
            placeholderTextColor={THEME.colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={{ marginHorizontal: 24, marginBottom: 28 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
            Message
          </Text>
          <TextInput
            style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 13, borderWidth: 0.5, borderColor: THEME.colors.border, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 15, minHeight: 100, textAlignVertical: 'top' }}
            placeholder="Your message to clients..."
            placeholderTextColor={THEME.colors.textMuted}
            value={body}
            onChangeText={setBody}
            multiline
          />
        </View>

        {/* Send button */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={isPending || sent}
          activeOpacity={0.85}
          style={{ marginHorizontal: 24, backgroundColor: sent ? THEME.colors.success : THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
        >
          {isPending ? (
            <ActivityIndicator color={THEME.colors.background} />
          ) : (
            <Text style={{ color: THEME.colors.background, fontFamily: THEME.fonts.sansMedium, fontSize: 16 }}>
              {sent ? '✓ Sent successfully' : `Send to ${segment === 'active' ? 'active clients' : 'all users'}`}
            </Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
