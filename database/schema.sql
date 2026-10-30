-- Execute in Supabase SQL Editor as project owner, once. No secrets in this file.
begin;
create table if not exists public.app_owner (
 singleton boolean primary key default true check (singleton),
 user_id uuid not null unique references auth.users(id)
);
alter table public.app_owner enable row level security;
revoke all on public.app_owner from anon, authenticated;
grant select on public.app_owner to authenticated;
create policy owner_read on public.app_owner for select to authenticated using (user_id=auth.uid());

create table if not exists public.private_state (
 user_id uuid primary key references auth.users(id),
 payload jsonb not null check (jsonb_typeof(payload)='object' and payload->>'version'='1'),
 revision integer not null default 1 check (revision>0),
 updated_at timestamptz not null default now()
);
alter table public.private_state enable row level security;
revoke all on public.private_state from anon, authenticated;
grant select,insert,update on public.private_state to authenticated;
create policy private_read on public.private_state for select to authenticated using (
 user_id=auth.uid() and exists(select 1 from public.app_owner where user_id=auth.uid())
);
create policy private_insert on public.private_state for insert to authenticated with check (
 user_id=auth.uid() and exists(select 1 from public.app_owner where user_id=auth.uid())
);
create policy private_update on public.private_state for update to authenticated using (
 user_id=auth.uid() and exists(select 1 from public.app_owner where user_id=auth.uid())
) with check (user_id=auth.uid() and exists(select 1 from public.app_owner where user_id=auth.uid()));

create or replace function public.save_private_state(new_payload jsonb,expected_revision integer)
returns integer language plpgsql security invoker set search_path=public as $$
declare next_revision integer;
begin
 if auth.uid() is null or not exists(select 1 from public.app_owner where user_id=auth.uid()) then
  raise insufficient_privilege using message='Cuenta no autorizada';
 end if;
 if expected_revision=0 then
  insert into public.private_state(user_id,payload) values(auth.uid(),new_payload)
   on conflict(user_id) do nothing returning revision into next_revision;
 else
  update public.private_state set payload=new_payload,revision=revision+1,updated_at=now()
   where user_id=auth.uid() and revision=expected_revision returning revision into next_revision;
 end if;
 if next_revision is null then raise sqlstate 'PT409' using message='Conflicto de versión'; end if;
 return next_revision;
end $$;
revoke all on function public.save_private_state(jsonb,integer) from public,anon;
grant execute on function public.save_private_state(jsonb,integer) to authenticated;
commit;
-- After creating your user in Authentication > Users, run separately:
-- insert into public.app_owner(singleton,user_id) values(true,'YOUR-USER-UUID');
