begin;

-- Ensure the availability activity audit table can be queried and written by authenticated users
-- while still enforcing row-level security for staff-only access.

grant select, insert on public.availability_activity_log to authenticated;

alter table public.availability_activity_log enable row level security;

-- Allow staff to view audit records.
drop policy if exists availability_activity_log_select_staff on public.availability_activity_log;
create policy availability_activity_log_select_staff
  on public.availability_activity_log
  for select
  to authenticated
  using (
    public.driver_compliance_is_staff()
  );

-- Allow authenticated users to insert audit rows.
drop policy if exists availability_activity_log_insert_authenticated on public.availability_activity_log;
create policy availability_activity_log_insert_authenticated
  on public.availability_activity_log
  for insert
  to authenticated
  with check (true);

commit;
