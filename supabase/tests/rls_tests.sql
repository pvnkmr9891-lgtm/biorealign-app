-- ============================================================================
-- RLS regression tests — BioRealign
--
-- Verifies the security properties established in the 2026-07-03 audit:
--   anon is locked out, clients see only themselves (+staff), coaches are
--   scoped to assigned/enrolled clients, role escalation is blocked, and
--   the SECURITY DEFINER RPCs enforce ownership.
--
-- Safe to run against ANY environment (including prod): read-only asserts,
-- write attempts are expected to fail, and the whole run is rolled back.
--
-- Run:  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_tests.sql
-- Exits non-zero if any test fails. Requires at least: 2 clients (one with an
-- assigned coach), 2 coaches, 1 admin in profiles.
-- ============================================================================

begin;

create temp table _results (ord serial, name text, pass boolean, detail text);
create temp table _fx as
select
  (select id   from public.profiles where role = 'client' and assigned_coach_id is not null limit 1) as client_id,
  (select assigned_coach_id from public.profiles where role = 'client' and assigned_coach_id is not null limit 1) as coach_id,
  (select id   from public.profiles p where role = 'client'
     and p.id <> (select id from public.profiles where role = 'client' and assigned_coach_id is not null limit 1)
     and coalesce(p.assigned_coach_id, '00000000-0000-0000-0000-000000000000')
         <> (select assigned_coach_id from public.profiles where role = 'client' and assigned_coach_id is not null limit 1)
   limit 1) as other_client_id,
  (select id from public.profiles where role = 'admin' limit 1) as admin_id;

grant select, insert on _results to anon, authenticated;
grant select on _fx to anon, authenticated;
grant usage on sequence _results_ord_seq to anon, authenticated;

do $$
begin
  if (select client_id from _fx) is null or (select other_client_id from _fx) is null
     or (select coach_id from _fx) is null then
    raise exception 'fixtures missing: need 2 clients (one assigned to a coach) and their coach';
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════════════
-- ANON — must be fully locked out of profiles, and see zero rows elsewhere
-- ════════════════════════════════════════════════════════════════════════
set local role anon;

do $$
begin
  perform count(*) from public.profiles;
  insert into _results(name, pass, detail) values ('anon: profiles SELECT denied', false, 'select succeeded');
exception when insufficient_privilege then
  insert into _results(name, pass, detail) values ('anon: profiles SELECT denied', true, sqlerrm);
end $$;

-- Policies on these tables subquery profiles, on which anon has zero grants —
-- so anon gets "permission denied" rather than an empty result. Either
-- outcome (denied or 0 rows) means anon is blocked; both count as pass.
do $$
declare n int;
begin
  select count(*) into n from public.medical_documents;
  insert into _results(name, pass, detail) values ('anon: medical_documents blocked', n = 0, 'saw ' || n);
exception when insufficient_privilege then
  insert into _results(name, pass, detail) values ('anon: medical_documents blocked', true, 'denied');
end $$;

do $$
declare n int;
begin
  select count(*) into n from public.daily_checkins;
  insert into _results(name, pass, detail) values ('anon: daily_checkins blocked', n = 0, 'saw ' || n);
exception when insufficient_privilege then
  insert into _results(name, pass, detail) values ('anon: daily_checkins blocked', true, 'denied');
end $$;

do $$
declare n int;
begin
  select count(*) into n from public.messages;
  insert into _results(name, pass, detail) values ('anon: messages blocked', n = 0, 'saw ' || n);
exception when insufficient_privilege then
  insert into _results(name, pass, detail) values ('anon: messages blocked', true, 'denied');
end $$;

do $$
begin
  perform public.get_client_checkin_summary((select client_id from _fx), 7);
  insert into _results(name, pass, detail) values ('anon: checkin RPC denied', false, 'rpc succeeded');
exception when insufficient_privilege then
  insert into _results(name, pass, detail) values ('anon: checkin RPC denied', true, sqlerrm);
end $$;

reset role;

-- ════════════════════════════════════════════════════════════════════════
-- CLIENT — own data + staff directory only; no escalation
-- ════════════════════════════════════════════════════════════════════════
select set_config('request.jwt.claims',
  json_build_object('sub', (select client_id from _fx), 'role', 'authenticated')::text, true);
set local role authenticated;

insert into _results(name, pass, detail)
select 'client: sees own profile', count(*) = 1, 'saw ' || count(*)
from public.profiles where id = (select client_id from _fx);

insert into _results(name, pass, detail)
select 'client: cannot see other client profile', count(*) = 0, 'saw ' || count(*)
from public.profiles where id = (select other_client_id from _fx);

