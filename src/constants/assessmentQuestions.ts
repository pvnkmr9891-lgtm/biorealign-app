// src/constants/assessmentQuestions.ts
// Program-specific assessment question bank — sourced from BioRealign_Assessment_Question_Bank.xlsx

export type QType = 'single' | 'multi' | 'numeric' | 'descriptive' | 'scale' | 'date' | 'yesno';

export interface AOption {
  label: string;
  value: string;
  emoji?: string;
}

export interface AQuestion {
  id: string;
  text: string;
  subtext?: string;
  type: QType;
  options?: AOption[];
  unit?: string;
  scaleMin?: number;
  scaleMax?: number;
  minLabel?: string;
  maxLabel?: string;
  placeholder?: string;
  optional?: boolean;
  showIf?: { id: string; equals?: string | string[]; notEmpty?: boolean };
}

export interface APhase {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  questions: AQuestion[];
}

// ── Map from profile.workout_program_id → assessment key ──────────────────────
export const PROGRAM_ASSESSMENT_KEY: Record<string, string> = {
  'total_transformation':  'FBR',
  'metabolic_renewal':     'MRS',
  'postural_realignment':  'PRP',
  '3-PRP':                 'PRP',
  'hormonal_balance':      'RRS',
  'corporate_reset':       'CPR',
  'athletic_performance':  'PPL',
  'mind_body':             'LVE',
};

// ── Shared Core Phases (every program starts here) ────────────────────────────
export const SHARED_CORE_PHASES: APhase[] = [
  {
    id: 'core-1',
    title: 'Your Baseline',
    subtitle: 'Let\'s start with the fundamentals — who you are and how your body works.',
    emoji: '🧬',
    questions: [
      {
        id: 'CORE-Q3',
        text: 'What\'s your biological sex?',
        subtext: 'This helps us calibrate your metabolic and hormonal baseline.',
        type: 'single',
        options: [
          { label: 'Male', value: 'male', emoji: '♂️' },
          { label: 'Female', value: 'female', emoji: '♀️' },
          { label: 'Prefer not to say', value: 'prefer_not', emoji: '🔒' },
        ],
      },
      {
        id: 'CORE-Q2',
        text: 'When were you born?',
        subtext: 'Your age shapes how we design your plan.',
        type: 'date',
        placeholder: 'DD / MM / YYYY',
      },
      {
        id: 'CORE-Q4',
        text: 'How tall are you?',
        type: 'numeric',
        unit: 'cm',
        placeholder: 'e.g. 170',
      },
      {
        id: 'CORE-Q5',
        text: 'What\'s your current weight?',
        type: 'numeric',
        unit: 'kg',
        placeholder: 'e.g. 72',
      },
      {
        id: 'CORE-Q6',
        text: 'How would you describe your body type right now?',
        subtext: 'Be honest — your coach sees this, not a judgement.',
        type: 'single',
        options: [
          { label: 'Lean / Skinny', value: 'lean', emoji: '🪶' },
          { label: 'Athletic / Toned', value: 'athletic', emoji: '💪' },
          { label: 'Soft / Rounded', value: 'soft', emoji: '🌊' },
          { label: 'Curvy / Voluptuous', value: 'curvy', emoji: '🌷' },
          { label: 'Heavyset / Broad', value: 'heavyset', emoji: '🏋️' },
          { label: 'Stout / Solid', value: 'stout', emoji: '🪨' },
          { label: 'Not sure', value: 'unsure', emoji: '🤷' },
        ],
      },
      {
        id: 'CORE-Q7',
        text: 'Where does your body tend to store fat first?',
        type: 'multi',
        options: [
          { label: 'Belly / Midsection', value: 'belly', emoji: '🫃' },
          { label: 'Hips & Thighs', value: 'hips', emoji: '🦵' },
          { label: 'Face & Neck', value: 'face', emoji: '😶' },
          { label: 'Arms', value: 'arms', emoji: '💪' },
          { label: 'Evenly distributed', value: 'even', emoji: '⚖️' },
          { label: 'Not sure', value: 'unsure', emoji: '🤷' },
        ],
      },
    ],
  },
  {
    id: 'core-2',
    title: 'Health & Safety',
    subtitle: 'So your plan is built around your reality — not a generic template.',
    emoji: '🩺',
    questions: [
      {
        id: 'CORE-Q9',
        text: 'Do you have any current medical conditions?',
        subtext: 'Select all that apply — this is confidential.',
        type: 'multi',
        options: [
          { label: 'Type 1/2 Diabetes', value: 'diabetes', emoji: '🩸' },
          { label: 'Hypertension', value: 'hypertension', emoji: '💓' },
          { label: 'Thyroid disorder', value: 'thyroid', emoji: '🦋' },
          { label: 'PCOS / PCOD', value: 'pcos', emoji: '🔁' },
          { label: 'Heart condition', value: 'heart', emoji: '❤️' },
          { label: 'Asthma / Respiratory', value: 'asthma', emoji: '🫁' },
          { label: 'Joint / Arthritis', value: 'arthritis', emoji: '🦴' },
          { label: 'None', value: 'none', emoji: '✅' },
        ],
      },
      {
        id: 'CORE-Q9-detail',
        text: 'Please describe your condition(s) briefly.',
        type: 'descriptive',
        placeholder: 'e.g. Type 2 diabetes for 3 years, currently managed with medication...',
        optional: true,
        showIf: { id: 'CORE-Q9', equals: ['diabetes', 'hypertension', 'thyroid', 'pcos', 'heart', 'asthma', 'arthritis'] },
      },
      {
        id: 'CORE-Q10',
        text: 'Are you currently on any medication?',
        type: 'yesno',
      },
      {
        id: 'CORE-Q10-detail',
        text: 'What medication(s) are you taking?',
        type: 'descriptive',
        placeholder: 'e.g. Metformin 500mg, Lisinopril 10mg...',
        showIf: { id: 'CORE-Q10', equals: 'yes' },
      },
      {
        id: 'CORE-Q11',
        text: 'Any past surgeries or major injuries?',
        type: 'yesno',
      },
      {
        id: 'CORE-Q11-detail',
        text: 'Tell us about it — when, what, and how it\'s affecting you now.',
        type: 'descriptive',
        placeholder: 'e.g. ACL surgery in 2022, still have occasional knee stiffness...',
        showIf: { id: 'CORE-Q11', equals: 'yes' },
      },
      {
        id: 'CORE-Q12',
        text: 'How would you rate your energy levels on a typical day?',
        type: 'scale',
        scaleMin: 1, scaleMax: 10,
        minLabel: 'Exhausted', maxLabel: 'Excellent',
      },
      {
        id: 'CORE-Q13',
        text: 'How many hours do you sleep on average per night?',
        type: 'numeric',
        unit: 'hrs',
        placeholder: 'e.g. 7',
      },
      {
        id: 'CORE-Q14',
        text: 'How would you describe your sleep quality?',
        type: 'single',
        options: [
          { label: 'Deep & restful', value: 'deep', emoji: '😴' },
          { label: 'Light, wake often', value: 'light', emoji: '🌙' },
          { label: 'Hard to fall asleep', value: 'insomnia', emoji: '👁️' },
          { label: 'Inconsistent', value: 'inconsistent', emoji: '🔀' },
          { label: 'Use a sleep aid', value: 'aided', emoji: '💊' },
        ],
      },
    ],
  },
];

