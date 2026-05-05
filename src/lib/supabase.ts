import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Database } from '@/types/database';

// ---------------------------------------------------------------------------
// Chunked SecureStore adapter — splits values > 1800 bytes across multiple
// keys to avoid the 2048-byte SecureStore limit that Supabase sessions hit.
// ---------------------------------------------------------------------------
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const value = await SecureStore.getItemAsync(key);
    if (!value) return null;

    if (value.startsWith('__chunked__')) {
      const count = parseInt(value.replace('__chunked__', ''), 10);
      let assembled = '';
      for (let i = 0; i < count; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
        assembled += chunk ?? '';
      }
      return assembled;
    }

    return value;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (value.length <= 1800) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    // Value too large — split into 1800-byte chunks
    const chunkSize = 1800;
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += chunkSize) {
      chunks.push(value.slice(i, i + chunkSize));
    }

    // Store a manifest key so getItem knows how many chunks to reassemble
    await SecureStore.setItemAsync(key, `__chunked__${chunks.length}`);
    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunks[i]);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    const value = await SecureStore.getItemAsync(key);
    if (value?.startsWith('__chunked__')) {
      const count = parseInt(value.replace('__chunked__', ''), 10);
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
      }
    }
    await SecureStore.deleteItemAsync(key);
  },
};

// ---------------------------------------------------------------------------
// Env var validation
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example → .env and fill in your project credentials.'
  );
}

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ---------------------------------------------------------------------------
// Convenience re-exports for common query patterns
// ---------------------------------------------------------------------------
export type { Database };
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
