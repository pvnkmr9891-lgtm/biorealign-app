import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Dimensions, Modal, Pressable, Linking, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarGrid } from '@/components/ui/CalendarGrid';
import { WeekStatusStrip } from '@/components/ui/WeekStatusStrip';
import { MacroRing } from '@/components/coach/DayMacroSummary';
import { MetricTrendChart } from '@/components/ui/MetricTrendChart';
import { NutritionTrendChart } from '@/components/coach/NutritionTrendChart';
import { useClientProfile, useClientBodyMetrics, useClientPhotos, useClientWorkoutSummary, useClientNutritionTrend, useClientOopsTrend } from '@/hooks/useCoachClientOverview';
import { useClientTrainingLoadScores } from '@/hooks/useTrainingLoad';
import { TrainingLoadSection } from '@/components/ui/TrainingLoadSection';
import { useClientDetailedAssessment, useMarkAssessmentReviewed, useUpdateDetailedAssessmentStage, AssessmentStageKey } from '@/hooks/useDetailedAssessment';
import { DETAILED_ASSESSMENT_STAGES, AssessmentField, FieldType } from '@/constants/detailedAssessmentQuestions';
import { useUpdateClientAssessment } from '@/hooks/useClientAssessment';
import { getWeekStart } from '@/hooks/useManualLog';
import { useClientMedicalDocuments, useClientMedicalAnalyses, DocumentCategory, AnalysisDocResult, MedicalDocument } from '@/hooks/useMedicalDocuments';
import { useMarkAnalysisViewedByCoach } from '@/hooks/useCoachDashboard';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateProfile } from '@/hooks/useClient';
import { useClientRehabRequests, useClientRehabAppointments, useRespondToRehabRequest, useAdminMarkRehabPaid } from '@/hooks/useAdmin';
import { FeedbackThreadModal } from '@/components/medical/FeedbackThreadModal';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { useClientFitnessAssessments, FitnessDomain } from '@/hooks/useFitnessAssessment';
import { SupplementCalendarTracker } from '@/components/supplements/SupplementCalendarTracker';
import { supabase } from '@/lib/supabase';
import { THEME } from '@/constants/theme';

const SUCCESS = THEME.colors.success ?? '#4CC986';

type TabKey = 'profile' | 'overview' | 'assessment' | 'measurements' | 'pictures' | 'workouts' | 'medical' | 'recovery' | 'fitness';
const TABS: { key: TabKey; label: string; icon: string; color: string }[] = [
  { key: 'profile',      label: 'Profile',      icon: '👤', color: '#8b78e8' },
  { key: 'overview',     label: 'Overview',     icon: '🏠', color: THEME.colors.teal },
  { key: 'assessment',   label: 'Detailed Assessment', icon: '📝', color: THEME.colors.amber },
  { key: 'measurements', label: 'Body',         icon: '📏', color: '#60A5FA' },
  { key: 'pictures',     label: 'Pictures',     icon: '📷', color: '#C084FC' },
  { key: 'workouts',     label: 'Workouts',     icon: '💪', color: SUCCESS },
  { key: 'medical',      label: 'Medical',      icon: '🩺', color: '#F87171' },
  { key: 'fitness',      label: 'Fitness',      icon: '🏋️', color: '#34D399' },
];
// Recovery review/respond is admin-only (Eshwar reviews from admin login) —
// appended conditionally in ClientProfileView, not always shown to coaches.
const RECOVERY_TAB: { key: TabKey; label: string; icon: string; color: string } = { key: 'recovery', label: 'Recovery', icon: '🩹', color: THEME.colors.amber };

// ── Shared building blocks ────────────────────────────────────────────
function SectionHeader({ icon, title, color }: { icon: string; title: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: `${color}20`, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 13 }}>{icon}</Text>
      </View>
      <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{title}</Text>
    </View>
  );
}

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 14, borderLeftWidth: accent ? 3 : 0.5, borderLeftColor: accent ?? THEME.colors.border }}>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, textTransform: 'capitalize', textAlign: 'right', flex: 1 }}>{value ?? '—'}</Text>
    </View>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 30 }}>{icon}</Text>
      </View>
      <Text style={{ fontSize: 17, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center' }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>{subtitle}</Text>}
    </View>
  );
}

function formatValue(v: any) {
  if (v == null || v === '') return null;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.length ? v : null;
  if (typeof v === 'object') {
    // number_unit shape ({ value, unit }) or pain_per_item shape ({ injury: n, ... })
    if ('value' in v && 'unit' in v) return v.value ? `${v.value} ${v.unit}` : null;
    const entries = Object.entries(v).filter(([, n]) => n != null);
    return entries.length ? entries.map(([k, n]) => `${k}: ${n}/10`) : null;
  }
  return String(v);
}