// ── Future Body Reset (FBR) — Children & Teen Program ─────────────────────────
const FBR_PHASES: APhase[] = [
  {
    id: 'fbr-1',
    title: 'Parent / Guardian',
    subtitle: 'This section is for the parent or guardian. Take your time — your answers shape your child\'s plan.',
    emoji: '👨‍👩‍👧',
    questions: [
      {
        id: 'FBR-P1-Q1',
        text: 'Your full name?',
        subtext: 'As parent or guardian completing this intake.',
        type: 'descriptive',
        placeholder: 'e.g. Priya Sharma',
      },
      {
        id: 'FBR-P1-Q2',
        text: 'Your relationship to the child?',
        type: 'single',
        options: [
          { label: 'Mother', value: 'mother', emoji: '👩' },
          { label: 'Father', value: 'father', emoji: '👨' },
          { label: 'Legal Guardian', value: 'guardian', emoji: '🛡️' },
          { label: 'Other', value: 'other', emoji: '🤝' },
        ],
      },
      {
        id: 'FBR-P1-Q3',
        text: 'Child\'s full name?',
        type: 'descriptive',
        placeholder: 'e.g. Aryan Sharma',
      },
      {
        id: 'FBR-P1-Q4',
        text: 'Child\'s date of birth?',
        subtext: 'Program is designed for ages 6–18.',
        type: 'date',
        placeholder: 'DD / MM / YYYY',
      },
      {
        id: 'FBR-P1-Q5',
        text: 'I consent to my child participating in this program and confirm all information provided is accurate.',
        subtext: 'Required — cannot proceed without consent.',
        type: 'yesno',
      },
      {
        id: 'FBR-P1-Q6',
        text: 'Has your child been diagnosed with any of the following?',
        type: 'multi',
        options: [
          { label: 'Early-stage obesity', value: 'obesity', emoji: '⚖️' },
          { label: 'Pre-diabetes', value: 'prediabetes', emoji: '🩸' },
          { label: 'Thyroid issue', value: 'thyroid', emoji: '🦋' },
          { label: 'PCOS / PCOD', value: 'pcos', emoji: '🔁' },
          { label: 'Asthma', value: 'asthma', emoji: '🫁' },
          { label: 'None', value: 'none', emoji: '✅' },
          { label: 'Other', value: 'other', emoji: '➕' },
        ],
      },
      {
        id: 'FBR-P1-Q6-detail',
        text: 'Please specify the other condition.',
        type: 'descriptive',
        placeholder: 'Describe...',
        optional: true,
        showIf: { id: 'FBR-P1-Q6', equals: ['other'] },
      },
      {
        id: 'FBR-P1-Q7',
        text: 'Any family history of metabolic conditions?',
        subtext: 'Select all that apply.',
        type: 'multi',
        options: [
          { label: 'Diabetes', value: 'diabetes', emoji: '🩸' },
          { label: 'Obesity', value: 'obesity', emoji: '⚖️' },
          { label: 'Thyroid disorder', value: 'thyroid', emoji: '🦋' },
          { label: 'Heart disease', value: 'heart', emoji: '❤️' },
          { label: 'None known', value: 'none', emoji: '✅' },
          { label: 'Not sure', value: 'unsure', emoji: '🤷' },
        ],
      },
      {
        id: 'FBR-P1-Q8',
        text: 'What\'s your main concern for your child right now?',
        type: 'multi',
        options: [
          { label: 'Weight gain', value: 'weight', emoji: '⚖️' },
          { label: 'Low energy / activity', value: 'energy', emoji: '⚡' },
          { label: 'Poor eating habits', value: 'eating', emoji: '🍕' },
          { label: 'Early signs of health issues', value: 'health', emoji: '🩺' },
          { label: 'Confidence / self-esteem', value: 'confidence', emoji: '💪' },
          { label: 'Screen time & sedentary behaviour', value: 'screen', emoji: '📱' },
          { label: 'General prevention', value: 'prevention', emoji: '🛡️' },
        ],
      },
      {
        id: 'FBR-P1-Q9',
        text: 'How physically active is your child currently?',
        type: 'single',
        options: [
          { label: 'Very active — daily sports or play', value: 'very_active', emoji: '🏃' },
          { label: 'Moderately active — 2-3×/week', value: 'moderate', emoji: '🚶' },
          { label: 'Mostly sedentary', value: 'sedentary', emoji: '🛋️' },
          { label: 'Varies a lot', value: 'varies', emoji: '🔀' },
        ],
      },
      {
        id: 'FBR-P1-Q10',
        text: 'Average screen time per day (school + leisure)?',
        type: 'single',
        options: [
          { label: 'Under 2 hrs', value: 'lt2', emoji: '✅' },
          { label: '2–4 hrs', value: '2to4', emoji: '📱' },
          { label: '4–6 hrs', value: '4to6', emoji: '😐' },
          { label: '6+ hrs', value: 'gt6', emoji: '⚠️' },
        ],
      },
      {
        id: 'FBR-P1-Q11',
        text: 'Who manages the child\'s meals at home?',
        type: 'single',
        options: [
          { label: 'Parent / Guardian', value: 'parent', emoji: '👩‍🍳' },
          { label: 'Shared with school / hostel', value: 'school', emoji: '🏫' },
          { label: 'Child manages own meals', value: 'child', emoji: '🧒' },
          { label: 'Mixed', value: 'mixed', emoji: '🔀' },
        ],
      },
      {
        id: 'FBR-P1-Q12',
        text: 'How would you describe your child\'s current eating habits?',
        type: 'multi',
        options: [
          { label: 'Home-cooked meals mostly', value: 'homecooked', emoji: '🍱' },
          { label: 'Frequent outside food / junk food', value: 'junk', emoji: '🍟' },
          { label: 'Picky eater', value: 'picky', emoji: '🫤' },
          { label: 'Skips meals', value: 'skips', emoji: '⏩' },
          { label: 'Emotional eating noticed', value: 'emotional', emoji: '😢' },
          { label: 'Balanced', value: 'balanced', emoji: '✅' },
        ],
      },
      {
        id: 'FBR-P1-Q13',
        text: 'How involved will you be in supporting this program?',
        subtext: 'The program works best with active family support.',
        type: 'single',
        options: [
          { label: 'Very involved — I\'ll be hands-on', value: 'very', emoji: '🙋' },
          { label: 'Somewhat — I\'ll check in regularly', value: 'some', emoji: '👀' },
          { label: 'Limited — child mostly independent', value: 'limited', emoji: '🤞' },
        ],
      },
    ],
  },
  {
    id: 'fbr-2',
    title: 'Hey, it\'s your turn! 🌟',
    subtitle: 'This part is for you. No wrong answers — just be honest and have fun with it!',
    emoji: '🧒',
    questions: [
      {
        id: 'FBR-P2-Q1',
        text: 'How do you feel about your body and fitness right now?',
        type: 'single',
        options: [
          { label: 'Happy with it!', value: 'happy', emoji: '😊' },
          { label: 'Want to feel stronger', value: 'stronger', emoji: '💪' },
          { label: 'Want to feel more confident', value: 'confidence', emoji: '🌟' },
          { label: 'Don\'t think about it much', value: 'neutral', emoji: '🤷' },
          { label: 'Not sure', value: 'unsure', emoji: '🤔' },
        ],
      },
      {
        id: 'FBR-P2-Q2',
        text: 'What do you enjoy doing for fun or to stay active?',
        type: 'multi',
        options: [
          { label: 'Sports', value: 'sports', emoji: '⚽' },
          { label: 'Dance', value: 'dance', emoji: '💃' },
          { label: 'Cycling', value: 'cycling', emoji: '🚴' },
          { label: 'Swimming', value: 'swimming', emoji: '🏊' },
          { label: 'Video games (less active)', value: 'games', emoji: '🎮' },
          { label: 'Outdoor play', value: 'outdoor', emoji: '🌳' },
          { label: 'Not sure yet', value: 'unsure', emoji: '🤷' },
        ],
      },
      {
        id: 'FBR-P2-Q2-detail',
        text: 'Which sport(s) do you play?',
        type: 'descriptive',
        placeholder: 'e.g. Cricket, Football, Basketball...',
        optional: true,
        showIf: { id: 'FBR-P2-Q2', equals: ['sports'] },
      },
      {
        id: 'FBR-P2-Q3',
        text: 'How many hours do you sleep on a school night?',
        type: 'numeric',
        unit: 'hrs',
        placeholder: 'e.g. 8',
      },
      {
        id: 'FBR-P2-Q4',
        text: 'Do you feel tired or low on energy during the day?',
        type: 'single',
        options: [
          { label: 'Rarely — I feel good!', value: 'rarely', emoji: '⚡' },
          { label: 'Sometimes', value: 'sometimes', emoji: '😐' },
          { label: 'Often', value: 'often', emoji: '😔' },
          { label: 'Most days', value: 'most_days', emoji: '😴' },
        ],
      },
      {
        id: 'FBR-P2-Q5',
        text: 'Anything else you\'d like us to know?',
        subtext: 'Totally optional — but we\'d love to hear from you!',
        type: 'descriptive',
        placeholder: 'Anything at all — we\'re here to help 😊',
        optional: true,
      },
    ],
  },
];

