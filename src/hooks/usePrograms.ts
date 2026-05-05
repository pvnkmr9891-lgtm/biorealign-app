import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// ── Static program catalogue ──────────────────────────────────────────────────
export const PROGRAM_CATALOGUE = [
  {
    slug: 'future-body-reset',
    name: 'Future Body Reset',
    tagline: 'Build lasting healthy habits from the ground up',
    tag: 'Children & Youth',
    color: '#6EE7B7',
    weeks: 12,
    difficulty: 'Beginner',
    icon: '🌱',
    for_who: 'Young adults and teenagers building healthy foundations',
    overview: 'A structured 12-week program designed to instil lifelong movement, nutrition, and mindset habits. No prior experience needed — just consistency.',
    what_you_get: [
      'Daily movement routines (20–30 min)',
      'Nutrition education and meal planning',
      'Sleep and recovery coaching',
      'Habit tracking and accountability',
      'Weekly coach check-ins',
    ],
    phases: [
      { number: 1, name: 'Foundation', weeks: '1–4', description: 'Build baseline movement patterns and daily habits' },
      { number: 2, name: 'Momentum', weeks: '5–8', description: 'Increase intensity, refine nutrition, improve sleep' },
      { number: 3, name: 'Identity', weeks: '9–12', description: 'Cement habits, set next-level goals, celebrate wins' },
    ],
    tracks: ['workout', 'nutrition', 'lifestyle', 'mindset'],
    outcomes: ['Consistent exercise habit', 'Better energy levels', 'Improved posture', 'Healthier relationship with food'],
  },
  {
    slug: 'metabolic-reversal-system',
    name: 'Metabolic Reversal System',
    tagline: 'Reverse metabolic dysfunction and reclaim your body',
    tag: 'Diabetes & Obesity',
    color: '#FCA5A5',
    weeks: 16,
    difficulty: 'Intermediate',
    icon: '🔥',
    for_who: 'Adults managing Type 2 diabetes, pre-diabetes, or obesity',
    overview: 'A medically-informed 16-week protocol targeting insulin resistance, visceral fat reduction, and metabolic restoration through precision nutrition and movement.',
    what_you_get: [
      'Blood sugar optimisation protocol',
      'Anti-inflammatory nutrition plan',
      'Low-impact metabolic training',
      'Stress and cortisol management',
      'Biweekly coach reviews',
    ],
    phases: [
      { number: 1, name: 'Detox & Reset', weeks: '1–4', description: 'Remove inflammatory foods, establish baseline movement' },
      { number: 2, name: 'Metabolic Repair', weeks: '5–10', description: 'Targeted nutrition, insulin sensitivity training' },
      { number: 3, name: 'Reversal', weeks: '11–16', description: 'Sustained fat loss, normalise metabolic markers' },
    ],
    tracks: ['workout', 'nutrition', 'recovery', 'lifestyle'],
    outcomes: ['Improved blood sugar control', 'Reduced visceral fat', 'Higher energy', 'Better sleep quality'],
  },
  {
    slug: 'posture-recode-protocol',
    name: 'Posture Recode Protocol',
    tagline: 'Correct years of postural damage in 8 weeks',
    tag: 'Posture Correction',
    color: '#93C5FD',
    weeks: 8,
    difficulty: 'Beginner',
    icon: '🧍',
    for_who: 'Desk workers, students, and anyone with chronic pain from poor posture',
    overview: 'An 8-week corrective protocol addressing forward head posture, rounded shoulders, anterior pelvic tilt, and lower back pain through targeted corrective exercises and daily habits.',
    what_you_get: [
      'Postural assessment and analysis',
      'Daily corrective exercise sequences',
      'Desk ergonomics setup guide',
      'Mobility and flexibility protocols',
      'Pain tracking and progress photos',
    ],
    phases: [
      { number: 1, name: 'Assess & Release', weeks: '1–2', description: 'Identify imbalances, release tight muscles' },
      { number: 2, name: 'Activate & Strengthen', weeks: '3–6', description: 'Activate inhibited muscles, build stability' },
      { number: 3, name: 'Reinforce', weeks: '7–8', description: 'Cement new patterns, maintain gains long-term' },
    ],
    tracks: ['posture_rehab', 'workout', 'lifestyle'],
    outcomes: ['Reduced neck and back pain', 'Taller posture', 'Improved breathing', 'More confidence'],
  },
  {
    slug: 'rebuild-rehab-system',
    name: 'Rebuild & Rehab System',
    tagline: 'Recover stronger than before your injury',
    tag: 'Injury Recovery',
    color: '#C4B5FD',
    weeks: 10,
    difficulty: 'Beginner',
    icon: '🩹',
    for_who: 'Anyone recovering from surgery, sports injury, or chronic pain',
    overview: 'A carefully structured 10-week rehabilitation protocol that rebuilds strength, mobility, and confidence after injury — designed to prevent re-injury while accelerating recovery.',
    what_you_get: [
      'Injury-specific movement assessment',
      'Progressive rehab exercise program',
      'Pain management protocols',
      'Sleep and recovery optimisation',
      'Weekly progress reviews with coach',
    ],
    phases: [
      { number: 1, name: 'Protect & Heal', weeks: '1–3', description: 'Gentle movement, reduce inflammation, protect injury site' },
      { number: 2, name: 'Rebuild', weeks: '4–7', description: 'Progressive loading, restore range of motion' },
      { number: 3, name: 'Return to Function', weeks: '8–10', description: 'Sport/activity-specific training, full recovery' },
    ],
    tracks: ['posture_rehab', 'recovery', 'workout', 'lifestyle'],
    outcomes: ['Full range of motion restored', 'Stronger than before injury', 'Reduced re-injury risk', 'Confident movement'],
  },
  {
    slug: 'corporate-performance-reset',
    name: 'Corporate Performance Reset',
    tagline: 'Peak performance for the professional athlete of work',
    tag: 'Workplace Wellness',
    color: '#FDE68A',
    weeks: 6,
    difficulty: 'Beginner',
    icon: '💼',
    for_who: 'Busy professionals, executives, and entrepreneurs',
    overview: 'A 6-week intensive designed for high-performers who need maximum results with minimal time. Fix posture, boost energy, reduce stress, and sharpen mental clarity.',
    what_you_get: [
      '20-minute daily movement routines',
      'High-performance nutrition strategy',
      'Stress and cortisol management',
      'Sleep optimisation protocol',
      'Energy and focus coaching',
    ],
    phases: [
      { number: 1, name: 'Recovery Mode', weeks: '1–2', description: 'Fix sleep, reduce stress hormones, repair baseline health' },
      { number: 2, name: 'Performance Mode', weeks: '3–4', description: 'Optimise energy, sharpen focus, build strength' },
      { number: 3, name: 'Elite Mode', weeks: '5–6', description: 'Peak performance habits locked in for life' },
    ],
    tracks: ['workout', 'nutrition', 'lifestyle', 'mindset', 'recovery'],
    outcomes: ['More energy throughout the day', 'Better focus and clarity', 'Reduced stress', 'Improved posture'],
  },
  {
    slug: 'peak-performance-lab',
    name: 'Peak Performance Lab',
    tagline: 'Train like an elite athlete. Perform at your peak.',
    tag: 'Athletic Excellence',
    color: '#00C4B4',
    weeks: 12,
    difficulty: 'Advanced',
    icon: '🏆',
    for_who: 'Athletes, fitness enthusiasts, and high-performers seeking elite conditioning',
    overview: 'A 12-week advanced performance protocol combining periodised strength training, athletic conditioning, precision nutrition, and recovery science to unlock your physical ceiling.',
    what_you_get: [
      'Periodised strength & conditioning program',
      'Athletic nutrition and timing protocol',
      'Recovery and regeneration system',
      'Performance testing and benchmarking',
      'Weekly data review with coach',
    ],
    phases: [
      { number: 1, name: 'Base Build', weeks: '1–4', description: 'Build aerobic base, refine movement quality' },
      { number: 2, name: 'Strength & Power', weeks: '5–8', description: 'Maximum strength, power development, speed work' },
      { number: 3, name: 'Peak & Compete', weeks: '9–12', description: 'Peaking protocol, performance testing, competition prep' },
    ],
    tracks: ['workout', 'nutrition', 'recovery', 'mindset'],
    outcomes: ['Significant strength gains', 'Improved speed and power', 'Better recovery', 'Elite-level conditioning'],
  },
  {
    slug: 'longevity-vitality-engine',
    name: 'Longevity & Vitality Engine',
    tagline: 'Age backwards. Live stronger, longer.',
    tag: 'Aging & Vitality',
    color: '#E8A44A',
    weeks: 20,
    difficulty: 'Intermediate',
    icon: '⏳',
    for_who: 'Adults 40+ who want to maintain and improve quality of life as they age',
    overview: 'A comprehensive 20-week longevity protocol addressing the four pillars of healthy aging: strength, mobility, metabolic health, and cognitive vitality.',
    what_you_get: [
      'Longevity-focused strength training',
      'Anti-aging nutrition protocol',
      'Mobility and flexibility system',
      'Cognitive and mental vitality coaching',
      'Monthly biomarker review',
    ],
    phases: [
      { number: 1, name: 'Foundation', weeks: '1–5', description: 'Restore baseline strength, mobility, and metabolic function' },
      { number: 2, name: 'Vitality Build', weeks: '6–12', description: 'Build lean muscle, optimise hormones, improve bone density' },
      { number: 3, name: 'Longevity Lock-In', weeks: '13–20', description: 'Sustainable habits for decades of vibrant living' },
    ],
    tracks: ['workout', 'nutrition', 'recovery', 'lifestyle', 'mindset'],
    outcomes: ['Maintained muscle mass', 'Better joint health', 'Sharper cognition', 'Sustained energy and vitality'],
  },
];

