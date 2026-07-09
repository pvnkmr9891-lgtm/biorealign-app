// ── Badge catalog — 4 phases × 6 badges, all backed by data already tracked
//    (streaks, perfect weeks, days logged, check-ins, measurements, alignment
//    score). Each phase escalates the same 6 categories to a harder threshold.
//    Phase N+1 stays visible but locked until every badge in phase N is earned.
//    See useBadgeProgress (src/hooks/useBadgeProgress.ts) for how "earned" is
//    computed live from real client data — nothing here is a stored event.

export type BadgeCategory = 'streak' | 'perfect_week' | 'days_logged' | 'checkin' | 'measurement' | 'alignment';

export interface BadgeDef {
  id: string;
  category: BadgeCategory;
  icon: string;
  label: string;
  description: string;
  threshold: number;
}

export interface PhaseDef {
  id: string;
  name: string;
  subtitle: string;
  badges: BadgeDef[];
}

export const PHASES: PhaseDef[] = [
  {
    id: 'phase1',
    name: 'Getting Started',
    subtitle: 'The first 6 milestones on your journey',
    badges: [
      { id: 'p1_streak',  category: 'streak',       icon: '🔥', label: '3-Day Streak',        description: 'Log 3 days in a row',             threshold: 3 },
      { id: 'p1_perfect', category: 'perfect_week', icon: '🏆', label: 'First Perfect Week',  description: 'Complete every task in a week',   threshold: 1 },
      { id: 'p1_days',    category: 'days_logged',  icon: '🗓️', label: '10 Days Logged',      description: 'Log 10 solid days',               threshold: 10 },
      { id: 'p1_checkin', category: 'checkin',      icon: '📝', label: '5 Check-ins',         description: 'Complete 5 daily check-ins',      threshold: 5 },
      { id: 'p1_measure', category: 'measurement',  icon: '📐', label: 'First Measurement',   description: 'Log your first weekly measurement', threshold: 1 },
      { id: 'p1_align',   category: 'alignment',    icon: '⚡', label: 'Momentum',            description: 'Reach a 40+ rolling alignment score', threshold: 40 },
    ],
  },
  {
    id: 'phase2',
    name: 'Building Consistency',
    subtitle: 'Turning good days into a good routine',
    badges: [
      { id: 'p2_streak',  category: 'streak',       icon: '🔥', label: '7-Day Streak',        description: 'Log 7 days in a row',             threshold: 7 },
      { id: 'p2_perfect', category: 'perfect_week', icon: '🏆', label: '3 Perfect Weeks',     description: 'Complete 3 perfect weeks',        threshold: 3 },
      { id: 'p2_days',    category: 'days_logged',  icon: '🗓️', label: '30 Days Logged',      description: 'Log 30 solid days',               threshold: 30 },
      { id: 'p2_checkin', category: 'checkin',      icon: '📝', label: '15 Check-ins',        description: 'Complete 15 daily check-ins',     threshold: 15 },
      { id: 'p2_measure', category: 'measurement',  icon: '📐', label: '4 Measurements',      description: 'Log 4 weekly measurements',       threshold: 4 },
      { id: 'p2_align',   category: 'alignment',    icon: '🔒', label: 'Locked In',           description: 'Reach a 65+ rolling alignment score', threshold: 65 },
    ],
  },
  {
    id: 'phase3',
    name: 'Going Deeper',
    subtitle: 'This is where the results start showing',
    badges: [
      { id: 'p3_streak',  category: 'streak',       icon: '🔥', label: '14-Day Streak',       description: 'Log 14 days in a row',            threshold: 14 },
      { id: 'p3_perfect', category: 'perfect_week', icon: '🏆', label: '6 Perfect Weeks',     description: 'Complete 6 perfect weeks',        threshold: 6 },
      { id: 'p3_days',    category: 'days_logged',  icon: '🗓️', label: '60 Days Logged',      description: 'Log 60 solid days',               threshold: 60 },
      { id: 'p3_checkin', category: 'checkin',      icon: '📝', label: '30 Check-ins',        description: 'Complete 30 daily check-ins',     threshold: 30 },
      { id: 'p3_measure', category: 'measurement',  icon: '📐', label: '8 Measurements',      description: 'Log 8 weekly measurements',       threshold: 8 },
      { id: 'p3_align',   category: 'alignment',    icon: '💎', label: 'Unbreakable',         description: 'Reach an 85+ rolling alignment score', threshold: 85 },
    ],
  },
  {
    id: 'phase4',
    name: 'Elite Status',
    subtitle: 'Very few clients ever reach this phase',
    badges: [
      { id: 'p4_streak',  category: 'streak',       icon: '🔥', label: '30-Day Streak',       description: 'Log 30 days in a row',            threshold: 30 },
      { id: 'p4_perfect', category: 'perfect_week', icon: '🏆', label: '10 Perfect Weeks',    description: 'Complete 10 perfect weeks',       threshold: 10 },
      { id: 'p4_days',    category: 'days_logged',  icon: '🗓️', label: '100 Days Logged',     description: 'Log 100 solid days',              threshold: 100 },
      { id: 'p4_checkin', category: 'checkin',      icon: '📝', label: '60 Check-ins',        description: 'Complete 60 daily check-ins',     threshold: 60 },
      { id: 'p4_measure', category: 'measurement',  icon: '📐', label: '12 Measurements',     description: 'Log 12 weekly measurements',      threshold: 12 },
      { id: 'p4_align',   category: 'alignment',    icon: '🌟', label: 'Peak Form',           description: 'Reach a 95+ rolling alignment score', threshold: 95 },
    ],
  },
];
