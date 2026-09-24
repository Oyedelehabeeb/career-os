-- Private career profile and reusable, normalized skill records.

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  current_title text check (current_title is null or length(btrim(current_title)) between 1 and 200),
  target_role text check (target_role is null or length(btrim(target_role)) between 1 and 200),
  years_experience numeric(4,1) check (years_experience is null or years_experience between 0 and 70),
  professional_summary text check (professional_summary is null or length(professional_summary) <= 3000),
  industries text[] not null default '{}',
  location text check (location is null or length(btrim(location)) between 1 and 200),
  preferred_work_modes text[] not null default '{}'
    check (preferred_work_modes <@ array['remote', 'hybrid', 'on_site']::text[]),
  preferred_role_types text[] not null default '{}',
  compensation_min numeric(14,2) check (compensation_min is null or compensation_min >= 0),
  compensation_max numeric(14,2) check (compensation_max is null or compensation_max >= 0),
  compensation_currency text check (compensation_currency is null or compensation_currency ~ '^[A-Z]{3}$'),
  portfolio_url text,
  github_url text,
  linkedin_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (compensation_min is null or compensation_max is null or compensation_min <= compensation_max)
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  name_key text generated always as (lower(btrim(name))) stored,
  category text not null default 'technical'
    check (category in ('technical', 'tool', 'domain', 'soft', 'other')),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name_key)
);

create table public.profile_skills (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  skill_id uuid not null,
  proficiency text check (proficiency is null or proficiency in ('learning', 'working', 'strong', 'expert')),
  years_experience numeric(4,1) check (years_experience is null or years_experience between 0 and 70),
  created_at timestamptz not null default now(),
  primary key (user_id, skill_id),
  foreign key (skill_id, user_id) references public.skills(id, user_id) on delete cascade
);

create index profile_skills_user_idx on public.profile_skills(user_id);

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

revoke all on public.profiles, public.skills, public.profile_skills from anon;
revoke all on public.profiles, public.skills, public.profile_skills from authenticated;
grant select, insert, update, delete on public.profiles, public.skills, public.profile_skills to authenticated;

alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.profile_skills enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);
create policy profiles_insert_own on public.profiles for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy profiles_delete_own on public.profiles for delete to authenticated
using ((select auth.uid()) = user_id);

create policy skills_select_own on public.skills for select to authenticated
using ((select auth.uid()) = user_id);
create policy skills_insert_own on public.skills for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy skills_update_own on public.skills for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy skills_delete_own on public.skills for delete to authenticated
using ((select auth.uid()) = user_id);

create policy profile_skills_select_own on public.profile_skills for select to authenticated
using ((select auth.uid()) = user_id);
create policy profile_skills_insert_own on public.profile_skills for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy profile_skills_update_own on public.profile_skills for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy profile_skills_delete_own on public.profile_skills for delete to authenticated
using ((select auth.uid()) = user_id);
