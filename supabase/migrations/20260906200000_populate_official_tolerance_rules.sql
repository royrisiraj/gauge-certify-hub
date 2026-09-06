-- Migration: Populate official Legal Metrology tolerance rules and upgrade assess_measurement trigger
-- Standards: Legal Metrology (General) Rules, 2011, Government of India / Department of Consumer Affairs

-- 1. Insert official Legal Metrology tolerance rules for all supported instrument categories & units
insert into public.tolerance_rules (name, category, unit, tolerance_type, tolerance_value, near_boundary_fraction, authority_id, is_demo, source_note) values
  -- Non-Automatic Weighing Instruments (NAWI) - Seventh Schedule, Part I (IS 9281 / OIML R 76-1)
  (
    'NAWI Commercial Class III (kg) — Verification',
    'Non-Automatic Weighing Instrument (NAWI)',
    'kg',
    'percent',
    0.10,
    0.80,
    null,
    false,
    'Legal Metrology (General) Rules, 2011, Seventh Schedule, Part I, Table 4 (Accuracy Class III, Medium Accuracy). Verification MPE: +/-0.10% of applied load.'
  ),
  (
    'NAWI Precision Class II (g) — Verification',
    'Non-Automatic Weighing Instrument (NAWI)',
    'g',
    'percent',
    0.05,
    0.80,
    null,
    false,
    'Legal Metrology (General) Rules, 2011, Seventh Schedule, Part I, Table 3 (Accuracy Class II, High Accuracy). Verification MPE: +/-0.05% of applied load for precious metals & lab trade.'
  ),
  (
    'NAWI Analytical Class I (mg) — Verification',
    'Non-Automatic Weighing Instrument (NAWI)',
    'mg',
    'percent',
    0.02,
    0.80,
    null,
    false,
    'Legal Metrology (General) Rules, 2011, Seventh Schedule, Part I, Table 2 (Accuracy Class I, Special Accuracy). Verification MPE: +/-0.02% of applied load for micro/analytical balances.'
  ),
  (
    'NAWI Heavy Industrial Class III (tonne) — Verification',
    'Non-Automatic Weighing Instrument (NAWI)',
    'tonne',
    'percent',
    0.10,
    0.80,
    null,
    false,
    'Legal Metrology (General) Rules, 2011, Seventh Schedule, Part I, Table 4 (Accuracy Class III, Medium Accuracy). Verification MPE: +/-0.10% of applied load.'
  ),

  -- Weighbridge (Heavy Capacity) - Seventh Schedule, Part I, Clause 4 (IS 1436 / OIML R 76-1)
  (
    'Weighbridge Vehicle Scale Class III (tonne) — Verification',
    'Weighbridge (Heavy Capacity)',
    'tonne',
    'percent',
    0.10,
    0.80,
    null,
    false,
    'Legal Metrology (General) Rules, 2011, Seventh Schedule, Part I, Clause 4 (Weighbridges). Maximum Permissible Error on verification: +/-0.10% of test load.'
  ),
  (
    'Weighbridge Platform Class III (kg) — Verification',
    'Weighbridge (Heavy Capacity)',
    'kg',
    'percent',
    0.10,
    0.80,
    null,
    false,
    'Legal Metrology (General) Rules, 2011, Seventh Schedule, Part I, Clause 4 (Weighbridges). Maximum Permissible Error on verification: +/-0.10% of test load.'
  ),

  -- Automatic Catchweighing Instrument - Seventh Schedule, Part II (OIML R 51-1)
  (
    'Automatic Catchweigher Category X(1) (kg) — Verification',
    'Automatic Catchweighing Instrument',
    'kg',
    'percent',
    0.15,
    0.80,
    null,
    false,
    'Legal Metrology (General) Rules, 2011, Seventh Schedule, Part II (OIML R 51-1 Category X(1)/Y(a)). Verification MPE: +/-0.15% of dynamic test load.'
  ),
  (
    'Automatic Catchweigher Small Pack Category X(1) (g) — Verification',
    'Automatic Catchweighing Instrument',
    'g',
    'percent',
    0.15,
    0.80,
    null,
    false,
    'Legal Metrology (General) Rules, 2011, Seventh Schedule, Part II. Verification MPE: +/-0.15% of dynamic package weight.'
  ),

  -- Fuel Dispenser / Flow Meter - Eighth Schedule, Part I (OIML R 117-1)
  (
    'Fuel Dispenser Class 0.5 (L) — Meter Verification',
    'Fuel Dispenser / Flow Meter',
    'L',
    'percent',
    0.30,
    0.80,
    null,
    false,
    'Legal Metrology (General) Rules, 2011, Eighth Schedule, Part I, Table 1 (Accuracy Class 0.5 for Fuel Dispensing Pumps). Verification MPE: +/-0.30% (+/-15 mL per 5 L test measure on initial verification, +/-0.50% in-service).'
  ),
  (
    'Flow Meter High Precision Class 0.3 (mL) — Verification',
    'Fuel Dispenser / Flow Meter',
    'mL',
    'percent',
    0.30,
    0.80,
    null,
    false,
    'Legal Metrology (General) Rules, 2011, Eighth Schedule, Part I, Table 1. Verification MPE: +/-0.30% of dispensed volume.'
  ),

  -- Storage Tank Metering System - Ninth Schedule (OIML R 85 / R 71)
  (
    'Storage Tank Metering System (L) — Verification',
    'Storage Tank Metering System',
    'L',
    'percent',
    0.20,
    0.80,
    null,
    false,
    'Legal Metrology (General) Rules, 2011, Ninth Schedule, Section B (Liquid Storage Tank Metering & Level Gauging). Calibration and verification MPE: +/-0.20% of nominal tank capacity/volume.'
  ),

  -- Material Measure of Length - Fifth Schedule, Part I (OIML R 35)
  (
    'Material Measure of Length Class II (m) — Verification',
    'Material Measure of Length',
    'm',
    'absolute',
    0.0005,
    0.80,
    null,
    false,
    'Legal Metrology (General) Rules, 2011, Fifth Schedule, Part I, Clause 5 (Accuracy Class II Commercial Length Measures). Verification MPE formula: +/-(0.3 + 0.2*L) mm; for 1 m reference: +/-0.5 mm (+/-0.0005 m).'
  ),
  (
    'Material Measure of Length Class II (cm) — Verification',
    'Material Measure of Length',
    'cm',
    'absolute',
    0.05,
    0.80,
    null,
    false,
    'Legal Metrology (General) Rules, 2011, Fifth Schedule, Part I, Clause 5 (Class II). Verification MPE: +/-0.05 cm (+/-0.5 mm).'
  ),

  -- Standard Test Weight - Third Schedule (OIML R 111-1)
  (
    'Standard Test Weight Class M2 (kg) — Commercial Verification',
    'Standard Test Weight',
    'kg',
    'percent',
    0.016,
    0.80,
    null,
    false,
    'Legal Metrology (General) Rules, 2011, Third Schedule, Table 1 (Commercial Weights, Class M2). Verification MPE: +/-160 mg per 1 kg (+/-0.016%).'
  ),
  (
    'Standard Test Weight Class M2 (g) — Verification',
    'Standard Test Weight',
    'g',
    'percent',
    0.016,
    0.80,
    null,
    false,
    'Legal Metrology (General) Rules, 2011, Third Schedule, Table 1. Verification MPE: +/-0.016% of nominal weight.'
  );