// Renders a field value either as a chip row (arrays) or a Row (scalars)
function FieldValue({ label, value, color }: { label: string; value: any; color: string }) {
  const v = formatValue(value);
  if (v == null) return <Row label={label} value={null} />;
  if (Array.isArray(v)) {
    return (
      <View style={{ paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 6 }}>{label}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {v.map((item: string) => (
            <View key={item} style={{ backgroundColor: `${color}18`, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color }}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }
  return <Row label={label} value={v} />;
}

// ── Profile tab ─────────────────────────────────────────────────────────
// Editable info — deliberately limited to the exact fields the client can
// edit about themselves today (full_name, phone, via EditProfileModal) plus
// diet_preference (added for the Detailed Assessment's cross-table field).
// Other fields shown in the Overview tab (gender, height, weight, health
// goals, conditions) have no edit UI anywhere in the app yet — including for
// the client themselves — so there's nothing to reuse here. That's a
// deliberate gap, not a silent one: flagging it rather than building a new,
// parallel editor for fields nobody else can edit either.
function ProfileTab({ clientId }: { clientId: string }) {
  const { data: profile, isLoading } = useClientProfile(clientId);
  const { mutateAsync: updateProfile } = useUpdateProfile();
  const [editVisible, setEditVisible] = useState(false);

  if (isLoading) return <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />;

  const handleSave = async (data: { full_name: string; phone: string }) => {
    try {
      await updateProfile({ targetUserId: clientId, data });
    } catch {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
  };

  const toggleDiet = async (v: 'veg' | 'non_veg') => {
    try {
      await updateProfile({ targetUserId: clientId, data: { diet_type: v } });
    } catch {
      Alert.alert('Error', 'Failed to update diet preference.');
    }
  };

  return (
    <View>
      <Card accent="#8b78e8">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <SectionHeader icon="👤" title="Personal Info" color="#8b78e8" />
          <TouchableOpacity onPress={() => setEditVisible(true)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: `${THEME.colors.teal}18` }}>
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Edit</Text>
          </TouchableOpacity>
        </View>
        <Row label="Name" value={profile?.full_name} />
        <Row label="Phone" value={profile?.phone} />
        <Row label="Member since" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
      </Card>

      <Card accent={THEME.colors.teal}>
        <SectionHeader icon="🍽️" title="Diet Preference" color={THEME.colors.teal} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['veg', 'non_veg'] as const).map((v) => {
            const selected = profile?.diet_type === v;
            return (
              <TouchableOpacity
                key={v}
                onPress={() => toggleDiet(v)}
                style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: selected ? THEME.colors.teal : THEME.colors.surface3, borderWidth: 0.5, borderColor: selected ? THEME.colors.teal : THEME.colors.border }}
              >
                <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: selected ? THEME.colors.background : THEME.colors.textSecondary }}>{v === 'veg' ? 'Veg' : 'Non-Veg'}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      <EditProfileModal profile={profile} visible={editVisible} onClose={() => setEditVisible(false)} onSave={handleSave} />
    </View>
  );
}

// ── Overview tab ───────────────────────────────────────────────────────
function OverviewTab({ clientId }: { clientId: string }) {
  const { data: profile, isLoading } = useClientProfile(clientId);

  if (isLoading) return <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />;

  return (
    <View>
      <ProfileOverviewCard clientId={clientId} profile={profile} color={THEME.colors.teal} />
    </View>
  );
}

// ── Assessment tab ─────────────────────────────────────────────────────
// Small inline editor primitives shared by both the General Assessment
// editor (plain string/array/number fields, schema-less) and the Detailed
// Assessment stage editor (typed FieldType per field).

export function EditChipToggle({ options, value, onChange, color }: { options: string[]; value: string[]; onChange: (v: string[]) => void; color: string }) {
  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {options.map((opt) => {
        const selected = value.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => toggle(opt)}
            style={{ backgroundColor: selected ? color : THEME.colors.surface3, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 0.5, borderColor: selected ? color : THEME.colors.border }}
          >
            <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: selected ? THEME.colors.background : THEME.colors.textSecondary }}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function EditSelectRow({ options, value, onChange, color }: { options: string[]; value: string; onChange: (v: string) => void; color: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={{ backgroundColor: selected ? color : THEME.colors.surface3, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 0.5, borderColor: selected ? color : THEME.colors.border }}
          >
            <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: selected ? THEME.colors.background : THEME.colors.textSecondary }}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function EditList({ value, onChange, color }: { value: string[]; onChange: (v: string[]) => void; color: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...value, v]);
    setDraft('');
  };
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: value.length ? 8 : 0 }}>
        {value.map((item, idx) => (
          <View key={`${item}-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${color}18`, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color }}>{item}</Text>
            <TouchableOpacity onPress={() => onChange(value.filter((_, i) => i !== idx))}>
              <Text style={{ fontSize: 12, color }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add an item"
          placeholderTextColor={THEME.colors.textMuted}
          style={{ flex: 1, backgroundColor: THEME.colors.surface3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 13, borderWidth: 0.5, borderColor: THEME.colors.border }}
          onSubmitEditing={add}
        />
        <TouchableOpacity onPress={add} style={{ paddingHorizontal: 14, justifyContent: 'center', backgroundColor: color, borderRadius: 10 }}>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>+ Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Predefined chips + free-text "+ Add" — for fields with common options that
// still need to support a client-specific custom entry (e.g. a condition or
// medication not in the preset list).
export function ChipsAndAddList({ options, value, onChange, color }: { options: string[]; value: string[]; onChange: (v: string[]) => void; color: string }) {
  const [draft, setDraft] = useState('');
  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };
  const add = () => {
    const v = draft.trim();
    if (!v || value.includes(v)) return;
    onChange([...value, v]);
    setDraft('');
  };
  const extras = value.filter((v) => !options.includes(v));
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {options.map((opt) => {
          const selected = value.includes(opt);
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => toggle(opt)}
              style={{ backgroundColor: selected ? color : THEME.colors.surface3, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 0.5, borderColor: selected ? color : THEME.colors.border }}
            >
              <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: selected ? THEME.colors.background : THEME.colors.textSecondary }}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
        {extras.map((item, idx) => (
          <View key={`${item}-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${color}18`, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color }}>{item}</Text>
            <TouchableOpacity onPress={() => onChange(value.filter((v) => v !== item))}>
              <Text style={{ fontSize: 12, color }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add another"
          placeholderTextColor={THEME.colors.textMuted}
          style={{ flex: 1, backgroundColor: THEME.colors.surface3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 13, borderWidth: 0.5, borderColor: THEME.colors.border }}
          onSubmitEditing={add}
        />
        <TouchableOpacity onPress={add} style={{ paddingHorizontal: 14, justifyContent: 'center', backgroundColor: color, borderRadius: 10 }}>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>+ Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const OVERVIEW_INPUT_STYLE = { backgroundColor: THEME.colors.surface3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 13, borderWidth: 0.5, borderColor: THEME.colors.border } as const;
const HEALTH_GOAL_OPTIONS = ['Weight loss', 'Muscle gain', 'Posture correction', 'Pain relief', 'General fitness', 'Athletic performance', 'Better sleep', 'Stress reduction'];
const MEDICAL_CONDITION_OPTIONS = ['Diabetes', 'Hypertension', 'Thyroid', 'PCOS/PCOD', 'Cardiac', 'Asthma', 'Arthritis'];

function buildOverviewDraft(p: any) {
  return {
    full_name: p?.full_name ?? '',
    gender: p?.gender ?? '',
    dob: p?.dob ?? '',
    phone: p?.phone ?? '',
    height_cm: p?.height_cm != null ? String(p.height_cm) : '',
    weight_kg: p?.weight_kg != null ? String(p.weight_kg) : '',
    health_goals: Array.isArray(p?.health_goals) ? p.health_goals : [],
    conditions: Array.isArray(p?.conditions) ? p.conditions : [],
    medications: Array.isArray(p?.medications) ? p.medications : [],
    supplements: Array.isArray(p?.supplements) ? p.supplements : [],
    occupation: p?.occupation ?? '',
    location: p?.location ?? '',
    diet_type: p?.diet_type ?? '',
  };
}

// Single shared Overview card — exactly the fields BioRealign wants visible
// across client-self, coach, and admin profile screens, all writing through
// the same profiles columns so the three views never drift out of sync.
export function ProfileOverviewCard({ clientId, profile, color = THEME.colors.teal }: { clientId: string; profile: any; color?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => buildOverviewDraft(profile));
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile();

  const startEditing = () => {
    setDraft(buildOverviewDraft(profile));
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateProfile({
        targetUserId: clientId,
        data: {
          full_name: draft.full_name.trim() || null,
          gender: draft.gender || null,
          dob: draft.dob.trim() || null,
          phone: draft.phone.trim() || null,
          height_cm: draft.height_cm ? Number(draft.height_cm) : null,
          weight_kg: draft.weight_kg ? Number(draft.weight_kg) : null,
          health_goals: draft.health_goals,
          conditions: draft.conditions,
          medications: draft.medications,
          supplements: draft.supplements,
          occupation: draft.occupation.trim() || null,
          location: draft.location.trim() || null,
          diet_type: draft.diet_type || null,
        },
      });
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save. Please try again.');
    }
  };

  return (
    <Card accent={color}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <SectionHeader icon="👤" title="Overview" color={color} />
        {!editing && (
          <TouchableOpacity onPress={startEditing} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: `${color}18` }}>
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color }}>✏️ Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {editing ? (
        <View style={{ gap: 12 }}>
          <View>
            <EditFieldLabel label="Name" />
            <TextInput value={draft.full_name} onChangeText={(t) => setDraft((d) => ({ ...d, full_name: t }))} placeholderTextColor={THEME.colors.textMuted} style={OVERVIEW_INPUT_STYLE} />
          </View>
          <View>
            <EditFieldLabel label="Gender" />
            <EditSelectRow options={['Male', 'Female', 'Other']} value={draft.gender} onChange={(v) => setDraft((d) => ({ ...d, gender: v }))} color={color} />
          </View>
          <View>
            <EditFieldLabel label="Date of birth" />
            <TextInput value={draft.dob} onChangeText={(t) => setDraft((d) => ({ ...d, dob: t }))} placeholder="YYYY-MM-DD" placeholderTextColor={THEME.colors.textMuted} style={OVERVIEW_INPUT_STYLE} />
          </View>
          <View>
            <EditFieldLabel label="Contact" />
            <TextInput value={draft.phone} onChangeText={(t) => setDraft((d) => ({ ...d, phone: t }))} keyboardType="phone-pad" placeholder="+91 98765 43210" placeholderTextColor={THEME.colors.textMuted} style={OVERVIEW_INPUT_STYLE} />
          </View>
          <View>
            <EditFieldLabel label="Height (cm)" />
            <TextInput value={draft.height_cm} onChangeText={(t) => setDraft((d) => ({ ...d, height_cm: t.replace(/[^0-9.]/g, '') }))} keyboardType="numeric" placeholderTextColor={THEME.colors.textMuted} style={OVERVIEW_INPUT_STYLE} />
          </View>
          <View>
            <EditFieldLabel label="Weight (kg)" />
            <TextInput value={draft.weight_kg} onChangeText={(t) => setDraft((d) => ({ ...d, weight_kg: t.replace(/[^0-9.]/g, '') }))} keyboardType="numeric" placeholderTextColor={THEME.colors.textMuted} style={OVERVIEW_INPUT_STYLE} />
          </View>
          <View>
            <EditFieldLabel label="Health goals" />
            <ChipsAndAddList options={HEALTH_GOAL_OPTIONS} value={draft.health_goals} onChange={(v) => setDraft((d) => ({ ...d, health_goals: v }))} color={color} />
          </View>
          <View>
            <EditFieldLabel label="Medical conditions" />
            <ChipsAndAddList options={MEDICAL_CONDITION_OPTIONS} value={draft.conditions} onChange={(v) => setDraft((d) => ({ ...d, conditions: v }))} color={THEME.colors.amber} />
          </View>
          <View>
            <EditFieldLabel label="Medications" />
            <EditList value={draft.medications} onChange={(v) => setDraft((d) => ({ ...d, medications: v }))} color="#F87171" />
          </View>
          <View>
            <EditFieldLabel label="Supplements" />
            <EditList value={draft.supplements} onChange={(v) => setDraft((d) => ({ ...d, supplements: v }))} color="#34D399" />
          </View>
          <View>
            <EditFieldLabel label="Occupation" />
            <TextInput value={draft.occupation} onChangeText={(t) => setDraft((d) => ({ ...d, occupation: t }))} placeholderTextColor={THEME.colors.textMuted} style={OVERVIEW_INPUT_STYLE} />
          </View>
          <View>
            <EditFieldLabel label="Location" />
            <TextInput value={draft.location} onChangeText={(t) => setDraft((d) => ({ ...d, location: t }))} placeholder="City, State" placeholderTextColor={THEME.colors.textMuted} style={OVERVIEW_INPUT_STYLE} />
          </View>
          <View>
            <EditFieldLabel label="Diet" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['veg', 'non_veg'] as const).map((v) => {
                const selected = draft.diet_type === v;
                return (
                  <TouchableOpacity
                    key={v}
                    onPress={() => setDraft((d) => ({ ...d, diet_type: v }))}
                    style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: selected ? color : THEME.colors.surface3, borderWidth: 0.5, borderColor: selected ? color : THEME.colors.border }}
                  >
                    <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: selected ? THEME.colors.background : THEME.colors.textSecondary }}>{v === 'veg' ? 'Veg' : 'Non-Veg'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <SaveCancelBar onCancel={() => setEditing(false)} onSave={handleSave} saving={isPending} />
        </View>
      ) : (
        <>
          <Row label="Name" value={profile?.full_name} />
          <Row label="Gender" value={profile?.gender} />
          <Row label="Date of birth" value={profile?.dob ? new Date(profile.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
          <Row label="Contact" value={profile?.phone} />
          <Row label="Height" value={profile?.height_cm ? `${profile.height_cm} cm` : null} />
          <Row label="Weight" value={profile?.weight_kg ? `${profile.weight_kg} kg` : null} />
          <FieldValue label="Health goals" value={profile?.health_goals} color={color} />
          <FieldValue label="Medical conditions" value={profile?.conditions} color={THEME.colors.amber} />
          <FieldValue label="Medications" value={profile?.medications} color="#F87171" />
          <FieldValue label="Supplements" value={profile?.supplements} color="#34D399" />
          <Row label="Occupation" value={profile?.occupation} />
          <Row label="Location" value={profile?.location} />
          <Row label="Diet" value={profile?.diet_type === 'veg' ? 'Veg' : profile?.diet_type === 'non_veg' ? 'Non-Veg' : null} />
        </>
      )}
    </Card>
  );
}

export function EditScale({ value, max, onChange, color }: { value: number | null; max: number; onChange: (v: number) => void; color: string }) {
  const nums = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {nums.map((n) => {
        const selected = value === n;
        return (
          <TouchableOpacity
            key={n}
            onPress={() => onChange(n)}
            style={{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? color : THEME.colors.surface3, borderWidth: 0.5, borderColor: selected ? color : THEME.colors.border }}
          >
            <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: selected ? THEME.colors.background : THEME.colors.textSecondary }}>{n}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export function EditFieldLabel({ label }: { label: string }) {
  return <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 6 }}>{label}</Text>;
}

export function SaveCancelBar({ onCancel, onSave, saving }: { onCancel: () => void; onSave: () => void; saving: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
      <TouchableOpacity onPress={onCancel} disabled={saving} style={{ flex: 1, backgroundColor: THEME.colors.surface3, borderRadius: 10, paddingVertical: 11, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
        <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSave} disabled={saving} style={{ flex: 1, backgroundColor: THEME.colors.teal, borderRadius: 10, paddingVertical: 11, alignItems: 'center', opacity: saving ? 0.7 : 1 }}>
        {saving ? <ActivityIndicator size="small" color={THEME.colors.background} /> : <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Save</Text>}
      </TouchableOpacity>
    </View>
  );
}

// ── Detailed Assessment — per-field typed editor ───────────────────────
export function DetailedFieldEditor({ field, value, onChange, color, allStageData }: { field: AssessmentField; value: any; onChange: (v: any) => void; color: string; allStageData: Record<string, any> }) {
  const type: FieldType = field.type;

  if (type === 'chips' || type === 'select') {
    const options = field.options ?? [];
    if (type === 'chips') {
      return <EditChipToggle options={options} value={Array.isArray(value) ? value : []} onChange={onChange} color={color} />;
    }
    return <EditSelectRow options={options} value={typeof value === 'string' ? value : ''} onChange={onChange} color={color} />;
  }

  if (type === 'list') {
    return <EditList value={Array.isArray(value) ? value : []} onChange={onChange} color={color} />;
  }

  if (type === 'scale') {
    return <EditScale value={typeof value === 'number' ? value : null} max={field.max ?? 10} onChange={onChange} color={color} />;
  }

  if (type === 'textarea') {
    return (
      <TextInput
        value={typeof value === 'string' ? value : ''}
        onChangeText={onChange}
        placeholder={field.placeholder}
        placeholderTextColor={THEME.colors.textMuted}
        multiline
        style={{ minHeight: 70, backgroundColor: THEME.colors.surface3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 13, borderWidth: 0.5, borderColor: THEME.colors.border, textAlignVertical: 'top' }}
      />
    );
  }

  if (type === 'toggle') {
    return (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[true, false].map((v) => {
          const selected = !!value === v;
          return (
            <TouchableOpacity
              key={String(v)}
              onPress={() => onChange(v)}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9, backgroundColor: selected ? color : THEME.colors.surface3, borderWidth: 0.5, borderColor: selected ? color : THEME.colors.border }}
            >
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: selected ? THEME.colors.background : THEME.colors.textSecondary }}>{v ? 'Yes' : 'No'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  if (type === 'pain_per_item') {
    // value is Record<string, number> keyed by entries of the sibling list field
    const items: string[] = field.dependsOnKey ? (allStageData[field.dependsOnKey] ?? []) : [];
    const painMap: Record<string, number> = value && typeof value === 'object' ? value : {};
    if (!items.length) return <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>No items to rate yet.</Text>;
    return (
      <View style={{ gap: 10 }}>
        {items.map((item) => (
          <View key={item}>
            <EditFieldLabel label={item} />
            <EditScale value={typeof painMap[item] === 'number' ? painMap[item] : null} max={10} onChange={(n) => onChange({ ...painMap, [item]: n })} color={color} />
          </View>
        ))}
      </View>
    );
  }

  if (type === 'number_unit') {
    const v = value && typeof value === 'object' ? value : { value: '', unit: field.units?.[0] ?? '' };
    return (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={String(v.value ?? '')}
          onChangeText={(t) => onChange({ ...v, value: t.replace(/[^0-9.]/g, '') })}
          keyboardType="numeric"
          placeholder={field.placeholder}
          placeholderTextColor={THEME.colors.textMuted}
          style={{ flex: 1, backgroundColor: THEME.colors.surface3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 13, borderWidth: 0.5, borderColor: THEME.colors.border }}
        />
        {(field.units ?? []).map((u) => {
          const selected = v.unit === u;
          return (
            <TouchableOpacity
              key={u}
              onPress={() => onChange({ ...v, unit: u })}
              style={{ paddingHorizontal: 12, justifyContent: 'center', borderRadius: 10, backgroundColor: selected ? color : THEME.colors.surface3, borderWidth: 0.5, borderColor: selected ? color : THEME.colors.border }}
            >
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: selected ? THEME.colors.background : THEME.colors.textSecondary }}>{u}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // text, number, date — plain TextInput
  return (
    <TextInput
      value={value == null ? '' : String(value)}
      onChangeText={(t) => onChange(type === 'number' ? t.replace(/[^0-9.]/g, '') : t)}
      placeholder={field.placeholder}
      placeholderTextColor={THEME.colors.textMuted}
      keyboardType={type === 'number' ? 'numeric' : 'default'}
      style={{ backgroundColor: THEME.colors.surface3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 13, borderWidth: 0.5, borderColor: THEME.colors.border }}
    />
  );
}

// `onSave`/`saving` are passed in rather than this component owning a mutation
// hook directly — the coach/admin call site (here in ClientProfileView) wraps
// useUpdateDetailedAssessmentStage(clientId), while the client self-edit call
// site (app/(client)/profile.tsx) wraps useSaveAssessmentStage() instead, since
// that's the self-service mutation the client's own onboarding flow already
// uses (and it also needs to pass through the assessment's current_stage
// unchanged, which only the caller has in scope).
export function DetailedStageEditor({ stage, data, color, onDone, onSave, saving }: { stage: typeof DETAILED_ASSESSMENT_STAGES[number]; data: Record<string, any>; color: string; onDone: () => void; onSave: (stageKey: typeof DETAILED_ASSESSMENT_STAGES[number]['key'], data: Record<string, any>) => Promise<void>; saving: boolean }) {
  const [draft, setDraft] = useState<Record<string, any>>(() => ({ ...data }));

  const setField = (key: string, v: any) => setDraft((d) => ({ ...d, [key]: v }));

  const handleSave = async () => {
    try {
      await onSave(stage.key, draft);
      onDone();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save this section. Please try again.');
    }
  };

  return (
    <View style={{ gap: 14 }}>
      {stage.fields.map((field) => {
        if (field.crossTableProfileDiet) return null; // lives on profiles, not editable here
        return (
          <View key={field.key}>
            <EditFieldLabel label={field.label} />
            <DetailedFieldEditor field={field} value={draft[field.key]} onChange={(v) => setField(field.key, v)} color={color} allStageData={draft} />
          </View>
        );
      })}
      <SaveCancelBar onCancel={onDone} onSave={handleSave} saving={saving} />
    </View>
  );
}

// ── General Assessment — flat-column editor (no typed schema; matches
// app/(admin)/assessment-detail.tsx's grouping, ported inline) ─────────
type GAFieldKind = 'text' | 'number' | 'chips';

interface GAFieldDef { key: string; label: string; kind: GAFieldKind }

export const GENERAL_ASSESSMENT_SECTIONS: { title: string; icon: string; color: string; fields: GAFieldDef[] }[] = [
  {
    title: 'Personal Foundation', icon: '🧬', color: THEME.colors.teal,
    fields: [
      { key: 'occupation_type', label: 'Occupation', kind: 'text' },
      { key: 'work_hours_daily', label: 'Work hours/day', kind: 'number' },
      { key: 'daily_activity_level', label: 'Activity level', kind: 'text' },
      { key: 'available_minutes_per_day', label: 'Available time (min/day)', kind: 'number' },
      { key: 'primary_stressor', label: 'Primary stressor', kind: 'text' },
      { key: 'previous_coaching', label: 'Previous coaching', kind: 'text' },
    ],
  },
  {
    title: 'Body & Health', icon: '🩺', color: '#F87171',
    fields: [
      { key: 'height_cm', label: 'Height (cm)', kind: 'number' },
      { key: 'weight_kg', label: 'Weight (kg)', kind: 'number' },
      { key: 'breathing_quality', label: 'Breathing', kind: 'text' },
      { key: 'medications', label: 'Medications', kind: 'text' },
      { key: 'complaints', label: 'Complaints', kind: 'chips' },
      { key: 'conditions', label: 'Medical conditions', kind: 'chips' },
      { key: 'energy_morning', label: 'Energy — morning (1-10)', kind: 'number' },
      { key: 'energy_afternoon', label: 'Energy — afternoon (1-10)', kind: 'number' },
      { key: 'energy_evening', label: 'Energy — evening (1-10)', kind: 'number' },
    ],
  },
  {
    title: 'Movement & Fitness', icon: '🏋️', color: '#C4B5FD',
    fields: [
      { key: 'last_exercise_period', label: 'Last exercised', kind: 'text' },
      { key: 'weekly_frequency', label: 'Weekly frequency', kind: 'number' },
      { key: 'workout_environment', label: 'Environment', kind: 'text' },
      { key: 'flexibility_score', label: 'Flexibility score (1-10)', kind: 'number' },
      { key: 'balance_score', label: 'Balance score (1-10)', kind: 'number' },
      { key: 'posture_issues', label: 'Posture issues', kind: 'chips' },
      { key: 'pain_during_movement', label: 'Pain during movement', kind: 'chips' },
      { key: 'available_equipment', label: 'Available equipment', kind: 'chips' },
    ],
  },
  {
    title: 'Nutrition & Recovery', icon: '🥗', color: THEME.colors.amber,
    fields: [
      { key: 'diet_type', label: 'Diet type', kind: 'text' },
      { key: 'meals_per_day', label: 'Meals per day', kind: 'number' },
      { key: 'meal_timing', label: 'Meal timing', kind: 'text' },
      { key: 'hydration_glasses', label: 'Hydration (glasses/day)', kind: 'number' },
      { key: 'caffeine_cups', label: 'Caffeine (cups/day)', kind: 'number' },
      { key: 'alcohol_frequency', label: 'Alcohol', kind: 'text' },
      { key: 'sleep_hours_avg', label: 'Avg sleep (hrs)', kind: 'number' },
      { key: 'sleep_quality_avg', label: 'Sleep quality (1-10)', kind: 'number' },
      { key: 'stress_level', label: 'Stress level (1-10)', kind: 'number' },
      { key: 'food_allergies', label: 'Food allergies', kind: 'chips' },
      { key: 'recovery_tools', label: 'Recovery tools used', kind: 'chips' },
    ],
  },
  {
    title: 'Goals & Mindset', icon: '🎯', color: '#34D399',
    fields: [
      { key: 'primary_goal', label: 'Primary goal', kind: 'text' },
      { key: 'timeline', label: 'Timeline', kind: 'text' },
      { key: 'commitment_level', label: 'Daily commitment', kind: 'text' },
      { key: 'secondary_goals', label: 'Secondary goals', kind: 'chips' },
      { key: 'past_blockers', label: 'Past blockers', kind: 'chips' },
      { key: 'ideal_outcome', label: 'Ideal outcome', kind: 'text' },
      { key: 'coach_notes_from_client', label: 'Note to coach', kind: 'text' },
    ],
  },
];

export function GeneralAssessmentEditor({ clientId, assessment, onDone }: { clientId: string; assessment: Record<string, any>; onDone: () => void }) {
  const [draft, setDraft] = useState<Record<string, any>>(() => ({ ...assessment }));
  const { mutateAsync: updateAssessment, isPending } = useUpdateClientAssessment();

  const setField = (key: string, v: any) => setDraft((d) => ({ ...d, [key]: v }));

  // Only ever submit fields that are actually rendered (the flat typed
  // columns) — never the raw answers/program_key jsonb from onboarding.
  const editableKeys = GENERAL_ASSESSMENT_SECTIONS.flatMap((s) => s.fields.map((f) => f.key));

  const handleSave = async () => {
    const payload: Record<string, any> = {};
    for (const key of editableKeys) {
      let v = draft[key];
      if (typeof v === 'string' && v.trim() === '') v = null;
      payload[key] = v;
    }
    try {
      await updateAssessment({ clientId, payload });
      onDone();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save the assessment. Please try again.');
    }
  };

  return (
    <View>
      {GENERAL_ASSESSMENT_SECTIONS.map((section) => (
        <Card key={section.title} accent={section.color}>
          <SectionHeader icon={section.icon} title={section.title} color={section.color} />
          <View style={{ gap: 12 }}>
            {section.fields.map((field) => {
              const value = draft[field.key];
              return (
                <View key={field.key}>
                  <EditFieldLabel label={field.label} />
                  {field.kind === 'chips' ? (
                    <EditList value={Array.isArray(value) ? value : []} onChange={(v) => setField(field.key, v)} color={section.color} />
                  ) : (
                    <TextInput
                      value={value == null ? '' : String(value)}
                      onChangeText={(t) => setField(field.key, field.kind === 'number' ? t.replace(/[^0-9.]/g, '') : t)}
                      keyboardType={field.kind === 'number' ? 'numeric' : 'default'}
                      placeholderTextColor={THEME.colors.textMuted}
                      style={{ backgroundColor: THEME.colors.surface3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 13, borderWidth: 0.5, borderColor: THEME.colors.border }}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </Card>
      ))}
      <SaveCancelBar onCancel={onDone} onSave={handleSave} saving={isPending} />
    </View>
  );
}

function AssessmentTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { data: assessment, isLoading } = useClientDetailedAssessment(clientId);
  const { data: clientProfile } = useClientProfile(clientId);
  const { mutateAsync: markReviewed, isPending } = useMarkAssessmentReviewed();
  const { mutateAsync: saveStage, isPending: isSavingStage } = useUpdateDetailedAssessmentStage(clientId);
  const [openStage, setOpenStage] = useState<string | null>(DETAILED_ASSESSMENT_STAGES[0]?.key ?? null);
  const [editingStage, setEditingStage] = useState<string | null>(null);

  const handleSaveStage = async (stageKey: AssessmentStageKey, data: Record<string, any>) => {
    await saveStage({ stageKey, data });
  };

  if (isLoading) return <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />;

  if (!assessment || assessment.status === 'in_progress') {
    return (
      <EmptyState
        icon="📝"
        title="Not submitted yet"
        subtitle={`${clientName} hasn't requested a coach / taken the Detailed Assessment yet (currently on stage ${assessment?.current_stage ?? 1}).`}
      />
    );
  }

  const isReviewed = assessment.status === 'reviewed';
  const isAthlete = !!(assessment as any).is_athlete;
  const stages = DETAILED_ASSESSMENT_STAGES.filter((s) => !s.athleteOnly || isAthlete);

  return (
    <View>
      <View style={{ backgroundColor: isReviewed ? `${SUCCESS}15` : `${THEME.colors.amber}15`, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 0.5, borderColor: isReviewed ? `${SUCCESS}30` : `${THEME.colors.amber}30`, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 20 }}>{isReviewed ? '✅' : '🔔'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: isReviewed ? SUCCESS : THEME.colors.amber }}>
            {isReviewed ? 'Reviewed' : 'Submitted — needs review'}
          </Text>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
            {assessment.submitted_at ? new Date(assessment.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
          </Text>
        </View>
      </View>

      {stages.map((stage, i) => {
        const data = (assessment as any)[stage.key] ?? {};
        const isOpen = openStage === stage.key;
        const isEditingThis = editingStage === stage.key;
        const stageColors = ['#00C4B4', '#F59E0B', '#60A5FA', '#C084FC', '#4CC986'];
        const color = stageColors[i % stageColors.length];

        return (
          <View key={stage.key} style={{ marginBottom: 10, backgroundColor: THEME.colors.surface2, borderRadius: 14, borderWidth: 0.5, borderColor: THEME.colors.border, overflow: 'hidden' }}>
            <TouchableOpacity
              onPress={() => setOpenStage(isOpen ? null : stage.key)}
              activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 }}
            >
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${color}20`, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 15 }}>{stage.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{stage.title}</Text>
                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 1 }}>{stage.subtitle}</Text>
              </View>
              <Text style={{ color: THEME.colors.textMuted, fontSize: 16, transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}>›</Text>
            </TouchableOpacity>

            {isOpen && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 14, borderTopWidth: 0.5, borderTopColor: THEME.colors.border }}>
                {isEditingThis ? (
                  <DetailedStageEditor
                    stage={stage}
                    data={data}
                    color={color}
                    onDone={() => setEditingStage(null)}
                    onSave={handleSaveStage}
                    saving={isSavingStage}
                  />
                ) : (
                  <>
                    {stage.fields.map((field) => {
                      // diet_preference's value lives on profiles.diet_type, not in this stage's jsonb.
                      const value = field.crossTableProfileDiet
                        ? (clientProfile?.diet_type === 'veg' ? 'Veg' : clientProfile?.diet_type === 'non_veg' ? 'Non-Veg' : null)
                        : data[field.key];
                      return <FieldValue key={field.key} label={field.label} value={value} color={color} />;
                    })}
                    <TouchableOpacity
                      onPress={() => setEditingStage(stage.key)}
                      style={{ alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: `${color}18` }}
                    >
                      <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color }}>✏️ Edit</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        );
      })}

      {!isReviewed && (
        <TouchableOpacity
          onPress={() => Alert.alert('Mark as reviewed', `Confirm you've reviewed ${clientName}'s assessment?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Confirm', onPress: () => markReviewed(clientId) },
          ])}
          disabled={isPending}
          activeOpacity={0.85}
          style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 }}
        >
          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>✓ Mark as Reviewed</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Body Measurements tab ──────────────────────────────────────────────
const METRIC_FIELDS: { key: string; label: string; icon: string; suffix: string; color: string }[] = [
  { key: 'weight_kg', label: 'Weight', icon: '⚖️', suffix: 'kg', color: '#60A5FA' },
  { key: 'body_fat_pct', label: 'Body fat', icon: '🔥', suffix: '%', color: THEME.colors.amber },
  { key: 'waist_cm', label: 'Waist', icon: '📐', suffix: 'cm', color: '#C084FC' },
  { key: 'hips_cm', label: 'Hips', icon: '📐', suffix: 'cm', color: '#F472B6' },
  { key: 'chest_cm', label: 'Chest', icon: '📐', suffix: 'cm', color: THEME.colors.teal },
  { key: 'pushup_count', label: 'Push-ups', icon: '🤸', suffix: '', color: SUCCESS },
  { key: 'plank_seconds', label: 'Plank', icon: '⏱️', suffix: 's', color: '#FB923C' },
  { key: 'squat_reps', label: 'Squats', icon: '🦵', suffix: '', color: '#818CF8' },
];

function shiftOverviewWeek(weekStart: string, delta: number) {
  const d = new Date(weekStart + 'T00:00:00');
  d.setDate(d.getDate() + delta * 7);
  return getWeekStart(d);
}

function MeasurementsTab({ clientId }: { clientId: string }) {
  const { data: metrics = [], isLoading } = useClientBodyMetrics(clientId);
  const { data: nutritionTrend = [] } = useClientNutritionTrend(clientId);
  const { data: oopsTrend = [] } = useClientOopsTrend(clientId);
  const { data: trainingLoad } = useClientTrainingLoadScores(clientId);
  const [selectedMetric, setSelectedMetric] = useState('weight_kg');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nutritionView, setNutritionView] = useState<'total' | 'oops'>('total');

  if (isLoading) return <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />;
  if (!metrics.length) {
    return (
      <View>
        <Card>
          <SectionHeader icon="💊" title="Supplement Tracker" color="#A78BFA" />
          <SupplementCalendarTracker clientId={clientId} />
        </Card>
        <EmptyState icon="📏" title="No measurements yet" subtitle="Measurements logged by the client will show up here." />
      </View>
    );
  }

  // Chronological (oldest→newest) for the trend chart and week strip
  const chronological = [...metrics].reverse();
  const loggedWeeks = new Set(metrics.map((m: any) => m.recorded_date));

  // Last 12 weeks ending at the most recent logged week (or today if more recent)
  const latestAnchor = metrics[0]?.recorded_date && metrics[0].recorded_date > getWeekStart() ? metrics[0].recorded_date : getWeekStart();
  const recentWeeks: string[] = [];
  for (let i = 11; i >= 0; i--) recentWeeks.push(shiftOverviewWeek(latestAnchor, -i));

  const availableMetrics = METRIC_FIELDS.filter((f) => metrics.some((m: any) => m[f.key] != null));
  const activeField = availableMetrics.find((f) => f.key === selectedMetric) ?? availableMetrics[0];
  const trendPoints = chronological.filter((m: any) => m[activeField.key] != null).map((m: any) => ({ date: m.recorded_date, value: Number(m[activeField.key]) }));
  const trendCardColor = activeField.color;

  const onSelectWeek = (wk: string) => {
    const match = metrics.find((m: any) => m.recorded_date === wk);
    setExpandedId(match ? match.id : null);
  };

  return (
    <View>
      {/* Week status — green = logged, grey = no measurement that week */}
      <Card>
        <SectionHeader icon="📆" title="Logging Streak" color="#60A5FA" />
        <WeekStatusStrip
          weeks={recentWeeks}
          loggedWeeks={loggedWeeks}
          selectedWeek={metrics.find((m: any) => m.id === expandedId)?.recorded_date}
          onSelect={onSelectWeek}
          accentColor="#60A5FA"
        />
      </Card>

      {/* Trend analysis — pick a body metric, see it charted across every week at once */}
      <Card accent={trendCardColor}>
        <SectionHeader icon="📈" title="Trend Analysis" color={trendCardColor} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 6 }}>
          {availableMetrics.map((f) => {
            const active = f.key === activeField.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setSelectedMetric(f.key)}
                style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9, backgroundColor: active ? f.color : THEME.colors.surface3 }}
              >
                <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: active ? THEME.colors.background : THEME.colors.textSecondary }}>{f.icon} {f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <MetricTrendChart points={trendPoints} color={activeField.color} unit={activeField.suffix} />
      </Card>

      {/* Training Load — daily Cardio / Strength / Mobility scores, auto-derived
          from workout logs. Separate from the 8-domain Fitness Assessment tab. */}
      {trainingLoad && (
        <View style={{ marginBottom: 4 }}>
          <TrainingLoadSection data={trainingLoad} />
        </View>
      )}

      {/* Nutrition trend — calories / protein / fat across weeks */}
      <Card accent="#F59E0B">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <SectionHeader icon="🍽️" title="Nutrition Trend" color="#F59E0B" />
          <View style={{ flexDirection: 'row', backgroundColor: THEME.colors.surface3, borderRadius: 10, padding: 3, gap: 3 }}>
            <TouchableOpacity
              onPress={() => setNutritionView('total')}
              style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: nutritionView === 'total' ? THEME.colors.teal : 'transparent' }}
            >
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: nutritionView === 'total' ? '#fff' : THEME.colors.textMuted }}>Total</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setNutritionView('oops')}
              style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: nutritionView === 'oops' ? '#F97316' : 'transparent' }}
            >
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: nutritionView === 'oops' ? '#fff' : THEME.colors.textMuted }}>Oops 🙈</Text>
            </TouchableOpacity>
          </View>
        </View>
        {nutritionView === 'total'
          ? <NutritionTrendChart points={nutritionTrend} />
          : oopsTrend.length === 0
            ? (
              <View style={{ paddingVertical: 28, alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 28 }}>🥗</Text>
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Clean as a whistle.</Text>
                <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', paddingHorizontal: 16 }}>No confession booth entries this period.</Text>
              </View>
            )
            : <NutritionTrendChart points={oopsTrend} accentColor="#F97316" />
        }
      </Card>

      {/* Supplement calendar tracker — one calendar per supplement, green=done red=missed */}
      <Card>
        <SectionHeader icon="💊" title="Supplement Tracker" color="#A78BFA" />
        <SupplementCalendarTracker clientId={clientId} />
      </Card>

      {/* Detail log — tap any week to expand its full readout */}
      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 10, marginTop: 4 }}>WEEKLY LOG</Text>
      {metrics.map((m: any, idx: number) => {
        const prev = metrics[idx + 1];
        const isOpen = expandedId === m.id || (expandedId === null && idx === 0);
        return (
          <View key={m.id} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 10, overflow: 'hidden' }}>
            <TouchableOpacity onPress={() => setExpandedId(isOpen ? '' : m.id)} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 13.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
                  {new Date(m.recorded_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
                {idx === 0 && (
                  <View style={{ backgroundColor: `${THEME.colors.teal}20`, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>LATEST</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                {m.weight_kg ? `${m.weight_kg}kg` : '—'} {isOpen ? '▾' : '▸'}
              </Text>
            </TouchableOpacity>

            {isOpen && (
              <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {METRIC_FIELDS.filter((f) => m[f.key] != null).map((f) => {
                    const delta = prev?.[f.key] != null ? Number(m[f.key]) - Number(prev[f.key]) : null;
                    return (
                      <View key={f.key} style={{ flexBasis: '47%', backgroundColor: THEME.colors.surface3, borderRadius: 10, padding: 10 }}>
                        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{f.icon} {f.label}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 3 }}>
                          <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{m[f.key]}{f.suffix}</Text>
                          {delta != null && delta !== 0 && (
                            <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: delta > 0 ? THEME.colors.amber : SUCCESS }}>
                              {delta > 0 ? '▲' : '▼'} {Math.abs(Math.round(delta * 10) / 10)}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
                {m.notes && <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 10, fontStyle: 'italic' }}>"{m.notes}"</Text>}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ── Pictures tab ────────────────────────────────────────────────────────
function PhotoThumb({ p, cellW, selected, selectable, onPress }: { p: any; cellW: number; selected?: boolean; selectable?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={selectable ? 0.8 : 1}
      onPress={onPress}
      disabled={!selectable}
      style={{ width: cellW, height: cellW * 1.3, borderRadius: 12, overflow: 'hidden', backgroundColor: THEME.colors.surface2, borderWidth: selected ? 2 : 0, borderColor: THEME.colors.teal }}
    >
      {p.url ? (
        <Image source={{ uri: p.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22 }}>🖼️</Text>
        </View>
      )}
      <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
        <Text style={{ fontSize: 9, fontFamily: THEME.fonts.sansMedium, color: '#fff', textTransform: 'capitalize' }}>{p.photo_type}</Text>
      </View>
      {selected && (
        <View style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: THEME.colors.teal, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 10, color: THEME.colors.background, fontFamily: THEME.fonts.sansMedium }}>✓</Text>
        </View>
      )}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 4, alignItems: 'center' }}>
        <Text style={{ fontSize: 9, fontFamily: THEME.fonts.sans, color: '#fff' }}>
          {new Date(p.photo_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function PicturesTab({ clientId }: { clientId: string }) {
  const { data: photos = [], isLoading } = useClientPhotos(clientId);
  const screenW = Dimensions.get('window').width - 48;
  const cellW = (screenW - 16) / 3;
  const [mode, setMode] = useState<'timeline' | 'week' | 'compare'>('timeline');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [browseWeekStart, setBrowseWeekStart] = useState(() => getWeekStart());
  const [jumpVisible, setJumpVisible] = useState(false);

  if (isLoading) return <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />;
  if (!photos.length) return <EmptyState icon="📷" title="No photos yet" subtitle="Progress photos uploaded by the client will appear here." />;

  // Group by the Monday of the week each photo falls in
  const weeks = new Map<string, any[]>();
  (photos as any[]).forEach((p) => {
    const wk = getWeekStart(new Date(p.photo_date + 'T00:00:00'));
    if (!weeks.has(wk)) weeks.set(wk, []);
    weeks.get(wk)!.push(p);
  });
  const sortedWeeks = Array.from(weeks.entries()).sort(([a], [b]) => b.localeCompare(a));
  const markedDates = new Set((photos as any[]).map((p) => p.photo_date));
  const weekPhotos = weeks.get(browseWeekStart) ?? [];

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };
  const compareA = photos.find((p: any) => p.id === compareIds[0]);
  const compareB = photos.find((p: any) => p.id === compareIds[1]);

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 4, gap: 4, borderWidth: 0.5, borderColor: THEME.colors.border }}>
          {(['timeline', 'week', 'compare'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => { setMode(m); setCompareIds([]); }}
              style={{ flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9, backgroundColor: mode === m ? '#C084FC' : 'transparent' }}
            >
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: mode === m ? THEME.colors.background : THEME.colors.textMuted }}>
                {m === 'timeline' ? '🕐 All' : m === 'week' ? '📆 Week' : '⇄ Compare'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {(mode === 'timeline' || mode === 'week') && (
          <TouchableOpacity
            onPress={() => setJumpVisible(true)}
            style={{ width: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.colors.surface2, borderRadius: 12, borderWidth: 0.5, borderColor: THEME.colors.border }}
          >
            <Text style={{ fontSize: 17 }}>📅</Text>
          </TouchableOpacity>
        )}
      </View>

      {mode === 'week' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <TouchableOpacity onPress={() => setBrowseWeekStart((w) => shiftOverviewWeek(w, -1))} style={{ padding: 8 }}>
            <Text style={{ fontSize: 18, color: THEME.colors.textMuted }}>‹</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary }}>
            Week of {new Date(browseWeekStart + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
          <TouchableOpacity
            onPress={() => setBrowseWeekStart((w) => shiftOverviewWeek(w, 1))}
            disabled={browseWeekStart >= getWeekStart()}
            style={{ padding: 8, opacity: browseWeekStart >= getWeekStart() ? 0.3 : 1 }}
          >
            <Text style={{ fontSize: 18, color: THEME.colors.textMuted }}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'week' && (
        weekPhotos.length === 0 ? (
          <EmptyState icon="📸" title="No photos this week" />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {weekPhotos.map((p: any) => <PhotoThumb key={p.id} p={p} cellW={cellW} />)}
          </View>
        )
      )}

      {mode === 'compare' && (
        <View style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 12, textAlign: 'center' }}>
            Tap up to 2 photos below to compare them side by side
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[compareA, compareB].map((p, i) => (
              <View key={i} style={{ flex: 1, height: cellW * 1.6, borderRadius: 14, backgroundColor: THEME.colors.surface2, borderWidth: 0.5, borderColor: THEME.colors.border, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                {p ? (
                  <>
                    <Image source={{ uri: p.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 5, alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: '#fff' }}>
                        {new Date(p.photo_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Pick photo {i + 1}</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {mode === 'timeline' && sortedWeeks.map(([wk, wPhotos]) => (
        <View key={wk} style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: '#C084FC', marginBottom: 10 }}>
            Week of {new Date(wk + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {wPhotos.map((p: any) => (
              <PhotoThumb key={p.id} p={p} cellW={cellW} />
            ))}
          </View>
        </View>
      ))}

      <Modal transparent visible={jumpVisible} animationType="slide" onRequestClose={() => setJumpVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={() => setJumpVisible(false)} />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: THEME.colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 36 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontSize: 17, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>Jump to a date</Text>
            <TouchableOpacity onPress={() => setJumpVisible(false)}><Text style={{ fontSize: 20, color: THEME.colors.textMuted }}>✕</Text></TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 14 }}>Dates with a dot have photos</Text>
          <CalendarGrid
            markedDates={markedDates}
            accentColor="#C084FC"
            onSelect={(date) => {
              setBrowseWeekStart(getWeekStart(new Date(date + 'T00:00:00')));
              setMode('week');
              setJumpVisible(false);
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

// ── Workouts tab ────────────────────────────────────────────────────────
const NUTRITION_COLOR = '#FB923C';

const MEDICAL_CATEGORY_META: Record<DocumentCategory, { label: string; icon: string }> = {
  blood_work:    { label: 'Blood Work / Lab Reports', icon: '🩸' },
  imaging:       { label: 'Imaging / X-rays / Scans', icon: '🩻' },
  prescriptions: { label: 'Prescriptions / Medication', icon: '💊' },
  other:         { label: 'Other', icon: '📄' },
};

function MedicalLabValueRow({ lv }: { lv: { test: string; value: string; unit: string; referenceRange: string | null; status: string } }) {
  const color = lv.status === 'out_of_range' ? THEME.colors.amber : lv.status === 'in_range' ? SUCCESS : THEME.colors.textMuted;
  const label = lv.status === 'out_of_range' ? 'Outside range' : lv.status === 'in_range' ? 'In range' : 'Unknown';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{lv.test}</Text>
        <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 1 }}>
          {lv.value}{lv.unit ? ` ${lv.unit}` : ''}{lv.referenceRange ? `  ·  Ref: ${lv.referenceRange}` : ''}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${color}18`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
        <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sansMedium, color }}>{label}</Text>
      </View>
    </View>
  );
}

function MedicalDocumentSummaryModal({ doc, visible, onClose }: { doc: AnalysisDocResult | null; visible: boolean; onClose: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }} onPress={onClose} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '80%', backgroundColor: THEME.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 }}>
        {doc && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text numberOfLines={2} style={{ fontSize: 16, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginBottom: 14 }}>
              {MEDICAL_CATEGORY_META[doc.category]?.icon} {doc.filename}
            </Text>
            {doc.labValues?.length > 0 && doc.labValues.map((lv, j) => <MedicalLabValueRow key={j} lv={lv} />)}
            {doc.medications?.length > 0 && doc.medications.map((m, j) => (
              <View key={j} style={{ paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{m.name}</Text>
                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 1 }}>{m.dosage} · {m.frequency}</Text>
              </View>
            ))}
            {doc.notes && <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, marginTop: 10, lineHeight: 20 }}>{doc.notes}</Text>}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function MedicalRecordsTab({ clientId }: { clientId: string }) {
  const { user, isCoach } = useAuth();
  const { data: docs = [], isLoading: docsLoading } = useClientMedicalDocuments(clientId);
  const { data: analyses = [], isLoading: analysesLoading } = useClientMedicalAnalyses(clientId);
  const latestAnalysis = analyses[0];
  const [summaryDoc, setSummaryDoc] = useState<AnalysisDocResult | null>(null);
  const [feedbackDoc, setFeedbackDoc] = useState<MedicalDocument | null>(null);

  const { mutate: markAnalysisViewed } = useMarkAnalysisViewedByCoach();
  useEffect(() => {
    if (!isCoach) return;
    (analyses as any[]).forEach((a) => {
      if (a.sent_to_coach_at && !a.coach_viewed_at) markAnalysisViewed(a.id);
    });
  }, [isCoach, analyses]);

  if (docsLoading || analysesLoading) {
    return <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 24 }} />;
  }

  function findAnalysisDoc(filename: string): AnalysisDocResult | undefined {
    return latestAnalysis?.result?.documents?.find((d) => d.filename === filename);
  }

  async function openDocument(storagePath: string) {
    const { data, error } = await supabase.storage.from('medical-documents').createSignedUrl(storagePath, 60 * 5);
    if (error || !data?.signedUrl) {
      Alert.alert('Could not open document', error?.message ?? 'Please try again.');
      return;
    }
    Linking.openURL(data.signedUrl);
  }

  if (docs.length === 0) {
    return (
      <Card>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center' }}>
          This client hasn't uploaded any medical documents yet.
        </Text>
      </Card>
    );
  }

  return (
    <View>
      <SectionHeader icon="🩺" title="Medical Documents" color="#F87171" />
      {(['blood_work', 'imaging', 'prescriptions', 'other'] as DocumentCategory[]).map((cat) => {
        const inCat = docs.filter((d) => d.category === cat);
        if (inCat.length === 0) return null;
        return (
          <View key={cat} style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 6 }}>
              {MEDICAL_CATEGORY_META[cat].icon} {MEDICAL_CATEGORY_META[cat].label}
            </Text>
            {inCat.map((doc) => {
              const analysisDoc = findAnalysisDoc(doc.original_filename);
              return (
                <View key={doc.id} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, padding: 10, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 6 }}>
                  <Text numberOfLines={1} style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{doc.original_filename}</Text>
                  <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
                    {new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: THEME.colors.border }}>
                    <TouchableOpacity onPress={() => openDocument(doc.storage_path)}>
                      <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>View</Text>
                    </TouchableOpacity>
                    {analysisDoc && (
                      <>
                        <TouchableOpacity onPress={() => setSummaryDoc(analysisDoc)}>
                          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Summary</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setFeedbackDoc(doc)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Feedback</Text>
                          {doc.coach_has_unread_feedback && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: THEME.colors.amber }} />}
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}

      <MedicalDocumentSummaryModal doc={summaryDoc} visible={!!summaryDoc} onClose={() => setSummaryDoc(null)} />
      <FeedbackThreadModal
        documentId={feedbackDoc?.id ?? null}
        clientId={clientId}
        coachId={user?.id}
        filename={feedbackDoc?.original_filename}
        visible={!!feedbackDoc}
        onClose={() => setFeedbackDoc(null)}
      />
    </View>
  );
}

function WorkoutsTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const { data: summary, isLoading } = useClientWorkoutSummary(clientId, weekStart);

  const planButton = (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/(coach)/client-workouts', params: { clientId, clientName } })}
      activeOpacity={0.85}
      style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 }}
    >
      <Text style={{ fontSize: 16 }}>✏️</Text>
      <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Suggest · Exercises / Nutrition</Text>
    </TouchableOpacity>
  );

  const weekNav = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <TouchableOpacity onPress={() => setWeekStart((w) => shiftOverviewWeek(w, -1))} style={{ padding: 6 }}>
        <Text style={{ fontSize: 18, color: THEME.colors.textMuted }}>‹</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary }}>
        Week of {new Date(weekStart + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </Text>
      <TouchableOpacity onPress={() => setWeekStart((w) => shiftOverviewWeek(w, 1))} style={{ padding: 6 }}>
        <Text style={{ fontSize: 18, color: THEME.colors.textMuted }}>›</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) return <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />;
  if (!summary || summary.total === 0) {
    return (
      <View>
        {planButton}
        {weekNav}
        <EmptyState icon="💪" title="Nothing planned this week" subtitle="Add exercises or meals to this client's plan, or browse another week." />
      </View>
    );
  }

  const dayLabels = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const pct = Math.round((summary.done / summary.total) * 100);

  return (
    <View>
      {planButton}
      {weekNav}

      <Card accent={SUCCESS}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 22, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{summary.done}/{summary.total} completed</Text>
          <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 4, borderColor: SUCCESS, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: SUCCESS }}>{pct}%</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.colors.teal }} />
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>💪 {summary.exDone}/{summary.exTotal} exercises</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: NUTRITION_COLOR }} />
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>🍽️ {summary.nutDone}/{summary.nutTotal} meals</Text>
          </View>
          {(summary.supTotal ?? 0) > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#A78BFA' }} />
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>💊 {summary.supDone}/{summary.supTotal} supplements</Text>
            </View>
          )}
        </View>
      </Card>

      {Object.entries(summary.byDay).sort(([a], [b]) => Number(a) - Number(b)).map(([day, stat]) => {
        const dayTotal = stat.exTotal + stat.nutTotal + (stat.supTotal ?? 0);
        const dayDone = dayTotal > 0 && stat.exDone + stat.nutDone + (stat.supDone ?? 0) === dayTotal;
        const exPct = stat.exTotal ? Math.round((stat.exDone / stat.exTotal) * 100) : 0;
        const nutPct = stat.nutTotal ? Math.round((stat.nutDone / stat.nutTotal) * 100) : 0;
        const supPct = (stat.supTotal ?? 0) ? Math.round(((stat.supDone ?? 0) / stat.supTotal) * 100) : 0;
        return (
          <Card key={day} accent={dayDone ? SUCCESS : THEME.colors.border}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{dayLabels[Number(day)] ?? `Day ${day}`}</Text>
                {dayDone && <Text style={{ fontSize: 12 }}>✅</Text>}
              </View>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                {dayTotal === 0 ? 'Nothing planned' : `${stat.exDone + stat.nutDone + (stat.supDone ?? 0)}/${dayTotal}`}
              </Text>
            </View>

            {dayTotal > 0 && (
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  {stat.exTotal > 0 && (
                    <View style={{ marginBottom: stat.nutTotal > 0 ? 8 : 0 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>💪 Exercises</Text>
                        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{stat.exDone}/{stat.exTotal}</Text>
                      </View>
                      <View style={{ height: 5, backgroundColor: THEME.colors.surface3, borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${exPct}%`, backgroundColor: THEME.colors.teal, borderRadius: 3 }} />
                      </View>
                    </View>
                  )}

                  {stat.nutTotal > 0 && (
                    <View style={{ marginBottom: (stat.supTotal ?? 0) > 0 ? 8 : 0 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>🍽️ Nutrition</Text>
                        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{stat.nutDone}/{stat.nutTotal}</Text>
                      </View>
                      <View style={{ height: 5, backgroundColor: THEME.colors.surface3, borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${nutPct}%`, backgroundColor: NUTRITION_COLOR, borderRadius: 3 }} />
                      </View>
                    </View>
                  )}

                  {(stat.supTotal ?? 0) > 0 && (
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>💊 Supplements</Text>
                        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{stat.supDone}/{stat.supTotal}</Text>
                      </View>
                      <View style={{ height: 5, backgroundColor: THEME.colors.surface3, borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${supPct}%`, backgroundColor: '#A78BFA', borderRadius: 3 }} />
                      </View>
                    </View>
                  )}
                </View>

                {stat.calories > 0 && (
                  <View style={{ paddingLeft: 14, borderLeftWidth: 0.5, borderLeftColor: THEME.colors.border, flexShrink: 0 }}>
                    <MacroRing calories={stat.calories} protein={stat.protein} fat={stat.fat} compact />
                  </View>
                )}
              </View>
            )}

            {dayTotal === 0 && (
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, fontStyle: 'italic' }}>Nothing added for this day</Text>
            )}
          </Card>
        );
      })}
    </View>
  );
}

// ── Recovery tab (admin-only) — review/respond to in-person rehab requests
// and see the client's confirmed appointments once booked.
function RehabTab({ clientId }: { clientId: string }) {
  const { data: requests = [], isLoading } = useClientRehabRequests(clientId);
  const { data: appointments = [] } = useClientRehabAppointments(clientId);
  const { mutateAsync: respond, isPending } = useRespondToRehabRequest();
  const { mutateAsync: markPaid } = useAdminMarkRehabPaid();
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  if (isLoading) return <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />;
  if (requests.length === 0) return <EmptyState icon="🩹" title="No Recovery requests" subtitle="This client hasn't requested in-person treatment yet." />;

  const onAccept = (req: any) => {
    const price = Number(priceDrafts[req.id]);
    if (!price || price <= 0) { Alert.alert('Enter a price', 'Please enter a quoted price before accepting.'); return; }
    respond({ requestId: req.id, clientId, action: 'accept', quotedPrice: price });
  };

  const onDecline = (req: any) => {
    Alert.alert('Decline request', 'Add an optional note for the client?', [
      { text: 'Decline without note', onPress: () => respond({ requestId: req.id, clientId, action: 'decline' }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View>
      <SectionHeader icon="🩹" title="Recovery Requests" color={THEME.colors.amber} />
      {requests.map((req: any) => {
        const reqAppointments = appointments.filter((a: any) => a.rehab_request_id === req.id);
        return (
          <Card key={req.id} accent={req.status === 'pending' ? THEME.colors.amber : req.status === 'accepted' ? SUCCESS : '#F87171'}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>
                {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
              <View style={{ backgroundColor: req.status === 'pending' ? `${THEME.colors.amber}20` : req.status === 'accepted' ? `${SUCCESS}20` : '#F8717120', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: req.status === 'pending' ? THEME.colors.amber : req.status === 'accepted' ? SUCCESS : '#F87171', textTransform: 'capitalize' }}>{req.status}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: 4 }}>{req.package?.label}</Text>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 19, marginBottom: 6 }}>{req.issue_description}</Text>
            {req.duration_text && <Row label="Duration of issue" value={req.duration_text} />}

            {req.status === 'pending' && (
              <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: THEME.colors.border }}>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 6 }}>Quote a price (₹)</Text>
                <TextInput
                  value={priceDrafts[req.id] ?? ''}
                  onChangeText={(v) => setPriceDrafts((d) => ({ ...d, [req.id]: v.replace(/[^0-9]/g, '') }))}
                  placeholder="e.g. 6000"
                  placeholderTextColor={THEME.colors.textMuted}
                  keyboardType="numeric"
                  style={{ backgroundColor: THEME.colors.surface3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity onPress={() => onAccept(req)} disabled={isPending} style={{ flex: 1, backgroundColor: THEME.colors.teal, borderRadius: 10, paddingVertical: 11, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDecline(req)} disabled={isPending} style={{ flex: 1, backgroundColor: THEME.colors.surface3, borderRadius: 10, paddingVertical: 11, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
                    <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {req.status === 'declined' && req.decline_reason && (
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 4, fontStyle: 'italic' }}>"{req.decline_reason}"</Text>
            )}

            {req.status === 'accepted' && (
              <View style={{ marginTop: 8 }}>
                <Row label="Quoted price" value={`₹${req.quoted_price}`} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
                  <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Payment</Text>
                  {req.payment_status === 'paid' ? (
                    <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: SUCCESS }}>
                      Paid{req.payment_method === 'cash' ? ' in cash' : req.payment_method === 'razorpay' ? ' via Razorpay' : ''} ✓
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>Awaiting payment</Text>
                  )}
                </View>
                {req.payment_status !== 'paid' && (
                  <TouchableOpacity onPress={() => markPaid({ requestId: req.id, clientId })}>
                    <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textDecorationLine: 'underline' }}>
                      Mark as paid manually (if client hasn't confirmed in-app yet)
                    </Text>
                  </TouchableOpacity>
                )}
                {reqAppointments.length === 0 ? (
                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 4 }}>Waiting for client to pick a session time.</Text>
                ) : (
                  <View style={{ marginTop: 6 }}>
                    <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 6 }}>UPCOMING SESSIONS ({reqAppointments.length})</Text>
                    {reqAppointments.map((a: any) => (
                      <Text key={a.id} style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, paddingVertical: 3 }}>
                        {new Date(a.scheduled_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(a.scheduled_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </Card>
        );
      })}
    </View>
  );
}

// ── Fitness tab (coach + admin) — same scores/trend the client sees, plus
// raw results with units, evidence-strength tags, and full assessment
// history. Launches the shared assessment-entry flow (coach screen, also
// registered under (admin) as a thin re-export for parity).
const FITNESS_DOMAIN_META: Record<FitnessDomain, { label: string; icon: string; color: string }> = {
  strength:    { label: 'Strength',    icon: '💪', color: '#8b78e8' },
  flexibility: { label: 'Flexibility', icon: '🤸', color: THEME.colors.amber },
  endurance:   { label: 'Endurance',   icon: '🫁', color: '#60A5FA' },
  agility:     { label: 'Agility',     icon: '🏃', color: SUCCESS },
};

function FitnessAssessmentTab({ clientId, clientName, isAdminContext }: { clientId: string; clientName: string; isAdminContext: boolean }) {
  const router = useRouter();
  const { data: assessments = [], isLoading } = useClientFitnessAssessments(clientId);

  if (isLoading) return <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />;

  const newAssessmentButton = (
    <TouchableOpacity
      onPress={() => router.push({ pathname: isAdminContext ? '/(admin)/fitness-assessment-new' : '/(coach)/fitness-assessment-new', params: { clientId, clientName } })}
      activeOpacity={0.85}
      style={{ backgroundColor: '#34D399', borderRadius: 14, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 }}
    >
      <Text style={{ fontSize: 16 }}>🏋️</Text>
      <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>New Fitness Assessment</Text>
    </TouchableOpacity>
  );

  if (assessments.length === 0) {
    return (
      <View>
        {newAssessmentButton}
        <EmptyState icon="🏋️" title="No assessments yet" subtitle="Run a fitness assessment to start tracking this client's domain scores." />
      </View>
    );
  }

  return (
    <View>
      {newAssessmentButton}
      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 10 }}>ASSESSMENT HISTORY</Text>
      {assessments.map((a, idx) => (
        <Card key={a.id} accent={idx === 0 ? '#34D399' : undefined}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
              {new Date(a.assessment_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
            {idx === 0 && (
              <View style={{ backgroundColor: '#34D39920', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sansMedium, color: '#34D399' }}>LATEST</Text>
              </View>
            )}
          </View>
          <Row label="Age at assessment" value={`${a.client_age_at_assessment} yrs`} />
          <Row label="Gender" value={a.client_gender} />
          <Row label="Athlete (snapshot)" value={a.is_athlete} />
          {a.notes && <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 6, fontStyle: 'italic' }}>"{a.notes}"</Text>}

          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: THEME.colors.border, gap: 8 }}>
            {a.results.map((r) => {
              const meta = FITNESS_DOMAIN_META[r.domain as FitnessDomain] ?? { label: r.domain, icon: '📊', color: THEME.colors.textMuted };
              const outOfRange = r.score_status === 'age_out_of_range';
              return (
                <View key={r.id} style={{ backgroundColor: THEME.colors.surface3, borderRadius: 10, padding: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{meta.icon} {meta.label}</Text>
                    {outOfRange ? (
                      <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>Age out of range</Text>
                    ) : (
                      <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: meta.color }}>{r.domain_score != null ? Math.round(r.domain_score) : '—'}</Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                    {r.test_protocol_used}: {r.raw_result_primary}{r.raw_result_secondary != null ? ` / ${r.raw_result_secondary}` : ''} {r.raw_result_unit}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
                    <View style={{ backgroundColor: `${meta.color}18`, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sansMedium, color: meta.color, textTransform: 'capitalize' }}>{r.evidence_strength} evidence</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
      ))}
    </View>
  );
}

// ── Shared shell — used by both the coach's client-overview screen and the
// admin's client-profile screen. Adding a field/screen to a client's own
// login? Add the matching tab/field here once, both contexts pick it up.
export function ClientProfileView({
  clientId, clientName, ownerLabel = 'Your client', onBack, showRecoveryTab = false, initialTab,
}: {
  clientId: string; clientName: string; ownerLabel?: string; onBack: () => void; showRecoveryTab?: boolean; initialTab?: TabKey;
}) {
  const [tab, setTab] = useState<TabKey>(initialTab ?? 'overview');
  const tabs = showRecoveryTab ? [...TABS, RECOVERY_TAB] : TABS;

  return (
    <View style={{ flex: 1 }}>
      {/* Hero header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={onBack}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
          >
            <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${THEME.colors.teal}20`, borderWidth: 1, borderColor: `${THEME.colors.teal}30`, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>
              {clientName?.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>{clientName}</Text>
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 1 }}>{ownerLabel}</Text>
          </View>
        </View>

        {/* Tab bar — horizontally scrollable now that there are 7 tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 4, gap: 4, borderWidth: 0.5, borderColor: THEME.colors.border }}>
            {tabs.map((t) => {
              const active = tab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  activeOpacity={0.8}
                  style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, backgroundColor: active ? t.color : 'transparent', gap: 2 }}
                >
                  <Text style={{ fontSize: 14 }}>{t.icon}</Text>
                  <Text numberOfLines={1} style={{ fontSize: 9.5, fontFamily: THEME.fonts.sansMedium, color: active ? THEME.colors.background : THEME.colors.textMuted }}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {tab === 'profile'      && <ProfileTab clientId={clientId} />}
        {tab === 'overview'     && <OverviewTab clientId={clientId} />}
        {tab === 'assessment'   && <AssessmentTab clientId={clientId} clientName={clientName} />}
        {tab === 'measurements' && <MeasurementsTab clientId={clientId} />}
        {tab === 'pictures'     && <PicturesTab clientId={clientId} />}
        {tab === 'workouts'     && <WorkoutsTab clientId={clientId} clientName={clientName} />}
        {tab === 'medical'      && <MedicalRecordsTab clientId={clientId} />}
        {tab === 'recovery'     && <RehabTab clientId={clientId} />}
        {tab === 'fitness'      && <FitnessAssessmentTab clientId={clientId} clientName={clientName} isAdminContext={showRecoveryTab} />}
      </ScrollView>
    </View>
  );
}
