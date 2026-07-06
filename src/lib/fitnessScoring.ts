// Pure fitness-assessment scoring bands, extracted from DomainRadarChart.tsx
// for unit testing without pulling in react-native/react-native-svg at
// import time.

export function scoreBand(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: '#34D399' };
  if (score >= 60) return { label: 'Good', color: '#00C4B4' };
  if (score >= 40) return { label: 'Fair', color: '#E8A44A' };
  return { label: 'Needs work', color: '#EF4444' };
}
