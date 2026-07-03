import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { THEME } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import {
  useSupplementSchedules,
  useClientAllAdherenceMarks,
  SupplementSchedule,
} from '@/hooks/useSupplementSchedule';
import { SupplementCalendar } from './SupplementCalendar';
import { SupplementScheduleForm } from './SupplementScheduleForm';

// â”€â”€ Shared component used by client self-view AND coach/admin view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// clientId: undefined = logged-in client's own view; string = coach/admin sees this client
interface Props {
  clientId?: string;
  readOnly?: boolean;       // coach/admin can't tick marks for the client
  showAddButton?: boolean;  // hide "Add schedule" on coach view if preferred
}

function todayMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function SupplementsAdherenceTab({ clientId, readOnly = false, showAddButton = true }: Props) {
  const { user } = useAuth();
  const resolvedClientId = clientId ?? user?.id ?? '';

  const { data: schedules = [], isLoading } = useSupplementSchedules(clientId);
  const [selectedId, setSelectedId]         = useState<string | null>(null);
  const [showForm, setShowForm]             = useState(false);
  const [viewMonth]                         = useState(todayMonthStr);

  // Fetch ALL marks for the client's schedules at once (single query)
  const { data: allMarks = {} } = useClientAllAdherenceMarks(
    resolvedClientId,
    viewMonth
  );

  // Only show active schedules in the tab bar; inactive ones are still
  // accessible historically but not shown unless the user asks for them.
  const activeSchedules = schedules.filter(s => s.is_active);
  const selected: SupplementSchedule | undefined =
    schedules.find(s => s.id === selectedId) ??
    (activeSchedules.length > 0 ? activeSchedules[0] : undefined);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
        <ActivityIndicator color={THEME.colors.teal} />
      </View>
    );
  }

  if (activeSchedules.length === 0 && !showAddButton) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, textAlign: 'center' }}>
          No supplement schedules yet
        </Text>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', marginTop: 6 }}>
          The client hasn't added any supplement schedules to track.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Header row */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
      }}>
        <Text style={{
          fontSize: 11, fontFamily: THEME.fonts.sansMedium,
          color: THEME.colors.textMuted,
          letterSpacing: 0.7, textTransform: 'uppercase',
        }}>
          Supplement Adherence
        </Text>
        {showAddButton && (
          <TouchableOpacity
            onPress={() => setShowForm(true)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: `${THEME.colors.teal}20`,
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
            }}
          >
            <Text style={{ fontSize: 16, color: THEME.colors.teal, lineHeight: 18 }}>+</Text>
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>
              Add schedule
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {activeSchedules.length === 0 ? (
        /* Empty state when user has the add button */
        <View style={{ paddingVertical: 40, alignItems: 'center', paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 32, marginBottom: 12 }}>ðŸ’Š</Text>
          <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, textAlign: 'center' }}>
            No supplement schedules yet
          </Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 19 }}>
            Add a schedule to start tracking daily adherence on a calendar â€” tap a day to mark it taken.
          </Text>
          <TouchableOpacity
            onPress={() => setShowForm(true)}
            style={{
              marginTop: 20, backgroundColor: THEME.colors.teal,
              borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
            }}
          >
            <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: '#fff' }}>
              Add first supplement
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Horizontal scrollable supplement tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 4, gap: 8, flexDirection: 'row' }}
            style={{ flexGrow: 0 }}
          >
            {activeSchedules.map(sc => {
              const isSelected = (selected?.id === sc.id);
              return (
                <TouchableOpacity
                  key={sc.id}
                  onPress={() => setSelectedId(sc.id)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                    backgroundColor: isSelected
                      ? (THEME.colors.teal)
                      : THEME.colors.surface2,
                    borderWidth: isSelected ? 0 : 0.5,
                    borderColor: THEME.colors.border,
                  }}
                >
                  <Text style={{
                    fontSize: 13,
                    fontFamily: isSelected ? THEME.fonts.sansMedium : THEME.fonts.sans,
                    color: isSelected ? '#fff' : THEME.colors.textSecondary,
                    maxWidth: 140,
                  }} numberOfLines={1}>
                    {sc.supplement_name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Calendar for selected supplement */}
          {selected && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
            >
              {/* Card */}
              <View style={{
                backgroundColor: THEME.colors.surface2,
                borderRadius: 16, padding: 20,
                borderWidth: 0.5, borderColor: THEME.colors.border,
              }}>
                {/* Supplement name header */}
                <Text style={{
                  fontSize: 15, fontFamily: THEME.fonts.sansMedium,
                  color: THEME.colors.textPrimary, marginBottom: 4,
                }}>
                  {selected.supplement_name}
                </Text>
                <Text style={{
                  fontSize: 11, fontFamily: THEME.fonts.sans,
                  color: THEME.colors.textMuted, marginBottom: 18,
                }}>
                  {selected.schedule_type === 'daily' && 'Every day'}
                  {selected.schedule_type === 'weekdays' && `${['Su','Mo','Tu','We','Th','Fr','Sa'].filter((_, i) => selected.weekdays.includes(i)).join(', ')}`}
                  {selected.schedule_type === 'date_range' && 'Date range'}
                  {' Â· Since '}
                  {new Date(selected.start_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>

                <SupplementCalendar
                  schedule={selected}
                  externalMarks={allMarks[selected.id]}
                  clientId={clientId}
                  readOnly={readOnly}
                />
              </View>

              {/* Inactive schedules (historical) */}
              {schedules.filter(s => !s.is_active).length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <Text style={{
                    fontSize: 11, fontFamily: THEME.fonts.sansMedium,
                    color: THEME.colors.textMuted, letterSpacing: 0.7,
                    textTransform: 'uppercase', marginBottom: 10,
                  }}>
                    Past schedules
                  </Text>
                  {schedules.filter(s => !s.is_active).map(sc => (
                    <TouchableOpacity
                      key={sc.id}
                      onPress={() => setSelectedId(sc.id)}
                      style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingVertical: 12, paddingHorizontal: 14,
                        backgroundColor: THEME.colors.surface2, borderRadius: 10,
                        borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 8,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary }}>
                          {sc.supplement_name}
                        </Text>
                        <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                          {sc.start_date} â†’ {sc.end_date ?? 'ended'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.teal }}>
                        View history â€º
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* Schedule creation form */}
      <SupplementScheduleForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        clientId={clientId}
        existingSchedules={schedules}
      />
    </View>
  );
}

