-- Persisted, explainable candidate-to-role comparisons.

create table public.opportunity_fit_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  opportunity_id uuid not null,
  input_hash text not null check (input_hash ~ '^[a-f0-9]{64}$'),
  evaluator_version text not null,
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, user_id),
  foreign key (opportunity_id, user_id)
    references public.opportunities(id, user_id) on delete cascade
);

create index opportunity_fit_analyses_user_updated_idx
on public.opportunity_fit_analyses(user_id, updated_at desc);

create trigger opportunity_fit_analyses_updated_at
before update on public.opportunity_fit_analyses
for each row execute function public.set_updated_at();

revoke all on public.opportunity_fit_analyses from anon, authenticated;
grant select, insert, update, delete on public.opportunity_fit_analyses to authenticated;

alter table public.opportunity_fit_analyses enable row level security;
create policy opportunity_fit_analyses_select_own
on public.opportunity_fit_analyses for select to authenticated
using ((select auth.uid()) = user_id);
create policy opportunity_fit_analyses_insert_own
on public.opportunity_fit_analyses for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy opportunity_fit_analyses_update_own
on public.opportunity_fit_analyses for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy opportunity_fit_analyses_delete_own
on public.opportunity_fit_analyses for delete to authenticated
using ((select auth.uid()) = user_id);
