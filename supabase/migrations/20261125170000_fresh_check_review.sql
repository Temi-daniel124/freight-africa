-- Security review of the D044 fresh check: more invite roles need it, and wrong codes are counted one at a time.
create or replace function public.create_invite(p_org uuid, p_role text, p_phone text default null, p_email text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_role record;
  v_phone text := nullif(btrim(p_phone), '');
  v_email text := lower(nullif(btrim(p_email), ''));
  v_token text;
begin
  if not public.is_member(p_org) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into v_role from private.parse_role(p_org, p_role);
  -- Inviting anyone who can book, pay, see money or run the team needs a fresh check (D044, review).
  if coalesce(v_role.o_shipper::text, v_role.o_transporter::text, '') not in ('driver', 'viewer') and not private.fresh_ok() then
    raise exception 'confirm it is you first' using errcode = '28000';
  end if;
  if not private.can_grant(p_org, v_role.o_shipper, v_role.o_transporter) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_phone is null and v_email is null then
    raise exception 'a phone number or email is needed' using errcode = '22023';
  end if;
  -- Ten invites an hour per organisation is plenty for a real team and stops a flood.
  if (select count(*) from public.invites where org_id = p_org and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'too many invites' using errcode = '54000';
  end if;
  -- Someone already in the organisation doesn't need an invite.
  if exists (
    select 1 from public.organization_members m join public.profiles p on p.id = m.user_id
    where m.org_id = p_org and ((v_phone is not null and p.phone = v_phone) or (v_email is not null and p.email = v_email))
  ) then
    raise exception 'already a member' using errcode = '23505';
  end if;
  -- A new invite replaces an open one for the same person.
  update public.invites set revoked_at = now()
  where org_id = p_org and accepted_at is null and revoked_at is null
    and ((v_phone is not null and phone = v_phone) or (v_email is not null and email = v_email));
  v_token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_');
  insert into public.invites (kind, org_id, phone, email, role_payload, token_hash, invited_by)
  values (
    case when v_role.o_transporter = 'driver' then 'driver' else 'team_member' end,
    p_org, v_phone, v_email,
    case when v_role.o_shipper is not null then jsonb_build_object('shipper_role', v_role.o_shipper) else jsonb_build_object('transporter_role', v_role.o_transporter) end,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_user
  );
  return v_token;
end;
$$;

create or replace function public.fresh_try(p_user uuid) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  -- One try at a time per person, so tries sent together can't all slip past the limit (review).
  perform pg_advisory_xact_lock(hashtextextended('fresh_try:' || p_user::text, 0));
  if (select count(*) from private.fresh_tries where user_id = p_user and at > now() - interval '1 hour') >= 5 then
    return false;
  end if;
  insert into private.fresh_tries (user_id) values (p_user);
  return true;
end;
$$;
