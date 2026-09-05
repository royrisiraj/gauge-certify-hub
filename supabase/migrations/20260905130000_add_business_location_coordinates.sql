-- Migration: Add structured geographic coordinates and locality to public.businesses
-- and update bootstrap_account() to authoritatively accept and store location data.

-- 1. Add coordinates and locality columns to public.businesses
alter table public.businesses
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists locality text;

-- 2. Drop historical signatures of bootstrap_account
drop function if exists public.bootstrap_account(text, public.app_role, text, uuid, text, text, text);
drop function if exists public.bootstrap_account(text, public.app_role, text, uuid, text, text, text, text, text, text, text, double precision, double precision);
drop function if exists public.bootstrap_account(text, public.app_role, text, uuid, text, text, text, text, text, text, text, text, double precision, double precision);

-- 3. Create updated, idempotent bootstrap_account function
create or replace function public.bootstrap_account(
  p_full_name text,
  p_role public.app_role,
  p_business_name text default null,
  p_authority_id uuid default null,
  p_designation text default null,
  p_phone text default null,
  p_contact_email text default null,
  p_address_line text default null,
  p_locality text default null,
  p_city text default null,
  p_state text default null,
  p_pincode text default null,
  p_latitude double precision default null,
  p_longitude double precision default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  bid uuid;
  existing_profile public.profiles%rowtype;
  existing_business public.businesses%rowtype;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'Full name is required';
  end if;

  select * into existing_profile from public.profiles where id = uid;

  if p_role = 'business' then
    -- CASE B: Profile exists AND profiles.business_id is already linked
    if existing_profile.id is not null and existing_profile.business_id is not null then
      select * into existing_business from public.businesses where id = existing_profile.business_id;
      if existing_business.id is not null then
        bid := existing_business.id;
      end if;
    end if;

    -- CASE C: Profile exists BUT profiles.business_id is NULL
    -- Check if user already owns a business record
    if bid is null then
      select * into existing_business from public.businesses
      where owner_id = uid
      order by created_at desc
      limit 1;

      if existing_business.id is not null then
        bid := existing_business.id;
      end if;
    end if;

    -- If existing business is found, update only provided non-blank fields, preserving existing data
    if bid is not null then
      update public.businesses
      set
        name = coalesce(nullif(trim(p_business_name), ''), name),
        contact_phone = coalesce(nullif(trim(p_phone), ''), contact_phone),
        contact_email = coalesce(nullif(trim(p_contact_email), ''), contact_email),
        address_line = coalesce(nullif(trim(p_address_line), ''), address_line),
        locality = coalesce(nullif(trim(p_locality), ''), locality),
        city = coalesce(nullif(trim(p_city), ''), city),
        state = coalesce(nullif(trim(p_state), ''), state),
        pincode = coalesce(nullif(trim(p_pincode), ''), pincode),
        latitude = coalesce(p_latitude, latitude),
        longitude = coalesce(p_longitude, longitude)
      where id = bid;
    else
      -- CASE A: No business exists for owner: create business record
      if coalesce(trim(p_business_name), '') = '' then
        raise exception 'Business name is required';
      end if;

      insert into public.businesses (
        name,
        owner_id,
        contact_email,
        contact_phone,
        address_line,
        locality,
        city,
        state,
        pincode,
        latitude,
        longitude
      ) values (
        trim(p_business_name),
        uid,
        nullif(trim(p_contact_email), ''),
        nullif(trim(p_phone), ''),
        nullif(trim(p_address_line), ''),
        nullif(trim(p_locality), ''),
        nullif(trim(p_city), ''),
        nullif(trim(p_state), ''),
        nullif(trim(p_pincode), ''),
        p_latitude,
        p_longitude
      ) returning id into bid;
    end if;

    if bid is null then
      raise exception 'Failed to establish business record for business owner';
    end if;

    -- Atomically create or update profile and link profiles.business_id = bid
    if existing_profile.id is not null then
      update public.profiles
      set
        full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
        phone = coalesce(nullif(trim(p_phone), ''), phone),
        business_id = bid
      where id = uid;
    else
      insert into public.profiles (id, full_name, phone, business_id)
      values (uid, trim(p_full_name), nullif(trim(p_phone), ''), bid);
    end if;

  else -- p_role = 'inspector'
    if p_authority_id is null and existing_profile.authority_id is null then
      raise exception 'Select a verification authority';
    end if;

    if existing_profile.id is not null then
      update public.profiles
      set
        full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
        phone = coalesce(nullif(trim(p_phone), ''), phone),
        designation = coalesce(nullif(trim(p_designation), ''), designation),
        authority_id = coalesce(p_authority_id, authority_id)
      where id = uid;
    else
      insert into public.profiles (id, full_name, phone, designation, authority_id)
      values (uid, trim(p_full_name), nullif(trim(p_phone), ''), nullif(trim(p_designation), ''), p_authority_id);
    end if;
  end if;

  -- Ensure the role exists for this user (idempotent duplicate protection)
  insert into public.user_roles (user_id, role)
  values (uid, p_role)
  on conflict (user_id, role) do nothing;

  -- Audit log event
  insert into public.audit_events (entity_type, entity_id, action, actor_id, actor_role, business_id)
  values ('account', uid, 'account.bootstrapped', uid, p_role::text, bid);

  return jsonb_build_object('role', p_role, 'business_id', bid);
end; $$;

revoke execute on function public.bootstrap_account(text, public.app_role, text, uuid, text, text, text, text, text, text, text, text, double precision, double precision) from public, anon;
grant execute on function public.bootstrap_account(text, public.app_role, text, uuid, text, text, text, text, text, text, text, text, double precision, double precision) to authenticated;
