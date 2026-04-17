begin;

alter table if exists public.profiles
  add column if not exists last_login_at timestamptz;

create table if not exists public.availability_activity_log (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_profile_id uuid references public.profiles(id),
  actor_role text,
  actor_name text,
  target_driver_id uuid references public.drivers(id),
  target_driver_name text,
  action text not null,
  details text,
  source text,
  event_metadata jsonb,
  primary key (id)
);

comment on table public.availability_activity_log is 'Audit log for availability activity events, including driver and dispatcher actions.';

create index if not exists idx_availability_activity_log_actor_profile_id
  on public.availability_activity_log(actor_profile_id);

create index if not exists idx_availability_activity_log_target_driver_id
  on public.availability_activity_log(target_driver_id);

create index if not exists idx_availability_activity_log_created_at
  on public.availability_activity_log(created_at desc);

grant select, insert on public.availability_activity_log to authenticated;

commit;
