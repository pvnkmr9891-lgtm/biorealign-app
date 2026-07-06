import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useMyDetailedAssessment, useSaveAssessmentStage, useSubmitDetailedAssessment, useSetAthleteFlag } from '@/hooks/useDetailedAssessment';
import { DETAILED_ASSESSMENT_STAGES, AssessmentField } from '@/constants/detailedAssessmentQuestions';
import { THEME } from '@/constants/theme';
import { DateField } from '@/components/ui/DateField';
import { MAX_LENGTHS, sanitizeDecimal } from '@/utils/validation';

function ScaleField({ field, value, onChange }: { field: AssessmentField; value: any; onChange: (v: any) => void }) {
  const max = field.max ?? 10;
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, marginBottom: 8 }}>{field.label}</Text>
      {field.helperText && <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 8 }}>{field.helperText}</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
          const filled = typeof value === 'number' && n <= value;
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onChange(n)}
              style={{ width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: filled ? THEME.colors.teal : THEME.colors.surface2, borderWidth: 0.5, borderColor: filled ? THEME.colors.teal : THEME.colors.border }}
            >
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: filled ? THEME.colors.background : THEME.colors.textMuted }}>{n}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ToggleField({ field, value, onChange }: { field: AssessmentField; value: any; onChange: (v: any) => void }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, marginBottom: 8 }}>{field.label}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[['Yes', true], ['No', false]].map(([label, v]) => {
          const selected = value === v;
          return (
            <TouchableOpacity
              key={label as string}
              onPress={() => onChange(v)}
              style={{ paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, backgroundColor: selected ? THEME.colors.teal : THEME.colors.surface2, borderWidth: 0.5, borderColor: selected ? THEME.colors.teal : THEME.colors.border }}
            >
              <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: selected ? THEME.colors.background : THEME.colors.textSecondary }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ListField({ field, value, onChange }: { field: AssessmentField; value: any; onChange: (v: any) => void }) {
  const arr: string[] = Array.isArray(value) ? value : [];
  const [draft, setDraft] = useState('');
  const predefined = field.options ?? [];
  const customItems = arr.filter((v) => !predefined.includes(v));

  const toggle = (opt: string) => onChange(arr.includes(opt) ? arr.filter((o) => o !== opt) : [...arr, opt]);
  const addCustom = () => {
    const v = draft.trim();
    if (!v || arr.includes(v)) return;
    onChange([...arr, v]);
    setDraft('');
  };
  const removeCustom = (item: string) => onChange(arr.filter((o) => o !== item));

  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, marginBottom: 8 }}>{field.label}</Text>
      {predefined.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {predefined.map((opt) => {
            const selected = arr.includes(opt);
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => toggle(opt)}
                style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: selected ? `${THEME.colors.amber}25` : THEME.colors.surface2, borderWidth: 0.5, borderColor: selected ? THEME.colors.amber : THEME.colors.border }}
              >
                <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: selected ? THEME.colors.amber : THEME.colors.textSecondary }}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      {customItems.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {customItems.map((item) => (
            <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: `${THEME.colors.teal}18`, borderWidth: 0.5, borderColor: THEME.colors.teal }}>
              <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>{item}</Text>
              <TouchableOpacity onPress={() => removeCustom(item)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={{ fontSize: 13, color: THEME.colors.teal }}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={field.placeholder ?? 'Add your own...'}
          placeholderTextColor={THEME.colors.textMuted}
          onSubmitEditing={addCustom}
          maxLength={MAX_LENGTHS.customListItem}
          style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 13, borderWidth: 0.5, borderColor: THEME.colors.border }}
        />
        <TouchableOpacity onPress={addCustom} style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: THEME.colors.teal, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18, color: THEME.colors.background }}>＋</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PainPerItemField({ field, items, value, onChange }: { field: AssessmentField; items: string[]; value: any; onChange: (v: any) => void }) {
  const map: Record<string, number> = value && typeof value === 'object' ? value : {};
  if (items.length === 0) {
    return (
      <View style={{ marginBottom: 18 }}>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, marginBottom: 8 }}>{field.label}</Text>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Add a past injury above to rate its current pain.</Text>
      </View>
    );
  }
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, marginBottom: 10 }}>{field.label}</Text>
      {items.map((injury) => (
        <View key={injury} style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 6 }}>{injury}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
              const filled = map[injury] != null && n <= map[injury];
              return (
                <TouchableOpacity
                  key={n}
                  onPress={() => onChange({ ...map, [injury]: n })}
                  style={{ width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: filled ? THEME.colors.amber : THEME.colors.surface2, borderWidth: 0.5, borderColor: filled ? THEME.colors.amber : THEME.colors.border }}
                >
                  <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sansMedium, color: filled ? THEME.colors.background : THEME.colors.textMuted }}>{n}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

