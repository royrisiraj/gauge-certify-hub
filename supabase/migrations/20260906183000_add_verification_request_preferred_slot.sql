-- Migration: Add preferred_date and preferred_time_slot to public.verification_requests
-- Supports configurable appointment preferences for business owners requesting metrology verification

alter table public.verification_requests
  add column if not exists preferred_date date,
  add column if not exists preferred_time_slot text;

notify pgrst, 'reload schema';