insert into _results(name, pass, detail)
select 'client: can browse coach directory', count(*) >= 1, 'saw ' || count(*)
from public.profiles where role = 'coach';

insert into _results(name, pass, detail)
select 'client: cannot read other client checkins', count(*) = 0, 'saw ' || count(*)
from public.daily_checkins where client_id = (select other_client_id from _fx);

insert into _results(name, pass, detail)
select 'client: cannot read other client medical docs', count(*) = 0, 'saw ' || count(*)
from public.medical_documents where client_id = (select other_client_id from _fx);

do $$
begin
  update public.profiles set role = 'admin' where id = (select client_id from _fx);
  insert into _results(name, pass, detail) values ('client: role self-escalation blocked', false, 'update succeeded');
exception when others then
  insert into _results(name, pass, detail) values ('client: role self-escalation blocked', true, sqlerrm);
end $$;

do $$
begin
  update public.profiles set assigned_coach_id = (select other_client_id from _fx)
  where id = (select client_id from _fx);
  insert into _results(name, pass, detail) values ('client: arbitrary coach self-assignment blocked', false, 'update succeeded');
exception when others then
  insert into _results(name, pass, detail) values ('client: arbitrary coach self-assignment blocked', true, sqlerrm);
end $$;

do $$
declare n int;
begin
  update public.profiles set last_seen_at = now() where id = (select client_id from _fx);
  get diagnostics n = row_count;
  insert into _results(name, pass, detail)
  values ('client: own heartbeat update works', n = 1, n || ' rows updated');
exception when others then
  insert into _results(name, pass, detail) values ('client: own heartbeat update works', false, sqlerrm);
end $$;

do $$
begin
  perform public.get_client_checkin_summary((select other_client_id from _fx), 7);
  insert into _results(name, pass, detail) values ('client: checkin RPC ownership guard', false, 'rpc succeeded for another client');
exception when others then
  insert into _results(name, pass, detail) values ('client: checkin RPC ownership guard', true, sqlerrm);
end $$;

do $$
begin
  update public.messages set body = 'tampered' where receiver_id = (select client_id from _fx);
  insert into _results(name, pass, detail) values ('client: message body tampering blocked', false, 'update allowed');
exception when insufficient_privilege then
  insert into _results(name, pass, detail) values ('client: message body tampering blocked', true, sqlerrm);
end $$;

reset role;

-- ════════════════════════════════════════════════════════════════════════
-- COACH — scoped to assigned clients only
-- ════════════════════════════════════════════════════════════════════════
select set_config('request.jwt.claims',
  json_build_object('sub', (select coach_id from _fx), 'role', 'authenticated')::text, true);
set local role authenticated;

insert into _results(name, pass, detail)
select 'coach: sees assigned client', count(*) = 1, 'saw ' || count(*)
from public.profiles where id = (select client_id from _fx);

insert into _results(name, pass, detail)
select 'coach: cannot see unassigned client', count(*) = 0, 'saw ' || count(*)
from public.profiles where id = (select other_client_id from _fx);

insert into _results(name, pass, detail)
select 'coach: cannot read unassigned client checkins', count(*) = 0, 'saw ' || count(*)
from public.daily_checkins where client_id = (select other_client_id from _fx);

insert into _results(name, pass, detail)
select 'coach: cannot read unassigned client medical docs', count(*) = 0, 'saw ' || count(*)
from public.medical_documents where client_id = (select other_client_id from _fx);

do $$
declare n int;
begin
  update public.profiles set assigned_coach_id = (select coach_id from _fx)
  where id = (select other_client_id from _fx);
  get diagnostics n = row_count;
  insert into _results(name, pass, detail)
  values ('coach: cannot steal unassigned client', n = 0, n || ' rows updated');
exception when others then
  -- an exception (e.g. trigger) also counts as blocked
  insert into _results(name, pass, detail) values ('coach: cannot steal unassigned client', true, sqlerrm);
end $$;

reset role;

-- ════════════════════════════════════════════════════════════════════════
-- Report + verdict (everything above happens inside one rolled-back txn)
-- ════════════════════════════════════════════════════════════════════════
select case when pass then 'PASS' else 'FAIL' end as result, name, detail
from _results order by ord;

do $$
declare fails int;
begin
  select count(*) into fails from _results where not pass;
  if fails > 0 then
    raise exception 'RLS TESTS FAILED: % failing test(s) — see report above', fails;
  end if;
  raise notice 'RLS tests: all % passed', (select count(*) from _results);
end $$;

rollback;
