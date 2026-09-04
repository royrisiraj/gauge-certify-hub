-- ENUMS
create type public.app_role as enum ('business','inspector');
create type public.instrument_status as enum ('active','inactive');
create type public.request_status as enum ('submitted','assigned','under_review','completed','rejected');
create type public.inspection_status as enum ('draft','in_progress','submitted');
create type public.measurement_result as enum ('pass','review','fail');
create type public.decision_type as enum ('verified','verified_with_conditions','failed');
create type public.cert_status as enum ('active','suspended','revoked');

-- CONFIG
create table public.app_config (
  key text primary key,
  value jsonb not null,
  description text,
  is_demo boolean not null default false,
  updated_at timestamptz not null default now()
);
grant select on public.app_config to authenticated, anon;
grant all on public.app_config to service_role;
alter table public.app_config enable row level security;
create policy "config readable" on public.app_config for select using (true);

create table public.verification_authorities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  jurisdiction_label text,
  contact_email text,
  is_demo boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.verification_authorities to authenticated;
grant all on public.verification_authorities to service_role;
alter table public.verification_authorities enable row level security;
create policy "authorities readable by signed in" on public.verification_authorities for select to authenticated using (true);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid,
  contact_email text,
  contact_phone text,
  address_line text,
  city text,
  state text,
  pincode text,
  registration_ref text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.businesses to authenticated;
grant all on public.businesses to service_role;
alter table public.businesses enable row level security;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  designation text,
  business_id uuid references public.businesses(id) on delete set null,
  authority_id uuid references public.verification_authorities(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

-- HELPERS
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.current_business_id()
returns uuid language sql stable security definer set search_path = public as $$
  select business_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_authority_id()
returns uuid language sql stable security definer set search_path = public as $$
  select authority_id from public.profiles where id = auth.uid()
$$;

create policy "own profile readable" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'inspector'));
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create policy "business readable" on public.businesses for select to authenticated
  using (id = public.current_business_id() or public.has_role(auth.uid(),'inspector'));
create policy "business insert own" on public.businesses for insert to authenticated with check (owner_id = auth.uid());
create policy "business update own" on public.businesses for update to authenticated
  using (id = public.current_business_id() and public.has_role(auth.uid(),'business'));

-- TOLERANCE RULES (configurable, not hard-coded)
create table public.tolerance_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  unit text not null,
  tolerance_type text not null check (tolerance_type in ('absolute','percent')),
  tolerance_value numeric not null check (tolerance_value > 0),
  near_boundary_fraction numeric not null default 0.8 check (near_boundary_fraction > 0 and near_boundary_fraction <= 1),
  authority_id uuid references public.verification_authorities(id) on delete set null,
  is_demo boolean not null default true,
  source_note text,
  created_at timestamptz not null default now()
);
grant select on public.tolerance_rules to authenticated;
grant all on public.tolerance_rules to service_role;
alter table public.tolerance_rules enable row level security;
create policy "tolerance readable" on public.tolerance_rules for select to authenticated using (true);

-- INSTRUMENTS
create table public.instruments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category text not null,
  manufacturer text not null,
  model text not null,
  serial_number text not null,
  capacity_value numeric,
  capacity_unit text,
  resolution_value numeric,
  unit text not null,
  location_label text,
  status public.instrument_status not null default 'active',
  public_code text not null unique default 'INS-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (business_id, serial_number)
);
grant select, insert, update, delete on public.instruments to authenticated;
grant all on public.instruments to service_role;
alter table public.instruments enable row level security;
create policy "instruments business read own" on public.instruments for select to authenticated
  using (business_id = public.current_business_id() or public.has_role(auth.uid(),'inspector'));
create policy "instruments business insert" on public.instruments for insert to authenticated
  with check (business_id = public.current_business_id() and public.has_role(auth.uid(),'business'));
create policy "instruments business update" on public.instruments for update to authenticated
  using (business_id = public.current_business_id() and public.has_role(auth.uid(),'business'));
create policy "instruments business delete" on public.instruments for delete to authenticated
  using (business_id = public.current_business_id() and public.has_role(auth.uid(),'business'));

