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

This is flow **1 of the 6 golden flows** in `docs/TESTING.md` §2 (login
itself, all three roles, plus the negative path). The other five — register
→ OTP → onboarding, full-day logging, medical doc → AI → expert, coach
triage → message, and Razorpay booking — are natural next additions, each
building on `auth/login.yaml` the same way. They need more `testID`
coverage on their respective screens (onboarding steps, workout-plan
checklist items, medical upload button, etc.) before they can be written
with the same precision as the flows here.

## Why `testID`, not visible text

Maestro can select on visible text, but BioRealign's copy changes often
(marketing tweaks, A/B copy) and several screens reuse generic strings
("Save", "Submit") across contexts. `testID` is copy-independent and
unambiguous — this repo had zero `testID`s before this pass; add one to
any new interactive element a flow needs to target, rather than falling
back to fragile text matching.
