-- Self-service account deletion. Resume objects must be removed through the
-- Storage API before this function is called; relational data then cascades.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user uuid := (select auth.uid());
begin
  if target_user is null then
    raise exception 'Authentication required';
  end if;

  if exists (
    select 1
    from storage.objects
    where bucket_id = 'resumes'
      and name like target_user::text || '/%'
  ) then
    raise exception 'Private resume files must be deleted first';
  end if;

  delete from auth.users where id = target_user;
  if not found then
    raise exception 'Account not found';
  end if;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
