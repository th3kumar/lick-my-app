-- Lick My App — Phase 2: the show.
-- All show state is server-side; TV and phones are pure renders of it.
--   events.phase:      draft → pre → countdown → reveal → board → done
--   events.board_step: tray → revealed → claimed → montage → voting → verdict → tray
-- Votes never leave the server before the reveal: show_state only returns vote
-- values for characters past voting, live_state only returns your own vote.

alter table public.events
  add column if not exists reveal_order uuid[],
  add column if not exists reveal_started_at timestamptz,
  add column if not exists voting_opened_at timestamptz;

-- one row per board move, for Z (undo)
create table if not exists public.show_log (
  id bigserial primary key,
  event_id uuid not null references public.events on delete cascade,
  at timestamptz not null default now(),
  snapshot jsonb not null
);
create index if not exists show_log_event on public.show_log (event_id, id desc);
alter table public.show_log enable row level security;
revoke all on public.show_log from anon, authenticated;
revoke all on sequence public.show_log_id_seq from anon, authenticated;

-- ---------- helpers ----------

create or replace function public._show_event(p_token text, p_event uuid) returns public.events
language plpgsql security definer set search_path = public as $$
declare
  ev public.events;
begin
  perform public._admin(p_token);
  select * into ev from public.events where id = p_event for update;
  if not found then raise exception 'not_found'; end if;
  return ev;
end $$;

create or replace function public._show_log(ev public.events, p_char uuid) returns void
language sql security definer set search_path = public as $$
  insert into public.show_log (event_id, snapshot)
  select ev.id, jsonb_build_object(
    'board_step', ev.board_step,
    'current_character_id', ev.current_character_id,
    'character', (select jsonb_build_object('id', c.id, 'claimed_tier', c.claimed_tier,
                                            'final_tier', c.final_tier, 'tray_order', c.tray_order)
                  from public.characters c where c.id = p_char))
$$;

create or replace function public._tier_count(ev public.events) returns int
language sql stable set search_path = public as $$
  select jsonb_array_length(ev.tiers)
$$;

-- who may vote on a character: everyone in the event except the owner (unless owner_votes)
create or replace function public._eligible(ev public.events, p_char uuid) returns setof public.participants
language sql stable security definer set search_path = public as $$
  select p.* from public.participants p
  where p.event_id = ev.id
    and (coalesce((ev.settings->>'owner_votes')::boolean, false)
         or p.id is distinct from (select owner_id from public.characters where id = p_char))
$$;

create or replace function public._show_json(ev public.events) returns jsonb
language sql stable security definer set search_path = public as $$
  select public._event_json(ev) || jsonb_build_object(
    'board_step', ev.board_step,
    'current_character_id', ev.current_character_id,
    'countdown_ends_at', ev.countdown_ends_at,
    'voting_opened_at', ev.voting_opened_at,
    'voting_closes_at', ev.voting_closes_at,
    'reveal_order', to_jsonb(ev.reveal_order),
    'reveal_started_at', ev.reveal_started_at,
    'display_mode', coalesce(ev.display_mode, ev.settings->>'default_mode', 'mystery'),
    'server_now', now())
$$;

-- ---------- admin: the show ----------

