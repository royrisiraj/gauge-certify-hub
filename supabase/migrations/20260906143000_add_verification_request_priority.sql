-- Migration: Add priority column to public.verification_requests to support Smart Route GIS scoring
-- Identified missing field: 'priority' on public.verification_requests (requested scoring: High 50, Medium 30, Low 10)

alter table public.verification_requests
  add column if not exists priority text not null default 'Medium';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'verification_requests_priority_check'
  ) then
    alter table public.verification_requests
      add constraint verification_requests_priority_check
      check (priority in ('High', 'Medium', 'Low'));
  end if;
end $$;

-- Update existing requests with varied priorities based on request_type:
-- periodic -> High, initial -> Medium
update public.verification_requests
set priority = 'High'
where request_type = 'periodic' and priority = 'Medium';

notify pgrst, 'reload schema';
