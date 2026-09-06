-- Migration: Enable PASS and FAIL verification certificates / public results
-- Supports both VERIFIED (PASS) and NOT VERIFIED (FAIL) in the existing certificates table and verification flow

-- 1. Extend cert_status enum with 'failed' if not already present
ALTER TYPE public.cert_status ADD VALUE IF NOT EXISTS 'failed';

-- 2. Allow valid_until to be NULL for failed verification results (they do not have an expiration date)
ALTER TABLE public.certificates ALTER COLUMN valid_until DROP NOT NULL;

-- 3. Update issue_certificate RPC to support both PASS and FAIL decisions
CREATE OR REPLACE FUNCTION public.issue_certificate(p_decision_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d public.verification_decisions;
  months int;
  cid uuid;
  num text;
  code text;
  seq bigint;
  prefix text;
  cstatus public.cert_status;
  v_until date;
BEGIN
  IF NOT public.has_role(auth.uid(), 'inspector') THEN
    RAISE EXCEPTION 'Only a verification authority can issue a certificate or verification result';
  END IF;

  SELECT * INTO d FROM public.verification_decisions WHERE id = p_decision_id;
  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Decision not found';
  END IF;

  -- Idempotency: if a certificate/result already exists for this decision, return it
  IF EXISTS (SELECT 1 FROM public.certificates WHERE decision_id = p_decision_id) THEN
    SELECT id INTO cid FROM public.certificates WHERE decision_id = p_decision_id;
    RETURN cid;
  END IF;

  seq := (SELECT count(*) + 1 FROM public.certificates);
  code := 'EMAAP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  IF d.decision = 'failed' THEN
    prefix := 'VR-';
    cstatus := 'failed'::public.cert_status;
    v_until := NULL;
  ELSE
    prefix := 'VC-';
    cstatus := 'active'::public.cert_status;
    SELECT coalesce((value->>'months')::int, 12) INTO months FROM public.app_config WHERE key = 'certificate_validity';
    v_until := (current_date + (coalesce(months, 12) || ' months')::interval)::date;
  END IF;

  num := prefix || to_char(now(), 'YYYY') || '-' || lpad(seq::text, 6, '0');

  INSERT INTO public.certificates (
    decision_id,
    instrument_id,
    authority_id,
    certificate_number,
    verification_code,
    status,
    conditions,
    issued_by,
    valid_from,
    valid_until,
    status_reason
  ) VALUES (
    p_decision_id,
    d.instrument_id,
    d.authority_id,
    num,
    code,
    cstatus,
    d.conditions,
    auth.uid(),
    current_date,
    v_until,
    CASE WHEN d.decision = 'failed' THEN coalesce(d.override_reason, 'Verification criteria not satisfied') ELSE NULL END
  )
  RETURNING id INTO cid;

  -- Audit event
  INSERT INTO public.audit_events (entity_type, entity_id, action, actor_id, actor_role, business_id, detail)
  SELECT
    'certificate',
    cid,
    CASE WHEN d.decision = 'failed' THEN 'verification_result.issued' ELSE 'certificate.issued' END,
    auth.uid(),
    'inspector',
    i.business_id,
    jsonb_build_object(
      'certificate_number', num,
      'decision', d.decision,
      'status', cstatus
    )
  FROM public.instruments i WHERE i.id = d.instrument_id;

  -- Notification for business owner
  INSERT INTO public.notifications (user_id, title, body, link)
  SELECT
    b.owner_id,
    CASE WHEN d.decision = 'failed' THEN 'Verification Result Available' ELSE 'Certificate Issued' END,
    CASE
      WHEN d.decision = 'failed' THEN 'Verification result ' || num || ' (NOT VERIFIED — FAIL) was recorded.'
      ELSE 'Certificate ' || num || ' (VERIFIED — PASS) was issued.'
    END,
    '/business/certificates'
  FROM public.instruments i
  JOIN public.businesses b ON b.id = i.business_id
  WHERE i.id = d.instrument_id AND b.owner_id IS NOT NULL;

  RETURN cid;
END; $$;

GRANT EXECUTE ON FUNCTION public.issue_certificate(uuid) TO authenticated;

-- 4. Update record_decision to automatically generate the certificate/result
CREATE OR REPLACE FUNCTION public.record_decision(
  p_inspection_id uuid,
  p_decision public.decision_type,
  p_override_reason text default null,
  p_conditions text default null
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  insp public.inspections;
  calc public.decision_type;
  fails int;
  reviews int;
  total int;
  did uuid;
  cid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'inspector') THEN
    RAISE EXCEPTION 'Only a verification authority can record a decision';
  END IF;

  SELECT * INTO insp FROM public.inspections WHERE id = p_inspection_id;
  IF insp.id IS NULL THEN
    RAISE EXCEPTION 'Inspection not found';
  END IF;

  IF insp.inspector_id <> auth.uid() THEN
    RAISE EXCEPTION 'This inspection is assigned to another inspector';
  END IF;

  SELECT count(*), count(*) FILTER (WHERE result = 'fail'), count(*) FILTER (WHERE result = 'review')
    INTO total, fails, reviews FROM public.measurements WHERE inspection_id = p_inspection_id;

  IF total = 0 THEN
    RAISE EXCEPTION 'Record at least one measurement before deciding';
  END IF;

  calc := CASE
    WHEN fails > 0 THEN 'failed'::public.decision_type
    WHEN reviews > 0 THEN 'verified_with_conditions'::public.decision_type
    ELSE 'verified'::public.decision_type
  END;

  IF p_decision <> calc AND coalesce(trim(p_override_reason), '') = '' THEN
    RAISE EXCEPTION 'A reason is required when the decision differs from the calculated result';
  END IF;

  INSERT INTO public.verification_decisions (
    inspection_id,
    instrument_id,
    request_id,
    decided_by,
    authority_id,
    decision,
    calculated_result,
    override_reason,
    conditions
  ) VALUES (
    p_inspection_id,
    insp.instrument_id,
    insp.request_id,
    auth.uid(),
    public.current_authority_id(),
    p_decision,
    calc,
    nullif(trim(p_override_reason), ''),
    nullif(trim(p_conditions), '')
  )
  RETURNING id INTO did;

  UPDATE public.inspections SET status = 'submitted', submitted_at = now() WHERE id = p_inspection_id;
  UPDATE public.verification_requests SET status = 'completed', updated_at = now() WHERE id = insp.request_id;

  -- Audit decision
  INSERT INTO public.audit_events (entity_type, entity_id, action, actor_id, actor_role, business_id, detail)
  SELECT
    'verification_decision',
    did,
    'decision.recorded',
    auth.uid(),
    'inspector',
    i.business_id,
    jsonb_build_object('decision', p_decision, 'calculated', calc)
  FROM public.instruments i WHERE i.id = insp.instrument_id;

  -- Automatically generate certificate / public verification result for BOTH pass and fail
  cid := public.issue_certificate(did);

  RETURN did;
END; $$;

GRANT EXECUTE ON FUNCTION public.record_decision(uuid, public.decision_type, text, text) TO authenticated;

-- 5. Update public_verify to support both PASS and FAIL results, and include business info
CREATE OR REPLACE FUNCTION public.public_verify(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.certificates;
  i public.instruments;
  a public.verification_authorities;
  d public.verification_decisions;
  b public.businesses;
  req public.verification_requests;
  code text;
  soon int;
  state text;
BEGIN
  code := upper(trim(coalesce(p_code, '')));
  IF code = '' THEN
    RETURN jsonb_build_object('state', 'NOT_FOUND', 'query', p_code);
  END IF;

  SELECT coalesce((value->>'days')::int, 30) INTO soon FROM public.app_config WHERE key = 'expiring_soon_window';

  -- 1. Search by Certificate/Result Number or Verification Code
  SELECT * INTO c FROM public.certificates
  WHERE upper(verification_code) = code OR upper(certificate_number) = code
  LIMIT 1;

  -- 2. If not found by certificate, search by instrument serial or public code
  IF c.id IS NULL THEN
    SELECT * INTO i FROM public.instruments
    WHERE upper(public_code) = code OR upper(serial_number) = code
    LIMIT 1;

    IF i.id IS NULL THEN
      RETURN jsonb_build_object('state', 'NOT_FOUND', 'query', p_code);
    END IF;

    SELECT * INTO c FROM public.certificates c2
    WHERE c2.instrument_id = i.id
    ORDER BY c2.issued_at DESC
    LIMIT 1;
  END IF;

  IF c.id IS NOT NULL THEN
    SELECT * INTO i FROM public.instruments WHERE id = c.instrument_id;
    SELECT * INTO a FROM public.verification_authorities WHERE id = c.authority_id;
    SELECT * INTO d FROM public.verification_decisions WHERE id = c.decision_id;
    SELECT * INTO b FROM public.businesses WHERE id = i.business_id;

    state := CASE
      WHEN c.status = 'failed' OR (d.id IS NOT NULL AND d.decision = 'failed') THEN 'FAILED'
      WHEN c.status = 'suspended' THEN 'SUSPENDED'
      WHEN c.status = 'revoked' THEN 'REVOKED'
      WHEN c.valid_until IS NOT NULL AND c.valid_until < current_date THEN 'EXPIRED'
      WHEN c.valid_until IS NOT NULL AND c.valid_until <= current_date + soon THEN 'EXPIRING_SOON'
      ELSE 'VERIFIED'
    END;

    RETURN jsonb_build_object(
      'state', state,
      'query', p_code,
      'certificate', jsonb_build_object(
        'number', c.certificate_number,
        'code', c.verification_code,
        'status', c.status,
        'issued_at', c.issued_at,
        'valid_from', c.valid_from,
        'valid_until', c.valid_until,
        'status_reason', c.status_reason,
        'conditions', c.conditions,
        'is_demo', c.is_demo
      ),
      'instrument', jsonb_build_object(
        'category', i.category,
        'manufacturer', i.manufacturer,
        'model', i.model,
        'serial_number', i.serial_number,
        'public_code', i.public_code,
        'capacity_value', i.capacity_value,
        'capacity_unit', i.capacity_unit,
        'resolution_value', i.resolution_value,
        'unit', i.unit
      ),
      'business', CASE WHEN b.id IS NULL THEN NULL ELSE jsonb_build_object(
        'name', b.name,
        'city', b.city,
        'locality', b.locality,
        'state', b.state,
        'address', coalesce(b.address_line, b.locality, b.city)
      ) END,
      'authority', CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object(
        'name', a.name,
        'jurisdiction', a.jurisdiction_label,
        'is_demo', a.is_demo
      ) END,
      'decision', CASE WHEN d.id IS NULL THEN NULL ELSE jsonb_build_object(
        'decision', d.decision,
        'decided_at', d.decided_at,
        'conditions', d.conditions,
        'override_reason', d.override_reason
      ) END
    );
  END IF;

  -- Instrument found but no certificate issued yet
  SELECT * INTO b FROM public.businesses WHERE id = i.business_id;
  SELECT * INTO req FROM public.verification_requests WHERE instrument_id = i.id ORDER BY submitted_at DESC LIMIT 1;
  SELECT * INTO d FROM public.verification_decisions WHERE instrument_id = i.id ORDER BY decided_at DESC LIMIT 1;

  IF d.id IS NOT NULL AND d.decision = 'failed' THEN
    state := 'FAILED';
  ELSIF req.id IS NOT NULL AND req.status = 'rejected' THEN
    state := 'REJECTED';
  ELSIF req.id IS NOT NULL THEN
    state := 'PENDING';
  ELSE
    state := 'NOT_VERIFIED';
  END IF;

  RETURN jsonb_build_object(
    'state', state,
    'query', p_code,
    'instrument', jsonb_build_object(
      'category', i.category,
      'manufacturer', i.manufacturer,
      'model', i.model,
      'serial_number', i.serial_number,
      'public_code', i.public_code,
      'capacity_value', i.capacity_value,
      'capacity_unit', i.capacity_unit,
      'resolution_value', i.resolution_value,
      'unit', i.unit
    ),
    'business', CASE WHEN b.id IS NULL THEN NULL ELSE jsonb_build_object(
      'name', b.name,
      'city', b.city,
      'locality', b.locality,
      'state', b.state,
      'address', coalesce(b.address_line, b.locality, b.city)
    ) END,
    'decision', CASE WHEN d.id IS NULL THEN NULL ELSE jsonb_build_object(
      'decision', d.decision,
      'decided_at', d.decided_at,
      'conditions', d.conditions,
      'override_reason', d.override_reason
    ) END,
    'request', CASE WHEN req.id IS NULL THEN NULL ELSE jsonb_build_object(
      'status', req.status,
      'submitted_at', req.submitted_at
    ) end
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.public_verify(text) TO anon, authenticated;
