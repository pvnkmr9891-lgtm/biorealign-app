import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useWeeklyDigest, useGenerateWeeklyDigest } from '@/hooks/useWeeklyDigest';
import { THEME } from '@/constants/theme';

// AI weekly digest for one client — summary, wins/concerns, and a suggested
// check-in message the coach can copy into the chat. Cached per week; the
// refresh icon force-regenerates.
export function WeeklyDigestCard({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: digest, isLoading } = useWeeklyDigest(clientId);
  const generate = useGenerateWeeklyDigest(clientId);
  const [copied, setCopied] = useState(false);

  const busy = generate.isPending;

  async function copyMessage() {
    if (!digest?.suggested_message) return;
    await Clipboard.setStringAsync(digest.suggested_message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginTop: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>✨ Weekly digest</Text>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>AI summary of this week — review before acting on it</Text>
        </View>
        {digest && !busy && (
          <TouchableOpacity onPress={() => generate.mutate({ force: true })} hitSlop={8}>
            <Text style={{ fontSize: 15 }}>🔄</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginVertical: 16 }} />
      ) : !digest ? (
        <TouchableOpacity
          onPress={() => generate.mutate({})}
          disabled={busy}
          activeOpacity={0.85}
          style={{ backgroundColor: busy ? THEME.colors.surface3 : `${THEME.colors.teal}22`, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12, borderWidth: 0.5, borderColor: `${THEME.colors.teal}55` }}
        >
          {busy ? (
            <ActivityIndicator color={THEME.colors.teal} size="small" />
          ) : (
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Generate this week's digest</Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={{ marginTop: 12, gap: 10 }}>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 19 }}>{digest.summary}</Text>

          {digest.wins?.length > 0 && (
            <View style={{ gap: 3 }}>
              {digest.wins.map((w, i) => (
                <Text key={i} style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: '#34D399' }}>✓ {w}</Text>
              ))}
            </View>
          )}
          {digest.concerns?.length > 0 && (
            <View style={{ gap: 3 }}>
              {digest.concerns.map((c, i) => (
                <Text key={i} style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: THEME.colors.amber }}>! {c}</Text>
              ))}
            </View>
          )}

          {digest.suggested_message && (
            <View style={{ backgroundColor: THEME.colors.surface3, borderRadius: 10, padding: 12 }}>
              <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 5 }}>SUGGESTED MESSAGE — EDIT BEFORE SENDING</Text>
              <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, fontStyle: 'italic', lineHeight: 18 }}>
                "{digest.suggested_message}"
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TouchableOpacity onPress={copyMessage} style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary }}>{copied ? 'Copied ✓' : 'Copy'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/(coach)/messaging', params: { coachId: user?.id, clientId, clientName } })}
                  style={{ flex: 1, backgroundColor: `${THEME.colors.teal}22`, borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 0.5, borderColor: `${THEME.colors.teal}55` }}
                >
                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Open chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {generate.isError && (
        <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.error, marginTop: 8 }}>
          Couldn't generate the digest — try again in a moment.
        </Text>
      )}
    </View>
  );
}
