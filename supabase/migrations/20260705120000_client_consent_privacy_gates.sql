-- ── Phase A: coaches could never see progress scores — the only coach path
-- went through enrollments (a workflow with zero rows). Add the
-- assigned_coach_id path; keep the enrollment path for the future.
drop policy if exists "metrics: coach read clients" on public.progress_metrics;
create policy "metrics: coach read clients" on public.progress_metrics
for select using (
  get_my_role() = 'coach' and (
    client_id in (select id from public.profiles where assigned_coach_id = auth.uid())
    or client_id in (select client_id from public.enrollments where coach_id = auth.uid())
  )
);

-- ── Phase B2: medical documents are private until the client shares them.
alter table public.medical_documents
  add column if not exists shared_with_coach boolean not null default false;

drop policy if exists coach_read_assigned_client_medical_documents on public.medical_documents;
create policy coach_read_assigned_client_medical_documents on public.medical_documents
for select using (
  shared_with_coach
  and client_id in (select id from public.profiles where assigned_coach_id = auth.uid())
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);

-- Analyses: visible to the coach only after the client's explicit
-- "Send to Coach" action (sent_to_coach_at is that consent record).
drop policy if exists coach_read_assigned_client_medical_analyses on public.medical_analyses;
create policy coach_read_assigned_client_medical_analyses on public.medical_analyses
for select using (
  sent_to_coach_at is not null
  and client_id in (select id from public.profiles where assigned_coach_id = auth.uid())
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);

-- Storage must honor the same consent: replace folder-wide coach read with a
-- per-object check against the shared flag.
drop policy if exists coach_read_assigned_client_medical_documents on storage.objects;
create policy coach_read_assigned_client_medical_documents on storage.objects
for select using (
  bucket_id = 'medical-documents' and exists (
    select 1 from public.medical_documents d
    join public.profiles p on p.id = d.client_id
    where d.storage_path = objects.name
      and d.shared_with_coach
      and p.assigned_coach_id = auth.uid()
  )
);

-- ── Phase B3: progress photos — client-controlled visibility, default shared.
alter table public.progress_photos
  add column if not exists visible_to_coach boolean not null default true;

drop policy if exists coach_see_client_photos on public.progress_photos;
create policy coach_see_client_photos on public.progress_photos
for select using (
  visible_to_coach
  and client_id in (select id from public.profiles where assigned_coach_id = auth.uid())
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);

drop policy if exists coach_read_client_photos on storage.objects;
create policy coach_read_client_photos on storage.objects
for select using (
  bucket_id = 'progress-photos' and exists (
    select 1 from public.progress_photos ph
    join public.profiles p on p.id = ph.client_id
    where ph.storage_path = objects.name
      and ph.visible_to_coach
      and (p.assigned_coach_id = auth.uid() or coach_can_view_profile(p.id))
  )
);