function NumberUnitField({ field, value, onChange }: { field: AssessmentField; value: any; onChange: (v: any) => void }) {
  const units = field.units ?? [];
  const current = value && typeof value === 'object' ? value : { value: '', unit: units[0] ?? '' };
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, marginBottom: 8 }}>{field.label}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        {units.map((u) => {
          const selected = current.unit === u;
          return (
            <TouchableOpacity
              key={u}
              onPress={() => onChange({ ...current, unit: u })}
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: selected ? THEME.colors.teal : THEME.colors.surface2, borderWidth: 0.5, borderColor: selected ? THEME.colors.teal : THEME.colors.border }}
            >
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: selected ? THEME.colors.background : THEME.colors.textSecondary }}>{u}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TextInput
        value={current.value ?? ''}
        onChangeText={(v) => onChange({ ...current, value: current.unit === 'ft-in' ? v.replace(/[^0-9'" -]/g, '') : sanitizeDecimal(v) })}
        placeholder={current.unit === 'ft-in' ? (field.placeholder ?? "e.g. 5'10\"") : field.placeholder}
        placeholderTextColor={THEME.colors.textMuted}
        keyboardType={current.unit === 'ft-in' ? 'default' : 'numeric'}
        maxLength={10}
        style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}
      />
    </View>
  );
}

function Field({ field, value, onChange, allValues }: { field: AssessmentField; value: any; onChange: (v: any) => void; allValues: Record<string, any> }) {
  if (field.type === 'select') {
    return (
      <View style={{ marginBottom: 18 }}>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, marginBottom: 8 }}>{field.label}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {field.options?.map((opt) => {
            const selected = value === opt;
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => onChange(opt)}
                style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: selected ? THEME.colors.teal : THEME.colors.surface2, borderWidth: 0.5, borderColor: selected ? THEME.colors.teal : THEME.colors.border }}
              >
                <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: selected ? THEME.colors.background : THEME.colors.textSecondary }}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  if (field.type === 'chips') {
    const arr: string[] = Array.isArray(value) ? value : [];
    const toggle = (opt: string) => {
      onChange(arr.includes(opt) ? arr.filter((o) => o !== opt) : [...arr, opt]);
    };
    return (
      <View style={{ marginBottom: 18 }}>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, marginBottom: 8 }}>{field.label}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {field.options?.map((opt) => {
            const selected = arr.includes(opt);
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => toggle(opt)}
                style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: selected ? `${THEME.colors.amber}25` : THEME.colors.surface2, borderWidth: 0.5, borderColor: selected ? THEME.colors.amber : THEME.colors.border }}
              >
                <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: selected ? THEME.colors.amber : THEME.colors.textSecondary }}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  if (field.type === 'scale') return <ScaleField field={field} value={value} onChange={onChange} />;
  if (field.type === 'toggle') return <ToggleField field={field} value={value} onChange={onChange} />;
  if (field.type === 'list') return <ListField field={field} value={value} onChange={onChange} />;
  if (field.type === 'number_unit') return <NumberUnitField field={field} value={value} onChange={onChange} />;
  if (field.type === 'pain_per_item') {
    const items: string[] = Array.isArray(allValues[field.dependsOnKey ?? '']) ? allValues[field.dependsOnKey ?? ''] : [];
    return <PainPerItemField field={field} items={items} value={value} onChange={onChange} />;
  }

  if (field.type === 'date') {
    return (
      <View style={{ marginBottom: 18 }}>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, marginBottom: 8 }}>{field.label}</Text>
        {field.helperText && <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 8 }}>{field.helperText}</Text>}
        <DateField value={value || undefined} onChange={onChange} placeholder="Select date" allowFuture accentColor={THEME.colors.teal} />
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, marginBottom: 8 }}>{field.label}</Text>
      {field.helperText && <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 8 }}>{field.helperText}</Text>}
      <TextInput
        value={value ?? ''}
        onChangeText={(v) => onChange(field.type === 'number' ? sanitizeDecimal(v) : v)}
        placeholder={field.placeholder}
        placeholderTextColor={THEME.colors.textMuted}
        keyboardType={field.type === 'number' ? 'numeric' : 'default'}
        multiline={field.type === 'textarea'}
        maxLength={field.type === 'textarea' ? MAX_LENGTHS.longNote : field.type === 'number' ? 10 : MAX_LENGTHS.description}
        style={{
          backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14,
          minHeight: field.type === 'textarea' ? 80 : undefined,
          textAlignVertical: field.type === 'textarea' ? 'top' : 'center',
          color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14,
          borderWidth: 0.5, borderColor: THEME.colors.border,
        }}
      />
    </View>
  );
}

