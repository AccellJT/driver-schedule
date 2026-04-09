begin;

create extension if not exists pgcrypto;

create or replace function public.driver_compliance_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

comment on function public.driver_compliance_set_updated_at() is
  'Maintains updated_at columns for mutable driver compliance tables without changing any shared global trigger helper.';

create or replace function public.prevent_driver_compliance_submission_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.submitted_at is not null then
    raise exception 'driver_compliance_submissions rows are immutable after submitted_at is set';
  end if;

  if tg_op = 'DELETE' and old.submitted_at is not null then
    raise exception 'finalized compliance submissions cannot be deleted';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

comment on function public.prevent_driver_compliance_submission_mutation() is
  'Prevents mutation or deletion of a compliance submission once it has been finally submitted.';

create table if not exists public.driver_compliance_profiles (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null unique
    references public.drivers(id)
    on delete cascade,
  current_submission_id uuid null,
  compliance_status text not null default 'not_started'
    check (
      compliance_status in (
        'not_started',
        'in_progress',
        'submitted',
        'review_required',
        'approved',
        'conditionally_approved',
        'blocked',
        'expired'
      )
    ),
  eligibility_status text not null default 'ineligible'
    check (eligibility_status in ('eligible', 'ineligible', 'review_required')),
  current_score integer not null default 0
    check (current_score >= 0 and current_score <= 100),
  risk_flags jsonb not null default '[]'::jsonb
    check (jsonb_typeof(risk_flags) = 'array'),
  missing_requirements jsonb not null default '[]'::jsonb
    check (jsonb_typeof(missing_requirements) = 'array'),
  submitted_at timestamptz null,
  reviewed_at timestamptz null,
  approved_at timestamptz null,
  expires_at timestamptz null,
  last_actor_profile_id uuid null
    references public.profiles(id)
    on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.driver_compliance_profiles is
  'One current compliance summary row per driver. Stores the latest compliance state, score, and expiration details.';
comment on column public.driver_compliance_profiles.driver_id is
  'Enforces one compliance profile row per driver.';
comment on column public.driver_compliance_profiles.current_submission_id is
  'Points to the latest submission used to derive the current compliance summary state.';

create table if not exists public.driver_compliance_submissions (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null
    references public.drivers(id)
    on delete cascade,
  submission_version integer not null default 1
    check (submission_version > 0),
  survey_version text not null default 'v1',
  compliance_status text not null default 'in_progress'
    check (
      compliance_status in (
        'not_started',
        'in_progress',
        'submitted',
        'review_required',
        'approved',
        'conditionally_approved',
        'blocked',
        'expired'
      )
    ),
  eligibility_status text not null default 'ineligible'
    check (eligibility_status in ('eligible', 'ineligible', 'review_required')),
  score integer not null default 0
    check (score >= 0 and score <= 100),
  answers jsonb not null default '{}'::jsonb
    check (jsonb_typeof(answers) = 'object'),
  derived_flags jsonb not null default '[]'::jsonb
    check (jsonb_typeof(derived_flags) = 'array'),
  summary jsonb not null default '{}'::jsonb
    check (jsonb_typeof(summary) = 'object'),
  created_by_profile_id uuid null
    references public.profiles(id)
    on delete set null,
  submitted_by_profile_id uuid null
    references public.profiles(id)
    on delete set null,
  submitted_at timestamptz null,
  review_due_at timestamptz null,
  expires_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint driver_compliance_submissions_driver_version_key
    unique (driver_id, submission_version),
  constraint driver_compliance_submissions_id_driver_key
    unique (id, driver_id),
  constraint driver_compliance_submissions_status_submission_check
    check (
      (
        submitted_at is null
        and compliance_status in ('not_started', 'in_progress')
      )
      or
      (
        submitted_at is not null
        and compliance_status in (
          'submitted',
          'review_required',
          'approved',
          'conditionally_approved',
          'blocked',
          'expired'
        )
      )
    )
);

comment on table public.driver_compliance_submissions is
  'Immutable history of compliance submissions. Draft rows may change until submitted_at is set; after that they are locked.';
comment on column public.driver_compliance_submissions.answers is
  'Snapshot of the survey answers payload for this submission version.';
comment on column public.driver_compliance_submissions.derived_flags is
  'Flag snapshot derived from the compliance rules at the time the submission was evaluated.';
comment on column public.driver_compliance_submissions.created_by_profile_id is
  'Profile that created the draft submission, if applicable.';
comment on column public.driver_compliance_submissions.submitted_by_profile_id is
  'Profile that finalized/submitted the attestation.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'driver_compliance_submissions_id_driver_key'
      and conrelid = 'public.driver_compliance_submissions'::regclass
  ) then
    alter table public.driver_compliance_submissions
      add constraint driver_compliance_submissions_id_driver_key
      unique (id, driver_id);
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'driver_compliance_profiles_current_submission_id_fkey'
      and conrelid = 'public.driver_compliance_profiles'::regclass
  ) then
    alter table public.driver_compliance_profiles
      drop constraint driver_compliance_profiles_current_submission_id_fkey;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'driver_compliance_profiles_current_submission_driver_fkey'
      and conrelid = 'public.driver_compliance_profiles'::regclass
  ) then
    alter table public.driver_compliance_profiles
      add constraint driver_compliance_profiles_current_submission_driver_fkey
      foreign key (current_submission_id, driver_id)
      references public.driver_compliance_submissions(id, driver_id)
      on delete restrict;
  end if;
