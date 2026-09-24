-- Opportunity-specific follow-ups. Completion is retained for a durable record.
create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  opportunity_id uuid not null,
  title text not null check (length(btrim(title)) between 1 and 160),
  due_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (opportunity_id, user_id) references public.opportunities(id, user_id) on delete cascade
);

create index follow_ups_user_due_idx on public.follow_ups(user_id, due_at)
where completed_at is null;
create index follow_ups_opportunity_idx on public.follow_ups(opportunity_id, created_at desc);

create trigger follow_ups_updated_at before update on public.follow_ups
for each row execute function public.set_updated_at();

revoke all on public.follow_ups from anon, authenticated;
grant select, insert, update on public.follow_ups to authenticated;

alter table public.follow_ups enable row level security;
create policy follow_ups_select_own on public.follow_ups for select to authenticated
using ((select auth.uid()) = user_id);
create policy follow_ups_insert_own on public.follow_ups for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy follow_ups_update_own on public.follow_ups for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
