// Central feature-flag switchboard.
// Flip PROGRAMS_ENABLED back to true to restore the curated-program experience
// (program selection, intensity selection, program-specific assessments, FBR
// workout/nutrition branching) for the Pro version. None of that code or data
// was removed — it's just bypassed while this flag is false.
export const PROGRAMS_ENABLED = false;

// Custom routines (New Routine / Explore) and the plan start-date / intensity /
// training-type picker are part of the advanced tracker, deferred to the Pro
// version. The 6-day checklist, water, and nutrition trackers always show by
// default while this is false. None of the underlying code was removed.
export const ADVANCED_TRACKING_ENABLED = false;

// "Need a Coach?" — client browses coaches, requests one, coach approves,
// approval unlocks the 5-stage detailed assessment + coach-curated plans.
export const COACH_REQUEST_ENABLED = true;
