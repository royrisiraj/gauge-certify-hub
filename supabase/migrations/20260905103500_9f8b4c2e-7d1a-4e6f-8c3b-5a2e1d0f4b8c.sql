-- Migration: Fix Business Owner account and business linkage in bootstrap_account
-- Makes bootstrap_account idempotent, repairs existing profiles missing business_id,
-- preserves existing business data without duplicates, and ensures transactional atomicity.

create or replace function public.bootstrap_account(
  p_full_name text,
  p_role public.app_role,
  p_business_name text default null,
  p_authority_id uuid default null,
  p_designation text default null,
  p_phone text default null,
  p_contact_email text default null
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
    -- 1. Check if user already has a valid linked business via profiles.business_id
    if existing_profile.id is not null and existing_profile.business_id is not null then
      select * into existing_business from public.businesses where id = existing_profile.business_id;
      if existing_business.id is not null then
        bid := existing_business.id;
      end if;
    end if;

    -- 2. If profile exists but profiles.business_id is null (or invalid), check if user already owns a business
    if bid is null then
      select * into existing_business from public.businesses
      where owner_id = uid
      order by created_at desc
      limit 1;

      if existing_business.id is not null then
        bid := existing_business.id;
      end if;
    end if;

    -- 3. If an existing business was found, preserve existing data and only fill in missing fields if provided
    if bid is not null then
      update public.businesses
      set
        name = coalesce(nullif(trim(name), ''), nullif(trim(p_business_name), ''), name),
        contact_phone = coalesce(contact_phone, nullif(trim(p_phone), '')),
        contact_email = coalesce(contact_email, nullif(trim(p_contact_email), ''))
      where id = bid;
    else
      -- 4. No business exists for owner: create business using supplied onboarding information
      if coalesce(trim(p_business_name), '') = '' then
        raise exception 'Business name is required';
      end if;

      insert into public.businesses (name, owner_id, contact_email, contact_phone)
      values (trim(p_business_name), uid, nullif(trim(p_contact_email), ''), nullif(trim(p_phone), ''))
      returning id into bid;
    end if;

    if bid is null then
      raise exception 'Failed to establish business record for business owner';
    end if;

    -- 5. Atomically create or update profile and link profiles.business_id = bid
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

  -- 6. Ensure the role exists for this user (idempotent)
  insert into public.user_roles (user_id, role)
  values (uid, p_role)
  on conflict (user_id, role) do nothing;

  -- 7. Audit log event
  insert into public.audit_events (entity_type, entity_id, action, actor_id, actor_role, business_id)
  values ('account', uid, 'account.bootstrapped', uid, p_role::text, bid);

  -- 8. Return the actual business_id and role
  return jsonb_build_object('role', p_role, 'business_id', bid);
end; $$;

revoke execute on function public.bootstrap_account(text, public.app_role, text, uuid, text, text, text) from public, anon;
grant execute on function public.bootstrap_account(text, public.app_role, text, uuid, text, text, text) to authenticated;
