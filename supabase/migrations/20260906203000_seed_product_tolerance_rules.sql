-- Migration: Seed product owner configured tolerance rules & update assessment trigger
-- Matches:
-- 1. Non-Automatic Weighing Instrument (NAWI): Class I (±0.05%), Class II (±0.1%), Class III (±0.1%), Class IIII (±0.5%)
-- 2. Automatic Catchweighing Instrument: ±0.3% of reading OR ±1 verification scale interval, whichever is greater
-- 3. Fuel Dispenser / Flow Meter: ±0.3% of delivered volume
-- 4. Storage Tank Metering System: ±0.5% of measured volume
-- 5. Material Measure of Length: ±1 mm per metre (±0.1%), minimum ±1 mm
-- 6. Standard Test Weight: M1 (±0.05%), M2 (±0.1%), M3 (±0.2%)
-- 7. Weighbridge (Heavy Capacity): ±0.1% of reading
-- 8. Other Legal Metrology Equipment: fallback ±0.5% of reading
-- Plus category aliases present in application data

-- Clean up any prior demo rules
delete from public.tolerance_rules where is_demo = true;

-- Insert configured rules
insert into public.tolerance_rules (name, category, unit, tolerance_type, tolerance_value, near_boundary_fraction, authority_id, is_demo, source_note) values
  -- 1. Non-Automatic Weighing Instrument (NAWI)
  ('NAWI Class I — ±0.05% of reading', 'Non-Automatic Weighing Instrument (NAWI)', 'mg', 'percent', 0.05, 0.8, null, false, 'Class I Special Accuracy: ±0.05% of reading'),
  ('NAWI Class I — ±0.05% of reading', 'Non-Automatic Weighing Instrument (NAWI)', 'g', 'percent', 0.05, 0.8, null, false, 'Class I Special Accuracy: ±0.05% of reading'),
  ('NAWI Class II — ±0.1% of reading', 'Non-Automatic Weighing Instrument (NAWI)', 'g', 'percent', 0.10, 0.8, null, false, 'Class II High Accuracy: ±0.1% of reading'),
  ('NAWI Class II — ±0.1% of reading', 'Non-Automatic Weighing Instrument (NAWI)', 'kg', 'percent', 0.10, 0.8, null, false, 'Class II High Accuracy: ±0.1% of reading'),
  ('NAWI Class III — ±0.1% of reading', 'Non-Automatic Weighing Instrument (NAWI)', 'kg', 'percent', 0.10, 0.8, null, false, 'Class III Medium Accuracy: ±0.1% of reading'),
  ('NAWI Class III — ±0.1% of reading', 'Non-Automatic Weighing Instrument (NAWI)', 'g', 'percent', 0.10, 0.8, null, false, 'Class III Medium Accuracy: ±0.1% of reading'),
  ('NAWI Class III — ±0.1% of reading', 'Non-Automatic Weighing Instrument (NAWI)', 'tonne', 'percent', 0.10, 0.8, null, false, 'Class III Medium Accuracy: ±0.1% of reading'),
  ('NAWI Class III — ±0.1% of reading', 'Non-Automatic Weighing Instrument (NAWI)', 'L', 'percent', 0.10, 0.8, null, false, 'Class III Medium Accuracy: ±0.1% of reading'),
  ('NAWI Class IIII — ±0.5% of reading', 'Non-Automatic Weighing Instrument (NAWI)', 'kg', 'percent', 0.50, 0.8, null, false, 'Class IIII Ordinary Accuracy: ±0.5% of reading'),
  ('NAWI Class IIII — ±0.5% of reading', 'Non-Automatic Weighing Instrument (NAWI)', 'tonne', 'percent', 0.50, 0.8, null, false, 'Class IIII Ordinary Accuracy: ±0.5% of reading'),

  -- NAWI Aliases (e.g. Electronic Retail Counter Scale, Weighing instrument)
  ('NAWI Class III — ±0.1% of reading', 'Electronic Retail Counter Scale', 'kg', 'percent', 0.10, 0.8, null, false, 'Class III Commercial Retail Counter Scale: ±0.1% of reading'),
  ('NAWI Class III — ±0.1% of reading', 'Electronic Retail Counter Scale', 'g', 'percent', 0.10, 0.8, null, false, 'Class III Commercial Retail Counter Scale: ±0.1% of reading'),
  ('NAWI Class III — ±0.1% of reading', 'Weighing instrument', 'kg', 'percent', 0.10, 0.8, null, false, 'Weighing Instrument: ±0.1% of reading'),

  -- 2. Automatic Catchweighing Instrument
  ('Automatic Catchweighing Instrument — ±0.3% (or ≥ 1 scale interval)', 'Automatic Catchweighing Instrument', 'kg', 'percent', 0.30, 0.8, null, false, '±0.3% of reading OR ±1 verification scale interval, whichever is greater'),
  ('Automatic Catchweighing Instrument — ±0.3% (or ≥ 1 scale interval)', 'Automatic Catchweighing Instrument', 'g', 'percent', 0.30, 0.8, null, false, '±0.3% of reading OR ±1 verification scale interval, whichever is greater'),
  ('Automatic Catchweighing Instrument — ±0.3% (or ≥ 1 scale interval)', 'Automatic Catchweighing Instrument', 'tonne', 'percent', 0.30, 0.8, null, false, '±0.3% of reading OR ±1 verification scale interval, whichever is greater'),
  ('Automatic Weighing Instrument — ±0.3% (or ≥ 1 scale interval)', 'Automatic Weighing Instrument', 'kg', 'percent', 0.30, 0.8, null, false, '±0.3% of reading OR ±1 verification scale interval, whichever is greater'),
  ('Automatic Weighing Instrument — ±0.3% (or ≥ 1 scale interval)', 'Automatic Weighing Instrument', 'g', 'percent', 0.30, 0.8, null, false, '±0.3% of reading OR ±1 verification scale interval, whichever is greater'),

  -- 3. Fuel Dispenser / Flow Meter
  ('Fuel Dispenser / Flow Meter — ±0.3% of delivered volume', 'Fuel Dispenser / Flow Meter', 'L', 'percent', 0.30, 0.8, null, false, '±0.3% of delivered volume'),
  ('Fuel Dispenser / Flow Meter — ±0.3% of delivered volume', 'Fuel Dispenser / Flow Meter', 'mL', 'percent', 0.30, 0.8, null, false, '±0.3% of delivered volume'),
  ('Volumetric Measure — ±0.3% of delivered volume', 'Volumetric Measure', 'L', 'percent', 0.30, 0.8, null, false, '±0.3% of delivered volume'),
  ('Volumetric Measure — ±0.3% of delivered volume', 'Volumetric Measure', 'mL', 'percent', 0.30, 0.8, null, false, '±0.3% of delivered volume'),
  ('Volume measure — ±0.3% of delivered volume', 'Volume measure', 'L', 'percent', 0.30, 0.8, null, false, '±0.3% of delivered volume'),

  -- 4. Storage Tank Metering System
  ('Storage Tank Metering System — ±0.5% of measured volume', 'Storage Tank Metering System', 'L', 'percent', 0.50, 0.8, null, false, '±0.5% of measured volume'),
  ('Storage Tank Metering System — ±0.5% of measured volume', 'Storage Tank Metering System', 'mL', 'percent', 0.50, 0.8, null, false, '±0.5% of measured volume'),
  ('Storage Tank Capacity Measure — ±0.5% of measured volume', 'Storage Tank Capacity Measure', 'L', 'percent', 0.50, 0.8, null, false, '±0.5% of measured volume'),
  ('Storage Tank Capacity Measure — ±0.5% of measured volume', 'Storage Tank Capacity Measure', 'mL', 'percent', 0.50, 0.8, null, false, '±0.5% of measured volume'),

  -- 5. Material Measure of Length
  ('Material Measure of Length — ±1 mm/m (±0.1%, min ±1 mm)', 'Material Measure of Length', 'm', 'percent', 0.10, 0.8, null, false, '±1 mm per metre of measured length (±0.1%), with minimum ±1 mm'),
  ('Material Measure of Length — ±1 mm/m (±0.1%, min ±1 mm)', 'Material Measure of Length', 'cm', 'percent', 0.10, 0.8, null, false, '±1 mm per metre of measured length (±0.1%), with minimum ±1 mm (±0.1 cm)'),
  ('Linear Measure / Meter — ±1 mm/m (±0.1%, min ±1 mm)', 'Linear Measure / Meter', 'm', 'percent', 0.10, 0.8, null, false, '±1 mm per metre of measured length (±0.1%), with minimum ±1 mm'),
  ('Linear Measure / Meter — ±1 mm/m (±0.1%, min ±1 mm)', 'Linear Measure / Meter', 'cm', 'percent', 0.10, 0.8, null, false, '±1 mm per metre of measured length (±0.1%), with minimum ±1 mm (±0.1 cm)'),
  ('Length measure — ±1 mm/m (±0.1%, min ±1 mm)', 'Length measure', 'm', 'percent', 0.10, 0.8, null, false, '±1 mm per metre of measured length (±0.1%), with minimum ±1 mm'),

  -- 6. Standard Test Weight
  ('Standard Test Weight Class M1 — ±0.05% of nominal value', 'Standard Test Weight', 'kg', 'percent', 0.05, 0.8, null, false, 'M1: ±0.05% of nominal value'),
  ('Standard Test Weight Class M1 — ±0.05% of nominal value', 'Standard Test Weight', 'g', 'percent', 0.05, 0.8, null, false, 'M1: ±0.05% of nominal value'),
  ('Standard Test Weight Class M2 — ±0.1% of nominal value', 'Standard Test Weight', 'kg', 'percent', 0.10, 0.8, null, false, 'M2: ±0.1% of nominal value'),
  ('Standard Test Weight Class M2 — ±0.1% of nominal value', 'Standard Test Weight', 'g', 'percent', 0.10, 0.8, null, false, 'M2: ±0.1% of nominal value'),
  ('Standard Test Weight Class M3 — ±0.2% of nominal value', 'Standard Test Weight', 'kg', 'percent', 0.20, 0.8, null, false, 'M3: ±0.2% of nominal value'),
  ('Standard Test Weight Class M3 — ±0.2% of nominal value', 'Standard Test Weight', 'g', 'percent', 0.20, 0.8, null, false, 'M3: ±0.2% of nominal value'),

  -- 7. Weighbridge (Heavy Capacity)
  ('Weighbridge (Heavy Capacity) — ±0.1% of reading', 'Weighbridge (Heavy Capacity)', 'tonne', 'percent', 0.10, 0.8, null, false, '±0.1% of reading'),
  ('Weighbridge (Heavy Capacity) — ±0.1% of reading', 'Weighbridge (Heavy Capacity)', 'kg', 'percent', 0.10, 0.8, null, false, '±0.1% of reading'),

  -- 8. Other Legal Metrology Equipment (fallback)
  ('Other Legal Metrology Equipment — ±0.5% fallback', 'Other Legal Metrology Equipment', 'kg', 'percent', 0.50, 0.8, null, false, 'Fallback: ±0.5% of reading'),
  ('Other Legal Metrology Equipment — ±0.5% fallback', 'Other Legal Metrology Equipment', 'g', 'percent', 0.50, 0.8, null, false, 'Fallback: ±0.5% of reading'),
  ('Other Legal Metrology Equipment — ±0.5% fallback', 'Other Legal Metrology Equipment', 'mg', 'percent', 0.50, 0.8, null, false, 'Fallback: ±0.5% of reading'),
  ('Other Legal Metrology Equipment — ±0.5% fallback', 'Other Legal Metrology Equipment', 'tonne', 'percent', 0.50, 0.8, null, false, 'Fallback: ±0.5% of reading'),
  ('Other Legal Metrology Equipment — ±0.5% fallback', 'Other Legal Metrology Equipment', 'L', 'percent', 0.50, 0.8, null, false, 'Fallback: ±0.5% of reading'),
  ('Other Legal Metrology Equipment — ±0.5% fallback', 'Other Legal Metrology Equipment', 'mL', 'percent', 0.50, 0.8, null, false, 'Fallback: ±0.5% of reading'),
  ('Other Legal Metrology Equipment — ±0.5% fallback', 'Other Legal Metrology Equipment', 'm', 'percent', 0.50, 0.8, null, false, 'Fallback: ±0.5% of reading'),
  ('Other Legal Metrology Equipment — ±0.5% fallback', 'Other Legal Metrology Equipment', 'cm', 'percent', 0.50, 0.8, null, false, 'Fallback: ±0.5% of reading')
