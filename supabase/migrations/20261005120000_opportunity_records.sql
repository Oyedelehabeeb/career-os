-- Opportunity contacts, interviews, and private notes.

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  opportunity_id uuid not null,
  name text not null check (length(btrim(name)) between 1 and 160),
  role text check (role is null or length(btrim(role)) between 1 and 160),
  email text check (email is null or length(btrim(email)) <= 320),
  profile_url text check (profile_url is null or length(profile_url) <= 1000),
  notes text check (notes is null or length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id, opportunity_id),
  foreign key (opportunity_id, user_id)
    references public.opportunities(id, user_id) on delete cascade
);

create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  opportunity_id uuid not null,
  contact_id uuid,
  interview_type text not null check (interview_type in (
    'recruiter_screen', 'hiring_manager', 'technical', 'portfolio',
    'case_study', 'panel', 'final', 'other'
  )),
  stage text check (stage is null or length(btrim(stage)) between 1 and 120),
  scheduled_at timestamptz not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 15 and 480),
  location_or_url text check (location_or_url is null or length(location_or_url) <= 1000),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  outcome text check (outcome is null or outcome in (
    'advanced', 'no_decision', 'rejected', 'offer', 'withdrawn'
  )),
  preparation_notes text check (preparation_notes is null or length(preparation_notes) <= 10000),
  post_interview_notes text check (post_interview_notes is null or length(post_interview_notes) <= 10000),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (opportunity_id, user_id)
    references public.opportunities(id, user_id) on delete cascade,
  foreign key (contact_id, user_id, opportunity_id)
    references public.contacts(id, user_id, opportunity_id)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  opportunity_id uuid not null,
  body text not null check (length(btrim(body)) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (opportunity_id, user_id)
    references public.opportunities(id, user_id) on delete cascade
);

create index contacts_opportunity_created_idx
on public.contacts(opportunity_id, created_at desc);
create index interviews_opportunity_scheduled_idx
on public.interviews(opportunity_id, scheduled_at);
create index interviews_user_upcoming_idx
on public.interviews(user_id, scheduled_at)
where status = 'scheduled';
create index notes_opportunity_created_idx
on public.notes(opportunity_id, created_at desc);

create trigger contacts_updated_at before update on public.contacts
for each row execute function public.set_updated_at();
create trigger interviews_updated_at before update on public.interviews
for each row execute function public.set_updated_at();
create trigger notes_updated_at before update on public.notes
for each row execute function public.set_updated_at();

revoke all on public.contacts, public.interviews, public.notes from anon, authenticated;
grant select, insert, update on public.contacts, public.interviews, public.notes to authenticated;

alter table public.contacts enable row level security;
alter table public.interviews enable row level security;
alter table public.notes enable row level security;

create policy contacts_select_own on public.contacts for select to authenticated
using ((select auth.uid()) = user_id);
create policy contacts_insert_own on public.contacts for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy contacts_update_own on public.contacts for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy interviews_select_own on public.interviews for select to authenticated
using ((select auth.uid()) = user_id);
create policy interviews_insert_own on public.interviews for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy interviews_update_own on public.interviews for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy notes_select_own on public.notes for select to authenticated
using ((select auth.uid()) = user_id);
create policy notes_insert_own on public.notes for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy notes_update_own on public.notes for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
