-- =============================================================================
-- Phase 4 SQL — Run in Supabase SQL Editor
-- =============================================================================

-- Add push_token column to profiles
alter table public.profiles
add column if not exists push_token text;

-- Add RLS policy so users can update their own push token
create policy "profiles: update own push token"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Index for faster push token lookups
create index if not exists profiles_push_token_idx
  on public.profiles (push_token)
  where push_token is not null;