on conflict do nothing;

-- Update assess_measurement trigger function with full resolution and minimum threshold handling
create or replace function public.assess_measurement()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r public.tolerance_rules;
  tol numeric;
  dev numeric;
  insp public.inspections;
  inst public.instruments;
  min_tol numeric;
begin
  select * into insp from public.inspections where id = new.inspection_id;
  if insp.id is null then
    raise exception 'Inspection % not found', new.inspection_id;
  end if;

  select * into inst from public.instruments where id = insp.instrument_id;

  -- 1. Try currently linked rule on inspection
  if insp.tolerance_rule_id is not null then
    select tr.* into r from public.tolerance_rules tr where tr.id = insp.tolerance_rule_id;
  end if;

  -- 2. If no rule is attached, resolve from instrument category & unit
  if r.id is null and inst.id is not null then
    -- Try specific category match with unit
    select tr.* into r from public.tolerance_rules tr
      where (tr.category = inst.category
             or (inst.category in ('Non-Automatic Weighing Instrument (NAWI)', 'Electronic Retail Counter Scale', 'Weighing instrument') and tr.category in ('Non-Automatic Weighing Instrument (NAWI)', 'Electronic Retail Counter Scale', 'Weighing instrument'))
             or (inst.category in ('Automatic Catchweighing Instrument', 'Automatic Weighing Instrument') and tr.category in ('Automatic Catchweighing Instrument', 'Automatic Weighing Instrument'))
             or (inst.category in ('Fuel Dispenser / Flow Meter', 'Volumetric Measure', 'Volume measure') and tr.category in ('Fuel Dispenser / Flow Meter', 'Volumetric Measure', 'Volume measure'))
             or (inst.category in ('Storage Tank Metering System', 'Storage Tank Capacity Measure') and tr.category in ('Storage Tank Metering System', 'Storage Tank Capacity Measure'))
             or (inst.category in ('Material Measure of Length', 'Linear Measure / Meter', 'Length measure') and tr.category in ('Material Measure of Length', 'Linear Measure / Meter', 'Length measure'))
             or (inst.category in ('Standard Test Weight') and tr.category in ('Standard Test Weight'))
             or (inst.category in ('Weighbridge (Heavy Capacity)') and tr.category in ('Weighbridge (Heavy Capacity)'))
            )
        and (tr.unit = new.unit or tr.unit = inst.unit)
        and (tr.authority_id is null or tr.authority_id = (select authority_id from public.verification_requests where id = insp.request_id))
        and tr.category <> 'Other Legal Metrology Equipment'
      order by (tr.category = inst.category) desc, (tr.unit = new.unit) desc, tr.created_at asc
      limit 1;

    -- If no specific category with unit, try specific category any unit
    if r.id is null then
      select tr.* into r from public.tolerance_rules tr
        where (tr.category = inst.category
               or (inst.category in ('Non-Automatic Weighing Instrument (NAWI)', 'Electronic Retail Counter Scale', 'Weighing instrument') and tr.category in ('Non-Automatic Weighing Instrument (NAWI)', 'Electronic Retail Counter Scale', 'Weighing instrument'))
               or (inst.category in ('Automatic Catchweighing Instrument', 'Automatic Weighing Instrument') and tr.category in ('Automatic Catchweighing Instrument', 'Automatic Weighing Instrument'))
               or (inst.category in ('Fuel Dispenser / Flow Meter', 'Volumetric Measure', 'Volume measure') and tr.category in ('Fuel Dispenser / Flow Meter', 'Volumetric Measure', 'Volume measure'))
               or (inst.category in ('Storage Tank Metering System', 'Storage Tank Capacity Measure') and tr.category in ('Storage Tank Metering System', 'Storage Tank Capacity Measure'))
               or (inst.category in ('Material Measure of Length', 'Linear Measure / Meter', 'Length measure') and tr.category in ('Material Measure of Length', 'Linear Measure / Meter', 'Length measure'))
               or (inst.category in ('Standard Test Weight') and tr.category in ('Standard Test Weight'))
               or (inst.category in ('Weighbridge (Heavy Capacity)') and tr.category in ('Weighbridge (Heavy Capacity)'))
              )
          and (tr.authority_id is null or tr.authority_id = (select authority_id from public.verification_requests where id = insp.request_id))
          and tr.category <> 'Other Legal Metrology Equipment'
        order by (tr.category = inst.category) desc, tr.created_at asc
        limit 1;
    end if;

    -- Fallback rule: Other Legal Metrology Equipment (±0.5%)
    if r.id is null then
      select tr.* into r from public.tolerance_rules tr
        where tr.category = 'Other Legal Metrology Equipment'
        order by (tr.unit = new.unit or tr.unit = inst.unit) desc, tr.created_at asc
        limit 1;
    end if;

    -- If found, update inspection and request
    if r.id is not null then
      update public.inspections set tolerance_rule_id = r.id where id = insp.id;
      update public.verification_requests set tolerance_rule_id = coalesce(tolerance_rule_id, r.id) where id = insp.request_id;
    end if;
  end if;

  if r.id is null then
    raise exception 'No tolerance rule configured for this inspection. Administrative configuration required for instrument category: %', coalesce(inst.category, 'Unspecified');
  end if;

  -- Calculate base tolerance
  tol := case when r.tolerance_type = 'percent'
              then abs(new.reference_value) * r.tolerance_value / 100
              else r.tolerance_value end;

  -- Catchweighing rule: max(±0.3%, 1 verification scale interval)
  if (r.category ilike '%Catchweigh%' or r.category ilike '%Automatic Weighing%' or coalesce(inst.category, '') ilike '%Catchweigh%' or coalesce(inst.category, '') ilike '%Automatic Weighing%')
     and inst.resolution_value is not null and inst.resolution_value > 0 then
    if inst.resolution_value > tol then
      tol := inst.resolution_value;
    end if;
  end if;

  -- Material Measure of Length rule: ±1 mm per metre (±0.1%), minimum ±1 mm
  if (r.category ilike '%Length%' or r.category ilike '%Linear%' or coalesce(inst.category, '') ilike '%Length%' or coalesce(inst.category, '') ilike '%Linear%') then
    min_tol := case when lower(new.unit) = 'cm' then 0.1
                    when lower(new.unit) = 'mm' then 1.0
                    else 0.001 end;
    if tol < min_tol then
      tol := min_tol;
    end if;
  end if;

  dev := new.observed_value - new.reference_value;
  new.deviation := dev;
  new.tolerance_applied := tol;
  new.result := case
    when abs(dev) > tol then 'fail'::public.measurement_result
    when abs(dev) >= tol * r.near_boundary_fraction then 'review'::public.measurement_result
    else 'pass'::public.measurement_result end;
  return new;
