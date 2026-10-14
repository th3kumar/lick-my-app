-- Lick My App — Phase 1 functions (participants + admin).
-- All security definer; callers prove identity with a device token (phones)
-- or an admin session token (laptop). Errors are raised as short codes the
-- client maps to Sundial banners: not_admin, not_joined, username_taken,
-- username_length, locked, duplicate, max_chars, montage_too_long,
-- montage_required, has_characters, not_found, bad_passcode, invalid.

-- ---------- helpers (not callable by clients) ----------

create or replace function public._deadline(e public.events) returns timestamptz
language sql stable as $$
  select e.starts_at - (e.close_hours_before * interval '1 hour')
$$;

create or replace function public._locked(e public.events) returns boolean
language sql stable as $$
  select (not e.submissions_open)
      or (e.starts_at is not null and now() >= public._deadline(e))
      or e.phase not in ('draft', 'pre')
$$;

create or replace function public._event_json(e public.events) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'id', e.id, 'slug', e.slug, 'name', e.name, 'topic', e.topic,
    'description', e.description, 'banner_url', e.banner_url, 'venue', e.venue,
    'accent', e.accent, 'starts_at', e.starts_at, 'deadline', public._deadline(e),
    'close_hours_before', e.close_hours_before, 'submissions_open', e.submissions_open,
    'settings', e.settings, 'rules_text', e.rules_text, 'tiers', e.tiers,
    'phase', e.phase, 'archived', e.archived, 'locked', public._locked(e),
    'created_at', e.created_at)
$$;

create or replace function public._media_json(p_character uuid) returns jsonb
language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'kind', m.kind, 'url', m.url, 'position', m.position, 'duration_s', m.duration_s)
    order by m.position), '[]'::jsonb)
  from public.media m where m.character_id = p_character
$$;

create or replace function public._character_json(c public.characters) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'id', c.id, 'event_id', c.event_id, 'owner_id', c.owner_id, 'name', c.name,
    'thumb_url', c.thumb_url, 'hidden', c.hidden, 'created_at', c.created_at,
    'media', public._media_json(c.id))
$$;

