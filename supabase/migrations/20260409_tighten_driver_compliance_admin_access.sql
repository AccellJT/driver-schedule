begin;

create or replace function public.driver_compliance_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.driver_compliance_current_role() = 'admin', false);
$$;

create or replace function public.driver_compliance_is_driver()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.driver_compliance_current_role() = 'driver', false);
$$;

comment on function public.driver_compliance_is_staff() is
  'True when the current authenticated profile is an admin allowed to review or manage all driver compliance records.';
comment on function public.driver_compliance_is_driver() is
  'True when the current authenticated profile is the linked driver allowed to edit their own compliance wizard draft.';

revoke all on function public.driver_compliance_is_driver() from public;
grant execute on function public.driver_compliance_is_driver() to authenticated, service_role;

drop policy if exists driver_compliance_profiles_insert_staff
  on public.driver_compliance_profiles;
drop policy if exists driver_compliance_profiles_insert_own_or_admin
  on public.driver_compliance_profiles;
drop policy if exists driver_compliance_profiles_insert_own_driver_only
  on public.driver_compliance_profiles;
drop policy if exists driver_compliance_profiles_insert_driver_or_admin
  on public.driver_compliance_profiles;
create policy driver_compliance_profiles_insert_driver_or_admin
on public.driver_compliance_profiles
for insert
to authenticated
with check (
  (
    public.driver_compliance_is_driver()
    and driver_id = public.driver_compliance_current_driver_id()
  )
  or public.driver_compliance_is_staff()
);

drop policy if exists driver_compliance_profiles_update_staff
  on public.driver_compliance_profiles;
drop policy if exists driver_compliance_profiles_update_own_or_admin
  on public.driver_compliance_profiles;
drop policy if exists driver_compliance_profiles_update_own_driver_only
  on public.driver_compliance_profiles;
drop policy if exists driver_compliance_profiles_update_driver_or_admin
  on public.driver_compliance_profiles;
create policy driver_compliance_profiles_update_driver_or_admin
on public.driver_compliance_profiles
for update
to authenticated
using (
  (
    public.driver_compliance_is_driver()
    and driver_id = public.driver_compliance_current_driver_id()
  )
  or public.driver_compliance_is_staff()
)
with check (
  (
    public.driver_compliance_is_driver()
    and driver_id = public.driver_compliance_current_driver_id()
  )
  or public.driver_compliance_is_staff()
);

drop policy if exists driver_compliance_submissions_insert_own_or_staff
  on public.driver_compliance_submissions;
drop policy if exists driver_compliance_submissions_insert_own_driver_only
  on public.driver_compliance_submissions;
create policy driver_compliance_submissions_insert_own_driver_only
on public.driver_compliance_submissions
for insert
to authenticated
with check (
  public.driver_compliance_is_driver()
  and driver_id = public.driver_compliance_current_driver_id()
);

drop policy if exists driver_compliance_submissions_update_own_or_staff
  on public.driver_compliance_submissions;
drop policy if exists driver_compliance_submissions_update_own_driver_only
  on public.driver_compliance_submissions;
create policy driver_compliance_submissions_update_own_driver_only
on public.driver_compliance_submissions
for update
to authenticated
using (
  public.driver_compliance_is_driver()
  and driver_id = public.driver_compliance_current_driver_id()
)
with check (
  public.driver_compliance_is_driver()
  and driver_id = public.driver_compliance_current_driver_id()
);

drop policy if exists driver_compliance_submissions_delete_draft_own_or_staff
  on public.driver_compliance_submissions;
drop policy if exists driver_compliance_submissions_delete_draft_own_driver_only
  on public.driver_compliance_submissions;
create policy driver_compliance_submissions_delete_draft_own_driver_only
on public.driver_compliance_submissions
for delete
to authenticated
using (
  public.driver_compliance_is_driver()
  and driver_id = public.driver_compliance_current_driver_id()
  and submitted_at is null
);

drop policy if exists driver_compliance_reviews_select_own_or_staff
  on public.driver_compliance_reviews;
drop policy if exists driver_compliance_reviews_select_staff_only
  on public.driver_compliance_reviews;
create policy driver_compliance_reviews_select_staff_only
on public.driver_compliance_reviews
for select
to authenticated
using (public.driver_compliance_is_staff());

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

commit;
