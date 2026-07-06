// Run: deno test supabase/functions/_shared/razorpay.test.ts
//
// The hex vectors below were computed independently via Node's
// `crypto.createHmac('sha256', ...)` (not by running this file — Deno
// wasn't available in the session that wrote these tests) and cross-checked
// for length (64 hex chars = 32-byte digest). Web Crypto's HMAC-SHA256 and
// Node's are the same standard algorithm, so a value correct under one
// implementation is correct under both. Treat the first real `deno test`
// run as confirming the *code*, not the vectors — the vectors are already
// verified against an independent HMAC implementation.

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { hmacSha256Hex, verifyRazorpaySignature, timingSafeEqualHex, rupeesToPaise } from './razorpay.ts';

Deno.test('hmacSha256Hex - matches an independently-computed reference vector (order|payment message)', async () => {
  const digest = await hmacSha256Hex('test_secret_key', 'order_ABC123|pay_XYZ789');
  assertEquals(digest, 'b0b12113290ee2725c910a905e505ee6bb5ee8f268c106200dcc08f5fe79ad64');
});

Deno.test('hmacSha256Hex - matches reference vector (webhook JSON body message)', async () => {
  const digest = await hmacSha256Hex('whsec_test123', '{"event":"payment.captured","payload":{}}');
  assertEquals(digest, '75c3350327b1845543d9f7df78265c8bc70d8f0ece05cff5e4301a15b748bd92');
});

Deno.test('hmacSha256Hex - matches reference vector (empty message)', async () => {
  const digest = await hmacSha256Hex('secret', '');
  assertEquals(digest, 'f9e66e179b6747ae54108f82f8ade8b3c25d76fd30afde6c395822c530196169');
});

Deno.test('hmacSha256Hex - matches reference vector (short secret/message)', async () => {
  const digest = await hmacSha256Hex('k', 'a|b');
  assertEquals(digest, 'e15d03e80a8738ae1a8334c4419e89ea865e8393a0fb6a03364f62bde705c4a6');
});

Deno.test('hmacSha256Hex - different secrets produce different digests for the same message', async () => {
  const a = await hmacSha256Hex('secret-one', 'order_1|pay_1');
  const b = await hmacSha256Hex('secret-two', 'order_1|pay_1');
  assertEquals(a === b, false);
});

Deno.test('hmacSha256Hex - different messages produce different digests under the same secret', async () => {
  const a = await hmacSha256Hex('secret', 'order_1|pay_1');
  const b = await hmacSha256Hex('secret', 'order_1|pay_2');
  assertEquals(a === b, false);
});

Deno.test('verifyRazorpaySignature - accepts a correctly computed signature', async () => {
  const secret = 'test_secret_key';
  const message = 'order_ABC123|pay_XYZ789';
  const signature = await hmacSha256Hex(secret, message);
  assertEquals(await verifyRazorpaySignature(secret, message, signature), true);
});

Deno.test('verifyRazorpaySignature - rejects a tampered payment id (message changed)', async () => {
  const secret = 'test_secret_key';
  const realSignature = await hmacSha256Hex(secret, 'order_ABC123|pay_XYZ789');
  // attacker swaps in a different payment_id but replays the old signature
  assertEquals(await verifyRazorpaySignature(secret, 'order_ABC123|pay_FORGED', realSignature), false);
});

Deno.test('verifyRazorpaySignature - rejects a signature computed under the wrong secret', async () => {
  const message = 'order_ABC123|pay_XYZ789';
  const wrongSecretSignature = await hmacSha256Hex('not_the_real_secret', message);
  assertEquals(await verifyRazorpaySignature('test_secret_key', message, wrongSecretSignature), false);
});

Deno.test('verifyRazorpaySignature - rejects an empty/missing signature', async () => {
  assertEquals(await verifyRazorpaySignature('test_secret_key', 'order_1|pay_1', ''), false);
});

Deno.test('verifyRazorpaySignature - rejects a single flipped character (off-by-one forgery attempt)', async () => {
  const secret = 'test_secret_key';
  const message = 'order_ABC123|pay_XYZ789';
  const real = await hmacSha256Hex(secret, message);
  const flipped = real.slice(0, -1) + (real.at(-1) === '0' ? '1' : '0');
  assertEquals(await verifyRazorpaySignature(secret, message, flipped), false);
});

Deno.test('timingSafeEqualHex - equal strings compare equal', () => {
  assertEquals(timingSafeEqualHex('abc123', 'abc123'), true);
});

Deno.test('timingSafeEqualHex - different-length strings are never equal (no length leak via loop index)', () => {
  assertEquals(timingSafeEqualHex('abc', 'abcd'), false);
});

Deno.test('timingSafeEqualHex - a difference in the LAST character is still caught', () => {
  // guards against an implementation that returns early on the first mismatch
  // and never checks the rest of the string
  assertEquals(timingSafeEqualHex('aaaaaaaaaa', 'aaaaaaaaab'), false);
});

Deno.test('rupeesToPaise - whole rupee amounts', () => {
  assertEquals(rupeesToPaise(500), 50000);
});

Deno.test('rupeesToPaise - typical decimal price (499.50 rupees)', () => {
  assertEquals(rupeesToPaise(499.5), 49950);
});

Deno.test('rupeesToPaise - floating point edge case does not undercharge by a paise', () => {
  // 19.99 * 100 in raw JS floating point is 1998.9999999999998 before rounding
  assertEquals(rupeesToPaise(19.99), 1999);
});

Deno.test('rupeesToPaise - zero', () => {
  assertEquals(rupeesToPaise(0), 0);
});
