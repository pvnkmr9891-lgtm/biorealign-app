// Thin admin wrapper around the coach's activity-trend-report screen —
// same component, just registered under (admin) so admin can launch it
// directly from ClientProfileView's Fitness tab, mirroring how
// fitness-assessment-new.tsx wraps the coach screen for other features.
export { default } from '../(coach)/activity-trend-report';
