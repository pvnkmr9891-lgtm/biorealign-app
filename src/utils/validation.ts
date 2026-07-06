// Shared input validation/sanitization helpers for forms across the app.

export const MAX_LENGTHS = {
  personName: 80,
  username: 30,
  occupation: 80,
  location: 80,
  shortTitle: 80,
  customListItem: 100,
  supplementName: 100,
  description: 1000,
  note: 500,
  longNote: 2000,
  broadcastTitle: 100,
  broadcastBody: 500,
} as const;

export const NUMERIC_RANGES = {
  age: { min: 1, max: 120 },
  reps: { min: 1, max: 999 },
  sets: { min: 1, max: 50 },
  durationMinutes: { min: 1, max: 600 },
  weekNumber: { min: 1, max: 52 },
  holdSeconds: { min: 0, max: 600 },
  restSeconds: { min: 0, max: 1800 },
  calories: { min: 0, max: 10000 },
  macroGrams: { min: 0, max: 1000 },
  doseAmount: { min: 0, max: 1000 },
  heightCm: { min: 50, max: 272 },
  weightKg: { min: 20, max: 300 },
  strengthReps: { min: 0, max: 200 },
  flexibilityInches: { min: -50, max: 50 },
  enduranceDistance: { min: 0, max: 2000 },
  agilitySeconds: { min: 0, max: 300 },
} as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

/** Strips everything except digits, spaces, +, - and () — use for phone-pad fields. */
export function sanitizePhone(text: string): string {
  return text.replace(/[^0-9+\-() ]/g, '');
}

/** Loose phone check — 7 to 15 digits once formatting characters are stripped (E.164-ish). */
export function isValidPhone(value: string): boolean {
  const digits = value.replace(/[^0-9]/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/** Strips everything except digits — use for integer-only fields (age, reps, week #). */
export function sanitizeInteger(text: string): string {
  return text.replace(/[^0-9]/g, '');
}

/** Strips everything except digits and a single decimal point — use for positive decimal fields (weight, macros, dose). */
export function sanitizeDecimal(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
}

/** Strips everything except digits, a single leading minus, and a single decimal point — use for fields that may legitimately be negative (e.g. sit-and-reach). */
export function sanitizeSignedDecimal(text: string): string {
  const negative = text.trim().startsWith('-');
  const digits = sanitizeDecimal(text.replace(/-/g, ''));
  return negative ? `-${digits}` : digits;
}

export function clampToRange(value: number, range: { min: number; max: number }): number {
  if (Number.isNaN(value)) return range.min;
  return Math.min(range.max, Math.max(range.min, value));
}

export function isWithinRange(value: number, range: { min: number; max: number }): boolean {
  return !Number.isNaN(value) && value >= range.min && value <= range.max;
}