-- TV + Live control + Results. Vote values only for characters past their vote.
create or replace function public.show_state(p_token text, p_event uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  ev public.events;
begin
  perform public._admin(p_token);
  select * into ev from public.events where id = p_event;
  if not found then return null; end if;
  return public._show_json(ev) || jsonb_build_object(
    'people', (select coalesce(jsonb_agg(jsonb_build_object(
                 'id', p.id, 'username', p.username, 'join_index', p.join_index, 'role', p.role, 'manual', p.manual)
                 order by p.join_index), '[]'::jsonb)
               from public.participants p where p.event_id = ev.id),
    'characters', (select coalesce(jsonb_agg(public._character_json(c) || jsonb_build_object(
                     'tray_order', c.tray_order, 'claimed_tier', c.claimed_tier, 'final_tier', c.final_tier)
                     order by c.tray_order nulls last, c.created_at), '[]'::jsonb)
                   from public.characters c where c.event_id = ev.id and not c.hidden),
    'voted', (select coalesce(jsonb_agg(v.voter_id), '[]'::jsonb) from public.votes v
              where v.character_id = ev.current_character_id),
    'votes', (select coalesce(jsonb_object_agg(x.character_id, x.tiers), '{}'::jsonb) from (
                select v.character_id, jsonb_agg(v.tier) as tiers
                from public.votes v join public.characters c on c.id = v.character_id
                where c.event_id = ev.id
                  and not (c.id = ev.current_character_id and ev.board_step in ('claimed', 'montage', 'voting'))
                  and (c.final_tier is not null or (c.id = ev.current_character_id and ev.board_step = 'verdict'))
                group by v.character_id) x),
    'can_undo', exists (select 1 from public.show_log l where l.event_id = ev.id));
end $$;

-- Start: tray order + reveal order are shuffled on the laptop and passed in.
create or replace function public.show_start(p_token text, p_event uuid, p_tray uuid[], p_reveal uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare
  ev public.events := public._show_event(p_token, p_event);
begin
  if ev.phase not in ('draft', 'pre') then raise exception 'invalid' using errcode = '22023'; end if;
  update public.characters
     set tray_order = array_position(p_tray, id), claimed_tier = null, final_tier = null
   where event_id = ev.id;
  delete from public.votes v using public.characters c where c.id = v.character_id and c.event_id = ev.id;
  delete from public.show_log where event_id = ev.id;
  update public.events set
    phase = 'countdown',
    countdown_ends_at = now() + make_interval(secs => coalesce((settings->>'countdown_s')::int, 10)),
    display_mode = coalesce(settings->>'default_mode', 'mystery'),
    board_step = null, current_character_id = null, voting_closes_at = null, voting_opened_at = null,
    reveal_order = p_reveal, reveal_started_at = null, updated_at = now()
  where id = ev.id;
end $$;

-- countdown → reveal / board · reveal → board · any → done · countdown → pre (pause before it lands)
create or replace function public.show_phase(p_token text, p_event uuid, p_phase text) returns void
language plpgsql security definer set search_path = public as $$
declare
  ev public.events := public._show_event(p_token, p_event);
begin
  if p_phase = 'pre' and ev.phase = 'countdown' then
    update public.events set phase = 'pre', countdown_ends_at = null where id = ev.id;
  elsif p_phase = 'reveal' and ev.phase = 'countdown' then
    update public.events set phase = 'reveal', reveal_started_at = now() where id = ev.id;
  elsif p_phase = 'board' and ev.phase in ('countdown', 'reveal') then
    update public.events set phase = 'board', board_step = 'tray', current_character_id = null where id = ev.id;
  elsif p_phase = 'done' and ev.phase in ('countdown', 'reveal', 'board') then
    update public.events set phase = 'done', board_step = null, voting_closes_at = null where id = ev.id;
  elsif p_phase = ev.phase then
    return;
  else
    raise exception 'invalid' using errcode = '22023';
  end if;
end $$;

-- N / click: reveal a tray card. p_char null = next in the shuffled tray.
create or replace function public.show_pick(p_token text, p_event uuid, p_char uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  ev public.events := public._show_event(p_token, p_event);
  v_char uuid := p_char;
begin
  if ev.phase <> 'board' or coalesce(ev.board_step, 'tray') not in ('tray', 'revealed', 'verdict') then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if v_char is null then
    select id into v_char from public.characters
    where event_id = ev.id and not hidden and claimed_tier is null and final_tier is null
      and id is distinct from ev.current_character_id
    order by tray_order nulls last, created_at
    limit 1;
    if v_char is null then raise exception 'tray_empty' using errcode = '22023'; end if;
  elsif not exists (select 1 from public.characters where id = v_char and event_id = ev.id and not hidden
                    and claimed_tier is null and final_tier is null) then
    raise exception 'invalid' using errcode = '22023';
  end if;
  perform public._show_log(ev, v_char);
  update public.events set board_step = 'revealed', current_character_id = v_char,
         voting_closes_at = null, voting_opened_at = null
  where id = ev.id;
  return v_char;
end $$;

-- 1–5: owner claims a tier (0 = top row). Card moves to that lane with CLAIMED.
create or replace function public.show_claim(p_token text, p_event uuid, p_tier int) returns void
language plpgsql security definer set search_path = public as $$
declare
  ev public.events := public._show_event(p_token, p_event);
begin
  if ev.phase <> 'board' or ev.current_character_id is null or ev.board_step not in ('revealed', 'claimed', 'montage')
     or p_tier < 0 or p_tier >= public._tier_count(ev) then
    raise exception 'invalid' using errcode = '22023';
  end if;
  perform public._show_log(ev, ev.current_character_id);
  update public.characters set claimed_tier = p_tier where id = ev.current_character_id;
  update public.events set board_step = case when board_step = 'montage' then 'montage' else 'claimed' end where id = ev.id;
end $$;

create or replace function public.show_montage(p_token text, p_event uuid, p_open boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  ev public.events := public._show_event(p_token, p_event);
begin
  if ev.phase <> 'board' or ev.board_step not in ('claimed', 'montage') then
    raise exception 'invalid' using errcode = '22023';
  end if;
  update public.events set board_step = case when p_open then 'montage' else 'claimed' end where id = ev.id;
end $$;

create or replace function public.show_open_voting(p_token text, p_event uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  ev public.events := public._show_event(p_token, p_event);
begin
  if ev.phase <> 'board' or ev.board_step not in ('claimed', 'montage')
     or (select claimed_tier from public.characters where id = ev.current_character_id) is null then
    raise exception 'invalid' using errcode = '22023';
  end if;
  update public.events set board_step = 'voting', voting_opened_at = now(),
         voting_closes_at = now() + make_interval(secs => coalesce((settings->>'vote_timer_s')::int, 20))
  where id = ev.id;
end $$;

-- Enter / timer / everyone voted. Returns the vote values (now revealed).
create or replace function public.show_close_voting(p_token text, p_event uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ev public.events := public._show_event(p_token, p_event);
begin
  if ev.board_step <> 'voting' then
    if ev.board_step = 'verdict' then
      return (select coalesce(jsonb_agg(tier), '[]'::jsonb) from public.votes where character_id = ev.current_character_id);
    end if;
    raise exception 'invalid' using errcode = '22023';
  end if;
  perform public._show_log(ev, ev.current_character_id);
  update public.events set board_step = 'verdict', voting_closes_at = least(voting_closes_at, now()) where id = ev.id;
  return (select coalesce(jsonb_agg(tier), '[]'::jsonb) from public.votes where character_id = ev.current_character_id);
end $$;

-- Verdict (computed on the laptop with verdict.ts), Live control "Final tier", Results "Edit".
create or replace function public.show_set_final(p_token text, p_event uuid, p_char uuid, p_tier int) returns void
language plpgsql security definer set search_path = public as $$
declare
  ev public.events := public._show_event(p_token, p_event);
begin
  if p_tier is not null and (p_tier < 0 or p_tier >= public._tier_count(ev)) then
    raise exception 'invalid' using errcode = '22023';
  end if;
  update public.characters set final_tier = p_tier where id = p_char and event_id = ev.id;
end $$;

-- "Run the vote again": clear votes and reopen.
create or replace function public.show_revote(p_token text, p_event uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  ev public.events := public._show_event(p_token, p_event);
begin
  if ev.phase <> 'board' or ev.current_character_id is null
     or (select claimed_tier from public.characters where id = ev.current_character_id) is null then
    raise exception 'invalid' using errcode = '22023';
  end if;
  perform public._show_log(ev, ev.current_character_id);
  delete from public.votes where character_id = ev.current_character_id;
  update public.characters set final_tier = null where id = ev.current_character_id;
  update public.events set board_step = 'voting', voting_opened_at = now(),
         voting_closes_at = now() + make_interval(secs => coalesce((settings->>'vote_timer_s')::int, 20))
  where id = ev.id;
end $$;

-- "Send back to the tray": owner not here yet — back of the tray, pick it later.
create or replace function public.show_send_back(p_token text, p_event uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  ev public.events := public._show_event(p_token, p_event);
begin
  if ev.phase <> 'board' or ev.current_character_id is null then
    raise exception 'invalid' using errcode = '22023';
  end if;
  perform public._show_log(ev, ev.current_character_id);
  delete from public.votes where character_id = ev.current_character_id;
  update public.characters set claimed_tier = null, final_tier = null,
         tray_order = (select coalesce(max(tray_order), 0) + 1 from public.characters where event_id = ev.id)
  where id = ev.current_character_id;
  update public.events set board_step = 'tray', current_character_id = null,
         voting_closes_at = null, voting_opened_at = null
  where id = ev.id;
end $$;

create or replace function public.show_mode(p_token text, p_event uuid, p_mode text) returns void
language plpgsql security definer set search_path = public as $$
declare
  ev public.events := public._show_event(p_token, p_event);
begin
  if p_mode not in ('mystery', 'name', 'photo') then raise exception 'invalid' using errcode = '22023'; end if;
  update public.events set display_mode = p_mode where id = ev.id;
end $$;

-- Z: exact inverse of the last move. A move back into "voting" lands on "claimed"
-- (the old timer has run out); votes stay so V reopens with them.
create or replace function public.show_undo(p_token text, p_event uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  ev public.events := public._show_event(p_token, p_event);
  l public.show_log;
  ch jsonb;
begin
  select * into l from public.show_log where event_id = ev.id order by id desc limit 1;
  if not found then raise exception 'nothing_to_undo' using errcode = '22023'; end if;
  ch := l.snapshot->'character';
  if ch is not null and ch <> 'null'::jsonb then
    update public.characters set
      claimed_tier = (ch->>'claimed_tier')::int,
      final_tier = (ch->>'final_tier')::int,
      tray_order = (ch->>'tray_order')::int
    where id = (ch->>'id')::uuid and event_id = ev.id;
  end if;
  update public.events set
    board_step = case when l.snapshot->>'board_step' = 'voting' then 'claimed' else l.snapshot->>'board_step' end,
    current_character_id = (l.snapshot->>'current_character_id')::uuid,
    voting_closes_at = null
  where id = ev.id;
  delete from public.show_log where id = l.id;
end $$;

-- Results "Reset to pre-show": clears every claim, vote and verdict. Characters and people stay.
create or replace function public.show_reset(p_token text, p_event uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  ev public.events := public._show_event(p_token, p_event);
begin
  delete from public.votes v using public.characters c where c.id = v.character_id and c.event_id = ev.id;
  delete from public.show_log where event_id = ev.id;
  update public.characters set claimed_tier = null, final_tier = null, tray_order = null where event_id = ev.id;
  update public.events set phase = 'pre', board_step = null, current_character_id = null,
         voting_closes_at = null, voting_opened_at = null, countdown_ends_at = null,
         reveal_order = null, reveal_started_at = null, display_mode = null, updated_at = now()
  where id = ev.id;
end $$;

-- People without a phone: the admin casts their vote from the laptop.
create or replace function public.admin_cast_vote(p_token text, p_event uuid, p_voter uuid, p_tier int) returns void
language plpgsql security definer set search_path = public as $$
declare
  ev public.events := public._show_event(p_token, p_event);
begin
  if ev.board_step <> 'voting' or p_tier < 0 or p_tier >= public._tier_count(ev)
     or not exists (select 1 from public._eligible(ev, ev.current_character_id) e where e.id = p_voter and e.manual) then
    raise exception 'invalid' using errcode = '22023';
  end if;
  insert into public.votes (character_id, voter_id, tier) values (ev.current_character_id, p_voter, p_tier)
  on conflict (character_id, voter_id) do update set tier = excluded.tier, created_at = now();
end $$;

-- ---------- phones ----------

create or replace function public.live_state(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me public.participants := public._me(p_token);
  ev public.events;
  cur public.characters;
  owner public.participants;
  showing boolean;
begin
  select * into ev from public.events where id = me.event_id;
  showing := ev.board_step in ('voting', 'verdict') and ev.current_character_id is not null;
  if showing then
    select * into cur from public.characters where id = ev.current_character_id;
    select * into owner from public.participants where id = cur.owner_id;
  end if;
  return jsonb_build_object(
    'server_now', now(),
    'event', jsonb_build_object('id', ev.id, 'slug', ev.slug, 'name', ev.name, 'topic', ev.topic, 'tiers', ev.tiers,
                                'phase', ev.phase, 'board_step', ev.board_step,
                                'countdown_ends_at', ev.countdown_ends_at,
                                'voting_opened_at', ev.voting_opened_at, 'voting_closes_at', ev.voting_closes_at,
                                'vote_timer_s', (ev.settings->>'vote_timer_s')::int),
    'me', jsonb_build_object('id', me.id, 'username', me.username, 'join_index', me.join_index, 'role', me.role),
    'progress', jsonb_build_object(
      'done', (select count(*) from public.characters where event_id = ev.id and not hidden and final_tier is not null),
      'total', (select count(*) from public.characters where event_id = ev.id and not hidden)),
    'current', case when showing then jsonb_build_object(
      'id', cur.id, 'name', cur.name, 'thumb_url', cur.thumb_url, 'claimed_tier', cur.claimed_tier,
      'owner_id', owner.id, 'owner_username', owner.username, 'owner_join_index', owner.join_index) end,
    'eligible', case when showing then (select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'manual', e.manual)), '[]'::jsonb)
                                         from public._eligible(ev, cur.id) e) end,
    'voted', case when showing then (select coalesce(jsonb_agg(voter_id), '[]'::jsonb) from public.votes
                                      where character_id = cur.id) end,
    'my_vote', case when showing then (select tier from public.votes where character_id = cur.id and voter_id = me.id) end);
end $$;

create or replace function public.cast_vote(p_token text, p_tier int) returns void
language plpgsql security definer set search_path = public as $$
declare
  me public.participants := public._me(p_token);
  ev public.events;
begin
  select * into ev from public.events where id = me.event_id;
  if ev.board_step <> 'voting' or ev.current_character_id is null
     or now() > ev.voting_closes_at + interval '2 seconds' then
    raise exception 'voting_closed' using errcode = '22023';
  end if;
  if p_tier < 0 or p_tier >= public._tier_count(ev)
     or not exists (select 1 from public._eligible(ev, ev.current_character_id) e where e.id = me.id) then
    raise exception 'invalid' using errcode = '22023';
  end if;
  insert into public.votes (character_id, voter_id, tier) values (ev.current_character_id, me.id, p_tier)
  on conflict (character_id, voter_id) do update set tier = excluded.tier, created_at = now();
end $$;

-- ---------- grants (same rule as 0002: underscore helpers stay private) ----------

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and p.proname in ('_show_event', '_show_log', '_tier_count', '_eligible', '_show_json',
                        'show_state', 'show_start', 'show_phase', 'show_pick', 'show_claim', 'show_montage',
                        'show_open_voting', 'show_close_voting', 'show_set_final', 'show_revote', 'show_send_back',
                        'show_mode', 'show_undo', 'show_reset', 'admin_cast_vote', 'live_state', 'cast_vote')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    if left(f.proname, 1) <> '_' then
      execute format('grant execute on function %s to anon, authenticated', f.sig);
    end if;
  end loop;
end $$;
