// app/onboarding/assessment.tsx
import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useAssessmentStore } from '@/store/assessmentStore';
import { useAssessmentSubmit } from '@/hooks/useAssessmentSubmit';
import { supabase } from '@/lib/supabase';
import { MAX_LENGTHS } from '@/utils/validation';
import {
  getPhasesForProgram,
  PROGRAM_ASSESSMENT_KEY,
  PROGRAM_COLORS,
  PROGRAM_LABELS,
  PHOTO_PHASE_ID,
  APhase,
  AQuestion,
} from '@/constants/assessmentQuestions';

const BRAND = {
  bg: '#0A0A0B',
  surface: '#141416',
  surface2: '#1C1C1F',
  border: '#2A2A2E',
  text: '#F0EEE8',
  textMuted: '#6B6B70',
  teal: '#00C4B4',
  amber: '#E8A44A',
};

// ── Question-type components ───────────────────────────────────────────────────

function YesNoInput({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
      {[
        { label: 'Yes', value: 'yes', emoji: '✅' },
        { label: 'No', value: 'no', emoji: '❌' },
      ].map((opt) => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
            style={{
              flex: 1,
              paddingVertical: 20,
              borderRadius: 16,
              alignItems: 'center',
              backgroundColor: active ? `${BRAND.teal}20` : BRAND.surface2,
              borderWidth: 2,
              borderColor: active ? BRAND.teal : BRAND.border,
            }}
          >
            <Text style={{ fontSize: 28, marginBottom: 8 }}>{opt.emoji}</Text>
            <Text style={{ fontSize: 17, fontFamily: 'DMSans-Bold', color: active ? BRAND.teal : BRAND.text }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SingleInput({ question, value, onChange }: { question: AQuestion; value: string | undefined; onChange: (v: string) => void }) {
  const options = question.options ?? [];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 40,
              backgroundColor: active ? `${BRAND.teal}20` : BRAND.surface2,
              borderWidth: 1.5,
              borderColor: active ? BRAND.teal : BRAND.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {opt.emoji ? <Text style={{ fontSize: 16 }}>{opt.emoji}</Text> : null}
            <Text style={{ fontSize: 14, fontFamily: active ? 'DMSans-Bold' : 'DMSans-Regular', color: active ? BRAND.teal : BRAND.text }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MultiInput({ question, value, onChange }: { question: AQuestion; value: string[] | undefined; onChange: (v: string[]) => void }) {
  const selected = value ?? [];
  const options = question.options ?? [];

  function toggle(val: string) {
    if (val === 'none' || val === 'unsure') {
      onChange([val]);
      return;
    }
    const filtered = selected.filter(v => v !== 'none' && v !== 'unsure');
    if (filtered.includes(val)) {
      onChange(filtered.filter(v => v !== val));
    } else {
      onChange([...filtered, val]);
    }
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => toggle(opt.value)}
            activeOpacity={0.8}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 40,
              backgroundColor: active ? `${BRAND.teal}20` : BRAND.surface2,
              borderWidth: 1.5,
              borderColor: active ? BRAND.teal : BRAND.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {opt.emoji ? <Text style={{ fontSize: 16 }}>{opt.emoji}</Text> : null}
            <Text style={{ fontSize: 14, fontFamily: active ? 'DMSans-Bold' : 'DMSans-Regular', color: active ? BRAND.teal : BRAND.text }}>
              {opt.label}
            </Text>
            {active && <Text style={{ fontSize: 12, color: BRAND.teal }}>✓</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Predefined chips (toggle, multi-select) + free-text "+ Add" for entries not
// in the preset list — value is string[], same shape as MultiInput's.
function MultiAddInput({ question, value, onChange }: { question: AQuestion; value: string[] | undefined; onChange: (v: string[]) => void }) {
  const selected = value ?? [];
  const options = question.options ?? [];
  const [draft, setDraft] = useState('');

  function toggle(val: string) {
    if (val === 'none') {
      onChange([val]);
      return;
    }
    const filtered = selected.filter((v) => v !== 'none');
    if (filtered.includes(val)) {
      onChange(filtered.filter((v) => v !== val));
    } else {
      onChange([...filtered, val]);
    }
  }

  function addCustom() {
    const v = draft.trim();
    if (!v) return;
    const filtered = selected.filter((s) => s !== 'none');
    if (!filtered.includes(v)) onChange([...filtered, v]);
    setDraft('');
  }

  const presetValues = options.map((o) => o.value);
  const extras = selected.filter((v) => !presetValues.includes(v));

  return (
    <View style={{ marginTop: 4 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => toggle(opt.value)}
              activeOpacity={0.8}
              style={{
                paddingVertical: 12, paddingHorizontal: 16, borderRadius: 40,
                backgroundColor: active ? `${BRAND.teal}20` : BRAND.surface2,
                borderWidth: 1.5, borderColor: active ? BRAND.teal : BRAND.border,
                flexDirection: 'row', alignItems: 'center', gap: 6,
              }}
            >
              {opt.emoji ? <Text style={{ fontSize: 16 }}>{opt.emoji}</Text> : null}
              <Text style={{ fontSize: 14, fontFamily: active ? 'DMSans-Bold' : 'DMSans-Regular', color: active ? BRAND.teal : BRAND.text }}>{opt.label}</Text>
              {active && <Text style={{ fontSize: 12, color: BRAND.teal }}>✓</Text>}
            </TouchableOpacity>
          );
        })}
        {extras.map((item) => (
          <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 40, backgroundColor: `${BRAND.teal}20`, borderWidth: 1.5, borderColor: BRAND.teal }}>
            <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: BRAND.teal }}>{item}</Text>
            <TouchableOpacity onPress={() => onChange(selected.filter((v) => v !== item))}>
              <Text style={{ fontSize: 13, color: BRAND.teal }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.surface2, borderRadius: 14, borderWidth: 1.5, borderColor: BRAND.border, overflow: 'hidden' }}>
        <TextInput
          style={{ flex: 1, fontSize: 14, fontFamily: 'DMSans-Regular', color: BRAND.text, paddingVertical: 14, paddingHorizontal: 16 }}
          value={draft}
          onChangeText={setDraft}
          placeholder="Add another (optional)"
          placeholderTextColor={BRAND.textMuted}
          onSubmitEditing={addCustom}
          returnKeyType="done"
          maxLength={MAX_LENGTHS.customListItem}
        />
        <TouchableOpacity onPress={addCustom} style={{ paddingHorizontal: 18, paddingVertical: 14, borderLeftWidth: 1, borderColor: BRAND.border }}>
          <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: BRAND.teal }}>+ Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function NumericInput({ question, value, onChange }: { question: AQuestion; value: string | undefined; onChange: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.surface2, borderRadius: 14, borderWidth: 1.5, borderColor: BRAND.border, overflow: 'hidden', marginTop: 4 }}>
      <TextInput
        style={{
          flex: 1,
          fontSize: 28,
          fontFamily: 'DMSans-Bold',
          color: BRAND.text,
          textAlign: 'center',
          paddingVertical: 20,
          paddingHorizontal: 16,
        }}
        keyboardType="numeric"
        value={value ?? ''}
        onChangeText={onChange}
        placeholder={question.placeholder ?? '0'}
        placeholderTextColor={BRAND.textMuted}
        returnKeyType="done"
      />
      {question.unit ? (
        <View style={{ paddingHorizontal: 20, borderLeftWidth: 1, borderColor: BRAND.border, paddingVertical: 20 }}>
          <Text style={{ fontSize: 16, fontFamily: 'DMSans-Medium', color: BRAND.textMuted }}>{question.unit}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ScaleInput({ question, value, onChange }: { question: AQuestion; value: number | undefined; onChange: (v: number) => void }) {
  const min = question.scaleMin ?? 1;
  const max = question.scaleMax ?? 10;
  const nums = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {nums.map((n) => {
          const active = value === n;
          let bg = BRAND.surface2;
          if (active) {
            if (n <= 3) bg = '#EF4444';
            else if (n <= 6) bg = BRAND.amber;
            else bg = BRAND.teal;
          }
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onChange(n)}
              activeOpacity={0.8}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? bg : BRAND.surface2,
                borderWidth: 1.5,
                borderColor: active ? bg : BRAND.border,
              }}
            >
              <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: active ? '#fff' : BRAND.textMuted }}>
                {n}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
        <Text style={{ fontSize: 11, fontFamily: 'DMSans-Regular', color: BRAND.textMuted }}>{question.minLabel}</Text>
        <Text style={{ fontSize: 11, fontFamily: 'DMSans-Regular', color: BRAND.textMuted }}>{question.maxLabel}</Text>
      </View>
    </View>
  );
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function calcAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthday =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthday) age--;
  return age;
}

function DateInput({ question, value, onChange }: { question: AQuestion; value: string | undefined; onChange: (v: string) => void }) {
  const today = new Date();
  // Parse stored YYYY-MM-DD or fall back to today
  const parsed = value ? new Date(value + 'T00:00:00') : null;

  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());
  const [mode, setMode] = useState<'calendar' | 'month' | 'year'>('calendar');

  const selected = parsed;

  // Age display for child DOB question
  const isChildDOB = question.id === 'FBR-P1-Q4';
  const childAge = isChildDOB && selected ? calcAge(selected) : null;
  const ageValid = childAge !== null && childAge >= 6 && childAge <= 18;

  function selectDate(d: number) {
    const y = viewYear, m = viewMonth;
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    onChange(`${y}-${mm}-${dd}`);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Build grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const isSelected = (d: number) => selected &&
    selected.getFullYear() === viewYear &&
    selected.getMonth() === viewMonth &&
    selected.getDate() === d;

  const isToday = (d: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === d;

  // Year range: 1920 to today+1
  const yearRange: number[] = [];
  for (let y = today.getFullYear() + 1; y >= 1920; y--) yearRange.push(y);

  const displayValue = selected
    ? `${selected.getDate()} ${MONTH_FULL[selected.getMonth()]} ${selected.getFullYear()}`
    : null;

  return (
    <View style={{ marginTop: 4 }}>
      {/* Selected value chip + age badge (for child DOB) */}
      {displayValue && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10, alignItems: 'center' }}>
          <View style={{ backgroundColor: `${BRAND.teal}18`, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: `${BRAND.teal}35` }}>
            <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: BRAND.teal }}>📅  {displayValue}</Text>
          </View>
          {isChildDOB && childAge !== null && (
            <View style={{
              borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1,
              backgroundColor: ageValid ? '#10B98118' : '#F8717118',
              borderColor: ageValid ? '#10B98135' : '#F8717135',
            }}>
              <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: ageValid ? '#10B981' : '#F87171' }}>
                {ageValid ? `🎂  Age ${childAge}` : `⚠️  Age ${childAge} — program is for ages 6–18`}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={{ backgroundColor: BRAND.surface2, borderRadius: 16, borderWidth: 1.5, borderColor: BRAND.border, overflow: 'hidden' }}>
        {/* Header row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: BRAND.border }}>
          <TouchableOpacity onPress={prevMonth} activeOpacity={0.7} style={{ padding: 6 }}>
            <Text style={{ fontSize: 18, color: BRAND.textMuted }}>‹</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setMode(m => m === 'month' ? 'calendar' : 'month')} activeOpacity={0.7}
              style={{ backgroundColor: mode === 'month' ? `${BRAND.teal}20` : 'transparent', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: mode === 'month' ? BRAND.teal : BRAND.text }}>{MONTH_FULL[viewMonth]}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode(m => m === 'year' ? 'calendar' : 'year')} activeOpacity={0.7}
              style={{ backgroundColor: mode === 'year' ? `${BRAND.teal}20` : 'transparent', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: mode === 'year' ? BRAND.teal : BRAND.text }}>{viewYear}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={nextMonth} activeOpacity={0.7} style={{ padding: 6 }}>
            <Text style={{ fontSize: 18, color: BRAND.textMuted }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Month picker */}
        {mode === 'month' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 }}>
            {MONTHS.map((m, i) => (
              <TouchableOpacity key={m} onPress={() => { setViewMonth(i); setMode('calendar'); }} activeOpacity={0.7}
                style={{ width: '22%', paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                  backgroundColor: i === viewMonth ? BRAND.teal : BRAND.surface }}>
                <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: i === viewMonth ? '#000' : BRAND.text }}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Year picker */}
        {mode === 'year' && (
          <ScrollView style={{ maxHeight: 200 }} contentContainerStyle={{ padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {yearRange.map(y => (
              <TouchableOpacity key={y} onPress={() => { setViewYear(y); setMode('calendar'); }} activeOpacity={0.7}
                style={{ width: '22%', paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                  backgroundColor: y === viewYear ? BRAND.teal : BRAND.surface }}>
                <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: y === viewYear ? '#000' : BRAND.text }}>{y}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Calendar grid */}
        {mode === 'calendar' && (
          <View style={{ padding: 12 }}>
            {/* Day labels */}
            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
              {DAYS.map(d => (
                <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: BRAND.textMuted }}>{d}</Text>
                </View>
              ))}
            </View>
            {/* Weeks */}
            {weeks.map((week, wi) => (
              <View key={wi} style={{ flexDirection: 'row', marginBottom: 4 }}>
                {week.map((day, di) => {
                  const sel = day !== null && isSelected(day);
                  const tod = day !== null && isToday(day);
                  return (
                    <TouchableOpacity
                      key={di}
                      onPress={() => day !== null && selectDate(day)}
                      activeOpacity={day !== null ? 0.7 : 1}
                      style={{ flex: 1, alignItems: 'center', paddingVertical: 7 }}
                    >
                      {day !== null ? (
                        <View style={{
                          width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                          backgroundColor: sel ? BRAND.teal : tod ? `${BRAND.teal}20` : 'transparent',
                          borderWidth: tod && !sel ? 1 : 0,
                          borderColor: BRAND.teal,
                        }}>
                          <Text style={{ fontSize: 14, fontFamily: sel ? 'DMSans-Bold' : 'DMSans-Regular', color: sel ? '#000' : BRAND.text }}>{day}</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function DescriptiveInput({ question, value, onChange }: { question: AQuestion; value: string | undefined; onChange: (v: string) => void }) {
  return (
    <TextInput
      style={{
        backgroundColor: BRAND.surface2,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: BRAND.border,
        fontSize: 15,
        fontFamily: 'DMSans-Regular',
        color: BRAND.text,
        paddingVertical: 16,
        paddingHorizontal: 16,
        minHeight: 110,
        textAlignVertical: 'top',
        marginTop: 4,
        lineHeight: 22,
      }}
      value={value ?? ''}
      onChangeText={onChange}
      placeholder={question.placeholder ?? 'Type your answer here...'}
      placeholderTextColor={BRAND.textMuted}
      multiline
      returnKeyType="default"
      maxLength={MAX_LENGTHS.longNote}
    />
  );
}

// ── Question card ──────────────────────────────────────────────────────────────

function QuestionCard({ question, answers, onAnswer, accentColor }: {
  question: AQuestion;
  answers: Record<string, any>;
  onAnswer: (id: string, val: any) => void;
  accentColor: string;
}) {
  if (question.showIf) {
    const { id, equals, notEmpty } = question.showIf;
    const dep = answers[id];
    if (notEmpty && !dep) return null;
    if (equals) {
      const eqArr = Array.isArray(equals) ? equals : [equals];
      const depArr = Array.isArray(dep) ? dep : [dep];
      const overlap = depArr.some(v => eqArr.includes(v));
      if (!overlap) return null;
    }
  }

  const val = answers[question.id];

  return (
    <View style={{
      backgroundColor: BRAND.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: BRAND.border,
      padding: 20,
      marginBottom: 16,
    }}>
      <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: BRAND.text, lineHeight: 24, marginBottom: 4 }}>
        {question.text}
      </Text>
      {question.subtext ? (
        <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, marginBottom: 14, lineHeight: 19 }}>
          {question.subtext}
        </Text>
      ) : <View style={{ height: 12 }} />}
      {question.optional ? (
        <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: accentColor, opacity: 0.7, marginBottom: 8, letterSpacing: 0.5 }}>
          OPTIONAL
        </Text>
      ) : null}

      {question.type === 'yesno' && (
        <YesNoInput value={val} onChange={(v) => onAnswer(question.id, v)} />
      )}
      {question.type === 'single' && (
        <SingleInput question={question} value={val} onChange={(v) => onAnswer(question.id, v)} />
      )}
      {question.type === 'multi' && (
        <MultiInput question={question} value={val} onChange={(v) => onAnswer(question.id, v)} />
      )}
      {question.type === 'multi_add' && (
        <MultiAddInput question={question} value={val} onChange={(v) => onAnswer(question.id, v)} />
      )}
      {question.type === 'numeric' && (
        <NumericInput question={question} value={val} onChange={(v) => onAnswer(question.id, v)} />
      )}
      {question.type === 'scale' && (
        <ScaleInput question={question} value={val} onChange={(v) => onAnswer(question.id, v)} />
      )}
      {question.type === 'date' && (
        <DateInput question={question} value={val} onChange={(v) => onAnswer(question.id, v)} />
      )}
      {question.type === 'descriptive' && (
        <DescriptiveInput question={question} value={val} onChange={(v) => onAnswer(question.id, v)} />
      )}
    </View>
  );
}

// ── Photo capture phase ────────────────────────────────────────────────────────

type PhotoType = 'front' | 'side' | 'back';
const PHOTO_SLOTS: { type: PhotoType; label: string; emoji: string; hint: string }[] = [
  { type: 'front', label: 'Front view', emoji: '🧍', hint: 'Stand straight, arms at sides, face the camera' },
  { type: 'side',  label: 'Side view',  emoji: '🚶', hint: 'Stand sideways to camera, arms relaxed' },
  { type: 'back',  label: 'Back view',  emoji: '🪞', hint: 'Face away from camera, arms at sides' },
];

function PhotoCapturePhase({ photos, onPhoto, accentColor }: {
  photos: Partial<Record<PhotoType, string>>;
  onPhoto: (type: PhotoType, uri: string) => void;
  accentColor: string;
}) {
  async function pickPhoto(type: PhotoType) {
    const camPerm = await ImagePicker.requestCameraPermissionsAsync();
    const galPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!camPerm.granted && !galPerm.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to upload your baseline photos.');
      return;
    }
    Alert.alert('Add photo', 'Take a new photo or choose from your gallery.', [
      {
        text: '📷  Camera',
        onPress: async () => {
          const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [3, 4], quality: 0.75 });
          if (!res.canceled) onPhoto(type, res.assets[0].uri);
        },
      },
      {
        text: '🖼️  Gallery',
        onPress: async () => {
          const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [3, 4], quality: 0.75 });
          if (!res.canceled) onPhoto(type, res.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const uploaded = Object.keys(photos).length;

  return (
    <View style={{ gap: 12 }}>
      {/* Tips card */}
      <View style={{ backgroundColor: `${accentColor}12`, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: `${accentColor}25`, marginBottom: 4 }}>
        <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: accentColor, marginBottom: 8 }}>
          📸  Tips for great baseline photos
        </Text>
        <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, lineHeight: 20 }}>
          • Wear fitted clothing or sports attire{'\n'}
          • Stand naturally — don't try to "fix" your posture{'\n'}
          • Full-body shot from head to toe{'\n'}
          • Good lighting, plain background if possible
        </Text>
      </View>

      {/* Slots */}
      {PHOTO_SLOTS.map((slot) => {
        const uri = photos[slot.type];
        return (
          <TouchableOpacity
            key={slot.type}
            onPress={() => pickPhoto(slot.type)}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: BRAND.surface,
              borderRadius: 16,
              padding: 14,
              borderWidth: 1.5,
              borderColor: uri ? accentColor : BRAND.border,
            }}
          >
            <View style={{ width: 64, height: 84, borderRadius: 10, backgroundColor: '#1A1A1E', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginRight: 14 }}>
              {uri ? (
                <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <Text style={{ fontSize: 26 }}>{slot.emoji}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: uri ? accentColor : BRAND.text, marginBottom: 3 }}>
                {slot.label} {uri ? '✓' : ''}
              </Text>
              <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: BRAND.textMuted }}>
                {uri ? 'Tap to replace' : slot.hint}
              </Text>
            </View>
            <Text style={{ fontSize: 18, color: BRAND.textMuted }}>›</Text>
          </TouchableOpacity>
        );
      })}

      {/* Progress note */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
        {PHOTO_SLOTS.map(s => (
          <View key={s.type} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: photos[s.type] ? accentColor : BRAND.border }} />
        ))}
        <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, marginLeft: 6 }}>
          {uploaded === 0 ? 'No photos yet — all optional' : `${uploaded} of 3 added`}
        </Text>
      </View>
    </View>
  );
}

