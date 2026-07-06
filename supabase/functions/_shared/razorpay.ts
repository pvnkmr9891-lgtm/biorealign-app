// Shared Razorpay helpers used by rehab-create-payment-order,
// rehab-verify-payment, and rehab-payment-webhook. Extracted so the HMAC
// signature logic exists in exactly one place — this is the code path that
// decides whether a payment is real money or a forged request, so there
// should never be two copies that could drift out of sync.

/** HMAC-SHA256 of `message` under `secret`, as lowercase hex. */
export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies a Razorpay-style HMAC signature in constant time (so response
 * timing can't leak how many leading bytes matched). Both call sites
 * (order+payment id concatenation for client-side verification, raw JSON
 * body for the webhook) just differ in what `message` is.
 */
export async function verifyRazorpaySignature(
  secret: string,
  message: string,
  signature: string,
): Promise<boolean> {
  const expected = await hmacSha256Hex(secret, message);
  return timingSafeEqualHex(expected, signature);
}

/**
 * Constant-time comparison of two hex strings. Plain `===`/`!==` short-
 * circuits on the first differing byte, which leaks timing information an
 * attacker could in principle use to guess a valid signature byte-by-byte.
 * Deno's crypto has no built-in timingSafeEqual, so this XORs char codes
 * across the full length regardless of where a mismatch occurs.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Converts a rupee amount (as stored in `quoted_price`, e.g. 499.5) to the
 * integer paise Razorpay's API requires. Rounds rather than truncates so a
 * price like 19.995 (an edge case, but quoted_price is a numeric column)
 * doesn't get silently undercharged by a paise.
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
