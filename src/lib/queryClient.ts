import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

// Wire React Query's focus manager to the app foreground state so
// refetchOnWindowFocus works on mobile: backgrounding + reopening the app
// refetches stale queries. This replaces the old per-hook refetchInterval
// polling (which kept every mounted screen hitting Supabase every 10-30s,
// even backgrounded). Messaging hooks keep a short interval — chat is the
// one surface that needs updates while the user is staring at it.
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state) => {
    handleFocus(state === 'active');
  });
  return () => subscription.remove();
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,           // 1 min — fresh enough without polling
      gcTime: 1000 * 60 * 30,         // 30 min — keep in cache
      retry: 2,
      refetchOnWindowFocus: true,      // via AppState wiring above
      refetchOnReconnect: true,        // re-fetch when coming back online
    },
    mutations: {
      retry: 1,
    },
  },
});
