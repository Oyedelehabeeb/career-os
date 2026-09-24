-- Persisted, user-reviewed job-description extraction results.

create table public.job_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  opportunity_id uuid not null,
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  parser_version text not null,
  extraction_method text not null default 'local_rules'
    check (extraction_method in ('local_rules', 'ai_assisted')),
  review_status text not null default 'draft'
    check (review_status in ('draft', 'reviewed')),
  seniority text check (seniority is null or seniority in (
    'entry', 'junior', 'mid', 'senior', 'lead', 'staff', 'principal', 'executive'
  )),
  experience_min numeric(4,1) check (experience_min is null or experience_min between 0 and 70),
  experience_max numeric(4,1) check (experience_max is null or experience_max between 0 and 70),
  work_mode text check (work_mode is null or work_mode in ('remote', 'hybrid', 'on_site')),
  location text,
  salary_min numeric(14,2) check (salary_min is null or salary_min >= 0),
  salary_max numeric(14,2) check (salary_max is null or salary_max >= 0),
  salary_currency text check (salary_currency is null or salary_currency ~ '^[A-Z]{3}$'),
  responsibilities text[] not null default '{}',
  required_skills text[] not null default '{}',
  preferred_skills text[] not null default '{}',
  education_requirements text[] not null default '{}',
  technologies text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, user_id),
  foreign key (opportunity_id, user_id)
    references public.opportunities(id, user_id) on delete cascade,
  check (experience_min is null or experience_max is null or experience_min <= experience_max),
  check (salary_min is null or salary_max is null or salary_min <= salary_max)
);

create index job_analyses_user_review_idx
on public.job_analyses(user_id, review_status, updated_at desc);

create trigger job_analyses_updated_at before update on public.job_analyses
for each row execute function public.set_updated_at();

revoke all on public.job_analyses from anon, authenticated;
grant select, insert, update, delete on public.job_analyses to authenticated;

alter table public.job_analyses enable row level security;
create policy job_analyses_select_own on public.job_analyses for select to authenticated
using ((select auth.uid()) = user_id);
create policy job_analyses_insert_own on public.job_analyses for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy job_analyses_update_own on public.job_analyses for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy job_analyses_delete_own on public.job_analyses for delete to authenticated
using ((select auth.uid()) = user_id);
