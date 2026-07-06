# Maestro E2E flows

## ⚠️ Status: authored, not yet run against a live build

These flows were written by reading the app's source directly (exact
`testID`s, exact alert text) — but this session had no Android/iOS
emulator, no device, and no Maestro CLI available to actually execute them.
**Treat the first real run as a shakeout pass**, not a working test suite.
Likely first-run issues: timing (the `extendedWaitUntil`/`timeout` values
are estimates), and the native-alert-dismiss step in flow 04 (`tapOn: "OK"`
— Android/iOS phrase this differently; adjust to what actually renders).

## Setup (one-time)

1. Install the Maestro CLI: https://maestro.dev/docs/getting-started/installing-maestro
2. Have the app running on a connected device or emulator (a dev-client or
   preview build — `npx expo run:android` / `run:ios`, or an EAS preview build).
3. Create test accounts for each role (client/coach/admin) in the target
   Supabase project — never point these flows at production data you care about.
4. Provide credentials as env vars at run time — **never commit them**:
   ```
   maestro test .maestro/flows/golden/01_client_login.yaml \
     -e TEST_CLIENT_EMAIL=you@test.com -e TEST_CLIENT_PASSWORD=...
   ```
   Or put them in a local, gitignored `.maestro/.env.local` and run with
   `maestro test --env-file .maestro/.env.local <flow>`.

## Running

```sh
# One flow
maestro test .maestro/flows/golden/01_client_login.yaml -e TEST_CLIENT_EMAIL=... -e TEST_CLIENT_PASSWORD=...

# Everything under flows/golden/
maestro test .maestro/flows/golden --env-file .maestro/.env.local
```

## What exists so far

| Flow | Covers |
|---|---|
| `auth/login.yaml` | Reusable subflow — not run directly, included via `runFlow` |
| `golden/01_client_login.yaml` | Client logs in → lands on client home |
| `golden/02_coach_login.yaml` | Coach logs in → lands on coach home |
| `golden/03_admin_login.yaml` | Admin logs in → lands on admin home |
| `golden/04_login_wrong_password_shows_error.yaml` | Wrong password → error alert, stays on login |
| `golden/05_client_log_full_day.yaml` | Client logs in → Workout tab → marks the whole day complete via the day-level select-all checkbox → saves → confirms → back to home |
| `golden/06_client_analyze_and_send_to_coach.yaml` | Client → Medical Records → AI analysis → send to assigned coach → confirmation |
| `golden/07_coach_sees_medical_analysis.yaml` | Coach → Medical Opinion Requests → opens the client → sees the shared document + AI summary |
| `golden/08_coach_triage_send_message.yaml` | Coach → dashboard "no log" attention item → messages that client |
| `golden/09_client_receives_coach_message.yaml` | Client → Messages → sees the coach's message |
| `golden/10_client_request_coach.yaml` | Client (no coach yet) → picks a coach from the directory → sends a request |
| `golden/11_coach_approve_request_and_client_appears.yaml` | Coach → approves the request → client shows up in "My Clients" |

Against the numbered list in `docs/TESTING.md` §2: **items 3 and 4 are
fully covered** (medical analysis → coach handoff; coach triage →
message). **Item 2** (login → log a full day → streak updates) is
covered except the streak-number verification, called out as a manual
follow-up in `05_client_log_full_day.yaml`. **Item 6**'s first half
(coach request → approve → client appears in coach list) is covered by
flows 10/11; its second half (coach enters a fitness assessment → client
sees scores) is deferred — `fitness-assessment-new.tsx` was under active
edit by a parallel session when this was written, so it was left alone
rather than risk clashing with in-progress work. **Items 1 and 5**
(register → OTP → onboarding; Razorpay booking) aren't started. Bare
login (used as infrastructure by every flow above, but not itself one of
the 6 numbered items) is fully covered across all three roles plus the
negative path.

Items 1 and 5 are intentionally last, not next: both involve automating a
system outside the app's own UI (real SMS delivery for OTP; a
third-party payment SDK overlay for Razorpay), a different, harder
category of flow than "add testID, script the tap" — see below. Item 6's
remaining half is a more ordinary next flow (same recipe as the others),
just blocked on the parallel edit clearing up.

Note on `10`/`11` (coach request/approval): these need **two distinct
client fixtures** — `TEST_CLIENT_NO_COACH_*` (no coach assigned or
pending, used here) and the plain `TEST_CLIENT_*` used by flows 05/06/08/09
(already has an assigned coach). Don't reuse one client across both sets;
the button flow 10 needs to tap only renders when there's no existing
coach relationship.

Note on `05_client_log_full_day.yaml`: it uses the single day-level
"select all" checkbox (`handleToggleAll` in `workout-plan.tsx`, which
marks every item across all categories — workout, water, food,
supplement — in one tap) rather than tapping ~15-20 individual items.
That checkbox toggles based on current state, so the flow assumes
today's log isn't already fully complete when it starts; if the test
account's day is already done, the first tap would uncheck everything
instead.

Note on `06`/`07` (medical analysis): these deliberately don't automate
the document **upload** step. Uploading opens a native OS picker (camera,
photo library, or file browser) outside the app — scripting through that
reliably needs either Maestro's `addMedia` command plus tapping through
whatever the device's native gallery/file-picker UI looks like (varies by
OS version and manufacturer), or a real file already sitting in a known
location on the test device. Neither was verifiable without a device in
this session, so flow 06 assumes a document is pre-seeded directly via
Supabase (insert a `medical_documents` row + matching object in the
`medical-documents` storage bucket) rather than guessing at OS-level
picker automation. Manual upload testing across file types (pdf/jpg/png/
heic/docx) stays a `docs/TESTING.md` checklist item, not an E2E flow —
that's the right split: E2E proves the app's business logic once a file
exists, the checklist covers the picker/format variety by hand.

## Why registration/OTP and Razorpay aren't scaffolded yet

Both remaining golden flows leave the app's own UI partway through:

- **Register → OTP → onboarding.** OTP delivery is real SMS via Twilio —
  a Maestro flow can't read an SMS that arrived on a real phone number.
  The app does have a `000000` dev-bypass code (see `project_biorealign`
  memory / the security-fix TODOs), but that bypass is scheduled for
  *removal* once Twilio moves to a paid plan — building a golden flow
  that depends on a security hole slated for deletion is the wrong
  foundation. The real fix is test-environment infrastructure (a
  dedicated test phone number with programmatic SMS retrieval, e.g. via
  Twilio's own test credentials/webhooks), which is a setup decision for
  whoever owns the Twilio account, not something to script around blind.
- **Razorpay booking.** Checkout renders as a native SDK overlay
  (`react-native-razorpay`) outside React Native's own view tree —
  Maestro can technically drive any on-screen UI, but scripting through
  a payment gateway's own screens (card entry, OTP-for-payment, success
  redirect) reliably needs to be verified against what that SDK actually
  renders on a device, which this session had no way to do. Razorpay
  does provide test-mode card numbers for exactly this purpose — this is
  worth building once there's a device to iterate against, not worth
  guessing at now.

Both are better done as a follow-up session with real device access, so
each tap can be verified as it's written rather than authored blind.

## Why `testID`, not visible text

Maestro can select on visible text, but BioRealign's copy changes often
(marketing tweaks, A/B copy) and several screens reuse generic strings
("Save", "Submit") across contexts. `testID` is copy-independent and
unambiguous — this repo had zero `testID`s before this pass; add one to
any new interactive element a flow needs to target, rather than falling
back to fragile text matching.
