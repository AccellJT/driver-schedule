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

revoke all on function public.driver_compliance_is_staff() from public;
revoke all on function public.driver_compliance_is_driver() from public;
grant execute on function public.driver_compliance_is_staff() to authenticated, service_role;
grant execute on function public.driver_compliance_is_driver() to authenticated, service_role;

create or replace function public.enforce_single_driver_compliance_draft()
returns trigger
language plpgsql
as $$
begin
  if new.submitted_at is null and exists (
    select 1
    from public.driver_compliance_submissions existing
    where existing.driver_id = new.driver_id
      and existing.submitted_at is null
      and existing.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    raise exception 'only one open compliance draft is allowed per driver';
  end if;

  return new;
end;
$$;

comment on function public.enforce_single_driver_compliance_draft() is
  'Prevents more than one editable driver compliance draft from existing for the same driver at a time.';

create or replace function public.prevent_driver_compliance_review_for_drafts()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.driver_compliance_submissions submission
    where submission.id = new.submission_id
      and submission.driver_id = new.driver_id
      and submission.submitted_at is not null
  ) then
    raise exception 'driver_compliance_reviews may only reference submitted compliance snapshots';
  end if;

  return new;
end;
$$;

comment on function public.prevent_driver_compliance_review_for_drafts() is
  'Ensures admin review records can only be created for immutable submitted compliance snapshots.';

drop trigger if exists trg_driver_compliance_submissions_single_open_draft
  on public.driver_compliance_submissions;
create trigger trg_driver_compliance_submissions_single_open_draft
before insert or update on public.driver_compliance_submissions
for each row
execute function public.enforce_single_driver_compliance_draft();

drop trigger if exists trg_driver_compliance_reviews_require_submitted_snapshot
  on public.driver_compliance_reviews;
create trigger trg_driver_compliance_reviews_require_submitted_snapshot
before insert or update on public.driver_compliance_reviews
for each row
execute function public.prevent_driver_compliance_review_for_drafts();

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
    and compliance_status in ('not_started', 'in_progress', 'submitted', 'review_required')
    and eligibility_status in ('ineligible', 'review_required')
    and reviewed_at is null
    and approved_at is null
    and expires_at is null
  )
  or public.driver_compliance_is_staff()
);

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
    and compliance_status in ('not_started', 'in_progress', 'submitted', 'review_required')
    and eligibility_status in ('ineligible', 'review_required')
    and reviewed_at is null
    and approved_at is null
    and expires_at is null
  )
  or public.driver_compliance_is_staff()
);

drop policy if exists driver_compliance_submissions_insert_own_driver_only
  on public.driver_compliance_submissions;
create policy driver_compliance_submissions_insert_own_driver_only
on public.driver_compliance_submissions
for insert
to authenticated
with check (
  public.driver_compliance_is_driver()
  and driver_id = public.driver_compliance_current_driver_id()
  and submitted_at is null
  and compliance_status in ('not_started', 'in_progress')
  and eligibility_status in ('ineligible', 'review_required')
);

drop policy if exists driver_compliance_submissions_update_own_driver_only
  on public.driver_compliance_submissions;
create policy driver_compliance_submissions_update_own_driver_only
on public.driver_compliance_submissions
for update
to authenticated
using (
  public.driver_compliance_is_driver()
  and driver_id = public.driver_compliance_current_driver_id()
  and submitted_at is null
)
with check (
  public.driver_compliance_is_driver()
  and driver_id = public.driver_compliance_current_driver_id()
  and compliance_status in ('not_started', 'in_progress', 'submitted', 'review_required')
  and eligibility_status in ('ineligible', 'review_required')
);

drop policy if exists driver_compliance_audit_log_insert_driver_own
  on public.driver_compliance_audit_log;
create policy driver_compliance_audit_log_insert_driver_own
on public.driver_compliance_audit_log
for insert
to authenticated
with check (
  public.driver_compliance_is_driver()
  and driver_id = public.driver_compliance_current_driver_id()
  and (actor_profile_id is null or actor_profile_id = auth.uid())
);

commit;
