begin;

create or replace function public.run_driver_compliance_annual_review(
  run_at timestamptz default timezone('utc', now())
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  transitioned_count integer := 0;
begin
  with due_profiles as (
    select
      profile.id as compliance_profile_id,
      profile.driver_id,
      profile.current_submission_id as submission_id,
      profile.expires_at
    from public.driver_compliance_profiles profile
    where profile.current_submission_id is not null
      and profile.expires_at is not null
      and profile.expires_at <= run_at
      and profile.compliance_status in ('approved', 'conditionally_approved', 'expired')
      and profile.eligibility_status <> 'review_required'
  ),
  updated_profiles as (
    update public.driver_compliance_profiles profile
    set compliance_status = 'review_required',
        eligibility_status = 'review_required',
        last_actor_profile_id = null
    from due_profiles due
    where profile.id = due.compliance_profile_id
    returning
      profile.driver_id,
      profile.id as compliance_profile_id,
      due.submission_id,
      due.expires_at
  )
  insert into public.driver_compliance_audit_log (
    driver_id,
    compliance_profile_id,
    submission_id,
    actor_profile_id,
    event_type,
    compliance_status,
    eligibility_status,
    note,
    event_metadata
  )
  select
    updated.driver_id,
    updated.compliance_profile_id,
    updated.submission_id,
    null,
    'submission.annual_review_due',
    'review_required',
    'review_required',
    'Annual review is now due. The prior one-year approval term has ended.',
    jsonb_build_object(
      'expiredAt', updated.expires_at,
      'runAt', run_at,
      'trigger', 'scheduled_annual_review'
    )
  from updated_profiles updated;

  get diagnostics transitioned_count = row_count;
  return transitioned_count;
end;
$$;

comment on function public.run_driver_compliance_annual_review(timestamptz) is
  'Moves approved compliance profiles back to review_required once the 1-year approval term expires and records an audit log entry.';

revoke all on function public.run_driver_compliance_annual_review(timestamptz) from public;
grant execute on function public.run_driver_compliance_annual_review(timestamptz) to service_role;

do $cron$
begin
  if exists (
    select 1
    from pg_available_extensions
    where name = 'pg_cron'
  ) then
    begin
      create extension if not exists pg_cron with schema extensions;
    exception
      when duplicate_object then
        null;
      when insufficient_privilege then
        raise notice 'pg_cron could not be enabled automatically; schedule public.run_driver_compliance_annual_review() externally.';
    end;

    if exists (select 1 from pg_extension where extname = 'pg_cron') then
      if not exists (
        select 1
        from cron.job
        where jobname = 'driver_compliance_annual_review_nightly'
      ) then
        perform cron.schedule(
          'driver_compliance_annual_review_nightly',
          '15 2 * * *',
          'select public.run_driver_compliance_annual_review();'
        );
      end if;
    end if;
  else
    raise notice 'pg_cron is not available in this Postgres environment; run public.run_driver_compliance_annual_review() from an external scheduler.';
  end if;
end;
$cron$;

commit;
