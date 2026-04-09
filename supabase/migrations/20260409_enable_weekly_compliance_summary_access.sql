begin;

create or replace function public.get_driver_compliance_summary_for_staff()
returns table (
  driver_id uuid,
  compliance_status text,
  eligibility_status text,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.driver_compliance_current_role() not in ('admin', 'dispatch') then
    raise exception 'not authorized to view driver compliance summaries';
  end if;

  return query
  select
    profile.driver_id,
    profile.compliance_status,
    profile.eligibility_status,
    profile.expires_at
  from public.driver_compliance_profiles profile;
end;
$$;

comment on function public.get_driver_compliance_summary_for_staff() is
  'Returns only condensed compliance summary fields for admin/dispatch weekly scheduling views.';

revoke all on function public.get_driver_compliance_summary_for_staff() from public;
grant execute on function public.get_driver_compliance_summary_for_staff() to authenticated, service_role;

commit;
