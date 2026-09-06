-- Migration: Align tolerance_rules to exact product owner specifications
-- Removes superseded rules prior to the product owner configuration

delete from public.tolerance_rules
where created_at < '2026-09-06 14:42:00+00';

-- Re-sync any inspections pointing to deleted rules
update public.inspections insp
set tolerance_rule_id = (
  select tr.id from public.tolerance_rules tr
  join public.instruments i on i.id = insp.instrument_id
  where (tr.category = i.category
         or (i.category in ('Non-Automatic Weighing Instrument (NAWI)', 'Electronic Retail Counter Scale', 'Weighing instrument') and tr.category in ('Non-Automatic Weighing Instrument (NAWI)', 'Electronic Retail Counter Scale', 'Weighing instrument'))
         or (i.category in ('Automatic Catchweighing Instrument', 'Automatic Weighing Instrument') and tr.category in ('Automatic Catchweighing Instrument', 'Automatic Weighing Instrument'))
         or (i.category in ('Fuel Dispenser / Flow Meter', 'Volumetric Measure', 'Volume measure') and tr.category in ('Fuel Dispenser / Flow Meter', 'Volumetric Measure', 'Volume measure'))
         or (i.category in ('Storage Tank Metering System', 'Storage Tank Capacity Measure') and tr.category in ('Storage Tank Metering System', 'Storage Tank Capacity Measure'))
         or (i.category in ('Material Measure of Length', 'Linear Measure / Meter', 'Length measure') and tr.category in ('Material Measure of Length', 'Linear Measure / Meter', 'Length measure'))
         or (i.category in ('Standard Test Weight') and tr.category in ('Standard Test Weight'))
         or (i.category in ('Weighbridge (Heavy Capacity)') and tr.category in ('Weighbridge (Heavy Capacity)'))
         or tr.category = 'Other Legal Metrology Equipment'
        )
    and (tr.unit = i.unit or tr.category = 'Other Legal Metrology Equipment')
  order by (tr.category = i.category) desc, (tr.unit = i.unit) desc, (tr.category <> 'Other Legal Metrology Equipment') desc
  limit 1
)
where insp.tolerance_rule_id is null or not exists (select 1 from public.tolerance_rules where id = insp.tolerance_rule_id);

update public.verification_requests vr
set tolerance_rule_id = (
  select tr.id from public.tolerance_rules tr
  join public.instruments i on i.id = vr.instrument_id
  where (tr.category = i.category
         or (i.category in ('Non-Automatic Weighing Instrument (NAWI)', 'Electronic Retail Counter Scale', 'Weighing instrument') and tr.category in ('Non-Automatic Weighing Instrument (NAWI)', 'Electronic Retail Counter Scale', 'Weighing instrument'))
         or (i.category in ('Automatic Catchweighing Instrument', 'Automatic Weighing Instrument') and tr.category in ('Automatic Catchweighing Instrument', 'Automatic Weighing Instrument'))
         or (i.category in ('Fuel Dispenser / Flow Meter', 'Volumetric Measure', 'Volume measure') and tr.category in ('Fuel Dispenser / Flow Meter', 'Volumetric Measure', 'Volume measure'))
         or (i.category in ('Storage Tank Metering System', 'Storage Tank Capacity Measure') and tr.category in ('Storage Tank Metering System', 'Storage Tank Capacity Measure'))
         or (i.category in ('Material Measure of Length', 'Linear Measure / Meter', 'Length measure') and tr.category in ('Material Measure of Length', 'Linear Measure / Meter', 'Length measure'))
         or (i.category in ('Standard Test Weight') and tr.category in ('Standard Test Weight'))
         or (i.category in ('Weighbridge (Heavy Capacity)') and tr.category in ('Weighbridge (Heavy Capacity)')
         or tr.category = 'Other Legal Metrology Equipment')
        )
    and (tr.unit = i.unit or tr.category = 'Other Legal Metrology Equipment')
  order by (tr.category = i.category) desc, (tr.unit = i.unit) desc, (tr.category <> 'Other Legal Metrology Equipment') desc
  limit 1
)
where vr.tolerance_rule_id is null or not exists (select 1 from public.tolerance_rules where id = vr.tolerance_rule_id);
