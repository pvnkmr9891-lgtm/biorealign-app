// app/onboarding/basic-info.tsx
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { THEME } from '@/constants/theme';
import { MAX_LENGTHS } from '@/utils/validation';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

// ── Static data ──────────────────────────────────────────────────────────────

const GENDER_OPTIONS = [
  { label: 'Male',   value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other',  value: 'other' },
];

const GOAL_OPTIONS = [
  'Weight loss', 'Muscle gain', 'General fitness', 'Better posture',
  'Pain relief', 'Stress management', 'Improve sleep', 'Improve flexibility',
];

const CONDITION_OPTIONS = [
  'Diabetes', 'Hypertension', 'Thyroid disorder', 'PCOS / PCOD',
  'Heart condition', 'Asthma', 'Arthritis / Joint pain', 'None',
];

const SUPPLEMENT_OPTIONS = [
  'Protein powder', 'Multivitamin', 'Omega-3 / Fish oil',
  'Vitamin D3', 'Creatine', 'Calcium', 'None',
];

const DIET_OPTIONS = [
  { label: '🥗 Veg',     value: 'veg' },
  { label: '🍗 Non-Veg', value: 'non_veg' },
];

// ── Date-of-birth auto-formatting ──────────────────────────────────────────
// Reformats whatever digits are currently in the field into DD-MM-YYYY,
// inserting hyphens automatically as the user types (and re-deriving
// cleanly on backspace, since it always recomputes from digits only).
function formatDobInput(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '').slice(0, 8);
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += '-' + digits.slice(2, 4);
  if (digits.length > 4) out += '-' + digits.slice(4, 8);
  return out;
}

// Parses "DD-MM-YYYY" into a real calendar date, or null if invalid —
// checks month range, and the day against the actual number of days in
// that specific month/year (rejects Feb 30, Apr 31, etc.), not just 1-31.
function parseDob(text: string): { dd: number; mm: number; yyyy: number } | null {
  const match = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const dd = Number(match[1]);
  const mm = Number(match[2]);
  const yyyy = Number(match[3]);
  if (mm < 1 || mm > 12) return null;
  const daysInMonth = new Date(yyyy, mm, 0).getDate();
  if (dd < 1 || dd > daysInMonth) return null;
  return { dd, mm, yyyy };
}

// Pulls the first two digit-groups out of a free-form height string (e.g.
// "5ft 2in", "5' 2\"", "5 2", "5ft2in") as feet and inches, regardless of
// which unit words/symbols were used, and converts to centimetres.
function parseHeightToCm(text: string): number | null {
  const nums = text.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  const ft = parseInt(nums[0], 10);
  const inch = nums.length > 1 ? parseInt(nums[1], 10) : 0;
  if (Number.isNaN(ft) || Number.isNaN(inch) || inch >= 12) return null;
  return (ft * 12 + inch) * 2.54;
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: THEME.colors.surface2,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
    }}>
      {children}
    </View>
  );
}

function FieldLabel({
  icon, children, optional,
}: {
  icon?: string; children: string; optional?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
      {icon ? <Text style={{ fontSize: 13, marginRight: 6 }}>{icon}</Text> : null}
      <Text style={{
        fontSize: 11, fontFamily: THEME.fonts.sansMedium,
        color: THEME.colors.textSecondary,
        letterSpacing: 1.1, textTransform: 'uppercase',
      }}>
        {children}
      </Text>
      {optional ? (
        <Text style={{
          fontSize: 10, fontFamily: THEME.fonts.sans,
          color: THEME.colors.textMuted, marginLeft: 7, letterSpacing: 0.3,
        }}>
          optional
        </Text>
      ) : null}
    </View>
  );
}