end; $$;

-- Update existing inspections and requests that have missing tolerance_rule_id
update public.inspections insp
set tolerance_rule_id = (
  select tr.id from public.tolerance_rules tr
  join public.instruments i on i.id = insp.instrument_id
  where (tr.category = i.category
         or (i.category in ('Non-Automatic Weighing Instrument (NAWI)', 'Electronic Retail Counter Scale', 'Weighing instrument') and tr.category = 'Non-Automatic Weighing Instrument (NAWI)')
         or (i.category in ('Automatic Catchweighing Instrument', 'Automatic Weighing Instrument') and tr.category = 'Automatic Catchweighing Instrument')
         or (i.category in ('Fuel Dispenser / Flow Meter', 'Volumetric Measure', 'Volume measure') and tr.category = 'Fuel Dispenser / Flow Meter')
         or (i.category in ('Storage Tank Metering System', 'Storage Tank Capacity Measure') and tr.category = 'Storage Tank Metering System')
         or (i.category in ('Material Measure of Length', 'Linear Measure / Meter', 'Length measure') and tr.category = 'Material Measure of Length')
         or (i.category in ('Standard Test Weight') and tr.category = 'Standard Test Weight')
         or (i.category in ('Weighbridge (Heavy Capacity)') and tr.category = 'Weighbridge (Heavy Capacity)')
         or tr.category = 'Other Legal Metrology Equipment'
        )
    and (tr.unit = i.unit or tr.category = 'Other Legal Metrology Equipment')
  order by (tr.category = i.category) desc, (tr.unit = i.unit) desc, (tr.category <> 'Other Legal Metrology Equipment') desc
  limit 1
)
where insp.tolerance_rule_id is null;

