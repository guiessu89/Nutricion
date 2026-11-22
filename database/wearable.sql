-- Run once in Supabase SQL Editor. Wearable data is kept separate from private_state
-- so automated sync never overwrites concurrent food diary edits.
create table if not exists public.wearable_days (
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null,
 source text not null default 'apple_health',
 steps integer check (steps between 0 and 200000),
 distance_km numeric check (distance_km between 0 and 300),
 active_kcal numeric check (active_kcal between 0 and 20000),
 resting_kcal numeric check (resting_kcal between 0 and 10000),
 heart_rate_avg numeric check (heart_rate_avg between 20 and 240),
 synced_at timestamptz not null default now(),
 primary key (user_id,day,source)
);
create table if not exists public.wearable_workouts (
 user_id uuid not null references auth.users(id) on delete cascade,
 external_id text not null,
 day date not null,
 kind text not null,
 started_at timestamptz,
 duration_min numeric not null check (duration_min between 0 and 1440),
 distance_km numeric check (distance_km between 0 and 300),
 active_kcal numeric check (active_kcal between 0 and 20000),
 heart_rate_avg numeric check (heart_rate_avg between 20 and 240),
 source text not null default 'apple_health',
 synced_at timestamptz not null default now(),
 primary key (user_id,external_id)
);
alter table public.wearable_days enable row level security;
alter table public.wearable_workouts enable row level security;
revoke all on public.wearable_days,public.wearable_workouts from anon;
grant select on public.wearable_days,public.wearable_workouts to authenticated;
drop policy if exists wearable_days_owner_read on public.wearable_days;
create policy wearable_days_owner_read on public.wearable_days for select to authenticated using (
 user_id=auth.uid() and exists(select 1 from public.app_owner where user_id=auth.uid())
);
drop policy if exists wearable_workouts_owner_read on public.wearable_workouts;
create policy wearable_workouts_owner_read on public.wearable_workouts for select to authenticated using (
 user_id=auth.uid() and exists(select 1 from public.app_owner where user_id=auth.uid())
);
-- Writes only from the server-side Edge Function (service role). Never grant browser write access.
