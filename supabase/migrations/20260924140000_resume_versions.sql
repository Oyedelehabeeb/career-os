-- Private resume versions, opportunity association, and storage ownership policies.

create table public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  original_file_name text not null check (length(btrim(original_file_name)) between 1 and 255),
  storage_path text not null,
  mime_type text not null check (mime_type in (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )),
  file_size bigint not null check (file_size between 1 and 10485760),
  extracted_text text,
  notes text check (notes is null or length(notes) <= 2000),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (storage_path),
  check ((storage.foldername(storage_path))[1] = user_id::text)
);

create index resume_versions_user_active_idx
on public.resume_versions(user_id, is_archived, created_at desc);

create trigger resume_versions_updated_at before update on public.resume_versions
for each row execute function public.set_updated_at();

alter table public.opportunities add column resume_version_id uuid;
alter table public.opportunities add constraint opportunities_resume_version_owner_fk
foreign key (resume_version_id, user_id)
references public.resume_versions(id, user_id);

revoke all on public.resume_versions from anon, authenticated;
grant select, insert, update, delete on public.resume_versions to authenticated;

alter table public.resume_versions enable row level security;
create policy resume_versions_select_own on public.resume_versions for select to authenticated
using ((select auth.uid()) = user_id);
create policy resume_versions_insert_own on public.resume_versions for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy resume_versions_update_own on public.resume_versions for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy resume_versions_delete_own on public.resume_versions for delete to authenticated
using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy resume_files_select_own on storage.objects for select to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy resume_files_insert_own on storage.objects for insert to authenticated
with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy resume_files_delete_own on storage.objects for delete to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