-- VERIFICATION REQUESTS
create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  authority_id uuid references public.verification_authorities(id) on delete set null,
  tolerance_rule_id uuid references public.tolerance_rules(id) on delete set null,
  status public.request_status not null default 'submitted',
  reason text,
  request_type text not null default 'initial',
  submitted_by uuid,
  submitted_at timestamptz not null default now(),
  assigned_to uuid,
  assigned_at timestamptz,
  rejected_reason text,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.verification_requests to authenticated;
grant all on public.verification_requests to service_role;
alter table public.verification_requests enable row level security;
create policy "requests read" on public.verification_requests for select to authenticated
  using (business_id = public.current_business_id() or public.has_role(auth.uid(),'inspector'));
create policy "requests business insert" on public.verification_requests for insert to authenticated
  with check (business_id = public.current_business_id() and public.has_role(auth.uid(),'business'));
create policy "requests inspector update" on public.verification_requests for update to authenticated
  using (public.has_role(auth.uid(),'inspector'));

-- INSPECTIONS
create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.verification_requests(id) on delete cascade,
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  inspector_id uuid not null,
  tolerance_rule_id uuid references public.tolerance_rules(id) on delete set null,
  status public.inspection_status not null default 'draft',
  notes text,
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);
grant select, insert, update on public.inspections to authenticated;
grant all on public.inspections to service_role;
alter table public.inspections enable row level security;
create policy "inspections read" on public.inspections for select to authenticated
  using (public.has_role(auth.uid(),'inspector')
    or instrument_id in (select id from public.instruments where business_id = public.current_business_id()));
create policy "inspections inspector insert" on public.inspections for insert to authenticated
  with check (public.has_role(auth.uid(),'inspector') and inspector_id = auth.uid());
create policy "inspections inspector update" on public.inspections for update to authenticated
  using (public.has_role(auth.uid(),'inspector') and inspector_id = auth.uid());

-- MEASUREMENTS
create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  point_index integer not null,
  reference_value numeric not null,
  observed_value numeric not null,
  unit text not null,
  tolerance_applied numeric,
  deviation numeric,
  result public.measurement_result,
  note text,
  created_at timestamptz not null default now(),
  unique (inspection_id, point_index)
);
grant select, insert, update, delete on public.measurements to authenticated;
grant all on public.measurements to service_role;
alter table public.measurements enable row level security;
create policy "measurements read" on public.measurements for select to authenticated
  using (inspection_id in (select id from public.inspections));
create policy "measurements inspector write" on public.measurements for insert to authenticated
  with check (public.has_role(auth.uid(),'inspector')
    and inspection_id in (select id from public.inspections where inspector_id = auth.uid()));
create policy "measurements inspector update" on public.measurements for update to authenticated
  using (public.has_role(auth.uid(),'inspector')
    and inspection_id in (select id from public.inspections where inspector_id = auth.uid() and status <> 'submitted'));
create policy "measurements inspector delete" on public.measurements for delete to authenticated
  using (public.has_role(auth.uid(),'inspector')
    and inspection_id in (select id from public.inspections where inspector_id = auth.uid() and status <> 'submitted'));

-- Authoritative tolerance assessment (server-side, never frontend)
create or replace function public.assess_measurement()
returns trigger language plpgsql security definer set search_path = public as $$
declare r public.tolerance_rules; tol numeric; dev numeric;
begin
  select tr.* into r from public.tolerance_rules tr
    where tr.id = (select tolerance_rule_id from public.inspections where id = new.inspection_id);
  if r.id is null then
    raise exception 'No tolerance rule configured for this inspection';
  end if;
  tol := case when r.tolerance_type = 'percent'
              then abs(new.reference_value) * r.tolerance_value / 100
              else r.tolerance_value end;
  dev := new.observed_value - new.reference_value;
  new.deviation := dev;
  new.tolerance_applied := tol;
  new.result := case
    when abs(dev) > tol then 'fail'::public.measurement_result
    when abs(dev) >= tol * r.near_boundary_fraction then 'review'::public.measurement_result
    else 'pass'::public.measurement_result end;
  return new;
