import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAdminAssessments, useAssessmentDetail } from '@/hooks/useAdmin';
import { THEME } from '@/constants/theme';

// ── Assessment list screen ────────────────────────────────────────────────────
export default function AssessmentsScreen() {
  const router = useRouter();
  const { data: assessments = [], isLoading } = useAdminAssessments();
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('all');

  const filtered = assessments.filter((a: any) =>
    filter === 'all' ? true : a.status === filter
  );

  const pending  = assessments.filter((a: any) => a.status === 'pending').length;
  const reviewed = assessments.filter((a: any) => a.status !== 'pending').length;

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
        <View>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 26 }}>Assessments</Text>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13, marginTop: 2 }}>
            {pending > 0 ? `${pending} pending review` : 'All reviewed'}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 24, marginBottom: 16 }}>
        {[
          { label: 'Total', value: assessments.length, color: THEME.colors.teal },
          { label: 'Pending', value: pending, color: THEME.colors.amber },
          { label: 'Reviewed', value: reviewed, color: '#34D399' },
        ].map(s => (
          <View key={s.label} style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
            <Text style={{ fontSize: 22, fontFamily: THEME.fonts.sansMedium, color: s.color }}>{s.value}</Text>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter pills */}
      <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 24, marginBottom: 16 }}>
        {(['all', 'pending', 'reviewed'] as const).map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={{ paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: filter === f ? THEME.colors.teal : THEME.colors.surface2, borderWidth: 0.5, borderColor: filter === f ? THEME.colors.teal : THEME.colors.border }}
          >
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: filter === f ? THEME.colors.background : THEME.colors.textMuted, textTransform: 'capitalize' }}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>📋</Text>
              <Text style={{ fontSize: 16, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>No assessments yet</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {filtered.map((assessment: any) => (
                <TouchableOpacity
                  key={assessment.id}
                  onPress={() => router.push({ pathname: '/(admin)/assessment-detail', params: { id: assessment.id, clientName: assessment.client_name } })}
                  activeOpacity={0.8}
                  style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: assessment.status === 'pending' ? `${THEME.colors.amber}40` : THEME.colors.border }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: `${THEME.colors.teal}20`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>
                        {assessment.client_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
                        {assessment.client_name}
                      </Text>
                      <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
                        {assessment.coach_name ? `Coach: ${assessment.coach_name}` : 'No coach assigned'}
                        {' · '}
                        {new Date(assessment.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <View style={{ backgroundColor: assessment.status === 'pending' ? `${THEME.colors.amber}20` : '#34D39920', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: assessment.status === 'pending' ? THEME.colors.amber : '#34D399', textTransform: 'capitalize' }}>
                          {assessment.status}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>View →</Text>
                    </View>
                  </View>

                  {/* Goal tags */}
                  {assessment.primary_goal && (
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      <View style={{ backgroundColor: `${THEME.colors.teal}15`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.teal }}>
                          🎯 {assessment.primary_goal?.replace(/_/g, ' ')}
                        </Text>
                      </View>
                      {assessment.occupation_type && (
                        <View style={{ backgroundColor: '#1A1A1E', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                            💼 {assessment.occupation_type?.replace(/_/g, ' ')}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
