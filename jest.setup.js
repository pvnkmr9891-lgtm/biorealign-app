// Pin the test-runner timezone to IST (Asia/Calcutta) — the timezone of
// every real BioRealign user. Without this, timezone-dependent date bugs
// (like the training-load off-by-one-day bug fixed 2026-07-06) are a no-op
// on UTC CI runners and silently escape the test suite.
process.env.TZ = 'Asia/Calcutta';
