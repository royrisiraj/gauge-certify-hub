-- Migration: Add geographic coordinates to public.instruments table
-- Supports precise instrument location mapping while preserving existing location_label records

alter table public.instruments
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;
