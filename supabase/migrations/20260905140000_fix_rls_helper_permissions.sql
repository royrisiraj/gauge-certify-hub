-- Migration: Restore EXECUTE privileges on RLS helper functions for authenticated role.
-- 
-- In migration 20260904111506, EXECUTE was revoked on has_role, current_business_id,
-- and current_authority_id from 'authenticated'.
-- 
-- However, Row Level Security (RLS) policies on:
--   - profiles
--   - businesses
--   - instruments
--   - verification_requests
--   - inspections
--   - certificates
--   - audit_events
-- all call public.has_role(auth.uid(), ...) and/or public.current_business_id().
-- 
-- When an authenticated user executes any query on these tables, PostgreSQL evaluates
-- RLS policies under the querying user's role ('authenticated'). Without EXECUTE privilege,
-- PostgreSQL aborts with: "permission denied for function has_role".
-- 
-- These functions are SECURITY DEFINER and STABLE. Granting EXECUTE to 'authenticated'
-- is required for PostgreSQL RLS evaluation while maintaining strict access control.
-- EXECUTE is NOT granted to 'anon' or 'public'.

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_business_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_authority_id() TO authenticated;