update public.verification_requests vr
set tolerance_rule_id = (
  select tr.id from public.tolerance_rules tr
  join public.instruments i on i.id = vr.instrument_id
  where (tr.category = i.category
         or (i.category in ('Non-Automatic Weighing Instrument (NAWI)', 'Electronic Retail Counter Scale', 'Weighing instrument') and tr.category = 'Non-Automatic Weighing Instrument (NAWI)')
         or (i.category in ('Automatic Catchweighing Instrument', 'Automatic Weighing Instrument') and tr.category = 'Automatic Catchweighing Instrument')
         or (i.category in ('Fuel Dispenser / Flow Meter', 'Volumetric Measure', 'Volume measure') and tr.category = 'Fuel Dispenser / Flow Meter')
         or (i.category in ('Storage Tank Metering System', 'Storage Tank Capacity Measure') and tr.category = 'Storage Tank Metering System')
         or (i.category in ('Material Measure of Length', 'Linear Measure / Meter', 'Length measure') and tr.category = 'Material Measure of Length')
         or (i.category in ('Standard Test Weight') and tr.category = 'Standard Test Weight')
         or (i.category in ('Weighbridge (Heavy Capacity)') and tr.category = 'Weighbridge (Heavy Capacity)')
         or tr.category = 'Other Legal Metrology Equipment'
        )
    and (tr.unit = i.unit or tr.category = 'Other Legal Metrology Equipment')
  order by (tr.category = i.category) desc, (tr.unit = i.unit) desc, (tr.category <> 'Other Legal Metrology Equipment') desc
  limit 1
)
where vr.tolerance_rule_id is null;
