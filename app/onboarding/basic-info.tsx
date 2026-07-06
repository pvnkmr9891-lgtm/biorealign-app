// app/onboarding/basic-info.tsx
import { useState, useRef, useEffect } from 'react';
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

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = Array.from({ length: 31  }, (_, i) => String(i + 1).padStart(2, '0'));
const YEARS  = Array.from({ length: 76  }, (_, i) => String(1940 + i)); // 1940–2015
const HEIGHTS = Array.from({ length: 143 }, (_, i) => String(130 + i)); // 130–272 cm
const WEIGHTS = Array.from({ length: 171 }, (_, i) => String(30  + i)); // 30–200 kg

// ── NumberSlider ─────────────────────────────────────────────────────────────
// Horizontal slider: ‹ 8 9 10 [11] 12 13 14 ›
// Tap adjacent numbers or tap-and-hold arrows for continuous step.
// Purely tap-based — zero scroll conflicts with the outer page ScrollView.

const SLIDER_VISIBLE = 7;
const SLIDER_HALF    = 3;

function NumberSlider({
  items, selectedIndex, onChange, suffix = '',
}: {
  items: string[]; selectedIndex: number; onChange: (i: number) => void; suffix?: string;
}) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  function startStep(delta: number) {
    let cur = Math.max(0, Math.min(items.length - 1, selectedIndex + delta));
    onChange(cur);
    intervalRef.current = setInterval(() => {
      cur = Math.max(0, Math.min(items.length - 1, cur + delta));
      onChange(cur);
    }, 100);
  }
  function stopStep() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }

  const atStart = selectedIndex === 0;
  const atEnd   = selectedIndex === items.length - 1;

  const slots = Array.from({ length: SLIDER_VISIBLE }, (_, i) => {
    const idx = selectedIndex - SLIDER_HALF + i;
    return { idx, val: idx >= 0 && idx < items.length ? items[idx] : null };
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 14, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 2,
      }}>
        <TouchableOpacity
          onPressIn={() => !atStart && startStep(-1)}
          onPressOut={stopStep}
          disabled={atStart}
          style={{ paddingHorizontal: 12, paddingVertical: 14 }}
          activeOpacity={0.6}
        >
          <Text style={{ fontSize: 18, color: atStart ? 'rgba(255,255,255,0.12)' : THEME.colors.teal }}>‹</Text>
        </TouchableOpacity>

        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          {slots.map(({ idx, val }, pos) => {
            const dist     = Math.abs(pos - SLIDER_HALF);
            const isCenter = pos === SLIDER_HALF;
            let display = '';
            if (val !== null) {
              display = isCenter && suffix ? `${val}${suffix}` : val;
            }
            return (
              <TouchableOpacity
                key={pos}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}
                onPress={() => val !== null && onChange(idx)}
                activeOpacity={0.65}
                disabled={val === null}
              >
                <Text style={{
                  fontSize:   isCenter ? 22 : dist === 1 ? 16 : dist === 2 ? 13 : 10,
                  fontFamily: isCenter ? THEME.fonts.sansSemibold : THEME.fonts.sans,
                  color:      isCenter ? THEME.colors.teal : THEME.colors.textMuted,
                  opacity:    isCenter ? 1 : dist === 1 ? 0.5 : dist === 2 ? 0.28 : 0.13,
                  letterSpacing: isCenter ? 0.3 : 0,
                }}>
                  {display}
                </Text>
                {isCenter && (
                  <View style={{
                    width: 22, height: 2, borderRadius: 1,
                    backgroundColor: THEME.colors.teal, marginTop: 4, opacity: 0.7,
                  }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPressIn={() => !atEnd && startStep(1)}
          onPressOut={stopStep}
          disabled={atEnd}
          style={{ paddingHorizontal: 12, paddingVertical: 14 }}
          activeOpacity={0.6}
        >
          <Text style={{ fontSize: 18, color: atEnd ? 'rgba(255,255,255,0.12)' : THEME.colors.teal }}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
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

  // DOB drum indices
  const [dobDay,   setDobDay]   = useState(0);  // into DAYS   (0 → "01")
  const [dobMonth, setDobMonth] = useState(0);  // into MONTHS (0 → "Jan")
  const [dobYear,  setDobYear]  = useState(50); // into YEARS  (50 → 1990)

  // Height / weight drum indices (0 = minimum per spec)
  const [heightIdx, setHeightIdx] = useState(0); // 0 → 130 cm
  const [weightIdx, setWeightIdx] = useState(0); // 0 → 30 kg

  // Goals
  const [goals,     setGoals]     = useState<string[]>([]);
  const [goalDraft, setGoalDraft] = useState('');

  // Conditions
  const [conditions,     setConditions]     = useState<string[]>([]);
  const [conditionDraft, setConditionDraft] = useState('');

  // Other fields
  const [medications,     setMedications]     = useState('');
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

    const day   = DAYS[dobDay];
    const month = String(dobMonth + 1).padStart(2, '0');
    const year  = YEARS[dobYear];
    const dob   = `${year}-${month}-${day}`;

    setSaving(true);

    const updates: Record<string, any> = {
      full_name:   fullName.trim(),
      dob,
      gender:      gender ?? null,
      height_cm:   Number(HEIGHTS[heightIdx]),
      weight_kg:   Number(WEIGHTS[weightIdx]),
      health_goals: goals,
      conditions,
      medications:  medications.trim()
        ? medications.split(',').map(s => s.trim()).filter(Boolean)
        : [],
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

              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 11, color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, width: 44 }}>Day</Text>
                  <View style={{ flex: 1 }}><NumberSlider items={DAYS}   selectedIndex={dobDay}   onChange={setDobDay} /></View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 11, color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, width: 44 }}>Month</Text>
                  <View style={{ flex: 1 }}><NumberSlider items={MONTHS} selectedIndex={dobMonth} onChange={setDobMonth} /></View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 11, color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, width: 44 }}>Year</Text>
                  <View style={{ flex: 1 }}><NumberSlider items={YEARS}  selectedIndex={dobYear}  onChange={setDobYear} /></View>
                </View>
              </View>
            </Card>

            {/* ─ Height & Weight ─ */}
            <Card>
              <View style={{ gap: 14 }}>
                <View>
                  <FieldLabel icon="📏">Height</FieldLabel>
                  <NumberSlider items={HEIGHTS} selectedIndex={heightIdx} onChange={setHeightIdx} suffix=" cm" />
                </View>
                <View>
                  <FieldLabel icon="⚖️">Weight</FieldLabel>
                  <NumberSlider items={WEIGHTS} selectedIndex={weightIdx} onChange={setWeightIdx} suffix=" kg" />
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
              <TextInput
                value={medications}
                onChangeText={setMedications}
                placeholder="e.g. Metformin 500mg, Vitamin D"
                placeholderTextColor={THEME.colors.textMuted}
                maxLength={MAX_LENGTHS.description}
                style={inputStyle}
              />
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