function Chip({ label, selected, onPress }: {
  label: string; selected: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: selected ? 'rgba(0,196,180,0.1)' : 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor:     selected ? THEME.colors.teal : 'rgba(255,255,255,0.1)',
      }}
    >
      {selected ? <Text style={{ fontSize: 10, color: THEME.colors.teal }}>✓</Text> : null}
      <Text style={{
        fontSize: 13,
        fontFamily: selected ? THEME.fonts.sansMedium : THEME.fonts.sans,
        color:     selected ? THEME.colors.teal : THEME.colors.textSecondary,
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function BasicInfoScreen() {
  const router = useRouter();
  const { profile, user } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [gender,   setGender]   = useState<string | null>(null);

  // Date of birth — free text, auto-formatted to DD-MM-YYYY as the user types.
  const [dobText, setDobText] = useState('');

  // Height (e.g. "5ft 2in") and weight (kg) — free text, parsed on submit.
  const [heightText, setHeightText] = useState('');
  const [weightText, setWeightText] = useState('');

  // Goals
  const [goals,     setGoals]     = useState<string[]>([]);
  const [goalDraft, setGoalDraft] = useState('');

  // Conditions
  const [conditions,     setConditions]     = useState<string[]>([]);
  const [conditionDraft, setConditionDraft] = useState('');

  // Other fields
  const [medications,      setMedications]     = useState<string[]>([]);
  const [medicationDraft,  setMedicationDraft]  = useState('');
  const [supplements,     setSupplements]     = useState<string[]>([]);
  const [supplementDraft, setSupplementDraft] = useState('');
  const [occupation, setOccupation] = useState('');
  const [location,   setLocation]   = useState('');
  const [dietType,   setDietType]   = useState<string | null>(null);
  const [saving,     setSaving]     = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function toggle(
    list: string[], setList: (v: string[]) => void, value: string,
  ) {
    if (value === 'None') {
      setList(list.includes('None') ? [] : ['None']);
      return;
    }
    const without = list.filter(v => v !== 'None');
    setList(without.includes(value)
      ? without.filter(v => v !== value)
      : [...without, value]);
  }

  function addCustom(
    draft: string,
    setDraft: (v: string) => void,
    list: string[],
    setList: (v: string[]) => void,
  ) {
    const v = draft.trim();
    if (!v) return;
    setList(prev => prev.includes(v) ? prev : [...prev.filter(p => p !== 'None'), v]);
    setDraft('');
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!fullName.trim()) {
      Alert.alert('Missing info', 'Please enter your name.');
      return;
    }

    const parsedDob = parseDob(dobText);
    if (!parsedDob) {
      Alert.alert('Invalid date of birth', 'Please enter your date of birth as DD-MM-YYYY.');
      return;
    }
    const { dd, mm, yyyy } = parsedDob;
    const dobDate = new Date(yyyy, mm - 1, dd);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const hadBirthdayThisYear =
      today.getMonth() > dobDate.getMonth() ||
      (today.getMonth() === dobDate.getMonth() && today.getDate() >= dobDate.getDate());
    if (!hadBirthdayThisYear) age -= 1;
    if (dobDate > today || age < 1 || age > 120) {
      Alert.alert('Invalid date of birth', 'Please enter a valid date of birth.');
      return;
    }
    const dob = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;

    const heightCm = parseHeightToCm(heightText);
    if (heightCm === null) {
      Alert.alert('Invalid height', 'Please enter your height like "5ft 2in".');
      return;
    }
    if (heightCm < 50 || heightCm > 274.32) {
      Alert.alert('Invalid height', 'Height must be between 1ft 8in and 9ft.');
      return;
    }

    const weightKg = parseFloat(weightText.replace(/[^0-9.]/g, ''));
    if (Number.isNaN(weightKg) || weightKg <= 0) {
      Alert.alert('Invalid weight', 'Please enter your weight in kg.');
      return;
    }
    if (weightKg < 20 || weightKg > 250) {
      Alert.alert('Invalid weight', 'Weight must be between 20kg and 250kg.');
      return;
    }

    setSaving(true);

    const updates: Record<string, any> = {
      full_name:   fullName.trim(),
      dob,
      gender:      gender ?? null,
      height_cm:   Math.round(heightCm),
      weight_kg:   weightKg,
      health_goals: goals,
      conditions,
      medications,
      supplements: supplements.filter(s => s !== 'None'),
      occupation:  occupation.trim()  || null,
      location:    location.trim()    || null,
      diet_type:   dietType,
      onboarding_completed:    true,
      onboarding_completed_at: new Date().toISOString(),
    };

    if (!user?.id) {
      setSaving(false);
      Alert.alert('Something went wrong', 'No active session — please log in again.');
      return;
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    setSaving(false);

    if (error) {
      Alert.alert('Something went wrong', error.message || 'Unknown error.');
      return;
    }

    useAuthStore.setState(state => ({
      profile: state.profile ? { ...state.profile, ...updates } : state.profile,
    }));
    router.replace('/(client)');
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top','bottom']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 52 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ─ Header ─ */}
          <View style={{ paddingHorizontal: 24, paddingTop: 32, marginBottom: 28 }}>
            <Text style={{
              fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal,
              letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16,
            }}>
              BioRealign
            </Text>
            <Text style={{
              fontSize: 32, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary,
              lineHeight: 42, marginBottom: 10,
            }}>
              Tell us about you
            </Text>
            <Text style={{
              fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 22,
            }}>
              A few quick basics to personalise your journey.
            </Text>
          </View>

          <View style={{ paddingHorizontal: 16, gap: 14 }}>

            {/* ─ Name + Gender ─ */}
            <Card>
              <FieldLabel icon="👤">Name</FieldLabel>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
                placeholderTextColor={THEME.colors.textMuted}
                autoCapitalize="words"
                maxLength={MAX_LENGTHS.personName}
                style={inputStyle}
              />

              <View style={{ height: 20 }} />

              <FieldLabel icon="🪪">Gender</FieldLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {GENDER_OPTIONS.map(g => (
                  <Chip key={g.value} label={g.label}
                    selected={gender === g.value}
                    onPress={() => setGender(g.value)} />
                ))}
              </View>
            </Card>

            {/* ─ Date of Birth ─ */}
            <Card>
              <FieldLabel icon="🎂">Date of birth</FieldLabel>
              <TextInput
                value={dobText}
                onChangeText={(t) => setDobText(formatDobInput(t))}
                placeholder="DD-MM-YYYY"
                placeholderTextColor={THEME.colors.textMuted}
                keyboardType="number-pad"
                maxLength={10}
                style={inputStyle}
              />
            </Card>

            {/* ─ Height & Weight ─ */}
            <Card>
              <View style={{ gap: 14 }}>
                <View>
                  <FieldLabel icon="📏">Height</FieldLabel>
                  <TextInput
                    value={heightText}
                    onChangeText={setHeightText}
                    placeholder="e.g. 5ft 2in"
                    placeholderTextColor={THEME.colors.textMuted}
                    maxLength={20}
                    style={inputStyle}
                  />
                </View>
                <View>
                  <FieldLabel icon="⚖️">Weight (kg)</FieldLabel>
                  <TextInput
                    value={weightText}
                    onChangeText={(t) => setWeightText(t.replace(/[^0-9.]/g, ''))}
                    placeholder="e.g. 70"
                    placeholderTextColor={THEME.colors.textMuted}
                    keyboardType="decimal-pad"
                    maxLength={6}
                    style={inputStyle}
                  />
                </View>
              </View>
            </Card>

            {/* ─ Health Goals ─ */}
            <Card>
              <FieldLabel icon="🎯" optional>Health goals</FieldLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {GOAL_OPTIONS.map(g => (
                  <Chip key={g} label={g}
                    selected={goals.includes(g)}
                    onPress={() => toggle(goals, setGoals, g)} />
                ))}
                {goals.filter(g => !GOAL_OPTIONS.includes(g)).map(g => (
                  <Chip key={g} label={g} selected
                    onPress={() => setGoals(prev => prev.filter(p => p !== g))} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={goalDraft}
                  onChangeText={setGoalDraft}
                  placeholder="Add your own goal"
                  placeholderTextColor={THEME.colors.textMuted}
                  onSubmitEditing={() => addCustom(goalDraft, setGoalDraft, goals, setGoals)}
                  maxLength={MAX_LENGTHS.customListItem}
                  style={[inputStyle, { flex: 1 }]}
                />
                <TouchableOpacity
                  onPress={() => addCustom(goalDraft, setGoalDraft, goals, setGoals)}
                  style={addBtnStyle}
                >
                  <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>+ Add</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* ─ Medical Conditions ─ */}
            <Card>
              <FieldLabel icon="🩺" optional>Medical conditions</FieldLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {CONDITION_OPTIONS.map(c => (
                  <Chip key={c} label={c}
                    selected={conditions.includes(c)}
                    onPress={() => toggle(conditions, setConditions, c)} />
                ))}
                {conditions.filter(c => !CONDITION_OPTIONS.includes(c)).map(c => (
                  <Chip key={c} label={c} selected
                    onPress={() => setConditions(prev => prev.filter(p => p !== c))} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={conditionDraft}
                  onChangeText={setConditionDraft}
                  placeholder="Add a condition"
                  placeholderTextColor={THEME.colors.textMuted}
                  onSubmitEditing={() => addCustom(conditionDraft, setConditionDraft, conditions, setConditions)}
                  maxLength={MAX_LENGTHS.customListItem}
                  style={[inputStyle, { flex: 1 }]}
                />
                <TouchableOpacity
                  onPress={() => addCustom(conditionDraft, setConditionDraft, conditions, setConditions)}
                  style={addBtnStyle}
                >
                  <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>+ Add</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* ─ Medications ─ */}
            <Card>
              <FieldLabel icon="💊" optional>Medications</FieldLabel>
              {medications.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {medications.map(m => (
                    <Chip key={m} label={m} selected
                      onPress={() => setMedications(prev => prev.filter(p => p !== m))} />
                  ))}
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={medicationDraft}
                  onChangeText={setMedicationDraft}
                  placeholder="e.g. Metformin 500mg"
                  placeholderTextColor={THEME.colors.textMuted}
                  onSubmitEditing={() => addCustom(medicationDraft, setMedicationDraft, medications, setMedications)}
                  maxLength={MAX_LENGTHS.customListItem}
                  style={[inputStyle, { flex: 1 }]}
                />
                <TouchableOpacity
                  onPress={() => addCustom(medicationDraft, setMedicationDraft, medications, setMedications)}
                  style={addBtnStyle}
                >
                  <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>+ Add</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* ─ Supplements ─ */}
            <Card>
              <FieldLabel icon="🧴" optional>Supplements</FieldLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {SUPPLEMENT_OPTIONS.map(s => (
                  <Chip key={s} label={s}
                    selected={supplements.includes(s)}
                    onPress={() => toggle(supplements, setSupplements, s)} />
                ))}
                {supplements.filter(s => !SUPPLEMENT_OPTIONS.includes(s)).map(s => (
                  <Chip key={s} label={s} selected
                    onPress={() => setSupplements(prev => prev.filter(p => p !== s))} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={supplementDraft}
                  onChangeText={setSupplementDraft}
                  placeholder="Add another"
                  placeholderTextColor={THEME.colors.textMuted}
                  onSubmitEditing={() => addCustom(supplementDraft, setSupplementDraft, supplements, setSupplements)}
                  maxLength={MAX_LENGTHS.customListItem}
                  style={[inputStyle, { flex: 1 }]}
                />
                <TouchableOpacity
                  onPress={() => addCustom(supplementDraft, setSupplementDraft, supplements, setSupplements)}
                  style={addBtnStyle}
                >
                  <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>+ Add</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* ─ Occupation + Location ─ */}
            <Card>
              <FieldLabel icon="💼" optional>Occupation</FieldLabel>
              <TextInput
                value={occupation}
                onChangeText={setOccupation}
                placeholder="e.g. Software Engineer"
                placeholderTextColor={THEME.colors.textMuted}
                maxLength={MAX_LENGTHS.occupation}
                style={inputStyle}
              />
              <View style={{ height: 18 }} />
              <FieldLabel icon="📍" optional>Location</FieldLabel>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Bengaluru, Karnataka"
                placeholderTextColor={THEME.colors.textMuted}
                maxLength={MAX_LENGTHS.location}
                style={inputStyle}
              />
            </Card>

            {/* ─ Diet ─ */}
            <Card>
              <FieldLabel icon="🍽️">Diet preference</FieldLabel>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {DIET_OPTIONS.map(d => (
                  <Chip key={d.value} label={d.label}
                    selected={dietType === d.value}
                    onPress={() => setDietType(d.value)} />
                ))}
              </View>
            </Card>

          </View>

          {/* ─ CTA ─ */}
          <View style={{ paddingHorizontal: 16, marginTop: 28 }}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={saving}
              activeOpacity={0.85}
              style={{
                backgroundColor: THEME.colors.teal,
                borderRadius: 16,
                paddingVertical: 17,
                alignItems: 'center',
                shadowColor: THEME.colors.teal,
                shadowOpacity: 0.4,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 5 },
                elevation: 8,
              }}
            >
              {saving
                ? <ActivityIndicator color="#000" />
                : <Text style={{
                    color: '#000', fontSize: 16,
                    fontFamily: THEME.fonts.sansSemibold, letterSpacing: 0.4,
                  }}>
                    Begin my journey →
                  </Text>}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Style tokens ─────────────────────────────────────────────────────────────

const inputStyle = {
  backgroundColor:  'rgba(255,255,255,0.04)',
  color:            THEME.colors.textPrimary,
  fontFamily:       THEME.fonts.sans,
  fontSize:         15,
  borderRadius:     12,
  paddingHorizontal: 16,
  paddingVertical:  13,
  borderWidth:      1,
  borderColor:      'rgba(255,255,255,0.08)',
} as const;

const addBtnStyle = {
  paddingHorizontal: 16,
  justifyContent:    'center'  as const,
  backgroundColor:   'rgba(0,196,180,0.08)',
  borderRadius:      12,
  borderWidth:       1,
  borderColor:       'rgba(0,196,180,0.2)',
} as const;