// profiles.diet_type uses a different 2-value vocabulary ('veg'/'non_veg')
// than this screen's UI ('Veg'/'Non-Veg') — convert at the boundary rather
// than introducing a third vocabulary.
const DIET_TYPE_TO_DB: Record<string, 'veg' | 'non_veg'> = { Veg: 'veg', 'Non-Veg': 'non_veg' };
const DIET_TYPE_FROM_DB: Record<string, string> = { veg: 'Veg', non_veg: 'Non-Veg' };

export default function DetailedAssessmentScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: assessment, isLoading } = useMyDetailedAssessment();
  const { mutateAsync: saveStage, isPending: isSaving } = useSaveAssessmentStage();
  const { mutateAsync: submit, isPending: isSubmitting } = useSubmitDetailedAssessment();
  const { mutate: setAthleteFlag } = useSetAthleteFlag();

  const [stageIndex, setStageIndex] = useState(0);
  const [form, setForm] = useState<Record<string, any>>({});

  // null = not chosen yet. Once the client answers, it's locked — the stage
  // list it determines must stay fixed for the rest of the assessment, or
  // a held stageIndex can point past the end of a list that just shrank.
  const isAthlete: boolean | null = (assessment as any)?.is_athlete ?? null;
  const athleteChosen = isAthlete !== null;
  const visibleStages = DETAILED_ASSESSMENT_STAGES.filter((s) => !s.athleteOnly || isAthlete === true);

  useEffect(() => {
    if (!assessment) return;
    setStageIndex((i) => Math.min(i, visibleStages.length - 1));
  }, [assessment?.id, isAthlete]);

  useEffect(() => {
    if (!assessment || !visibleStages[stageIndex]) return;
    const stageKey = visibleStages[stageIndex].key;
    const stageData = { ...((assessment as any)[stageKey] ?? {}) };
    // The diet_preference field's value actually lives on profiles.diet_type.
    if (visibleStages[stageIndex].fields.some((f) => f.crossTableProfileDiet)) {
      const dietField = visibleStages[stageIndex].fields.find((f) => f.crossTableProfileDiet)!;
      stageData[dietField.key] = profile?.diet_type ? DIET_TYPE_FROM_DB[profile.diet_type] : undefined;
    }
    setForm(stageData);
  }, [stageIndex, assessment?.id, visibleStages.length]);

  if (isLoading || !assessment) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }}>
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (assessment.status !== 'in_progress') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 44, marginBottom: 16 }}>{assessment.status === 'reviewed' ? '✅' : '📨'}</Text>
          <Text style={{ fontSize: 20, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
            {assessment.status === 'reviewed' ? 'Reviewed by your coach' : 'Submitted — awaiting review'}
          </Text>
          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', lineHeight: 22 }}>
            {assessment.status === 'reviewed'
              ? 'Your coach has reviewed your assessment and is building your plan.'
              : 'Your coach will review your answers and start curating your plan shortly.'}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 24, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: THEME.colors.surface2, borderRadius: 12 }}>
            <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>Back to Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!athleteChosen) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 44, marginBottom: 16 }}>🏃</Text>
          <Text style={{ fontSize: 20, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
            Are you an athlete?
          </Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
            This decides a few extra questions about your sport later on. You can't change this once you start.
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[['Yes', true], ['No', false]].map(([label, v]) => (
              <TouchableOpacity
                key={label as string}
                onPress={() => setAthleteFlag(v as boolean)}
                style={{ paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12, backgroundColor: THEME.colors.surface2, borderWidth: 0.5, borderColor: THEME.colors.border }}
              >
                <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const stage = visibleStages[stageIndex];
  const isLastStage = stageIndex === visibleStages.length - 1;
  const dietField = stage.fields.find((f) => f.crossTableProfileDiet);

  const onNext = async () => {
    const nextStage = Math.min(stageIndex + 2, visibleStages.length);
    try {
      // The diet_preference value is saved to profiles.diet_type, not into
      // this stage's jsonb blob — strip it out before persisting the stage.
      const stageData = { ...form };
      if (dietField) {
        const uiValue = stageData[dietField.key];
        delete stageData[dietField.key];
        if (uiValue && DIET_TYPE_TO_DB[uiValue]) {
          await supabase.from('profiles').update({ diet_type: DIET_TYPE_TO_DB[uiValue] }).eq('id', profile!.id);
        }
      }

      await saveStage({ stageKey: stage.key, data: stageData, nextStage });
      if (isLastStage) {
        await submit();
        Alert.alert('Submitted ✓', 'Your coach has been notified and will review your assessment.');
        router.back();
      } else {
        setStageIndex((i) => i + 1);
      }
    } catch (e: any) {
      Alert.alert('Could not save', e.message ?? 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => (stageIndex === 0 ? router.back() : setStageIndex((i) => i - 1))}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
          >
            <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>
            Stage {stageIndex + 1} of {visibleStages.length}
          </Text>
        </View>

        {/* Locked once chosen on the gating screen — never editable here. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>
            {isAthlete ? '🏆 Athlete profile' : 'General fitness profile'}
          </Text>
        </View>

        {/* Progress dots */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 18 }}>
          {visibleStages.map((s, i) => (
            <View key={s.key} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= stageIndex ? THEME.colors.teal : THEME.colors.surface3 }} />
          ))}
        </View>

        <Text style={{ fontSize: 26 }}>{stage.icon}</Text>
        <Text style={{ fontSize: 24, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginTop: 4 }}>{stage.title}</Text>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{stage.subtitle}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {stage.fields.map((field) => (
            <Field
              key={field.key}
              field={field}
              value={form[field.key]}
              onChange={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
              allValues={form}
            />
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 24, paddingBottom: 24, paddingTop: 8 }}>
          <TouchableOpacity
            onPress={onNext}
            disabled={isSaving || isSubmitting}
            activeOpacity={0.85}
            style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
          >
            {(isSaving || isSubmitting)
              ? <ActivityIndicator color={THEME.colors.background} />
              : <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>
                  {isLastStage ? 'Submit Assessment' : 'Next'}
                </Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
