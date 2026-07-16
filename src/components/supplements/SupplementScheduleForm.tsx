import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, Modal, Pressable,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { THEME } from '@/constants/theme';
import {
  ScheduleType,
  DoseUnit,
  useCreateSupplementSchedule,
  useEndSupplementSchedule,
  SupplementSchedule,
} from '@/hooks/useSupplementSchedule';
import { DateField } from '@/components/ui/DateField';
import { MAX_LENGTHS, NUMERIC_RANGES, sanitizeDecimal, clampToRange } from '@/utils/validation';

const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DOSE_UNITS: DoseUnit[] = ['grams', 'scoops', 'pills', 'capsules', 'mg', 'ml', 'tbsp'];
const DOSE_UNIT_LABELS: Record<DoseUnit, string> = {
  grams: 'g', scoops: 'scoop(s)', pills: 'pill(s)', capsules: 'capsule(s)',
  mg: 'mg', ml: 'ml', tbsp: 'tbsp',
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  clientId?: string;          // coach/admin sets this; client omits it
  /** Pre-fill supplement name (e.g. from the grid cell) */
  defaultName?: string;
  /** Existing schedules â€” shown as "active" chips user can end */
  existingSchedules?: SupplementSchedule[];
}

export function SupplementScheduleForm({
  visible,
  onClose,
  clientId,
  defaultName = '',
  existingSchedules = [],
}: Props) {
  const [name, setName]               = useState(defaultName);
  const [scheduleType, setScheduleType] = useState<ScheduleType>('daily');
  const [weekdays, setWeekdays]       = useState<number[]>([]);
  const [doseAmount, setDoseAmount]   = useState('');
  const [doseUnit, setDoseUnit]       = useState<DoseUnit>('grams');
  const [startDate, setStartDate]     = useState(todayStr());
  const [endDate, setEndDate]         = useState('');

  const create = useCreateSupplementSchedule();
  const end    = useEndSupplementSchedule();

  function toggleWeekday(dow: number) {
    setWeekdays(prev => prev.includes(dow) ? prev.filter(d => d !== dow) : [...prev, dow]);
  }

  async function handleCreate() {
    if (!name.trim()) { Alert.alert('Name required', 'Enter the supplement name.'); return; }
    if (scheduleType === 'weekdays' && weekdays.length === 0) {
      Alert.alert('No days selected', 'Pick at least one weekday.');
      return;
    }
    if (endDate && startDate && endDate < startDate) {
      Alert.alert('Invalid dates', 'End date must be on or after the start date.');
      return;
    }
    try {
      await create.mutateAsync({
        clientId,
        supplement_name: name.trim(),
        schedule_type: scheduleType,
        weekdays: scheduleType === 'weekdays' ? weekdays : [],
        dose_amount: doseAmount ? clampToRange(Number(doseAmount), NUMERIC_RANGES.doseAmount) : null,
        dose_unit: doseAmount ? doseUnit : null,
        start_date: startDate || todayStr(),
        end_date: endDate || null,
      });
      onClose();
      // Reset
      setName(defaultName);
      setScheduleType('daily');
      setWeekdays([]);
      setDoseAmount('');
      setStartDate(todayStr());
      setEndDate('');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save schedule.');
    }
  }

  async function handleEnd(schedule: SupplementSchedule) {
    Alert.alert(
      'End schedule',
      `Stop tracking "${schedule.supplement_name}"? Past adherence data is kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End schedule',
          style: 'destructive',
          onPress: async () => {
            try {
              await end.mutateAsync({ id: schedule.id, clientId: schedule.client_id });
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  }

  const s = (
    size: number,
    weight: 'sans' | 'sansMedium' = 'sans',
    color: string = THEME.colors.textPrimary
  ) => ({ fontSize: size, fontFamily: THEME.fonts[weight], color });

  const inputStyle = {
    backgroundColor: THEME.colors.background,
    borderWidth: 0.5,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: THEME.colors.textPrimary,
    fontFamily: THEME.fonts.sans,
    fontSize: 14,
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: THEME.colors.surface }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          padding: 20, borderBottomWidth: 0.5, borderColor: THEME.colors.border,
        }}>
          <Text style={s(17, 'sansMedium')}>Add Supplement Schedule</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Text style={{ fontSize: 22, color: THEME.colors.textMuted }}>âœ•</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">

          {/* Active schedules â€” quick-end chips */}
          {existingSchedules.filter(s => s.is_active).length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ ...s(11, 'sansMedium', THEME.colors.textMuted), letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 10 }}>
                Currently active
              </Text>
              {existingSchedules.filter(sc => sc.is_active).map(sc => (
                <View key={sc.id} style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingVertical: 10, paddingHorizontal: 14,
                  backgroundColor: THEME.colors.surface2, borderRadius: 10,
                  borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 8,
                }}>
                  <View>
                    <Text style={s(13, 'sansMedium')}>{sc.supplement_name}</Text>
                    <Text style={s(11, 'sans', THEME.colors.textMuted)}>
                      Started {sc.start_date}{sc.dose_amount ? ` Â· ${sc.dose_amount} ${DOSE_UNIT_LABELS[sc.dose_unit as DoseUnit] ?? sc.dose_unit}/day` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleEnd(sc)} style={{
                    paddingHorizontal: 10, paddingVertical: 5,
                    backgroundColor: '#EF444420', borderRadius: 8,
                  }}>
                    <Text style={s(12, 'sansMedium', '#EF4444')}>End</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={{ height: 1, backgroundColor: THEME.colors.border, marginVertical: 16 }} />
            </View>
          )}

          {/* Supplement name */}
          <Text style={{ ...s(12, 'sansMedium', THEME.colors.textSecondary), marginBottom: 6 }}>Supplement name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Whey Protein, Vitamin D3"
            placeholderTextColor={THEME.colors.textMuted}
            maxLength={MAX_LENGTHS.supplementName}
            style={{ ...inputStyle, marginBottom: 18 }}
          />

          {/* Schedule type */}
          <Text style={{ ...s(12, 'sansMedium', THEME.colors.textSecondary), marginBottom: 8 }}>Frequency</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
            {(['daily', 'weekdays', 'date_range'] as ScheduleType[]).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setScheduleType(t)}
                style={{
                  flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center',
                  backgroundColor: scheduleType === t ? (THEME.colors.teal) : THEME.colors.surface2,
                  borderWidth: scheduleType === t ? 0 : 0.5,
                  borderColor: THEME.colors.border,
                }}
              >
                <Text style={s(12, scheduleType === t ? 'sansMedium' : 'sans', scheduleType === t ? '#fff' : THEME.colors.textSecondary)}>
                  {t === 'daily' ? 'Every day' : t === 'weekdays' ? 'Specific days' : 'Date range'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Weekday picker */}
          {scheduleType === 'weekdays' && (
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 18, justifyContent: 'center' }}>
              {DOW_LABELS.map((label, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => toggleWeekday(i)}
                  style={{
                    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: weekdays.includes(i) ? (THEME.colors.teal) : THEME.colors.surface2,
                    borderWidth: weekdays.includes(i) ? 0 : 0.5,
                    borderColor: THEME.colors.border,
                  }}
                >
                  <Text style={s(12, weekdays.includes(i) ? 'sansMedium' : 'sans', weekdays.includes(i) ? '#fff' : THEME.colors.textMuted)}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Dose */}
          <Text style={{ ...s(12, 'sansMedium', THEME.colors.textSecondary), marginBottom: 8 }}>Dose (optional)</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
            <TextInput
              value={doseAmount}
              onChangeText={(t) => setDoseAmount(sanitizeDecimal(t))}
              placeholder="Amount"
              placeholderTextColor={THEME.colors.textMuted}
              keyboardType="numeric"
              maxLength={7}
              style={{ ...inputStyle, flex: 1 }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 2 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {DOSE_UNITS.map(u => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => setDoseUnit(u)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 10, borderRadius: 9,
                      backgroundColor: doseUnit === u ? (THEME.colors.teal) : THEME.colors.surface2,
                      borderWidth: doseUnit === u ? 0 : 0.5, borderColor: THEME.colors.border,
                    }}
                  >
                    <Text style={s(12, doseUnit === u ? 'sansMedium' : 'sans', doseUnit === u ? '#fff' : THEME.colors.textSecondary)}>
                      {DOSE_UNIT_LABELS[u]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Start date */}
          <Text style={{ ...s(12, 'sansMedium', THEME.colors.textSecondary), marginBottom: 6 }}>Start date *</Text>
          <View style={{ marginBottom: 18 }}>
            <DateField value={startDate} onChange={setStartDate} placeholder="Select start date" allowFuture accentColor={THEME.colors.teal} />
          </View>

          {/* End date */}
          <Text style={{ ...s(12, 'sansMedium', THEME.colors.textSecondary), marginBottom: 6 }}>
            End date <Text style={{ color: THEME.colors.textMuted }}>(optional â€” leave blank for ongoing)</Text>
          </Text>
          <View style={{ marginBottom: 28, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <DateField value={endDate} onChange={setEndDate} placeholder="No end date" allowFuture accentColor={THEME.colors.teal} />
            </View>
            {!!endDate && (
              <TouchableOpacity onPress={() => setEndDate('')} style={{ padding: 8 }}>
                <Text style={{ color: THEME.colors.textMuted, fontSize: 13 }}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Create */}
          <TouchableOpacity
            onPress={handleCreate}
            disabled={create.isPending}
            style={{
              backgroundColor: THEME.colors.teal,
              borderRadius: 12, paddingVertical: 14, alignItems: 'center',
              opacity: create.isPending ? 0.6 : 1,
            }}
          >
            <Text style={s(15, 'sansMedium', '#fff')}>
              {create.isPending ? 'Savingâ€¦' : 'Add schedule'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