// ── Metabolic Reversal System (MRS) ──────────────────────────────────────────
const MRS_PHASES: APhase[] = [
  {
    id: 'mrs-1',
    title: 'Metabolic Diagnosis',
    subtitle: 'Understanding your metabolic health is step one to reversing it.',
    emoji: '🔬',
    questions: [
      {
        id: 'MRS-P1-Q1',
        text: 'Have you been diagnosed with any of the following?',
        subtext: 'Select all that apply.',
        type: 'multi',
        options: [
          { label: 'Type 2 Diabetes', value: 'type2', emoji: '🩸' },
          { label: 'Pre-diabetes', value: 'prediabetes', emoji: '⚠️' },
          { label: 'PCOS / PCOD', value: 'pcos', emoji: '🔁' },
          { label: 'Metabolic Syndrome', value: 'metabolic_syndrome', emoji: '⚙️' },
          { label: 'Clinically obese', value: 'obesity', emoji: '⚖️' },
          { label: 'None — but I\'m concerned', value: 'concerned', emoji: '🤔' },
        ],
      },
      {
        id: 'MRS-P1-Q2',
        text: 'What\'s your most recent HbA1c level?',
        subtext: 'Skip if you haven\'t been tested.',
        type: 'numeric',
        unit: '%',
        placeholder: 'e.g. 6.2',
        optional: true,
      },
      {
        id: 'MRS-P1-Q3',
        text: 'What\'s your most recent fasting blood glucose?',
        type: 'numeric',
        unit: 'mg/dL',
        placeholder: 'e.g. 110',
        optional: true,
      },
      {
        id: 'MRS-P1-Q4',
        text: 'Do you take medication for blood sugar, blood pressure, or cholesterol?',
        type: 'multi',
        options: [
          { label: 'Metformin / Diabetes med', value: 'metformin', emoji: '💊' },
          { label: 'Blood pressure med', value: 'bp_med', emoji: '❤️' },
          { label: 'Cholesterol / Statin', value: 'statin', emoji: '🧪' },
          { label: 'Insulin', value: 'insulin', emoji: '💉' },
          { label: 'None', value: 'none', emoji: '✅' },
          { label: 'Other', value: 'other', emoji: '➕' },
        ],
      },
      {
        id: 'MRS-P1-Q4-other',
        text: 'Please specify the other medication(s) you take.',
        type: 'descriptive',
        placeholder: 'e.g. Thyroid medication, Vitamin D supplements...',
        optional: true,
        showIf: { id: 'MRS-P1-Q4', equals: 'other' },
      },
      {
        id: 'MRS-P1-Q5',
        text: 'How long have you been dealing with this metabolic concern?',
        type: 'single',
        options: [
          { label: 'Just found out', value: 'new', emoji: '😮' },
          { label: 'Less than 1 year', value: 'lt1', emoji: '📅' },
          { label: '1–3 years', value: '1to3', emoji: '📆' },
          { label: '3–5 years', value: '3to5', emoji: '🗓️' },
          { label: '5+ years', value: 'gt5', emoji: '⏳' },
        ],
      },
      {
        id: 'MRS-P1-Q6',
        text: 'Have you tried diets or weight-loss programs before?',
        type: 'yesno',
      },
      {
        id: 'MRS-P1-Q7',
        text: 'What did you try, and what happened?',
        type: 'descriptive',
        placeholder: 'e.g. Keto for 3 months — lost 5kg but regained it all within weeks...',
        showIf: { id: 'MRS-P1-Q6', equals: 'yes' },
      },
    ],
  },
  {
    id: 'mrs-2',
    title: 'Food & Lifestyle',
    subtitle: 'Your daily patterns hold the key to reversing your metabolism.',
    emoji: '🥗',
    questions: [
      {
        id: 'MRS-P2-Q1',
        text: 'How many meals do you typically eat per day?',
        type: 'single',
        options: [
          { label: '1–2 meals', value: '1to2', emoji: '🍽️' },
          { label: '3 meals', value: '3', emoji: '🍽️🍽️🍽️' },
          { label: '4–5 meals', value: '4to5', emoji: '🍱' },
          { label: '6+ meals', value: '6plus', emoji: '⏰' },
          { label: 'Irregular / varies', value: 'irregular', emoji: '🔀' },
        ],
      },
      {
        id: 'MRS-P2-Q2',
        text: 'How often do you eat outside food or processed food per week?',
        type: 'single',
        options: [
          { label: 'Rarely', value: 'rarely', emoji: '🥦' },
          { label: '1–2 times', value: '1to2', emoji: '🥡' },
          { label: '3–5 times', value: '3to5', emoji: '🍟' },
          { label: 'Almost daily', value: 'daily', emoji: '🍔' },
        ],
      },
      {
        id: 'MRS-P2-Q3',
        text: 'Do you experience strong sugar or carb cravings?',
        type: 'single',
        options: [
          { label: 'Rarely', value: 'rarely', emoji: '💪' },
          { label: 'Sometimes', value: 'sometimes', emoji: '😐' },
          { label: 'Often', value: 'often', emoji: '🍭' },
          { label: 'Constantly — it controls me', value: 'constantly', emoji: '🚨' },
        ],
      },
      {
        id: 'MRS-P2-Q4',
        text: 'Describe a typical day of eating — breakfast through dinner.',
        type: 'descriptive',
        placeholder: 'e.g. Chai + biscuits for breakfast, rice/dal for lunch, light dinner...',
      },
      {
        id: 'MRS-P2-Q5',
        text: 'Any food allergies, intolerances, or dietary restrictions?',
        type: 'descriptive',
        placeholder: 'e.g. Lactose intolerant, vegetarian, gluten-free...',
        optional: true,
      },
      {
        id: 'MRS-P2-Q6',
        text: 'How much water do you drink daily?',
        type: 'single',
        options: [
          { label: 'Less than 1L', value: 'lt1', emoji: '🏜️' },
          { label: '1–2 litres', value: '1to2', emoji: '💧' },
          { label: '2–3 litres', value: '2to3', emoji: '🚿' },
          { label: '3L+', value: 'gt3', emoji: '🌊' },
        ],
      },
      {
        id: 'MRS-P2-Q7',
        text: 'On a typical day, how would you rate your stress level?',
        type: 'scale',
        scaleMin: 1, scaleMax: 10,
        minLabel: 'Very calm', maxLabel: 'Highly stressed',
      },
    ],
  },
  {
    id: 'mrs-3',
    title: 'Activity & Goals',
    subtitle: 'Last section — tell us where you are now and where you want to go.',
    emoji: '🎯',
    questions: [
      {
        id: 'MRS-P3-Q1',
        text: 'What\'s your current physical activity level?',
        type: 'single',
        options: [
          { label: 'Sedentary — little to no exercise', value: 'sedentary', emoji: '🛋️' },
          { label: 'Lightly active — occasional walks', value: 'light', emoji: '🚶' },
          { label: 'Moderately active — 2-3×/week', value: 'moderate', emoji: '🏃' },
          { label: 'Very active — structured training', value: 'active', emoji: '⚡' },
        ],
      },
      {
        id: 'MRS-P3-Q2',
        text: 'Any joint pain, mobility issues, or physical limitations?',
        type: 'yesno',
      },
      {
        id: 'MRS-P3-Q2-detail',
        text: 'Tell us about your limitations.',
        type: 'descriptive',
        placeholder: 'e.g. Knee pain on stairs, can\'t do high-impact exercise...',
        showIf: { id: 'MRS-P3-Q2', equals: 'yes' },
      },
      {
        id: 'MRS-P3-Q3',
        text: 'What does success look like for you in 16 weeks?',
        type: 'descriptive',
        placeholder: 'Paint the picture — be specific. "I want to..."',
      },
      {
        id: 'MRS-P3-Q4',
        text: 'How confident are you that you can stick to a structured plan?',
        type: 'scale',
        scaleMin: 1, scaleMax: 10,
        minLabel: 'Not confident', maxLabel: 'Fully committed',
      },
    ],
  },
];

