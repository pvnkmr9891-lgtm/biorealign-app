# Contributing

## Admin parity rule

Any new field, screen, or feature added to the **client** or **coach** login
must also be made visible (and editable, if the client/coach themselves can
edit it) in the **admin User Management profile view** for that user type.

This is not optional or a "nice to have" — treat it as part of the
definition of done for any client- or coach-facing change.

**Why this is enforceable in practice, not just policy:** the admin profile
view is built from the same underlying components as the client/coach's own
screens, not a separately maintained copy:

- `src/components/profile/ClientProfileView.tsx` is the single shared
  component rendering a client's full profile (tabs: Profile, Overview,
  Assessment, Body, Pictures, Workouts, Medical). It's used by both
  `app/(coach)/client-overview.tsx` and `app/(admin)/client-profile.tsx`.
  Add a tab or field here once, and both contexts pick it up automatically.
- `src/components/profile/EditProfileModal.tsx` and
  `useUpdateProfile()` (`src/hooks/useClient.ts`) are the single edit
  path for basic profile fields (name, phone), shared by the client's own
  `app/(client)/profile.tsx`, the admin client-profile Profile tab, and the
  admin coach-profile screen. `useUpdateProfile` takes an explicit
  `targetUserId`, so the same mutation works whether the actor is editing
  themselves or an admin editing someone else.
- Coach→client editor hooks (`useCoachWorkoutEditor`, `useCoachNutritionEditor`,
  `useCoachSupplementEditor`, `useMarkAssessmentReviewed`, etc.) already take
  an explicit `clientId` — reuse these rather than writing parallel
  admin-only mutations.

When you add a new client- or coach-facing field:

1. Add it to the relevant shared component/hook above, not a screen-specific
   copy.
2. If a field genuinely has no admin equivalent (e.g. something that should
   only ever be self-reported and never edited by staff), leave a code
   comment explaining why — make it a deliberate, visible exception, not a
   silent gap. See the comment above `ProfileTab` in `ClientProfileView.tsx`
   for an example.
3. If the existing update logic is hardcoded to the current logged-in user
   (`useAuth().user!.id` inside a `mutationFn`), refactor it to accept an
   explicit target user id rather than duplicating it for the admin path.

## Known gaps (tracked, not silent)

- Several fields shown read-only in `OverviewTab` (gender, height_cm,
  weight_kg, health_goals, conditions) have **no edit UI anywhere in the
  app yet** — not for the client themselves, not for the coach, not for
  admin. There's nothing to "give admin parity with" until one of those
  gets a first edit UI; build it as a shared component when that happens,
  following the pattern above.
