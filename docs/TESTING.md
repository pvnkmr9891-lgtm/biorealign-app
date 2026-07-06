# BioRealign — Testing Strategy & Release Checklist

Living document. The strategy section explains *how* we test; the checklists
are the manual pass to run before every release build (OTA or binary).

---

## 1. The testing pyramid (what runs where)

| Layer | Tool | What it catches | Status |
|---|---|---|---|
| Static | TypeScript + ESLint in CI | type errors, dead code, API misuse | ✅ live (lint report-only) |
| Unit | Jest | scoring math, streak logic, date/week helpers | ✅ live (62 tests, `src/lib/`) |
| Component | React Native Testing Library | form validation, conditional rendering | ❌ later |
| DB security | `supabase/tests/rls_tests.sql` | cross-tenant leaks, role escalation | ✅ live (20 checks) |
| API / Edge functions | Deno test + staged invokes | AI digest, payments, OTP flows | ❌ to build |
| E2E | Maestro (`.maestro/`) | full user flows on a real build | 🚧 items 3, 4 & first half of 6 scaffolded, item 2 partial, **unverified — needs a device run** |
| Manual | this document's checklists | UX, visual, exploratory, device quirks | ✅ process below |
| Production | Sentry + PostHog | everything the above missed | ⏳ waiting on account keys |

**Rule of thumb:** anything that broke once gets an automated test so it can
never break silently again. Manual testing is for *discovering* problems;
automation is for *never rediscovering* them.

---

## 2. The six golden flows (automate first — Maestro)

These are the flows where a failure costs a user or a rupee. If only six
things are ever automated end-to-end, it's these. See `.maestro/README.md`
for setup and current status — items 3 and 4 are fully scaffolded, item 2
is scaffolded except streak verification, item 6's first half (request →
approve → appears in list) is scaffolded, and bare login (all 3 roles +
the wrong-password path) is done as shared infrastructure. Item 6's
second half (fitness assessment entry) is blocked on a parallel session's
in-progress edits to that screen. Items 1 and 5 aren't started — both
need testing infrastructure this session couldn't set up (real SMS
delivery, a payment SDK overlay).