// ── Upload photos to Supabase ─────────────────────────────────────────────────

async function uploadBaselinePhotos(userId: string, photos: Partial<Record<PhotoType, string>>) {
  for (const [type, uri] of Object.entries(photos)) {
    try {
      const response = await fetch(uri as string);
      const blob = await response.blob();
      const ext = (uri as string).split('.').pop() ?? 'jpg';
      const path = `${userId}/onboarding/${type}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('progress-photos').upload(path, blob, { contentType: `image/${ext}` });
      if (upErr) throw upErr;
      await supabase.from('progress_photos').insert({
        client_id: userId,
        photo_type: type,
        storage_path: path,
        photo_date: new Date().toISOString().split('T')[0],
        week_number: 0,
        phase: 0,
      });
    } catch (e) {
      console.warn('[Photos] upload error for', type, e);
    }
  }
}

// ── Main assessment screen ─────────────────────────────────────────────────────

export default function AssessmentScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { programId: onboardingProgramId } = useOnboardingStore();
  const { answers, setAnswer, setProgramKey, isSubmitting } = useAssessmentStore();
  const { submit } = useAssessmentSubmit();

  // Prefer the onboardingStore value (set when user picked a program in this session)
  // Fall back to profile.workout_program_id (returning users), then default to PRP
  const rawId = onboardingProgramId ?? profile?.workout_program_id ?? '3-PRP';
  const programKey = PROGRAM_ASSESSMENT_KEY[rawId] ?? 'PRP';
  const accentColor = PROGRAM_COLORS[programKey] ?? BRAND.teal;
  const programLabel = PROGRAM_LABELS[programKey] ?? 'Your Program';

  // Derive phases purely — no side effects during render
  const phases: APhase[] = useMemo(() => getPhasesForProgram(programKey), [programKey]);

  // Store the program key after render — never during render
  useEffect(() => { setProgramKey(programKey); }, [programKey]);

  const [phaseIdx, setPhaseIdx] = useState(0);
  const [photos, setPhotos] = useState<Partial<Record<PhotoType, string>>>({});
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const currentPhase = phases[phaseIdx] ?? phases[0];
  const isLastPhase = phaseIdx === phases.length - 1;

  function visibleQuestions(phase: APhase): AQuestion[] {
    return phase.questions.filter((q) => {
      if (!q.showIf) return true;
      const { id, equals, notEmpty } = q.showIf;
      const dep = answers[id];
      if (notEmpty && !dep) return false;
      if (equals) {
        const eqArr = Array.isArray(equals) ? equals : [equals];
        const depArr = Array.isArray(dep) ? dep : [dep];
        return depArr.some(v => eqArr.includes(v));
      }
      return true;
    });
  }

  function validatePhase(): boolean {
    const required = visibleQuestions(currentPhase).filter(q => !q.optional);
    for (const q of required) {
      const val = answers[q.id];
      if (val === undefined || val === null || val === '') return false;
      if (Array.isArray(val) && val.length === 0) return false;
    }
    return true;
  }

  function transitionTo(newIdx: number) {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setPhaseIdx(newIdx);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  }

  function handleNext() {
    if (!validatePhase()) {
      Alert.alert('Almost there', 'Please answer the required questions before continuing.');
      return;
    }
    if (isLastPhase) {
      handleSubmit();
    } else {
      transitionTo(phaseIdx + 1);
    }
  }

  function handleBack() {
    if (phaseIdx === 0) {
      router.back();
    } else {
      transitionTo(phaseIdx - 1);
    }
  }

  function handleSkip() {
    if (isLastPhase) {
      handleSubmit();
    } else {
      transitionTo(phaseIdx + 1);
    }
  }

  async function handleSubmit() {
    const ok = await submit();
    if (!ok) return;
    // Upload photos silently — don't block navigation on failure
    if (Object.keys(photos).length > 0 && profile?.id) {
      uploadBaselinePhotos(profile.id, photos).catch(() => {});
    }
    setTimeout(() => router.replace('/(client)'), 50);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BRAND.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />

      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 24, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity onPress={handleBack} activeOpacity={0.7} style={{ marginRight: 16, padding: 4 }}>
            <Text style={{ fontSize: 22, color: BRAND.textMuted }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: accentColor, letterSpacing: 2, textTransform: 'uppercase' }}>
              {programLabel}
            </Text>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, marginTop: 2 }}>
              Phase {phaseIdx + 1} of {phases.length}
            </Text>
          </View>
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={{ padding: 8 }}>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: BRAND.textMuted, textDecorationLine: 'underline' }}>
              Skip
            </Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={{ height: 3, backgroundColor: BRAND.surface2, borderRadius: 2, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${Math.max(((phaseIdx + 1) / phases.length) * 100, 5)}%`, backgroundColor: accentColor, borderRadius: 2 }} />
        </View>

        {/* Phase dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {phases.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === phaseIdx ? 20 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i <= phaseIdx ? accentColor : BRAND.border,
              }}
            />
          ))}
        </View>
      </View>

      {/* Content */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 4 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Phase header */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>{currentPhase.emoji}</Text>
            <Text style={{ fontSize: 26, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text, lineHeight: 34, marginBottom: 8 }}>
              {currentPhase.title}
            </Text>
            <Text style={{ fontSize: 14, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, lineHeight: 22 }}>
              {currentPhase.subtitle}
            </Text>
          </View>

          {/* Questions or Photo capture */}
          {currentPhase.id === PHOTO_PHASE_ID ? (
            <PhotoCapturePhase
              photos={photos}
              onPhoto={(type, uri) => setPhotos(prev => ({ ...prev, [type]: uri }))}
              accentColor={accentColor}
            />
          ) : (
            currentPhase.questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                answers={answers}
                onAnswer={setAnswer}
                accentColor={accentColor}
              />
            ))
          )}
        </ScrollView>
      </Animated.View>

      {/* Bottom nav */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: BRAND.bg,
        borderTopWidth: 1,
        borderColor: BRAND.border,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
      }}>
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          disabled={isSubmitting}
          style={{
            backgroundColor: accentColor,
            borderRadius: 14,
            paddingVertical: 17,
            alignItems: 'center',
            shadowColor: accentColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 6,
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: '#0A0A0B', letterSpacing: 0.3 }}>
            {isSubmitting
              ? 'Saving...'
              : isLastPhase
              ? Object.keys(photos).length > 0 ? 'Save & Complete ✓' : 'Complete Without Photos ✓'
              : 'Continue →'}
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, gap: 20 }}>
          {!isLastPhase && (
            <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, opacity: 0.6 }}>
              {phases.length - phaseIdx - 1} phase{phases.length - phaseIdx - 1 !== 1 ? 's' : ''} remaining
            </Text>
          )}
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
            <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, textDecorationLine: 'underline' }}>
              {isLastPhase ? 'Skip & finish' : 'Skip this phase'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
