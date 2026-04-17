begin;

-- Backfill driver-linked profiles for auth users whose email matches a driver record.
-- This fixes cases where a profile exists without driver_id/name after onboarding.

insert into public.profiles (id, role, name, driver_id)
select
  u.id,
  'driver',
  trim(regexp_replace(d.full_name, '[[:space:]]+', ' ', 'g')),
  d.id
from auth.users u
join public.drivers d on lower(trim(u.email)) = lower(trim(d.email))
where not exists (
  select 1 from public.profiles p where p.id = u.id
)
  and d.full_name is not null
  and trim(d.full_name) <> '';

update public.profiles p
set
  driver_id = d.id,
  name = coalesce(
    nullif(trim(p.name), ''),
    trim(regexp_replace(d.full_name, '[[:space:]]+', ' ', 'g'))
  )
from auth.users u
join public.drivers d on lower(trim(u.email)) = lower(trim(d.email))
where p.id = u.id
  and d.full_name is not null
  and trim(d.full_name) <> ''
  and (
    p.driver_id is null
    or p.driver_id <> d.id
    or p.name is null
    or trim(p.name) = ''
  );

create index if not exists idx_profiles_driver_id on public.profiles(driver_id);

commit;