end; $$;
create trigger measurements_assess before insert or update of reference_value, observed_value
  on public.measurements for each row execute function public.assess_measurement();

-- DECISIONS
create table public.verification_decisions (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null unique references public.inspections(id) on delete cascade,
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  request_id uuid not null references public.verification_requests(id) on delete cascade,
  decided_by uuid not null,
  authority_id uuid references public.verification_authorities(id) on delete set null,
  decision public.decision_type not null,
  calculated_result public.decision_type not null,
  override_reason text,
  conditions text,
  decided_at timestamptz not null default now()
);
grant select on public.verification_decisions to authenticated;
grant all on public.verification_decisions to service_role;
alter table public.verification_decisions enable row level security;
create policy "decisions read" on public.verification_decisions for select to authenticated
  using (public.has_role(auth.uid(),'inspector')
    or instrument_id in (select id from public.instruments where business_id = public.current_business_id()));

-- CERTIFICATES
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null unique references public.verification_decisions(id) on delete cascade,
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  authority_id uuid references public.verification_authorities(id) on delete set null,
  certificate_number text not null unique,
  verification_code text not null unique,
  status public.cert_status not null default 'active',
  conditions text,
  issued_by uuid,
  issued_at timestamptz not null default now(),
  valid_from date not null default current_date,
  valid_until date not null,
  status_reason text,
  is_demo boolean not null default false
);
grant select on public.certificates to authenticated;
grant all on public.certificates to service_role;
alter table public.certificates enable row level security;
create policy "certificates read" on public.certificates for select to authenticated
  using (public.has_role(auth.uid(),'inspector')
    or instrument_id in (select id from public.instruments where business_id = public.current_business_id()));

-- AUDIT
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  actor_id uuid,
  actor_role text,
  business_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_events to authenticated;
grant all on public.audit_events to service_role;
alter table public.audit_events enable row level security;
create policy "audit read" on public.audit_events for select to authenticated
  using (public.has_role(auth.uid(),'inspector') or business_id = public.current_business_id());
create policy "audit insert" on public.audit_events for insert to authenticated with check (actor_id = auth.uid());

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notifications own" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications update own" on public.notifications for update to authenticated using (user_id = auth.uid());
create policy "notifications insert" on public.notifications for insert to authenticated with check (true);

-- ACCOUNT BOOTSTRAP
create or replace function public.bootstrap_account(
  p_full_name text, p_role public.app_role, p_business_name text default null,
  p_authority_id uuid default null, p_designation text default null,
  p_phone text default null, p_contact_email text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); bid uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from public.profiles where id = uid) then
    return jsonb_build_object('already', true);
  end if;
  if p_role = 'business' then
    if coalesce(trim(p_business_name),'') = '' then raise exception 'Business name is required'; end if;
    insert into public.businesses (name, owner_id, contact_email, contact_phone)
      values (trim(p_business_name), uid, p_contact_email, p_phone) returning id into bid;
    insert into public.profiles (id, full_name, phone, business_id) values (uid, p_full_name, p_phone, bid);
  else
    if p_authority_id is null then raise exception 'Select a verification authority'; end if;
    insert into public.profiles (id, full_name, phone, designation, authority_id)
      values (uid, p_full_name, p_phone, p_designation, p_authority_id);
  end if;
  insert into public.user_roles (user_id, role) values (uid, p_role);
  insert into public.audit_events (entity_type, entity_id, action, actor_id, actor_role, business_id)
    values ('account', uid, 'account.created', uid, p_role::text, bid);
  return jsonb_build_object('role', p_role, 'business_id', bid);
end; $$;
grant execute on function public.bootstrap_account(text, public.app_role, text, uuid, text, text, text) to authenticated;

