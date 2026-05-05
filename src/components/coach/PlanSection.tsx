// ============================================================
// ADD THIS COMPONENT to your existing app/(coach)/client-detail.tsx
// Insert it wherever you want the plan section to appear
// (typically after the client info section)
// ============================================================

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useClientPlansForCoach } from '@/hooks/usePlans';
import { THEME } from '@/constants/theme';

const STATUS_COLOR: Record<string, string> = {
  draft:     '#6B6B70',
  active:    '#00C4B4',
  completed: '#E8A44A',
  archived:  '#6B6B70',
};

const STATUS_LABEL: Record<string, string> = {
  draft:     'Draft',
  active:    '✓ Active',
  completed: 'Completed',
  archived:  'Archived',
};

interface PlanSectionProps {
  clientId: string;
  clientName: string;
}

export function PlanSection({ clientId, clientName }: PlanSectionProps) {
  const router = useRouter();
  const { data: plans = [], isLoading } = useClientPlansForCoach(clientId);

 const activePlan = (plans ?? []).find((p: any) => p.status === 'active');

  return (
    <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
      {/* Section header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          Personalised Plan
        </Text>
        <TouchableOpacity
          onPress={() => router.push({
            pathname: '/(coach)/plan-builder',
            params: { clientId, clientName },
          })}
          style={{ backgroundColor: `${THEME.colors.teal}20`, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 12 }}>
            + New Plan
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} />
      ) : plans.length === 0 ? (
        // No plan yet — prominent CTA
        <TouchableOpacity
          onPress={() => router.push({
            pathname: '/(coach)/plan-builder',
            params: { clientId, clientName },
          })}
          activeOpacity={0.85}
          style={{
            backgroundColor: THEME.colors.surface2,
            borderRadius: 14,
            padding: 20,
            borderWidth: 1.5,
            borderColor: `${THEME.colors.teal}40`,
            borderStyle: 'dashed',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 28, marginBottom: 10 }}>📋</Text>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 15, marginBottom: 4 }}>
            Build their plan
          </Text>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13, textAlign: 'center' }}>
            Create a personalised multi-track plan for {clientName}
          </Text>
        </TouchableOpacity>
      ) : (
        // Show plans list
        <View style={{ gap: 10 }}>
          {(plans ?? []).map((plan: any) => (
            <TouchableOpacity
              key={plan.id}
              activeOpacity={0.8}
              onPress={() => router.push({
                pathname: '/(coach)/plan-builder',
                params: { clientId, clientName, planId: plan.id },
              })}
              style={{
                backgroundColor: THEME.colors.surface2,
                borderRadius: 14,
                padding: 16,
                borderWidth: 0.5,
                borderColor: plan.status === 'active' ? `${THEME.colors.teal}40` : THEME.colors.border,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 15, marginBottom: 4 }}>
                  {plan.title}
                </Text>
                <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12 }}>
                  Phase {plan.current_phase}/{plan.total_phases}
                  {plan.start_date ? ` · Started ${new Date(plan.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View style={{ backgroundColor: `${STATUS_COLOR[plan.status]}20`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: STATUS_COLOR[plan.status] }}>
                    {STATUS_LABEL[plan.status]}
                  </Text>
                </View>
                <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11 }}>
                  Edit ›
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