create or replace function public._admin(p_token text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if p_token is null or not exists (
    select 1 from public.admin_sessions s
    where s.token = p_token and s.created_at > now() - interval '30 days'
  ) then
    raise exception 'not_admin' using errcode = '28000';
  end if;
end $$;

create or replace function public._me(p_token text) returns public.participants
language plpgsql stable security definer set search_path = public as $$
declare
  me public.participants;
begin
  select p.* into me
  from public.participants p
  join public.participant_secrets s on s.participant_id = p.id
  where s.device_token = p_token;
  if not found then
    raise exception 'not_joined' using errcode = '28000';
  end if;
  return me;
end $$;

create or replace function public._next_join_index(p_event uuid) returns int
language sql stable as $$
  select coalesce(max(join_index) + 1, 0) from public.participants where event_id = p_event
$$;

create or replace function public._check_username(p_username text) returns text
language plpgsql immutable as $$
declare
  u text := btrim(coalesce(p_username, ''));
begin
  if char_length(u) < 3 or char_length(u) > 16 then
    raise exception 'username_length' using errcode = '22023';
  end if;
  return u;
end $$;

-- Shared by phone + admin. p_enforce = phone rules (owner, caps, montage limits).
create or replace function public._save_character(
  p_event uuid, p_owner uuid, p_id uuid, p_name text, p_thumb text, p_media jsonb, p_enforce boolean
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ev public.events;
  ch public.characters;
  v_name text := btrim(coalesce(p_name, ''));
  v_norm text := public.norm_name(p_name);
  v_total numeric := 0;
  v_count int := 0;
  item jsonb;
begin
  select * into ev from public.events where id = p_event;
  if not found then raise exception 'not_found'; end if;
  if v_norm = '' or char_length(v_name) > 60 or coalesce(p_thumb, '') = '' then
    raise exception 'invalid' using errcode = '22023';
  end if;

  p_media := coalesce(p_media, '[]'::jsonb);
  for item in select * from jsonb_array_elements(p_media) loop
    if item->>'kind' not in ('image', 'video') or coalesce(item->>'url', '') not like '%/storage/v1/object/public/lma-media/%' then
      raise exception 'invalid' using errcode = '22023';
    end if;
    v_total := v_total + case when item->>'kind' = 'image' then 4 else greatest(0, coalesce((item->>'duration_s')::numeric, 0)) end;
    v_count := v_count + 1;
  end loop;

  if p_enforce then
    if v_total > (ev.settings->>'montage_max_s')::numeric + 0.5 then
      raise exception 'montage_too_long' using errcode = '22023';
    end if;
    if coalesce((ev.settings->>'montage_required')::boolean, false) and v_count = 0 then
      raise exception 'montage_required' using errcode = '22023';
    end if;
  end if;

  begin
    if p_id is null then
      if p_enforce and (select count(*) from public.characters where owner_id = p_owner)
                       >= (ev.settings->>'max_chars')::int then
        raise exception 'max_chars' using errcode = '22023';
      end if;
      insert into public.characters (event_id, owner_id, name, name_norm, thumb_url)
      values (p_event, p_owner, v_name, v_norm, p_thumb)
      returning * into ch;
    else
      update public.characters
         set name = v_name, name_norm = v_norm, thumb_url = p_thumb, owner_id = p_owner, updated_at = now()
       where id = p_id and event_id = p_event
         and (not p_enforce or owner_id = p_owner)
      returning * into ch;
      if not found then raise exception 'not_found'; end if;
    end if;
  exception when unique_violation then
    insert into public.blocked_attempts (event_id, participant_id, name, name_norm)
    values (p_event, p_owner, v_name, v_norm)
    on conflict do nothing;
    raise exception 'duplicate' using errcode = '23505';
  end;

  delete from public.media where character_id = ch.id;
  insert into public.media (character_id, kind, url, position, duration_s)
  select ch.id, e->>'kind', e->>'url', (ord - 1)::int,
         case when e->>'kind' = 'image' then 4 else greatest(0, coalesce((e->>'duration_s')::numeric, 0)) end
  from jsonb_array_elements(p_media) with ordinality as t(e, ord);

  return public._character_json(ch);
end $$;

-- ---------- public / participant ----------

create or replace function public.get_event(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  ev public.events;
begin
  select * into ev from public.events where slug = p_slug and not archived;
  if not found then return null; end if;
  return public._event_json(ev) || jsonb_build_object(
    'people', (select coalesce(jsonb_agg(jsonb_build_object(
                 'id', p.id, 'username', p.username, 'join_index', p.join_index, 'role', p.role)
                 order by p.join_index), '[]'::jsonb)
               from public.participants p where p.event_id = ev.id),
    'character_count', (select count(*) from public.characters c where c.event_id = ev.id and not c.hidden),
    'submitter_count', (select count(*) from public.participants p where p.event_id = ev.id and p.role = 'submitter'));
end $$;

-- A released username (no device, not manual) can be picked again.
create or replace function public.username_available(p_slug text, p_username text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.participants p
    join public.events e on e.id = p.event_id
    where e.slug = p_slug and lower(p.username) = lower(btrim(p_username))
      and (p.manual or exists (select 1 from public.participant_secrets s where s.participant_id = p.id))
  )
$$;

create or replace function public.join_event(p_slug text, p_username text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ev public.events;
  me public.participants;
  v_user text := public._check_username(p_username);
  v_token text;
begin
  select * into ev from public.events where slug = p_slug and not archived;
  if not found or ev.phase = 'done' then raise exception 'not_found'; end if;

  select * into me from public.participants where event_id = ev.id and lower(username) = lower(v_user);
  begin
    if found then
      if me.manual then raise exception 'username_taken' using errcode = '23505'; end if;
      insert into public.participant_secrets (participant_id) values (me.id) returning device_token into v_token;
    else
      insert into public.participants (event_id, username, role, join_index)
      values (ev.id, v_user, case when public._locked(ev) then 'voter' end, public._next_join_index(ev.id))
      returning * into me;
      insert into public.participant_secrets (participant_id) values (me.id) returning device_token into v_token;
    end if;
  exception when unique_violation then
    raise exception 'username_taken' using errcode = '23505';
  end;
  return jsonb_build_object('token', v_token, 'participant_id', me.id);
end $$;

create or replace function public.get_me(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me public.participants := public._me(p_token);
  ev public.events;
begin
  select * into ev from public.events where id = me.event_id;
  return jsonb_build_object(
    'me', jsonb_build_object('id', me.id, 'username', me.username, 'role', me.role, 'join_index', me.join_index),
    'event', public._event_json(ev),
    'character_count', (select count(*) from public.characters where owner_id = me.id),
    'submitter_count', (select count(*) from public.participants p where p.event_id = ev.id and p.role = 'submitter'));
end $$;

create or replace function public.set_role(p_token text, p_role text) returns void
language plpgsql security definer set search_path = public as $$
declare
  me public.participants := public._me(p_token);
  ev public.events;
begin
  if p_role not in ('submitter', 'voter') then raise exception 'invalid' using errcode = '22023'; end if;
  if me.role is not distinct from p_role then return; end if;
  select * into ev from public.events where id = me.event_id;
  -- after the deadline you can still pick voter if you never chose, nothing else
  if public._locked(ev) and not (me.role is null and p_role = 'voter') then
    raise exception 'locked' using errcode = '22023';
  end if;
  if p_role = 'voter' and exists (select 1 from public.characters where owner_id = me.id) then
    raise exception 'has_characters' using errcode = '22023';
  end if;
  update public.participants set role = p_role where id = me.id;
end $$;

create or replace function public.my_characters(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public._character_json(c) order by c.created_at), '[]'::jsonb)
  from public.characters c where c.owner_id = (public._me(p_token)).id
$$;

-- Live duplicate check while typing. A hit by someone else is logged once.
create or replace function public.character_name_taken(p_token text, p_name text, p_exclude uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  me public.participants := public._me(p_token);
  v_norm text := public.norm_name(p_name);
  v_owner uuid;
begin
  if v_norm = '' then return false; end if;
  select owner_id into v_owner from public.characters
  where event_id = me.event_id and name_norm = v_norm and id is distinct from p_exclude;
  if not found then return false; end if;
  if v_owner <> me.id then
    insert into public.blocked_attempts (event_id, participant_id, name, name_norm)
    values (me.event_id, me.id, btrim(p_name), v_norm)
    on conflict do nothing;
  end if;
  return true;
end $$;

create or replace function public.save_character(p_token text, p_id uuid, p_name text, p_thumb_url text, p_media jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me public.participants := public._me(p_token);
  ev public.events;
begin
  select * into ev from public.events where id = me.event_id;
  if public._locked(ev) then raise exception 'locked' using errcode = '22023'; end if;
  if me.role is distinct from 'submitter' then raise exception 'invalid' using errcode = '22023'; end if;
  return public._save_character(me.event_id, me.id, p_id, p_name, p_thumb_url, p_media, true);
end $$;

create or replace function public.delete_character(p_token text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me public.participants := public._me(p_token);
  ev public.events;
begin
  select * into ev from public.events where id = me.event_id;
  if public._locked(ev) then raise exception 'locked' using errcode = '22023'; end if;
  delete from public.characters where id = p_id and owner_id = me.id;
end $$;

-- ---------- admin ----------

create or replace function public.admin_login(p_passcode text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hash text;
  v_token text;
begin
  select passcode_hash into v_hash from public.admin_config where id = 1;
  if v_hash is null or extensions.crypt(coalesce(p_passcode, ''), v_hash) <> v_hash then
    perform pg_sleep(0.6);
    raise exception 'bad_passcode' using errcode = '28000';
  end if;
  delete from public.admin_sessions where created_at < now() - interval '30 days';
  insert into public.admin_sessions default values returning token into v_token;
  return v_token;
end $$;

create or replace function public.admin_check(p_token text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_sessions where token = p_token and created_at > now() - interval '30 days')
$$;

create or replace function public.admin_logout(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from public.admin_sessions where token = p_token
$$;

create or replace function public.admin_set_passcode(p_token text, p_current text, p_new text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hash text;
begin
  perform public._admin(p_token);
  select passcode_hash into v_hash from public.admin_config where id = 1;
  if extensions.crypt(coalesce(p_current, ''), v_hash) <> v_hash then
    raise exception 'bad_passcode' using errcode = '28000';
  end if;
  if char_length(coalesce(p_new, '')) < 4 then raise exception 'invalid' using errcode = '22023'; end if;
  update public.admin_config set passcode_hash = extensions.crypt(p_new, extensions.gen_salt('bf')) where id = 1;
  delete from public.admin_sessions where token <> p_token;
end $$;

create or replace function public._event_counts(p_event uuid) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'people', (select count(*) from public.participants where event_id = p_event),
    'submitters', (select count(*) from public.participants where event_id = p_event and role = 'submitter'),
    'voters', (select count(*) from public.participants where event_id = p_event and role = 'voter'),
    'characters', (select count(*) from public.characters where event_id = p_event and not hidden),
    'with_media', (select count(*) from public.characters c where c.event_id = p_event and not c.hidden
                     and exists (select 1 from public.media m where m.character_id = c.id)))
$$;

create or replace function public.admin_events(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public._admin(p_token);
  return (select coalesce(jsonb_agg(public._event_json(e) || jsonb_build_object('counts', public._event_counts(e.id))
                                    order by e.starts_at nulls last, e.created_at), '[]'::jsonb)
          from public.events e);
end $$;

create or replace function public.admin_event(p_token text, p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  ev public.events;
begin
  perform public._admin(p_token);
  select * into ev from public.events where id = p_id;
  if not found then return null; end if;
  return public._event_json(ev) || jsonb_build_object('counts', public._event_counts(ev.id));
end $$;

create or replace function public._slugify(p text) returns text
language sql volatile as $$
  select coalesce(nullif(trim(both '-' from left(regexp_replace(lower(p), '[^a-z0-9]+', '-', 'g'), 32)), ''), 'event')
         || '-' || substr(md5(random()::text), 1, 4)
$$;

-- p: {name, topic, description, banner_url, venue, starts_at, submissions_open, settings, rules_text, tiers}
create or replace function public.admin_save_event(p_token text, p_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ev public.events;
  v_name text := btrim(coalesce(p->>'name', ''));
  v_topic text := btrim(coalesce(p->>'topic', ''));
  v_settings jsonb := p->'settings';
  v_tiers jsonb := p->'tiers';
begin
  perform public._admin(p_token);
  if v_name = '' or v_topic = '' then raise exception 'invalid' using errcode = '22023'; end if;
  if v_tiers is null or jsonb_typeof(v_tiers) <> 'array' or jsonb_array_length(v_tiers) not between 2 and 7 then
    raise exception 'invalid' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.events (slug, name, topic, description, banner_url, venue, starts_at,
                               submissions_open, settings, rules_text, tiers)
    values (public._slugify(v_name), v_name, v_topic, nullif(btrim(p->>'description'), ''),
            nullif(p->>'banner_url', ''), nullif(btrim(p->>'venue'), ''), (p->>'starts_at')::timestamptz,
            coalesce((p->>'submissions_open')::boolean, true), v_settings,
            nullif(btrim(p->>'rules_text'), ''), v_tiers)
    returning * into ev;
  else
    select * into ev from public.events where id = p_id for update;
    if not found then raise exception 'not_found'; end if;
    -- tiers + voting lock at Start
    if ev.phase not in ('draft', 'pre') then
      v_tiers := ev.tiers;
      v_settings := v_settings
        || jsonb_build_object('vote_timer_s', ev.settings->'vote_timer_s',
                              'owner_votes', ev.settings->'owner_votes',
                              'half_rounds', ev.settings->'half_rounds');
    end if;
    update public.events set
      name = v_name, topic = v_topic,
      description = nullif(btrim(p->>'description'), ''),
      banner_url = nullif(p->>'banner_url', ''),
      venue = nullif(btrim(p->>'venue'), ''),
      starts_at = (p->>'starts_at')::timestamptz,
      submissions_open = coalesce((p->>'submissions_open')::boolean, true),
      settings = v_settings, rules_text = nullif(btrim(p->>'rules_text'), ''), tiers = v_tiers,
      updated_at = now()
    where id = p_id
    returning * into ev;
  end if;
  return public._event_json(ev) || jsonb_build_object('counts', public._event_counts(ev.id));
end $$;

create or replace function public.admin_duplicate_event(p_token text, p_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  src public.events;
  v_id uuid;
begin
  perform public._admin(p_token);
  select * into src from public.events where id = p_id;
  if not found then raise exception 'not_found'; end if;
  insert into public.events (slug, name, topic, description, banner_url, venue, accent, starts_at,
                             close_hours_before, settings, rules_text, tiers)
  values (public._slugify(src.name), src.name || ' (copy)', src.topic, src.description, src.banner_url, src.venue,
          '#C2A24C', src.starts_at + interval '7 days', src.close_hours_before, src.settings, src.rules_text, src.tiers)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.admin_archive_event(p_token text, p_id uuid, p_archived boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._admin(p_token);
  update public.events set archived = p_archived, updated_at = now() where id = p_id;
end $$;

create or replace function public.admin_delete_event(p_token text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._admin(p_token);
  delete from public.events where id = p_id;
end $$;

create or replace function public.admin_people(p_token text, p_event uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public._admin(p_token);
  return (select coalesce(jsonb_agg(jsonb_build_object(
            'id', p.id, 'username', p.username, 'role', p.role, 'join_index', p.join_index,
            'manual', p.manual, 'joined_at', p.joined_at,
            'has_device', exists (select 1 from public.participant_secrets s where s.participant_id = p.id),
            'char_count', (select count(*) from public.characters c where c.owner_id = p.id))
            order by p.join_index), '[]'::jsonb)
          from public.participants p where p.event_id = p_event);
end $$;

create or replace function public.admin_add_person(p_token text, p_event uuid, p_username text, p_role text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user text := public._check_username(p_username);
  v_id uuid;
begin
  perform public._admin(p_token);
  if p_role not in ('submitter', 'voter') then raise exception 'invalid' using errcode = '22023'; end if;
  insert into public.participants (event_id, username, role, join_index, manual)
  values (p_event, v_user, p_role, public._next_join_index(p_event), true)
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'username_taken' using errcode = '23505';
end $$;

create or replace function public.admin_rename_person(p_token text, p_id uuid, p_username text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user text := public._check_username(p_username);
begin
  perform public._admin(p_token);
  update public.participants set username = v_user where id = p_id;
exception when unique_violation then
  raise exception 'username_taken' using errcode = '23505';
end $$;

create or replace function public.admin_set_person_role(p_token text, p_id uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._admin(p_token);
  if p_role not in ('submitter', 'voter') then raise exception 'invalid' using errcode = '22023'; end if;
  update public.participants set role = p_role where id = p_id;
end $$;

create or replace function public.admin_release_person(p_token text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._admin(p_token);
  delete from public.participant_secrets where participant_id = p_id;
end $$;

create or replace function public.admin_remove_person(p_token text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._admin(p_token);
  delete from public.participants where id = p_id;
end $$;

create or replace function public.admin_submissions(p_token text, p_event uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public._admin(p_token);
  return jsonb_build_object(
    'characters', (select coalesce(jsonb_agg(public._character_json(c) order by p.join_index, c.created_at), '[]'::jsonb)
                   from public.characters c join public.participants p on p.id = c.owner_id
                   where c.event_id = p_event),
    'blocked', (select coalesce(jsonb_agg(jsonb_build_object(
                   'id', b.id, 'name', b.name, 'at', b.at, 'username', p.username) order by b.at desc), '[]'::jsonb)
                from public.blocked_attempts b left join public.participants p on p.id = b.participant_id
                where b.event_id = p_event));
end $$;

create or replace function public.admin_save_character(
  p_token text, p_event uuid, p_owner uuid, p_id uuid, p_name text, p_thumb_url text, p_media jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._admin(p_token);
  if not exists (select 1 from public.participants where id = p_owner and event_id = p_event) then
    raise exception 'not_found';
  end if;
  return public._save_character(p_event, p_owner, p_id, p_name, p_thumb_url, p_media, false);
end $$;

create or replace function public.admin_name_taken(p_token text, p_event uuid, p_name text, p_exclude uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  perform public._admin(p_token);
  return exists (select 1 from public.characters
                 where event_id = p_event and name_norm = public.norm_name(p_name)
                   and public.norm_name(p_name) <> '' and id is distinct from p_exclude);
end $$;

create or replace function public.admin_set_character_hidden(p_token text, p_id uuid, p_hidden boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._admin(p_token);
  update public.characters set hidden = p_hidden, updated_at = now() where id = p_id;
end $$;

create or replace function public.admin_reassign_character(p_token text, p_id uuid, p_owner uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._admin(p_token);
  update public.characters c set owner_id = p_owner, updated_at = now()
  where c.id = p_id and exists (select 1 from public.participants p where p.id = p_owner and p.event_id = c.event_id);
end $$;

create or replace function public.admin_delete_character(p_token text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._admin(p_token);
  delete from public.characters where id = p_id;
end $$;

-- ---------- grants ----------

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    if left(f.proname, 1) <> '_' and f.proname not in ('notify_event_change', 'norm_name') then
      execute format('grant execute on function %s to anon, authenticated', f.sig);
    end if;
  end loop;
end $$;