// ── Posture Recode Protocol (PRP) ─────────────────────────────────────────────
const PRP_PHASES: APhase[] = [
  {
    id: 'prp-1',
    title: 'Pain & Posture Mapping',
    subtitle: 'Let\'s pinpoint exactly where your body is struggling.',
    emoji: '🦴',
    questions: [
      {
        id: 'PRP-P1-Q1',
        text: 'Where do you currently feel pain, tension, or stiffness?',
        subtext: 'Select all that apply.',
        type: 'multi',
        options: [
          { label: 'Neck', value: 'neck', emoji: '😣' },
          { label: 'Upper back / Shoulders', value: 'upper_back', emoji: '🎒' },
          { label: 'Lower back', value: 'lower_back', emoji: '🪑' },
          { label: 'Hips', value: 'hips', emoji: '🦵' },
          { label: 'Knees', value: 'knees', emoji: '🦿' },
          { label: 'Tension headaches', value: 'headaches', emoji: '🤕' },
          { label: 'No pain — just visible misalignment', value: 'none', emoji: '👁️' },
        ],
      },
      {
        id: 'PRP-P1-Q2',
        text: 'Rate your current pain or discomfort level.',
        type: 'scale',
        scaleMin: 1, scaleMax: 10,
        minLabel: 'No pain', maxLabel: 'Severe',
      },
      {
        id: 'PRP-P1-Q3',
        text: 'How long has this posture issue or pain been present?',
        type: 'single',
        options: [
          { label: 'Less than 3 months', value: 'lt3m', emoji: '🆕' },
          { label: '3–12 months', value: '3to12m', emoji: '📅' },
          { label: '1–3 years', value: '1to3y', emoji: '📆' },
          { label: '3+ years', value: 'gt3y', emoji: '⏳' },
          { label: 'As long as I can remember', value: 'always', emoji: '👶' },
        ],
      },
      {
        id: 'PRP-P1-Q4',
        text: 'Have you noticed any of these visible posture signs?',
        type: 'multi',
        options: [
          { label: 'Forward head posture', value: 'forward_head', emoji: '🐢' },
          { label: 'Rounded / hunched shoulders', value: 'rounded_shoulders', emoji: '🦃' },
          { label: 'Uneven shoulders or hips', value: 'uneven', emoji: '⚖️' },
          { label: 'Excessive lower back curve', value: 'lordosis', emoji: '🌙' },
          { label: 'Flat feet / ankle rolling', value: 'flat_feet', emoji: '👣' },
          { label: 'Let coach assess — not sure', value: 'unsure', emoji: '🔍' },
        ],
      },
      {
        id: 'PRP-P1-Q5',
        text: 'Have you tried physio, chiropractic, or stretching programs before?',
        type: 'yesno',
      },
      {
        id: 'PRP-P1-Q5-detail',
        text: 'What did you try, and did it help?',
        type: 'descriptive',
        placeholder: 'e.g. 6 weeks of physio — helped short-term but pain came back...',
        showIf: { id: 'PRP-P1-Q5', equals: 'yes' },
      },
    ],
  },
  {
    id: 'prp-2',
    title: 'Your Lifestyle Context',
    subtitle: 'Posture is built (or broken) by your daily habits. Let\'s find out.',
    emoji: '💻',
    questions: [
      {
        id: 'PRP-P2-Q1',
        text: 'What does most of your day look like?',
        type: 'single',
        options: [
          { label: 'Desk job — sitting most of the day', value: 'desk', emoji: '💻' },
          { label: 'Standing job', value: 'standing', emoji: '🏪' },
          { label: 'Physical / manual labour', value: 'manual', emoji: '🔧' },
          { label: 'Mixed', value: 'mixed', emoji: '🔀' },
          { label: 'Student (sitting in class)', value: 'student', emoji: '📚' },
        ],
      },
      {
        id: 'PRP-P2-Q2',
        text: 'How many hours do you sit per day on average?',
        type: 'numeric',
        unit: 'hrs',
        placeholder: 'e.g. 9',
      },
      {
        id: 'PRP-P2-Q3',
        text: 'What\'s your primary work / device setup?',
        type: 'single',
        options: [
          { label: 'Laptop on a proper desk', value: 'proper_desk', emoji: '🖥️' },
          { label: 'Laptop on lap / couch / bed', value: 'couch', emoji: '🛋️' },
          { label: 'Desktop with proper setup', value: 'desktop', emoji: '🖱️' },
          { label: 'Phone-heavy (scrolling posture)', value: 'phone', emoji: '📱' },
          { label: 'Mixed', value: 'mixed', emoji: '🔀' },
        ],
      },
      {
        id: 'PRP-P2-Q4',
        text: 'Do you play any sport or do any repetitive physical activity regularly?',
        type: 'yesno',
      },
      {
        id: 'PRP-P2-Q4-detail',
        text: 'Tell us what you do and how often.',
        type: 'descriptive',
        placeholder: 'e.g. Cricket 3×/week, cycling daily, construction work 8hrs/day...',
        optional: true,
        showIf: { id: 'PRP-P2-Q4', equals: 'yes' },
      },
      {
        id: 'PRP-P2-Q5',
        text: 'What\'s your usual bag / carry habit?',
        type: 'single',
        options: [
          { label: 'One-shoulder bag, same side always', value: 'oneshoulder', emoji: '👜' },
          { label: 'Backpack, both straps', value: 'backpack', emoji: '🎒' },
          { label: 'Crossbody bag', value: 'crossbody', emoji: '🛍️' },
          { label: 'Handbag, one side', value: 'handbag', emoji: '👛' },
          { label: 'No regular bag', value: 'none', emoji: '🤲' },
        ],
      },
      {
        id: 'PRP-P2-Q6',
        text: 'How do you usually sleep?',
        type: 'single',
        options: [
          { label: 'On my back', value: 'back', emoji: '🛏️' },
          { label: 'On my side', value: 'side', emoji: '🌙' },
          { label: 'On my stomach', value: 'stomach', emoji: '😬' },
          { label: 'Varies', value: 'varies', emoji: '🔀' },
        ],
      },
    ],
  },
  {
    id: 'prp-3',
    title: 'Your Goals',
    subtitle: 'What does a pain-free, aligned body mean to you?',
    emoji: '🎯',
    questions: [
      {
        id: 'PRP-P3-Q1',
        text: 'What\'s your main goal with this program?',
        type: 'multi',
        options: [
          { label: 'Eliminate my pain', value: 'eliminate_pain', emoji: '💊' },
          { label: 'Visibly better posture & appearance', value: 'appearance', emoji: '🪞' },
          { label: 'Better breathing & performance', value: 'performance', emoji: '🫁' },
          { label: 'Prevent future problems', value: 'prevention', emoji: '🛡️' },
          { label: 'Avoid surgery / long-term treatment', value: 'avoid_surgery', emoji: '🏥' },
        ],
      },
      {
        id: 'PRP-P3-Q2',
        text: 'How many days a week can you realistically commit to exercises?',
        type: 'single',
        options: [
          { label: '2–3 days', value: '2to3', emoji: '📅' },
          { label: '4–5 days', value: '4to5', emoji: '💪' },
          { label: 'Daily', value: 'daily', emoji: '🔥' },
          { label: 'Not sure yet', value: 'unsure', emoji: '🤷' },
        ],
      },
      {
        id: 'PRP-P3-Q3',
        text: 'Where will you be doing these exercises?',
        type: 'single',
        options: [
          { label: 'Home only', value: 'home', emoji: '🏠' },
          { label: 'Gym access', value: 'gym', emoji: '🏋️' },
          { label: 'Both — flexible', value: 'hybrid', emoji: '🔄' },
        ],
      },
    ],
  },
];

