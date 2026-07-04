# Migrations — state of play

**The live database's migration history is the source of truth**, not this
folder. As of 2026-07-03 the remote project (`loxcgewqbioicwxzbgub`) has ~57
recorded migrations; this folder holds only a subset:

- `001_…`–`003_…` and the `202606…` files: early snapshots, pre-dating
  consistent versioning.
- `20260703…` files: the RLS security audit fixes + coach digest table,
  checked in with their exact remote version stamps so a future
  `supabase db pull` / `db push` won't conflict with them.

## To fully sync this folder with the remote

```
supabase login
supabase link --project-ref loxcgewqbioicwxzbgub
supabase db pull        # writes the full declarative schema + history
```

Until that's done, do **not** assume `supabase db reset` from this folder
reproduces production — it won't. New schema changes should be added both to
the remote (via migration tooling) and as a matching file here.
