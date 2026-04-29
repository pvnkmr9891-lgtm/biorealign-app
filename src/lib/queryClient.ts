import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,       // 5 min — data stays fresh
      gcTime: 1000 * 60 * 30,         // 30 min — keep in cache
      retry: 2,
      refetchOnWindowFocus: false,     // not relevant for mobile
      refetchOnReconnect: true,        // re-fetch when coming back online
    },
    mutations: {
      retry: 1,
    },
  },
});