// ── Rebuild & Rehab System (RRS) ──────────────────────────────────────────────
const RRS_PHASES: APhase[] = [
  {
    id: 'rrs-0',
    title: 'Medical Clearance',
    subtitle: 'Your safety is our top priority. This section ensures you\'re ready to train.',
    emoji: '🏥',
    questions: [
      {
        id: 'RRS-P0-Q1',
        text: 'Have you been cleared for physical activity by a doctor or physiotherapist?',
        type: 'single',
        options: [
          { label: 'Yes — fully cleared', value: 'cleared', emoji: '✅' },
          { label: 'Yes — with some restrictions', value: 'restricted', emoji: '⚠️' },
          { label: 'Not yet — still under medical care', value: 'not_yet', emoji: '🏥' },
          { label: 'No formal clearance sought', value: 'no_clearance', emoji: '🤷' },
        ],
      },
      {
        id: 'RRS-P0-Q2',
        text: 'Please describe your restrictions.',
        type: 'descriptive',
        placeholder: 'e.g. No running or jumping, avoid spinal loading for 6 weeks...',
        showIf: { id: 'RRS-P0-Q1', equals: 'restricted' },
      },
      {
        id: 'RRS-P0-Q3',
        text: 'I understand this program is not a substitute for ongoing medical treatment, and I will inform my coach of any new symptoms.',
        subtext: 'Required to proceed safely.',
        type: 'yesno',
      },
    ],
  },
  {
    id: 'rrs-1',
    title: 'Injury & Surgery History',
    subtitle: 'Tell us what happened so we can build your comeback right.',
    emoji: '🩹',
    questions: [
      {
        id: 'RRS-P1-Q1',
        text: 'What brings you to this program?',
        type: 'single',
        options: [
          { label: 'Recovering from surgery', value: 'surgery', emoji: '🔪' },
          { label: 'Recovering from a sports injury', value: 'sports_injury', emoji: '⚽' },
          { label: 'Chronic pain from an old injury', value: 'chronic', emoji: '😣' },
          { label: 'Returning after a long layoff', value: 'layoff', emoji: '⏸️' },
          { label: 'General decline in movement', value: 'decline', emoji: '📉' },
        ],
      },
      {
        id: 'RRS-P1-Q2',
        text: 'Describe the injury or surgery — body part, what happened, when.',
        type: 'descriptive',
        placeholder: 'e.g. Torn ACL, right knee, football match, March 2024...',
      },
      {
        id: 'RRS-P1-Q3',
        text: 'When did the injury or surgery occur?',
        type: 'date',
        placeholder: 'DD / MM / YYYY',
      },
      {
        id: 'RRS-P1-Q4',
        text: 'What stage of recovery are you at right now?',
        type: 'single',
        options: [
          { label: 'Very early — 0–6 weeks post', value: 'early', emoji: '🌱' },
          { label: 'Building tolerance', value: 'building', emoji: '📈' },
          { label: 'Regaining strength', value: 'strength', emoji: '💪' },
          { label: 'Late stage — returning to full activity', value: 'late', emoji: '🏁' },
          { label: 'Plateaued / not progressing', value: 'plateau', emoji: '⏸️' },
        ],
      },
      {
        id: 'RRS-P1-Q5',
        text: 'Rate your pain at rest.',
        type: 'scale',
        scaleMin: 1, scaleMax: 10,
        minLabel: 'No pain', maxLabel: 'Severe',
      },
      {
        id: 'RRS-P1-Q6',
        text: 'Rate your pain during movement or activity.',
        type: 'scale',
        scaleMin: 1, scaleMax: 10,
        minLabel: 'No pain', maxLabel: 'Can\'t move',
      },
      {
        id: 'RRS-P1-Q7',
        text: 'Are you currently doing any physio or rehab exercises?',
        type: 'yesno',
      },
      {
        id: 'RRS-P1-Q7-detail',
        text: 'What are you currently doing in rehab?',
        type: 'descriptive',
        placeholder: 'e.g. Quad sets, heel slides, 3×/week with a physio...',
        showIf: { id: 'RRS-P1-Q7', equals: 'yes' },
      },
    ],
  },
  {
    id: 'rrs-2',
    title: 'Functional Capacity',
    subtitle: 'What can your body do right now? Be honest — this shapes Week 1.',
    emoji: '⚙️',
    questions: [
      {
        id: 'RRS-P2-Q1',
        text: 'Which daily activities are currently difficult or limited?',
        type: 'multi',
        options: [
          { label: 'Walking / standing for long periods', value: 'walking', emoji: '🚶' },
          { label: 'Climbing stairs', value: 'stairs', emoji: '🪜' },
          { label: 'Lifting objects', value: 'lifting', emoji: '📦' },
          { label: 'Sleeping comfortably', value: 'sleeping', emoji: '🛏️' },
          { label: 'Sitting for long periods', value: 'sitting', emoji: '🪑' },
          { label: 'Sport-specific movement', value: 'sport', emoji: '⚽' },
          { label: 'None — fully functional now', value: 'none', emoji: '✅' },
        ],
      },
      {
        id: 'RRS-P2-Q2',
        text: 'How active were you before this injury?',
        type: 'single',
        options: [
          { label: 'Competitive athlete', value: 'competitive', emoji: '🏆' },
          { label: 'Regular exerciser', value: 'regular', emoji: '💪' },
          { label: 'Occasionally active', value: 'occasional', emoji: '🚶' },
          { label: 'Mostly sedentary', value: 'sedentary', emoji: '🛋️' },
        ],
      },
      {
        id: 'RRS-P2-Q3',
        text: 'Do you feel fear or hesitation about re-injuring yourself when you move?',
        type: 'scale',
        scaleMin: 1, scaleMax: 10,
        minLabel: 'Not at all', maxLabel: 'Very fearful',
      },
      {
        id: 'RRS-P2-Q4',
        text: 'What equipment / facilities do you have access to?',
        type: 'single',
        options: [
          { label: 'Home — no equipment', value: 'home_none', emoji: '🏠' },
          { label: 'Home — basic equipment', value: 'home_basic', emoji: '🏋️' },
          { label: 'Gym access', value: 'gym', emoji: '🏢' },
          { label: 'Physiotherapy clinic', value: 'physio', emoji: '🏥' },
          { label: 'Mixed', value: 'mixed', emoji: '🔀' },
        ],
      },
    ],
  },
  {
    id: 'rrs-3',
    title: 'Your Comeback Goals',
    subtitle: 'Define what full recovery means for you.',
    emoji: '🏁',
    questions: [
      {
        id: 'RRS-P3-Q1',
        text: 'What does being "fully recovered" look like for you?',
        type: 'descriptive',
        placeholder: 'e.g. Back on the pitch playing 90-minute matches pain-free...',
      },
      {
        id: 'RRS-P3-Q2',
        text: 'Is there a specific event, sport season, or deadline you\'re working toward?',
        type: 'descriptive',
        placeholder: 'e.g. Marathon in October, pre-season starts January... (optional)',
        optional: true,
      },
    ],
  },
];

