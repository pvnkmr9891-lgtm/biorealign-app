import PostHog from 'posthog-react-native';

// Product analytics. Silently disabled until EXPO_PUBLIC_POSTHOG_API_KEY is
// set, so the app runs fine before the PostHog account exists.
const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

export const posthog: PostHog | null = apiKey ? new PostHog(apiKey, { host }) : null;

type EventProperties = NonNullable<Parameters<PostHog['capture']>[1]>;

/** Custom events, e.g. trackEvent('workout_logged', { day: 3 }). */
export function trackEvent(event: string, properties?: EventProperties) {
  posthog?.capture(event, properties);
}

/** Screen views — called automatically from Telemetry in the root layout. */
export function trackScreen(pathname: string) {
  posthog?.screen(pathname);
}

/**
 * Tie events to a user. Only id + role — never name/phone/email or any
 * health data, so analytics stays clean of PII.
 */
export function identifyUser(userId: string, properties?: EventProperties) {
  posthog?.identify(userId, properties);
}

/** Call on sign-out so the next user on this device isn't mis-attributed. */
export function resetAnalytics() {
  posthog?.reset();
}