-- 2. Upgrade public.assess_measurement() with automatic tolerance rule resolution
create or replace function public.assess_measurement()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r public.tolerance_rules;
  tol numeric;
  dev numeric;
  insp public.inspections;
  inst public.instruments;
begin
  -- Fetch parent inspection
  select * into insp from public.inspections where id = new.inspection_id;
  if insp.id is null then
    raise exception 'Inspection % not found', new.inspection_id;
  end if;

  -- 1. Try currently linked rule on inspection
  if insp.tolerance_rule_id is not null then
    select tr.* into r from public.tolerance_rules tr where tr.id = insp.tolerance_rule_id;
  end if;

  -- 2. If no rule is attached to the inspection, resolve from instrument
  if r.id is null then
    select * into inst from public.instruments where id = insp.instrument_id;
    if inst.id is not null then
      -- Match by category and unit (prioritize non-demo, exact unit match)
      select tr.* into r from public.tolerance_rules tr
        where tr.category = inst.category
          and (tr.unit = new.unit or tr.unit = inst.unit)
          and (tr.authority_id is null or tr.authority_id = (select authority_id from public.verification_requests where id = insp.request_id))
        order by (tr.is_demo = false) desc, (tr.unit = new.unit) desc, tr.created_at asc
        limit 1;

      -- If found, update inspection and request
      if r.id is not null then
        update public.inspections set tolerance_rule_id = r.id where id = insp.id;
        update public.verification_requests set tolerance_rule_id = coalesce(tolerance_rule_id, r.id) where id = insp.request_id;
      end if;
    end if;
  end if;

  -- 3. If still no rule, raise descriptive error requiring administrative configuration
  if r.id is null then
    raise exception 'No tolerance rule configured for this inspection. Administrative configuration required for instrument category: %', coalesce(inst.category, 'Unspecified');
  end if;

  -- 4. Calculate tolerance and deviation
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

-- 3. Upgrade public.claim_request() to match both category and unit
create or replace function public.claim_request(p_request_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  r public.verification_requests;
  inst public.instruments;
  iid uuid;
  rule uuid;
begin
  if not public.has_role(auth.uid(),'inspector') then
    raise exception 'Only a verification authority can take an assignment';
  end if;

  select * into r from public.verification_requests where id = p_request_id;
  if r.id is null then
    raise exception 'Request not found';
  end if;

  if r.assigned_to is not null and r.assigned_to <> auth.uid() then
    raise exception 'Already assigned to another inspector';
  end if;

  select * into inst from public.instruments where id = r.instrument_id;

  -- Resolve rule by category and unit
  select id into rule from public.tolerance_rules tr
    where tr.category = inst.category
      and tr.unit = inst.unit
      and (tr.authority_id is null or tr.authority_id = public.current_authority_id())
    order by (tr.is_demo = false) desc, tr.created_at asc
    limit 1;

  update public.verification_requests
    set assigned_to = auth.uid(),
        assigned_at = now(),
        status = 'under_review',
        authority_id = coalesce(authority_id, public.current_authority_id()),
        tolerance_rule_id = coalesce(tolerance_rule_id, rule),
        updated_at = now()
  where id = p_request_id;

  select id into iid from public.inspections where request_id = p_request_id and inspector_id = auth.uid();
  if iid is null then
    insert into public.inspections (request_id, instrument_id, inspector_id, tolerance_rule_id, status)
    values (p_request_id, r.instrument_id, auth.uid(), coalesce(r.tolerance_rule_id, rule), 'in_progress')
    returning id into iid;
  elsif rule is not null then
    update public.inspections
      set tolerance_rule_id = coalesce(tolerance_rule_id, rule)
      where id = iid and tolerance_rule_id is null;
  end if;

  insert into public.audit_events (entity_type, entity_id, action, actor_id, actor_role, business_id)
  values ('verification_request', p_request_id, 'request.assigned', auth.uid(), 'inspector', r.business_id);

  return iid;
end; $$;
