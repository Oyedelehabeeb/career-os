-- First product slice: private companies, opportunities, and durable status history.
-- Apply through Supabase migrations, not the remote SQL Editor, to preserve history.

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 200),
  name_key text generated always as (lower(btrim(name))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name_key)
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid,
  title text check (title is null or length(btrim(title)) between 1 and 250),
  location text,
  work_mode text check (work_mode in ('remote', 'hybrid', 'on_site')),
  source text,
  source_url text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'saved' check (status in (
    'saved', 'preparing', 'applied', 'screening', 'interview', 'final_round',
    'offer', 'rejected', 'withdrawn', 'ghosted', 'closed'
  )),
  saved_at timestamptz not null default now(),
  applied_at timestamptz,
  follow_up_at timestamptz,
  deadline_at timestamptz,
  job_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (company_id, user_id) references public.companies(id, user_id)
);

create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null,
  event_type text not null check (event_type = 'status_changed'),
  from_status text,
  to_status text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (opportunity_id, user_id) references public.opportunities(id, user_id) on delete cascade
);

create index opportunities_user_saved_idx on public.opportunities(user_id, saved_at desc);
create index opportunities_user_status_idx on public.opportunities(user_id, status);
create index application_events_opportunity_time_idx on public.application_events(opportunity_id, occurred_at desc);

create function public.set_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_updated_at before update on public.companies
for each row execute function public.set_updated_at();
create trigger opportunities_updated_at before update on public.opportunities
for each row execute function public.set_updated_at();

create function public.record_opportunity_status()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    insert into public.application_events (user_id, opportunity_id, event_type, from_status, to_status)
    values (new.user_id, new.id, 'status_changed', null, new.status);
  elsif old.status is distinct from new.status then
    insert into public.application_events (user_id, opportunity_id, event_type, from_status, to_status)
    values (new.user_id, new.id, 'status_changed', old.status, new.status);
  end if;
  return new;
end;
$$;

create trigger opportunity_status_history after insert or update of status on public.opportunities
for each row execute function public.record_opportunity_status();

revoke all on public.companies, public.opportunities, public.application_events from anon;
revoke all on public.companies, public.opportunities, public.application_events from authenticated;
grant select, insert, update, delete on public.companies, public.opportunities to authenticated;
grant select on public.application_events to authenticated;

alter table public.companies enable row level security;
alter table public.opportunities enable row level security;
alter table public.application_events enable row level security;

create policy companies_select_own on public.companies for select to authenticated
using ((select auth.uid()) = user_id);
create policy companies_insert_own on public.companies for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy companies_update_own on public.companies for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy companies_delete_own on public.companies for delete to authenticated
using ((select auth.uid()) = user_id);

create policy opportunities_select_own on public.opportunities for select to authenticated
using ((select auth.uid()) = user_id);
create policy opportunities_insert_own on public.opportunities for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy opportunities_update_own on public.opportunities for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy opportunities_delete_own on public.opportunities for delete to authenticated
using ((select auth.uid()) = user_id);

create policy application_events_select_own on public.application_events for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.record_opportunity_status() from public, anon, authenticated;
