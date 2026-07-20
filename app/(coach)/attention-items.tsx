import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import {
  useCoachAttentionItems, ATTENTION_META, attentionItemRoute, AttentionItemType,
} from '@/hooks/useCoachDashboard';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { THEME } from '@/constants/theme';

// Full "Needs attention" list — everything the home panel truncates,
// grouped by type in severity order.
export default function AttentionItemsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: items = [], isLoading } = useCoachAttentionItems();

  // Preserve severity order: items arrive sorted, so first-seen type order is
  // already most-urgent-first.
  const groups: { type: AttentionItemType; items: typeof items }[] = [];
  for (const item of items) {
    const group = groups.find((g) => g.type === item.type);
    if (group) group.items.push(item);
    else groups.push({ type: item.type, items: [item] });
  }

  return (
    <SafeAreaView testID="coach-attention-items-screen" style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <FadeInUp delay={0} style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          testID="back-button"
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: THEME.type.h1, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>Needs Attention</Text>
          <Text style={{ fontSize: THEME.type.caption, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
            {items.length} {items.length === 1 ? 'item' : 'items'} across your clients
          </Text>
        </View>
      </FadeInUp>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.amber} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>✅</Text>
          <Text style={{ fontSize: 18, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center' }}>All clear</Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', marginTop: 6 }}>
            Nothing needs your attention right now.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {groups.map((group, gi) => {
            const meta = ATTENTION_META[group.type];
            return (
              <FadeInUp key={group.type} delay={gi * 60} style={{ marginBottom: 22 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Text style={{ fontSize: 13 }}>{meta.icon}</Text>
                  <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: THEME.type.micro, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                    {meta.groupLabel} · {group.items.length}
                  </Text>
                </View>
                <View style={{ gap: 8 }}>
                  {group.items.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      onPress={() => router.push(attentionItemRoute(item, user?.id) as any)}
                      style={{
                        backgroundColor: `${meta.color}12`,
                        borderRadius: THEME.radius.xl,
                        padding: 14,
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: 10,
                        shadowColor: meta.color,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.25,
                        shadowRadius: 12,
                        elevation: 4,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>
                          {item.title}
                        </Text>
                        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>
                          {item.subtitle}
                        </Text>
                      </View>
                      <Text style={{ color: THEME.colors.textMuted, fontSize: 16, marginTop: 2 }}>›</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </FadeInUp>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