// ── Corporate Performance Reset (CPR) ─────────────────────────────────────────
const CPR_PHASES: APhase[] = [
  {
    id: 'cpr-1',
    title: 'Your Work Life',
    subtitle: 'Your job shapes your body. Let\'s understand what you\'re up against.',
    emoji: '💼',
    questions: [
      {
        id: 'CPR-P1-Q1',
        text: 'What\'s your company or organisation name?',
        type: 'descriptive',
        placeholder: 'e.g. TCS, McKinsey, Self-employed...',
        optional: true,
      },
      {
        id: 'CPR-P1-Q2',
        text: 'What best describes your job role?',
        type: 'single',
        options: [
          { label: 'Desk-based / Office', value: 'desk', emoji: '💻' },
          { label: 'Field / On-site', value: 'field', emoji: '🏗️' },
          { label: 'Hybrid', value: 'hybrid', emoji: '🔄' },
          { label: 'Managerial / Leadership', value: 'leadership', emoji: '👔' },
          { label: 'Other', value: 'other', emoji: '🔹' },
        ],
      },
      {
        id: 'CPR-P1-Q3',
        text: 'How many hours do you spend sitting during a typical workday?',
        type: 'numeric',
        unit: 'hrs',
        placeholder: 'e.g. 9',
      },
      {
        id: 'CPR-P1-Q4',
        text: 'What does your typical work schedule look like?',
        type: 'single',
        options: [
          { label: 'Standard 9–6', value: 'standard', emoji: '🕘' },
          { label: 'Long hours (10+ hrs/day)', value: 'long', emoji: '⏰' },
          { label: 'Rotating shifts', value: 'shifts', emoji: '🔁' },
          { label: 'Frequent travel', value: 'travel', emoji: '✈️' },
          { label: 'Flexible / Remote', value: 'flexible', emoji: '🏠' },
        ],
      },
      {
        id: 'CPR-P1-Q5',
        text: 'How would you rate your current work-related stress?',
        type: 'scale',
        scaleMin: 1, scaleMax: 10,
        minLabel: 'Very low', maxLabel: 'Extremely high',
      },
      {
        id: 'CPR-P1-Q6',
        text: 'Do you experience burnout symptoms — exhaustion, low motivation, or cynicism?',
        type: 'single',
        options: [
          { label: 'Not at all', value: 'none', emoji: '😊' },
          { label: 'Occasionally', value: 'occasionally', emoji: '😐' },
          { label: 'Frequently', value: 'frequently', emoji: '😩' },
          { label: 'Most days', value: 'most_days', emoji: '🔥' },
        ],
      },
    ],
  },
  {
    id: 'cpr-2',
    title: 'Body & Pain',
    subtitle: 'The desk takes a toll. Let\'s see where yours is showing up.',
    emoji: '🦴',
    questions: [
      {
        id: 'CPR-P2-Q1',
        text: 'Do you experience any desk-related physical discomfort?',
        type: 'multi',
        options: [
          { label: 'Neck / shoulder pain', value: 'neck', emoji: '😣' },
          { label: 'Lower back pain', value: 'lower_back', emoji: '🪑' },
          { label: 'Wrist / RSI symptoms', value: 'wrist', emoji: '⌨️' },
          { label: 'Eye strain / headaches', value: 'eyes', emoji: '👁️' },
          { label: 'None currently', value: 'none', emoji: '✅' },
        ],
      },
      {
        id: 'CPR-P2-Q2',
        text: 'How many sick days have you taken in the last 6 months?',
        type: 'single',
        options: [
          { label: '0 days', value: '0', emoji: '💪' },
          { label: '1–3 days', value: '1to3', emoji: '😷' },
          { label: '4–7 days', value: '4to7', emoji: '🤒' },
          { label: '8+ days', value: '8plus', emoji: '🏥' },
        ],
      },
      {
        id: 'CPR-P2-Q3',
        text: 'What\'s your current exercise routine outside work?',
        type: 'single',
        options: [
          { label: 'None', value: 'none', emoji: '❌' },
          { label: '1–2 times/week', value: '1to2', emoji: '🚶' },
          { label: '3–4 times/week', value: '3to4', emoji: '🏃' },
          { label: '5+ times/week', value: '5plus', emoji: '⚡' },
        ],
      },
      {
        id: 'CPR-P2-Q4',
        text: 'Any current medical conditions affecting your work performance?',
        subtext: 'Select all that apply.',
        type: 'multi',
        options: [
          { label: 'Diabetes', value: 'diabetes', emoji: '🩸' },
          { label: 'Hypertension', value: 'hypertension', emoji: '❤️' },
          { label: 'Thyroid disorder', value: 'thyroid', emoji: '🦋' },
          { label: 'Back / joint issues', value: 'back_joint', emoji: '🦴' },
          { label: 'None', value: 'none', emoji: '✅' },
          { label: 'Other', value: 'other', emoji: '➕' },
        ],
      },
      {
        id: 'CPR-P2-Q4-other',
        text: 'Please specify the condition(s).',
        type: 'descriptive',
        placeholder: 'e.g. Anxiety, migraine, IBS...',
        optional: true,
        showIf: { id: 'CPR-P2-Q4', equals: 'other' },
      },
    ],
  },
  {
    id: 'cpr-3',
    title: 'Goals & Availability',
    subtitle: 'Tell us what you want — and when you can actually do it.',
    emoji: '⚡',
    questions: [
      {
        id: 'CPR-P3-Q1',
        text: 'What\'s your main goal from this program?',
        type: 'multi',
        options: [
          { label: 'Less pain at work', value: 'pain', emoji: '🩹' },
          { label: 'More energy and focus', value: 'energy', emoji: '⚡' },
          { label: 'Stress management', value: 'stress', emoji: '🧘' },
          { label: 'General fitness alongside work', value: 'fitness', emoji: '💪' },
          { label: 'Set an example for my team', value: 'leadership', emoji: '🏆' },
        ],
      },
      {
        id: 'CPR-P3-Q2',
        text: 'When during your day could you realistically train?',
        type: 'single',
        options: [
          { label: 'Early morning before work', value: 'morning', emoji: '🌅' },
          { label: 'Lunch break / work breaks', value: 'lunch', emoji: '☀️' },
          { label: 'Evening after work', value: 'evening', emoji: '🌆' },
          { label: 'On-site during work hours', value: 'onsite', emoji: '🏢' },
          { label: 'Weekends only', value: 'weekends', emoji: '📅' },
        ],
      },
      {
        id: 'CPR-P3-Q3',
        text: 'Is your participation self-funded or sponsored by your employer?',
        type: 'single',
        options: [
          { label: 'Self-funded', value: 'self', emoji: '💳' },
          { label: 'Employer-sponsored', value: 'employer', emoji: '🏢' },
          { label: 'Not sure', value: 'unsure', emoji: '🤷' },
        ],
      },
    ],
  },
];

