import * as Sentry from '@sentry/react-native';

// Crash + error reporting. Silently disabled until EXPO_PUBLIC_SENTRY_DSN is
// set (in .env locally, and as an EAS environment variable for builds), so
// the app runs fine before the Sentry account exists.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const monitoringEnabled = !!dsn;

export function initMonitoring() {
  if (!monitoringEnabled) return;
  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    // Health-data app: never auto-attach IPs / emails to error reports.
    // We set only the user id + role explicitly (see Telemetry in _layout).
    sendDefaultPii: false,
  });
}

/** Wrap the root component for navigation instrumentation + touch tracking. */
export function wrapRoot<P extends Record<string, unknown>>(
  component: React.ComponentType<P>,
): React.ComponentType<P> {
  return monitoringEnabled ? Sentry.wrap(component) : component;
}

export { Sentry };
