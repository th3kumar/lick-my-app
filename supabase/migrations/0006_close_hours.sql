-- Event details: "Submissions close" is now a menu (0h … 2 days before start).
-- admin_save_event saves close_hours_before (it already existed on events, unused until now).
create or replace function public.admin_save_event(p_token text, p_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ev public.events;
  v_name text := btrim(coalesce(p->>'name', ''));
  v_topic text := btrim(coalesce(p->>'topic', ''));
  v_settings jsonb := p->'settings';
  v_tiers jsonb := p->'tiers';
  v_close int := (p->>'close_hours_before')::int;
begin
  perform public._admin(p_token);
  if v_name = '' or v_topic = '' then raise exception 'invalid' using errcode = '22023'; end if;
  if v_tiers is null or jsonb_typeof(v_tiers) <> 'array' or jsonb_array_length(v_tiers) not between 2 and 7 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if v_close is not null and v_close not between 0 and 168 then raise exception 'invalid' using errcode = '22023'; end if;

  if p_id is null then
    insert into public.events (slug, name, topic, description, banner_url, venue, starts_at, close_hours_before,
                               submissions_open, settings, rules_text, tiers)
    values (public._slugify(v_name), v_name, v_topic, nullif(btrim(p->>'description'), ''),
            nullif(p->>'banner_url', ''), nullif(btrim(p->>'venue'), ''), (p->>'starts_at')::timestamptz, coalesce(v_close, 2),
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
      close_hours_before = coalesce(v_close, close_hours_before),
      submissions_open = coalesce((p->>'submissions_open')::boolean, true),
      settings = v_settings, rules_text = nullif(btrim(p->>'rules_text'), ''), tiers = v_tiers,
      updated_at = now()
    where id = p_id
    returning * into ev;
  end if;
  return public._event_json(ev) || jsonb_build_object('counts', public._event_counts(ev.id));
end $$;