// ── Peak Performance Lab (PPL) ────────────────────────────────────────────────
const PPL_PHASES: APhase[] = [
  {
    id: 'ppl-1',
    title: 'Athletic Profile',
    subtitle: 'We\'re building a performance plan. Let\'s know who we\'re working with.',
    emoji: '🏆',
    questions: [
      {
        id: 'PPL-P1-Q1',
        text: 'What\'s your primary sport or discipline?',
        type: 'descriptive',
        placeholder: 'e.g. Football, CrossFit, Tennis, Triathlon, Powerlifting...',
      },
      {
        id: 'PPL-P1-Q2',
        text: 'What\'s your current competition level?',
        type: 'single',
        options: [
          { label: 'Recreational', value: 'recreational', emoji: '🎯' },
          { label: 'Amateur / Club', value: 'amateur', emoji: '🥈' },
          { label: 'State / National', value: 'state', emoji: '🥇' },
          { label: 'International / Professional', value: 'professional', emoji: '🏆' },
          { label: 'Returning after a break', value: 'returning', emoji: '↩️' },
        ],
      },
      {
        id: 'PPL-P1-Q3',
        text: 'How many years have you been training in this sport?',
        type: 'numeric',
        unit: 'years',
        placeholder: 'e.g. 5',
      },
      {
        id: 'PPL-P1-Q4',
        text: 'Which best describes your current situation?',
        type: 'single',
        options: [
          { label: 'Plateaued despite consistent training', value: 'plateau', emoji: '📊' },
          { label: 'Returning after a long break / injury gap', value: 'returning', emoji: '↩️' },
          { label: 'Currently training — want optimisation', value: 'optimise', emoji: '⚡' },
          { label: 'Carrying an existing injury or limitation', value: 'injured', emoji: '🩹' },
        ],
      },
      {
        id: 'PPL-P1-Q5',
        text: 'Do you have any current or recurring injuries?',
        type: 'yesno',
      },
      {
        id: 'PPL-P1-Q5-detail',
        text: 'Which body part, what\'s the history, and how is it now?',
        type: 'descriptive',
        placeholder: 'e.g. Right hamstring strain — recurring for 2 years, limits sprinting...',
        showIf: { id: 'PPL-P1-Q5', equals: 'yes' },
      },
    ],
  },
  {
    id: 'ppl-2',
    title: 'Performance Baseline',
    subtitle: 'Where you are now determines where we take you.',
    emoji: '📊',
    questions: [
      {
        id: 'PPL-P2-Q1',
        text: 'How many training sessions do you do per week currently?',
        type: 'numeric',
        unit: 'sessions',
        placeholder: 'e.g. 5',
      },
      {
        id: 'PPL-P2-Q2',
        text: 'Which performance qualities do you most want to improve?',
        subtext: 'Select your top priorities.',
        type: 'multi',
        options: [
          { label: 'Speed', value: 'speed', emoji: '⚡' },
          { label: 'Strength', value: 'strength', emoji: '💪' },
          { label: 'Power', value: 'power', emoji: '💥' },
          { label: 'Endurance / Stamina', value: 'endurance', emoji: '🏃' },
          { label: 'Agility / Change of direction', value: 'agility', emoji: '🔄' },
          { label: 'Mobility / Flexibility', value: 'mobility', emoji: '🧘' },
          { label: 'Mental / Competition focus', value: 'mental', emoji: '🧠' },
        ],
      },
      {
        id: 'PPL-P2-Q3',
        text: 'Do you currently track any performance metrics?',
        type: 'yesno',
      },
      {
        id: 'PPL-P2-Q3-detail',
        text: 'What do you track, and what are your current numbers?',
        type: 'descriptive',
        placeholder: 'e.g. 100m PB: 11.2s, Squat max: 140kg, VO2 max: 52...',
        showIf: { id: 'PPL-P2-Q3', equals: 'yes' },
      },
      {
        id: 'PPL-P2-Q4',
        text: 'How would you rate your current recovery between sessions?',
        type: 'scale',
        scaleMin: 1, scaleMax: 10,
        minLabel: 'Poor — always sore / tired', maxLabel: 'Excellent — fully recovered',
      },
      {
        id: 'PPL-P2-Q5',
        text: 'What facilities and equipment do you have access to?',
        type: 'single',
        options: [
          { label: 'Full performance lab / gym', value: 'full', emoji: '🏟️' },
          { label: 'Standard gym', value: 'gym', emoji: '🏋️' },
          { label: 'Home / limited equipment', value: 'home', emoji: '🏠' },
          { label: 'Sport-specific facility', value: 'specific', emoji: '⚽' },
        ],
      },
    ],
  },
  {
    id: 'ppl-3',
    title: 'Mental Edge & Targets',
    subtitle: 'The mental game separates good from elite.',
    emoji: '🧠',
    questions: [
      {
        id: 'PPL-P3-Q1',
        text: 'How would you rate your competition / performance mindset right now?',
        type: 'scale',
        scaleMin: 1, scaleMax: 10,
        minLabel: 'Struggles under pressure', maxLabel: 'Thrives under pressure',
      },
      {
        id: 'PPL-P3-Q2',
        text: 'What\'s your target event or timeline?',
        type: 'descriptive',
        placeholder: 'e.g. National trials in April, club pre-season in January...',
        optional: true,
      },
      {
        id: 'PPL-P3-Q3',
        text: 'What does reaching your "next level" look like specifically?',
        type: 'descriptive',
        placeholder: 'Be as specific as possible — numbers, rankings, feelings...',
      },
    ],
  },
];