const TRACK_LABELS: Record<string, string> = {
  workout:      '🏋️ Workout',
  nutrition:    '🥗 Nutrition',
  recovery:     '😴 Recovery',
  lifestyle:    '🌿 Lifestyle',
  posture_rehab:'🩺 Posture/Rehab',
  mindset:      '🧘 Mindset',
};

export function getProgramBySlug(slug: string) {
  return PROGRAM_CATALOGUE.find(p => p.slug === slug) ?? null;
}

export function getTrackLabel(track: string) {
  return TRACK_LABELS[track] ?? track;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

// Change useClientEnrollment to return array
export function useClientEnrollments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client', user?.id, 'enrollments'],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, program:programs(id, name, slug, duration_weeks)')
        .eq('client_id', user!.id)
        .eq('status', 'active')
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

// Get all enrollment requests by this client
export function useEnrollmentRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client', user?.id, 'enrollment_requests'],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollment_requests')
        .select('*, program:programs(id, name, slug)')
        .eq('client_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

// Request enrollment in a program
export function useRequestEnrollment() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ programSlug, message }: { programSlug: string; message?: string }) => {
      // Get program id from slug
      const { data: program, error: progError } = await supabase
        .from('programs')
        .select('id, name')
        .eq('slug', programSlug)
        .single();

      if (progError || !program) throw new Error('Program not found');

      // Get client's assigned coach
      const { data: profile } = await supabase
        .from('profiles')
        .select('assigned_coach_id, full_name')
        .eq('id', user!.id)
        .single();

      // Insert enrollment request
      const { data, error } = await supabase
        .from('enrollment_requests')
        .insert({
          client_id: user!.id,
          program_id: program.id,
          coach_id: profile?.assigned_coach_id ?? null,
          message: message?.trim() || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification to coach if assigned
      if (profile?.assigned_coach_id) {
        await supabase.from('notifications').insert({
          user_id: profile.assigned_coach_id,
          title: 'New enrollment request',
          body: `${profile.full_name} has requested to join ${program.name}`,
          type: 'enrollment_request',
          data: { client_id: user!.id, program_id: program.id },
        });
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', user?.id, 'enrollment_requests'] });
    },
  });
}