-- DECISION RECORDING (authoritative)
create or replace function public.record_decision(
  p_inspection_id uuid, p_decision public.decision_type,
  p_override_reason text default null, p_conditions text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare insp public.inspections; calc public.decision_type; fails int; reviews int; total int; did uuid;
begin
  if not public.has_role(auth.uid(),'inspector') then raise exception 'Only a verification authority can record a decision'; end if;
  select * into insp from public.inspections where id = p_inspection_id;
  if insp.id is null then raise exception 'Inspection not found'; end if;
  if insp.inspector_id <> auth.uid() then raise exception 'This inspection is assigned to another inspector'; end if;
  select count(*), count(*) filter (where result = 'fail'), count(*) filter (where result = 'review')
    into total, fails, reviews from public.measurements where inspection_id = p_inspection_id;
  if total = 0 then raise exception 'Record at least one measurement before deciding'; end if;
  calc := case when fails > 0 then 'failed'::public.decision_type
               when reviews > 0 then 'verified_with_conditions'::public.decision_type
               else 'verified'::public.decision_type end;
  if p_decision <> calc and coalesce(trim(p_override_reason),'') = '' then
    raise exception 'A reason is required when the decision differs from the calculated result';
  end if;
  insert into public.verification_decisions
    (inspection_id, instrument_id, request_id, decided_by, authority_id, decision, calculated_result, override_reason, conditions)
  values (p_inspection_id, insp.instrument_id, insp.request_id, auth.uid(), public.current_authority_id(),
          p_decision, calc, nullif(trim(p_override_reason),''), nullif(trim(p_conditions),''))
  returning id into did;
  update public.inspections set status = 'submitted', submitted_at = now() where id = p_inspection_id;
  update public.verification_requests set status = 'completed', updated_at = now() where id = insp.request_id;
  insert into public.audit_events (entity_type, entity_id, action, actor_id, actor_role, business_id, detail)
  select 'verification_decision', did, 'decision.recorded', auth.uid(), 'inspector', i.business_id,
         jsonb_build_object('decision', p_decision, 'calculated', calc)
  from public.instruments i where i.id = insp.instrument_id;
  insert into public.notifications (user_id, title, body, link)
  select b.owner_id, 'Verification decision recorded',
         'A decision was recorded for instrument ' || i.serial_number, '/business/instruments/' || i.id
  from public.instruments i join public.businesses b on b.id = i.business_id
  where i.id = insp.instrument_id and b.owner_id is not null;
  return did;
end; $$;
grant execute on function public.record_decision(uuid, public.decision_type, text, text) to authenticated;

-- CERTIFICATE ISSUANCE (authoritative)
create or replace function public.issue_certificate(p_decision_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare d public.verification_decisions; months int; cid uuid; num text; code text; seq bigint;
begin
  if not public.has_role(auth.uid(),'inspector') then raise exception 'Only a verification authority can issue a certificate'; end if;
  select * into d from public.verification_decisions where id = p_decision_id;
  if d.id is null then raise exception 'Decision not found'; end if;
  if d.decision = 'failed' then raise exception 'A certificate cannot be issued for a failed verification'; end if;
  if exists (select 1 from public.certificates where decision_id = p_decision_id) then
    raise exception 'A certificate already exists for this decision';
  end if;
  select coalesce((value->>'months')::int, 12) into months from public.app_config where key = 'certificate_validity';
  seq := (select count(*) + 1 from public.certificates);
  num := 'VC-' || to_char(now(),'YYYY') || '-' || lpad(seq::text, 6, '0');
  code := 'EMAAP-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  insert into public.certificates (decision_id, instrument_id, authority_id, certificate_number, verification_code,
    conditions, issued_by, valid_from, valid_until)
  values (p_decision_id, d.instrument_id, d.authority_id, num, code, d.conditions, auth.uid(),
          current_date, (current_date + (months || ' months')::interval)::date)
  returning id into cid;
  insert into public.audit_events (entity_type, entity_id, action, actor_id, actor_role, business_id, detail)
  select 'certificate', cid, 'certificate.issued', auth.uid(), 'inspector', i.business_id,
         jsonb_build_object('certificate_number', num)
  from public.instruments i where i.id = d.instrument_id;
  insert into public.notifications (user_id, title, body, link)
  select b.owner_id, 'Certificate issued', 'Certificate ' || num || ' was issued.', '/business/certificates'
  from public.instruments i join public.businesses b on b.id = i.business_id
  where i.id = d.instrument_id and b.owner_id is not null;
  return cid;
end; $$;
grant execute on function public.issue_certificate(uuid) to authenticated;

create or replace function public.set_certificate_status(p_certificate_id uuid, p_status public.cert_status, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'inspector') then raise exception 'Only a verification authority can change certificate status'; end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'A reason is required'; end if;
  update public.certificates set status = p_status, status_reason = trim(p_reason) where id = p_certificate_id;
  insert into public.audit_events (entity_type, entity_id, action, actor_id, actor_role, business_id, detail)
  select 'certificate', c.id, 'certificate.status_changed', auth.uid(), 'inspector', i.business_id,
         jsonb_build_object('status', p_status, 'reason', trim(p_reason))
  from public.certificates c join public.instruments i on i.id = c.instrument_id where c.id = p_certificate_id;
end; $$;
grant execute on function public.set_certificate_status(uuid, public.cert_status, text) to authenticated;

create or replace function public.claim_request(p_request_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare r public.verification_requests; iid uuid; rule uuid;
begin
  if not public.has_role(auth.uid(),'inspector') then raise exception 'Only a verification authority can take an assignment'; end if;
  select * into r from public.verification_requests where id = p_request_id;
  if r.id is null then raise exception 'Request not found'; end if;
  if r.assigned_to is not null and r.assigned_to <> auth.uid() then raise exception 'Already assigned to another inspector'; end if;
  select id into rule from public.tolerance_rules tr
    where tr.unit = (select unit from public.instruments where id = r.instrument_id)
    order by (tr.category = (select category from public.instruments where id = r.instrument_id)) desc limit 1;
  update public.verification_requests
    set assigned_to = auth.uid(), assigned_at = now(), status = 'under_review',
        authority_id = coalesce(authority_id, public.current_authority_id()),
        tolerance_rule_id = coalesce(tolerance_rule_id, rule), updated_at = now()
  where id = p_request_id;
  select id into iid from public.inspections where request_id = p_request_id and inspector_id = auth.uid();
  if iid is null then
    insert into public.inspections (request_id, instrument_id, inspector_id, tolerance_rule_id, status)
    values (p_request_id, r.instrument_id, auth.uid(), coalesce(r.tolerance_rule_id, rule), 'in_progress')
    returning id into iid;
  end if;
  insert into public.audit_events (entity_type, entity_id, action, actor_id, actor_role, business_id)
  values ('verification_request', p_request_id, 'request.assigned', auth.uid(), 'inspector', r.business_id);
  return iid;
end; $$;
grant execute on function public.claim_request(uuid) to authenticated;

-- PUBLIC VERIFICATION (only public data path; no authentication)
create or replace function public.public_verify(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c public.certificates; i public.instruments; a public.verification_authorities;
        d public.verification_decisions; code text; soon int; state text; explain text;
        req public.verification_requests;
begin
  code := upper(trim(coalesce(p_code,'')));
  if code = '' then return jsonb_build_object('state','NOT_FOUND','query',p_code); end if;
  select coalesce((value->>'days')::int, 30) into soon from public.app_config where key = 'expiring_soon_window';
  select * into c from public.certificates where upper(verification_code) = code or upper(certificate_number) = code limit 1;
  if c.id is null then
    select * into i from public.instruments where upper(public_code) = code or upper(serial_number) = code limit 1;
    if i.id is null then
      return jsonb_build_object('state','NOT_FOUND','query',p_code);
    end if;
    select * into c from public.certificates c2 where c2.instrument_id = i.id order by c2.issued_at desc limit 1;
  end if;
  if c.id is not null then
    select * into i from public.instruments where id = c.instrument_id;
    select * into a from public.verification_authorities where id = c.authority_id;
    select * into d from public.verification_decisions where id = c.decision_id;
    state := case
      when c.status = 'suspended' then 'SUSPENDED'
      when c.status = 'revoked' then 'REVOKED'
      when c.valid_until < current_date then 'EXPIRED'
      when c.valid_until <= current_date + soon then 'EXPIRING_SOON'
      else 'VERIFIED' end;
    return jsonb_build_object(
      'state', state, 'query', p_code,
      'certificate', jsonb_build_object('number', c.certificate_number, 'code', c.verification_code,
        'issued_at', c.issued_at, 'valid_from', c.valid_from, 'valid_until', c.valid_until,
        'status_reason', c.status_reason, 'conditions', c.conditions, 'is_demo', c.is_demo),
      'instrument', jsonb_build_object('category', i.category, 'manufacturer', i.manufacturer, 'model', i.model,
        'serial_number', i.serial_number, 'public_code', i.public_code, 'capacity_value', i.capacity_value,
        'capacity_unit', i.capacity_unit, 'resolution_value', i.resolution_value, 'unit', i.unit),
      'authority', case when a.id is null then null else jsonb_build_object('name', a.name,
        'jurisdiction', a.jurisdiction_label, 'is_demo', a.is_demo) end,
      'decision', case when d.id is null then null else jsonb_build_object('decision', d.decision,
        'decided_at', d.decided_at, 'conditions', d.conditions) end);
  end if;
  -- instrument found but no certificate: derive lifecycle state
  select * into req from public.verification_requests where instrument_id = i.id order by submitted_at desc limit 1;
  select * into d from public.verification_decisions where instrument_id = i.id order by decided_at desc limit 1;
  if d.id is not null and d.decision = 'failed' then state := 'FAILED';
  elsif req.id is not null and req.status = 'rejected' then state := 'REJECTED';
  elsif req.id is not null then state := 'PENDING';
  else state := 'NOT_VERIFIED'; end if;
  return jsonb_build_object('state', state, 'query', p_code,
    'instrument', jsonb_build_object('category', i.category, 'manufacturer', i.manufacturer, 'model', i.model,
      'serial_number', i.serial_number, 'public_code', i.public_code, 'capacity_value', i.capacity_value,
      'capacity_unit', i.capacity_unit, 'resolution_value', i.resolution_value, 'unit', i.unit),
    'request', case when req.id is null then null else jsonb_build_object('status', req.status,
      'submitted_at', req.submitted_at) end);
end; $$;
grant execute on function public.public_verify(text) to anon, authenticated;

-- SEED: configuration (illustrative/demo, not legal requirements)
insert into public.app_config (key, value, description, is_demo) values
 ('certificate_validity', '{"months": 12}', 'Configurable certificate validity period. Demo value only - not a legal requirement.', true),
 ('expiring_soon_window', '{"days": 30}', 'Configurable window before expiry when a certificate is shown as expiring soon.', true);

insert into public.verification_authorities (id, name, jurisdiction_label, contact_email, is_demo) values
 ('11111111-1111-1111-1111-111111111111','Demo Verification Authority (Sample)','Demo jurisdiction - illustrative only','authority@example.org', true),
 ('22222222-2222-2222-2222-222222222222','Demo Regional Verification Office (Sample)','Demo jurisdiction - illustrative only','regional@example.org', true);

insert into public.tolerance_rules (name, category, unit, tolerance_type, tolerance_value, near_boundary_fraction, authority_id, is_demo, source_note) values
 ('Demo weighing tolerance (absolute)','Weighing instrument','kg','absolute',0.010,0.8,'11111111-1111-1111-1111-111111111111', true,'Illustrative demo configuration. Replace with the tolerance defined by the applicable authority.'),
 ('Demo weighing tolerance (percent)','Weighing instrument','kg','percent',0.5,0.8,'11111111-1111-1111-1111-111111111111', true,'Illustrative demo configuration only.'),
 ('Demo volume tolerance','Volume measure','L','percent',0.5,0.8,'11111111-1111-1111-1111-111111111111', true,'Illustrative demo configuration only.'),
 ('Demo length tolerance','Length measure','m','absolute',0.002,0.8,'11111111-1111-1111-1111-111111111111', true,'Illustrative demo configuration only.');