end;
$$;

create table if not exists public.driver_compliance_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  driver_id uuid not null
    references public.drivers(id)
    on delete cascade,
  reviewer_profile_id uuid null
    references public.profiles(id)
    on delete set null,
  decision text not null
    check (decision in ('approved', 'conditionally_approved', 'review_required', 'blocked')),
  decision_reason text null,
  review_notes text null,
  conditions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(conditions) = 'array'),
  score_snapshot integer null
    check (score_snapshot is null or (score_snapshot >= 0 and score_snapshot <= 100)),
  flags_snapshot jsonb not null default '[]'::jsonb
    check (jsonb_typeof(flags_snapshot) = 'array'),
  created_at timestamptz not null default timezone('utc', now()),
  constraint driver_compliance_reviews_submission_driver_fkey
    foreign key (submission_id, driver_id)
    references public.driver_compliance_submissions(id, driver_id)
    on delete cascade
);

comment on table public.driver_compliance_reviews is
  'Staff review actions against a submitted compliance snapshot. Reviewers reference profiles.id.';

create table if not exists public.driver_compliance_audit_log (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null
    references public.drivers(id)
    on delete cascade,
  compliance_profile_id uuid null
    references public.driver_compliance_profiles(id)
    on delete set null,
  submission_id uuid null
    references public.driver_compliance_submissions(id)
    on delete set null,
  review_id uuid null
    references public.driver_compliance_reviews(id)
    on delete set null,
  actor_profile_id uuid null
    references public.profiles(id)
    on delete set null,
  event_type text not null,
  compliance_status text null
    check (
      compliance_status is null
      or compliance_status in (
        'not_started',
        'in_progress',
        'submitted',
        'review_required',
        'approved',
        'conditionally_approved',
        'blocked',
        'expired'
      )
    ),
  eligibility_status text null
    check (
      eligibility_status is null
      or eligibility_status in ('eligible', 'ineligible', 'review_required')
    ),
  event_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(event_metadata) = 'object'),
  note text null,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.driver_compliance_audit_log is
  'Append-only audit trail for important compliance lifecycle events, actor actions, and state transitions.';

create index if not exists idx_driver_compliance_profiles_compliance_status
  on public.driver_compliance_profiles (compliance_status);
create index if not exists idx_driver_compliance_profiles_eligibility_status
  on public.driver_compliance_profiles (eligibility_status);
create index if not exists idx_driver_compliance_profiles_expires_at
  on public.driver_compliance_profiles (expires_at);
create index if not exists idx_driver_compliance_profiles_submitted_at
  on public.driver_compliance_profiles (submitted_at);

create index if not exists idx_driver_compliance_submissions_driver_id
  on public.driver_compliance_submissions (driver_id);
create index if not exists idx_driver_compliance_submissions_compliance_status
  on public.driver_compliance_submissions (compliance_status);
create index if not exists idx_driver_compliance_submissions_eligibility_status
  on public.driver_compliance_submissions (eligibility_status);
create index if not exists idx_driver_compliance_submissions_expires_at
  on public.driver_compliance_submissions (expires_at);
create index if not exists idx_driver_compliance_submissions_submitted_at
  on public.driver_compliance_submissions (submitted_at);

create index if not exists idx_driver_compliance_reviews_driver_id
  on public.driver_compliance_reviews (driver_id);
create index if not exists idx_driver_compliance_audit_log_driver_id
  on public.driver_compliance_audit_log (driver_id);

drop trigger if exists trg_driver_compliance_profiles_set_updated_at
  on public.driver_compliance_profiles;
create trigger trg_driver_compliance_profiles_set_updated_at
before update on public.driver_compliance_profiles
for each row
execute function public.driver_compliance_set_updated_at();

drop trigger if exists trg_driver_compliance_submissions_set_updated_at
  on public.driver_compliance_submissions;
create trigger trg_driver_compliance_submissions_set_updated_at
before update on public.driver_compliance_submissions
for each row
execute function public.driver_compliance_set_updated_at();

drop trigger if exists trg_driver_compliance_submissions_prevent_final_mutation
  on public.driver_compliance_submissions;
create trigger trg_driver_compliance_submissions_prevent_final_mutation
before update or delete on public.driver_compliance_submissions
for each row
execute function public.prevent_driver_compliance_submission_mutation();

commit;