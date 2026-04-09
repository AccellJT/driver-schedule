begin;

alter table public.driver_compliance_profiles
  add column if not exists document_tracking jsonb not null default '{
    "w9SavedToGusto": false,
    "contractSavedToGusto": false,
    "insuranceSavedToGusto": false,
    "insuranceExpiresOn": null,
    "driversLicenseSavedToGusto": false,
    "driversLicenseExpiresOn": null,
    "updatedAt": null
  }'::jsonb;

comment on column public.driver_compliance_profiles.document_tracking is
  'Admin-only Gusto document checklist and expiration metadata for W-9, contractor agreement, insurance, and driver license records.';

commit;
