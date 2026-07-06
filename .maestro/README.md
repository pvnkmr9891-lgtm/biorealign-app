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

This covers **3 of the 6 golden flows** in `docs/TESTING.md` §2 — login
(all three roles + the negative path), daily logging, and the medical
analysis → coach handoff. The remaining three — register → OTP →
onboarding, coach triage → message, and Razorpay booking — are natural
next additions, each building on `auth/login.yaml` the same way. They
need more `testID` coverage on their respective screens (onboarding
steps, coach messaging, Razorpay checkout) before they can be written
with the same precision as the flows here.

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

## Why `testID`, not visible text

Maestro can select on visible text, but BioRealign's copy changes often
(marketing tweaks, A/B copy) and several screens reuse generic strings
("Save", "Submit") across contexts. `testID` is copy-independent and
unambiguous — this repo had zero `testID`s before this pass; add one to
any new interactive element a flow needs to target, rather than falling
back to fragile text matching.