// ── Longevity & Vitality Engine (LVE) ────────────────────────────────────────
const LVE_PHASES: APhase[] = [
  {
    id: 'lve-1',
    title: 'Your Longevity Profile',
    subtitle: 'Tell us where you are so we can map where to take you.',
    emoji: '⏳',
    questions: [
      {
        id: 'LVE-P1-Q1',
        text: 'Which best describes you?',
        type: 'single',
        options: [
          { label: 'I\'m 60+ and want to reclaim / preserve strength & independence', value: 'reclaim', emoji: '🌳' },
          { label: 'I\'m investing proactively in long-term health (any age)', value: 'proactive', emoji: '🛡️' },
          { label: 'I\'m noticing age-related decline — energy, mobility, cognition — and want to address it', value: 'reverse', emoji: '🔄' },
        ],
      },
      {
        id: 'LVE-P1-Q2',
        text: 'How old are you?',
        type: 'numeric',
        unit: 'years',
        placeholder: 'e.g. 55',
      },
      {
        id: 'LVE-P1-Q3',
        text: 'Any family history of age-related chronic disease?',
        type: 'multi',
        options: [
          { label: 'Heart disease', value: 'heart', emoji: '❤️' },
          { label: 'Dementia / Cognitive decline', value: 'dementia', emoji: '🧠' },
          { label: 'Osteoporosis', value: 'osteoporosis', emoji: '🦴' },
          { label: 'Diabetes', value: 'diabetes', emoji: '🩸' },
          { label: 'None known', value: 'none', emoji: '✅' },
          { label: 'Not sure', value: 'unsure', emoji: '🤷' },
        ],
      },
    ],
  },
  {
    id: 'lve-2',
    title: 'Functional Health',
    subtitle: 'Honest answers here let us design a plan that keeps you safe and progressing.',
    emoji: '🧬',
    questions: [
      {
        id: 'LVE-P2-Q1',
        text: 'Any current diagnosed conditions?',
        subtext: 'Select all that apply.',
        type: 'multi',
        options: [
          { label: 'Heart condition', value: 'heart', emoji: '❤️' },
          { label: 'Diabetes', value: 'diabetes', emoji: '🩸' },
          { label: 'Osteoporosis / Osteopenia', value: 'bone', emoji: '🦴' },
          { label: 'Arthritis', value: 'arthritis', emoji: '🦿' },
          { label: 'Hypertension', value: 'bp', emoji: '💓' },
          { label: 'Cognitive concerns', value: 'cognitive', emoji: '🧠' },
          { label: 'None', value: 'none', emoji: '✅' },
          { label: 'Other', value: 'other', emoji: '➕' },
        ],
      },
      {
        id: 'LVE-P2-Q1-other',
        text: 'Please specify the condition(s).',
        type: 'descriptive',
        placeholder: 'e.g. Parkinson\'s, chronic kidney disease, COPD...',
        optional: true,
        showIf: { id: 'LVE-P2-Q1', equals: 'other' },
      },
      {
        id: 'LVE-P2-Q2',
        text: 'Have you experienced any falls in the past year?',
        type: 'single',
        options: [
          { label: 'No falls', value: 'none', emoji: '✅' },
          { label: 'One fall — no injury', value: 'one_no_injury', emoji: '😌' },
          { label: 'One fall — with injury', value: 'one_injury', emoji: '🩹' },
          { label: 'Multiple falls', value: 'multiple', emoji: '⚠️' },
        ],
      },
      {
        id: 'LVE-P2-Q3',
        text: 'How would you rate your current balance and stability?',
        type: 'scale',
        scaleMin: 1, scaleMax: 10,
        minLabel: 'Very unsteady', maxLabel: 'Very stable',
      },
      {
        id: 'LVE-P2-Q4',
        text: 'Which daily activities feel harder than they used to?',
        type: 'multi',
        options: [
          { label: 'Climbing stairs', value: 'stairs', emoji: '🪜' },
          { label: 'Getting up from a chair or floor', value: 'getup', emoji: '🪑' },
          { label: 'Carrying groceries or objects', value: 'carrying', emoji: '🛍️' },
          { label: 'Walking long distances', value: 'walking', emoji: '🚶' },
          { label: 'Maintaining balance', value: 'balance', emoji: '⚖️' },
          { label: 'None — I feel fully capable', value: 'none', emoji: '💪' },
        ],
      },
      {
        id: 'LVE-P2-Q5',
        text: 'How would you rate your memory and mental clarity lately?',
        type: 'scale',
        scaleMin: 1, scaleMax: 10,
        minLabel: 'Noticeably declining', maxLabel: 'Sharp as ever',
      },
      {
        id: 'LVE-P2-Q6',
        text: 'What\'s your current activity level?',
        type: 'single',
        options: [
          { label: 'Sedentary', value: 'sedentary', emoji: '🛋️' },
          { label: 'Light — walking and errands', value: 'light', emoji: '🚶' },
          { label: 'Moderate — regular walks or light exercise', value: 'moderate', emoji: '🏃' },
          { label: 'Active — structured routine', value: 'active', emoji: '💪' },
        ],
      },
    ],
  },
  {
    id: 'lve-3',
    title: 'What Matters Most',
    subtitle: 'Define what vitality and longevity mean for YOUR life.',
    emoji: '🌟',
    questions: [
      {
        id: 'LVE-P3-Q1',
        text: 'What matters most to you in this program?',
        type: 'multi',
        options: [
          { label: 'Staying independent — no assistance needed', value: 'independence', emoji: '🦅' },
          { label: 'Preventing future decline', value: 'prevention', emoji: '🛡️' },
          { label: 'Reversing current decline', value: 'reverse', emoji: '🔄' },
          { label: 'Living actively for travel, family & hobbies', value: 'active_life', emoji: '✈️' },
          { label: 'Optimising for decades ahead', value: 'optimize', emoji: '⏳' },
        ],
      },
      {
        id: 'LVE-P3-Q2',
        text: 'Do you have support at home?',
        type: 'single',
        options: [
          { label: 'Yes — very supportive family / partner', value: 'very', emoji: '🤗' },
          { label: 'Somewhat — occasional support', value: 'some', emoji: '🤝' },
          { label: 'I live independently — no regular support', value: 'independent', emoji: '🦅' },
          { label: 'Prefer not to say', value: 'private', emoji: '🔒' },
        ],
      },
      {
        id: 'LVE-P3-Q3',
        text: 'What\'s your preferred training format?',
        type: 'single',
        options: [
          { label: 'In-person sessions', value: 'inperson', emoji: '🤝' },
          { label: 'Remote / video sessions', value: 'remote', emoji: '📱' },
          { label: 'Mix of both', value: 'both', emoji: '🔀' },
        ],
      },
    ],
  },
];

// ── Program phases map ─────────────────────────────────────────────────────────
export const PROGRAM_PHASES: Record<string, APhase[]> = {
  FBR: FBR_PHASES,
  MRS: MRS_PHASES,
  PRP: PRP_PHASES,
  RRS: RRS_PHASES,
  CPR: CPR_PHASES,
  PPL: PPL_PHASES,
  LVE: LVE_PHASES,
};

export const PROGRAM_COLORS: Record<string, string> = {
  FBR: '#6EE7B7',
  MRS: '#FCA5A5',
  PRP: '#93C5FD',
  RRS: '#C4B5FD',
  CPR: '#FDE68A',
  PPL: '#00C4B4',
  LVE: '#E8A44A',
};

export const PROGRAM_LABELS: Record<string, string> = {
  FBR: 'Future Body Reset',
  MRS: 'Metabolic Reversal System',
  PRP: 'Posture Recode Protocol',
  RRS: 'Rebuild & Rehab System',
  CPR: 'Corporate Performance Reset',
  PPL: 'Peak Performance Lab',
  LVE: 'Longevity & Vitality Engine',
};

// Special sentinel phase ID — assessment.tsx renders a custom photo UI for this
export const PHOTO_PHASE_ID = 'PHOTO_CAPTURE';

export const PHOTO_PHASE: APhase = {
  id: PHOTO_PHASE_ID,
  title: 'Baseline Photos',
  subtitle: 'Front, side & back — completely private. Helps your coach track your transformation visually.',
  emoji: '📸',
  questions: [], // rendered separately in assessment.tsx
};

export function getPhasesForProgram(assessmentKey: string): APhase[] {
  const programPhases = PROGRAM_PHASES[assessmentKey] ?? PROGRAM_PHASES['PRP'];
  return [...SHARED_CORE_PHASES, ...programPhases, PHOTO_PHASE];
}