// Coach: get pending enrollment requests
export function useCoachEnrollmentRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['coach', user?.id, 'enrollment_requests'],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollment_requests')
        .select(`
          *,
          program:programs(id, name, slug, duration_weeks),
          client:profiles!enrollment_requests_client_id_fkey(id, full_name, phone)
        `)
        .eq('coach_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

// Coach: approve or reject enrollment request
export function useHandleEnrollmentRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId, action, clientId, programId,
    }: {
      requestId: string;
      action: 'approve' | 'reject';
      clientId: string;
      programId: string;
    }) => {
      // Update request status
      await supabase
        .from('enrollment_requests')
        .update({ status: action === 'approve' ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', requestId);

      if (action === 'approve') {
        // Create enrollment
        const { error: enrollError } = await supabase
          .from('enrollments')
          .insert({
            client_id: clientId,
            program_id: programId,
            coach_id: user!.id,
            status: 'active',
            current_week: 1,
            started_at: new Date().toISOString(),
          });

        if (enrollError) throw enrollError;

        // Notify client
        const { data: program } = await supabase.from('programs').select('name').eq('id', programId).single();
        await supabase.from('notifications').insert({
          user_id: clientId,
          title: '🎉 Enrollment approved!',
          body: `You've been enrolled in ${program?.name}. Your coach will build your plan soon.`,
          type: 'enrollment_approved',
        });
      } else {
        // Notify client of rejection
        await supabase.from('notifications').insert({
          user_id: clientId,
          title: 'Enrollment update',
          body: 'Your enrollment request was reviewed. Please message your coach for next steps.',
          type: 'enrollment_rejected',
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coach', user?.id, 'enrollment_requests'] });
    },
  });
}