1. **Register → OTP → onboarding → first workout log** (the activation path)
2. **Login → log a full day** (workout ✓, meal ✓, water ✓, supplement ✓) → streak updates
3. **Client uploads medical doc → AI analysis → send to coach → coach sees it** (the "send to expert" path is a separate branch, shown only to clients with no assigned coach — it opens WhatsApp/email to BioRealign's team, not an in-app coach view)
4. **Coach: dashboard → attention item tap-through → client drill-down → send message → client receives**
5. **Recovery booking → slot pick → Razorpay (test mode) → confirmation → admin sees booking**
6. **Coach request → approve → client appears in coach list → coach enters fitness assessment → client sees scores**

---

## 3. Field-level testing method (boundary + equivalence)

For every input field, professional testing uses two techniques:

- **Equivalence classes** — group inputs into "valid", "invalid", "empty" and
  test one representative of each (don't test 5, 6, 7 reps — test 6, -1, blank).
- **Boundary values** — bugs live at the edges. Test the minimum, maximum,
  just-below, just-above, and zero.

App-specific boundary cases that MUST be covered whenever these fields change:

| Field | Test values |
|---|---|
| Assessment reps (chair stand, arm curl) | 0, 1, 60, -1, 999, blank, decimal (12.5) |
| Sit-and-reach / back scratch (inches) | **negative is VALID** (-5), 0, +5, -30, +30, blank |
| 6-min walk (meters) | 0, 100, 800, 2000 (absurd), blank |
| Up-and-go (seconds) | 2.9 (elite), 30, 0, negative, blank |
| Age at assessment | 59 (below norm tables → age_out_of_range), 60, 94, 95+, blank |
| Sleep hours (check-in) | 0, 0.5, 12, 24, 25 (invalid), blank |
| Mood / energy / pain | 0, 1, 10, 11, 12 (constraint is ≤12), negative |
| Weight (kg) | 20, 250, 0, negative, 3 decimals |
| Water segments | 0/13, 13/13, tap same segment twice, past-day edit |
| Phone | +91 format, without +91, 9 digits, 11 digits, letters, spaces |
| Username | taken (must error), UPPERCASE of taken, emoji, spaces, 1 char, 50 chars |
| Password | 7 chars (min?), all spaces, emoji, 100 chars, paste |
| Free-text notes | empty, 5000 chars, emoji, newlines, `'; drop table--`, RTL text |
| Names | single word, 60 chars, emoji, leading/trailing spaces |
| Dates | today, future assessment date, week boundary (Sunday/Monday!), month/year rollover |
| File upload | pdf, jpg, png, heic, docx, 20MB file, 0-byte file, wrong extension, cancel mid-upload |

**Week-boundary special:** streaks, weekly logs, and digests all pivot on the
Monday week start with Sunday as the rest day. Always test once on a Sunday
(or with device date set to Sunday) — most date bugs in this app will live there.

---

## 4. Manual release checklist

Run before every release. Mark N/A where a screen didn't change, but run
**Auth + the golden flows in full** every time.

### 4.1 Auth (all roles)
- [ ] Register: happy path with new phone + username
- [ ] Register: duplicate username → friendly error
- [ ] Register: duplicate phone → friendly error
- [ ] OTP: wrong code, expired code, resend, back-navigation mid-flow
- [ ] Login: wrong password, non-existent user, correct
- [ ] Forgot password: full phone-OTP reset, then login with new password
- [ ] Session: kill app, reopen → still logged in, lands on correct role home
- [ ] Stale token: (after DB reset / token revoke) app recovers to login, no crash-loop
- [ ] Logout: from each role, no back-navigation into authed screens

### 4.2 Client
- [ ] Onboarding: every question answerable; skip works where allowed; back-navigation preserves answers; athlete toggle lock
- [ ] Home: streak displays; check-in nudge; coach banner; week deltas
- [ ] Check-in: submit; resubmit same day (should update, not duplicate); all sliders at extremes
- [ ] Workout plan: check/uncheck each item type; add exercise (filter by equipment + muscle); collapsed default; meal wheel quadrant → scroll+expand
- [ ] Water: all 13 segments, select-all, clear-all, edit yesterday
- [ ] Supplements: expand/collapse all; mark taken; schedule renders correct days
- [ ] Progress: training load renders with <5 days data (calibrating), with 90 days
- [ ] Fitness assessment: scores + trend view match what coach entered
- [ ] Medical: upload each file type; AI analysis completes; send to expert; feedback thread
- [ ] Messages: send, receive (from coach device), read receipts, empty state
- [ ] Recovery: browse slots, book, pay (Razorpay TEST card success), pay-fail path, cancel
- [ ] Profile: edit each editable field, save, kill app, verify persisted

### 4.3 Coach
- [ ] Dashboard: each attention-item type appears when staged (supplement flag, unviewed analysis, 7-day no-log, adherence drop, assessment due) and taps to the right screen
- [ ] Client pulse: worst-first ordering
- [ ] Client list: Lite + legacy enrollment clients both present
- [ ] Drill-down: all tabs load for a data-rich client AND a brand-new empty client (empty states, no crashes)
- [ ] Overview: digest generate → content cites real data; regenerate; copy message
- [ ] Vitals sparklines: match check-in data; pain flag when staged
- [ ] Fitness tab: radar (1 assessment = no overlay; 2+ = overlay + deltas); new assessment entry with boundary values from §3
- [ ] Body tab: metric chart per metric; weight-vs-adherence overlay; training load
- [ ] Plan/nutrition/supplement editors: edit → client sees change after refetch
- [ ] Coach requests: approve (client gains coach; assessment shell created), decline
- [ ] Messaging: conversation with Lite client (regression: this was broken once)

### 4.4 Admin
- [ ] KPIs plausible vs DB counts
- [ ] Client + coach drill-downs: parity with coach view; edits persist
- [ ] Coach assignment: reassign a client; old coach loses access (verify in coach login!)
- [ ] Rehab: slot creation, availability grid, queue, mark-paid
- [ ] Broadcast: sends; clients receive
- [ ] Supplement catalog: image upload, replace, delete

### 4.5 Cross-cutting (every release)
- [ ] Airplane mode: open each main screen → graceful, no infinite spinners; reconnect → data loads
- [ ] Background app 2 min → foreground: data refreshes (new refetch behavior)
- [ ] Slow network (device throttle): no double-submits from double-taps on Pay / Send / Save
- [ ] Two-device concurrency: coach edits plan while client logs — no lost writes
- [ ] Small screen (5.5") + large font accessibility setting: no clipped buttons
- [ ] Android back button: sensible on every screen (no logout / no dead-end)
- [ ] Fresh install (cleared storage) vs upgrade-in-place both boot
- [ ] OTA update: old build receives update, restarts clean, no white screen

### 4.6 Payments (before any release touching payment code)
- [ ] Razorpay TEST success card → appointment confirmed + webhook verified server-side
- [ ] Payment abandoned (back out of Razorpay sheet) → no appointment, slot released
- [ ] Payment success but app killed before redirect → appointment still recorded (webhook path)
- [ ] Double-tap Pay → single order only

---

## 5. Staging data recipes

Keep these handy for staging attention items and edge states (run as SQL or
via the app):
- **No-log streak:** pick a client, delete/backdate their `completed_at` logs > 7 days
- **Adherence drop:** week N-1 mostly completed, week N mostly not
- **Pain flag:** 3+ consecutive daily_checkins with pain ≥ 7
- **Assessment due:** client with latest fitness_assessment > 60 days old
- **age_out_of_range:** assessment with client_age_at_assessment = 45

---

## 6. Cadence

| When | What |
|---|---|
| Every push/PR | CI: typecheck, lint, RLS tests (once secret added) |
| Before every OTA | Golden flows (manual or Maestro) + changed-screen checklists |
| Before every binary release | Full manual checklist, 2 physical devices (1 low-end Android) |
| Weekly during beta | Sentry triage + PostHog funnel review (activation + retention) |
| Before first B2B pilot | Load test (k6 against Supabase), full security re-audit, device matrix |
