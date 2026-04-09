begin;

create or replace function public.driver_compliance_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(p.role, ''))
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

comment on function public.driver_compliance_current_role() is
  'Returns the current authenticated profile role for driver compliance RLS checks.';

create or replace function public.driver_compliance_current_driver_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.driver_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

comment on function public.driver_compliance_current_driver_id() is
  'Returns the current authenticated profile''s linked driver_id for driver compliance RLS checks.';

create or replace function public.driver_compliance_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.driver_compliance_current_role() in ('admin', 'dispatch', 'manager', 'ops'), false);
$$;

comment on function public.driver_compliance_is_staff() is
  'True when the current authenticated profile is allowed to review or manage driver compliance records.';

revoke all on function public.driver_compliance_current_role() from public;
revoke all on function public.driver_compliance_current_driver_id() from public;
revoke all on function public.driver_compliance_is_staff() from public;

grant execute on function public.driver_compliance_current_role() to authenticated, service_role;
grant execute on function public.driver_compliance_current_driver_id() to authenticated, service_role;
grant execute on function public.driver_compliance_is_staff() to authenticated, service_role;

grant select, insert, update on public.driver_compliance_profiles to authenticated;
grant select, insert, update, delete on public.driver_compliance_submissions to authenticated;
grant select, insert on public.driver_compliance_reviews to authenticated;
grant select, insert on public.driver_compliance_audit_log to authenticated;

alter table public.driver_compliance_profiles enable row level security;
alter table public.driver_compliance_submissions enable row level security;
alter table public.driver_compliance_reviews enable row level security;
alter table public.driver_compliance_audit_log enable row level security;

drop policy if exists driver_compliance_profiles_select_own_or_staff
  on public.driver_compliance_profiles;
create policy driver_compliance_profiles_select_own_or_staff
on public.driver_compliance_profiles
for select
to authenticated
using (
  driver_id = public.driver_compliance_current_driver_id()
  or public.driver_compliance_is_staff()
);

drop policy if exists driver_compliance_profiles_insert_staff
  on public.driver_compliance_profiles;
create policy driver_compliance_profiles_insert_staff
on public.driver_compliance_profiles
for insert
to authenticated
with check (public.driver_compliance_is_staff());

drop policy if exists driver_compliance_profiles_update_staff
  on public.driver_compliance_profiles;
create policy driver_compliance_profiles_update_staff
on public.driver_compliance_profiles
for update
to authenticated
using (public.driver_compliance_is_staff())
with check (public.driver_compliance_is_staff());

drop policy if exists driver_compliance_submissions_select_own_or_staff
  on public.driver_compliance_submissions;
create policy driver_compliance_submissions_select_own_or_staff
on public.driver_compliance_submissions
for select
to authenticated
using (
  driver_id = public.driver_compliance_current_driver_id()
  or public.driver_compliance_is_staff()
);

drop policy if exists driver_compliance_submissions_insert_own_or_staff
  on public.driver_compliance_submissions;
create policy driver_compliance_submissions_insert_own_or_staff
on public.driver_compliance_submissions
for insert
to authenticated
with check (
  driver_id = public.driver_compliance_current_driver_id()
  or public.driver_compliance_is_staff()
);

drop policy if exists driver_compliance_submissions_update_own_or_staff
  on public.driver_compliance_submissions;
create policy driver_compliance_submissions_update_own_or_staff
on public.driver_compliance_submissions
for update
to authenticated
using (
  driver_id = public.driver_compliance_current_driver_id()
  or public.driver_compliance_is_staff()
)
with check (
  driver_id = public.driver_compliance_current_driver_id()
  or public.driver_compliance_is_staff()
);

drop policy if exists driver_compliance_submissions_delete_draft_own_or_staff
  on public.driver_compliance_submissions;
create policy driver_compliance_submissions_delete_draft_own_or_staff
on public.driver_compliance_submissions
for delete
to authenticated
using (
  (
    driver_id = public.driver_compliance_current_driver_id()
    and submitted_at is null
  )
  or public.driver_compliance_is_staff()
);

drop policy if exists driver_compliance_reviews_select_own_or_staff
  on public.driver_compliance_reviews;
create policy driver_compliance_reviews_select_own_or_staff
on public.driver_compliance_reviews
for select
to authenticated
using (
  driver_id = public.driver_compliance_current_driver_id()
  or public.driver_compliance_is_staff()
);

drop policy if exists driver_compliance_reviews_insert_staff
  on public.driver_compliance_reviews;
create policy driver_compliance_reviews_insert_staff
on public.driver_compliance_reviews
for insert
to authenticated
with check (
  public.driver_compliance_is_staff()
  and (reviewer_profile_id is null or reviewer_profile_id = auth.uid())
);

drop policy if exists driver_compliance_audit_log_select_own_or_staff
  on public.driver_compliance_audit_log;
create policy driver_compliance_audit_log_select_own_or_staff
on public.driver_compliance_audit_log
for select
to authenticated
using (
  driver_id = public.driver_compliance_current_driver_id()
  or public.driver_compliance_is_staff()
);

drop policy if exists driver_compliance_audit_log_insert_staff
  on public.driver_compliance_audit_log;
create policy driver_compliance_audit_log_insert_staff
on public.driver_compliance_audit_log
for insert
to authenticated
with check (
  public.driver_compliance_is_staff()
  and (actor_profile_id is null or actor_profile_id = auth.uid())
);

commit;