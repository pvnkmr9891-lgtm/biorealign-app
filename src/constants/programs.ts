// src/constants/programs.ts

export interface Program {
  id: string;
  name: string;
  icon: string;
  color: string;
  tagline: string;
  description: string;
  benefits: string[];
  target: string;
  pillars: string[];
}

export const PROGRAMS: Program[] = [
  {
    id: 'total_transformation',
    name: 'Future Body Reset',
    icon: '🚀',
    color: '#10B981',
    tagline: 'The complete BioRealign overhaul.',
    description:
      'The most comprehensive programme in the BioRealign ecosystem. A complete life overhaul covering movement, nutrition, recovery, sleep, mindset, and performance — every pillar rebuilt from the ground up.',
    benefits: [
      'Complete body composition change',
      'Sustainable performance habits embedded',
      'Peak output across all life domains',
      'Long-term results that last a lifetime',
    ],
    target: 'Those ready for a complete, uncompromising life transformation',
    pillars: ['Movement', 'Nutrition', 'Recovery', 'Mindset', 'Longevity'],
  },
  {
    id: 'metabolic_renewal',
    name: 'Metabolic Reversal System',
    icon: '🔥',
    color: '#E8A44A',
    tagline: 'Reset your metabolism from the inside out',
    description:
      'A science-backed protocol targeting metabolic dysfunction at its root. Combining strategic nutrition periodisation, metabolic resistance training, and hormonal optimisation to ignite sustainable fat loss and lasting energy.',
    benefits: [
      'Accelerated fat burning and body recomposition',
      'Improved insulin sensitivity',
      'Hormonal rebalancing',
      'Sustained high energy throughout the day',
    ],
    target: 'Those with slow metabolism, hormonal issues, or stubborn fat',
    pillars: ['Nutrition', 'Metabolics', 'Movement', 'Longevity'],
  },
  {
    id: 'postural_realignment',
    name: 'Posture Recode Protocol',
    icon: '🧘',
    color: '#8B5CF6',
    tagline: 'Move without pain. Stand tall. Live freely.',
    description:
      'Corrective exercise and movement therapy to systematically eliminate chronic pain, fix structural imbalances, and restore optimal biomechanics. Every session rebuilds the movement foundation your body needs to thrive.',
    benefits: [
      'Chronic pain elimination',
      'Full postural correction and alignment',
      'Greater mobility and joint health',
      'Long-term injury prevention',
    ],
    target: 'Chronic pain sufferers, posture issues, post-injury recovery',
    pillars: ['Movement', 'Recovery', 'Alignment', 'Mindset'],
  },
  {
    id: 'hormonal_balance',
    name: 'Rebuild & Rehab System',
    icon: '🛠️',
    color: '#EC4899',
    tagline: 'Rebalance. Renew. Reclaim yourself.',
    description:
      'A comprehensive hormonal optimisation programme addressing cortisol, insulin, thyroid, and reproductive hormones through targeted nutrition, specialised movement, sleep protocols, and stress management strategies.',
    benefits: [
      'Full hormonal equilibrium restored',
      'Weight management and body composition',
      'Mood stabilisation and emotional resilience',
      'Deep sleep and enhanced recovery',
    ],
    target: 'Hormonal imbalances, PCOS, thyroid conditions, burnout',
    pillars: ['Recovery', 'Nutrition', 'Mindset', 'Longevity'],
  },
  {
    id: 'corporate_reset',
    name: 'Corporate Performance Reset',
    icon: '💼',
    color: '#00C4B4',
    tagline: 'Reclaim your energy, posture, and performance at work',
    description:
      'Designed for desk-bound professionals experiencing chronic fatigue, postural damage, and metabolic slowdown. This programme reverses the physical cost of a sedentary career through targeted corrective work, metabolic conditioning, and stress-recovery protocols.',
    benefits: [
      'Eliminate chronic neck and back pain',
      'Restore daily energy and mental clarity',
      'Accelerate fat loss without crashing',
      'Build bulletproof postural strength',
    ],
    target: 'Office workers, executives, remote professionals',
    pillars: ['Movement', 'Recovery', 'Metabolics', 'Mindset'],
  },
  {
    id: 'athletic_performance',
    name: 'Peak Performance Lab',
    icon: '⚡',
    color: '#EF4444',
    tagline: 'Train like an athlete. Perform like a champion.',
    description:
      'Elite-level performance training combining strength, power, speed, and endurance protocols used with competitive athletes. Built for those who want to push physical limits and unlock peak output in every domain.',
    benefits: [
      'Maximum strength and power gains',
      'Explosive speed and agility',
      'Optimised recovery between sessions',
      'Mental toughness and competition readiness',
    ],
    target: 'Athletes, sports enthusiasts, high performers',
    pillars: ['Movement', 'Metabolics', 'Recovery', 'Mindset'],
  },
  {
    id: 'mind_body',
    name: 'Longevity & Vitality Engine',
    icon: '🌿',
    color: '#3B82F6',
    tagline: 'Heal from the inside. Transform from within.',
    description:
      'A holistic transformation protocol combining movement therapy, breathwork, and mindfulness to heal the nervous system, rebuild resilience, and create deep integration between physical and mental performance.',
    benefits: [
      'Stress and anxiety significantly reduced',
      'Nervous system regulation and calm',
      'Laser-sharp mental focus and clarity',
      'Emotional resilience and balance',
    ],
    target: 'Burnout recovery, anxiety management, high-stress professionals',
    pillars: ['Mindset', 'Recovery', 'Movement', 'Longevity'],
  },
];
