-- Lick My App — schema
-- No Supabase Auth: phones hold a device token, the admin holds a session token
-- from the passcode. Tables have RLS on and no policies; every read/write goes
-- through the security-definer functions in 0002_functions.sql.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.norm_name(t text) returns text
language sql immutable as $$
  select lower(regexp_replace(coalesce(t, ''), '[^[:alnum:]]+', '', 'g'))
$$;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  topic text not null,
  description text,
  banner_url text,
  venue text,
  accent text not null default '#C2A24C',
  starts_at timestamptz,
  close_hours_before int not null default 2, -- deadline = starts_at - this (see _deadline)
  submissions_open boolean not null default true,
  settings jsonb not null default '{
    "max_chars": 4,
    "montage_max_s": 90,
    "montage_required": false,
    "vote_timer_s": 20,
    "owner_votes": false,
    "half_rounds": "claim",
    "countdown_s": 10,
    "default_mode": "mystery",
    "awards": ["bestSelfJudge", "mostDelusional", "mostHumble", "mostControversial", "unanimous"]
  }'::jsonb,
  rules_text text,
  tiers jsonb not null default '[
    {"label": "S", "color": "#C24C7A"},
    {"label": "A", "color": "#C2704C"},
    {"label": "B", "color": "#C2A24C"},
    {"label": "C", "color": "#7AB648"},
    {"label": "D", "color": "#4C8DC2"}
  ]'::jsonb,
  phase text not null default 'pre' check (phase in ('draft', 'pre', 'countdown', 'reveal', 'board', 'done')),
  board_step text check (board_step in ('tray', 'revealed', 'claimed', 'montage', 'voting', 'verdict')),
  display_mode text,
  current_character_id uuid,
  voting_closes_at timestamptz,
  countdown_ends_at timestamptz,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  username text not null,
  role text check (role in ('submitter', 'voter')),
  join_index int not null,
  manual boolean not null default false,
  joined_at timestamptz not null default now()
);
create unique index participants_event_username on public.participants (event_id, lower(username));
create index participants_event on public.participants (event_id);

-- Kept apart so a participant row can never leak a token.
create table public.participant_secrets (
  participant_id uuid primary key references public.participants on delete cascade,
  device_token text not null unique default encode(extensions.gen_random_bytes(24), 'hex')
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  owner_id uuid not null references public.participants on delete cascade,
  name text not null,
  name_norm text not null,
  thumb_url text,
  tray_order int,
  claimed_tier int,
  final_tier int,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, name_norm)
);
create index characters_owner on public.characters (owner_id);

alter table public.events
  add constraint events_current_character_fk foreign key (current_character_id)
  references public.characters on delete set null;

create table public.media (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  url text not null,
  position int not null,
  duration_s numeric not null
);
create index media_character on public.media (character_id);

create table public.votes (
  character_id uuid not null references public.characters on delete cascade,
  voter_id uuid not null references public.participants on delete cascade,
  tier int not null,
  created_at timestamptz not null default now(),
  primary key (character_id, voter_id)
);

create table public.blocked_attempts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  participant_id uuid references public.participants on delete set null,
  name text not null,
  name_norm text not null,
  at timestamptz not null default now(),
  unique (event_id, participant_id, name_norm)
);

create table public.admin_config (
  id int primary key default 1 check (id = 1),
  passcode_hash text not null
);

create table public.admin_sessions (
  token text primary key default encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['events', 'participants', 'participant_secrets', 'characters', 'media', 'votes', 'blocked_attempts', 'admin_config', 'admin_sessions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Realtime: every change pings the event's public broadcast topic with no data
-- in it; clients refetch through the functions. Keeps names/votes private.
create or replace function public.notify_event_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  eid uuid;
begin
  if tg_table_name = 'events' then
    eid := coalesce(new.id, old.id);
  elsif tg_table_name in ('media', 'votes') then
    select c.event_id into eid from public.characters c where c.id = coalesce(new.character_id, old.character_id);
  else
    eid := coalesce(new.event_id, old.event_id);
  end if;
  if eid is not null then
    perform realtime.send(jsonb_build_object('table', tg_table_name, 'op', tg_op), 'change', 'event:' || eid::text, false);
  end if;
  return null;
end $$;
revoke execute on function public.notify_event_change() from public, anon, authenticated;

create trigger events_notify after insert or update or delete on public.events for each row execute function public.notify_event_change();
create trigger participants_notify after insert or update or delete on public.participants for each row execute function public.notify_event_change();
create trigger characters_notify after insert or update or delete on public.characters for each row execute function public.notify_event_change();
create trigger media_notify after insert or update or delete on public.media for each row execute function public.notify_event_change();
create trigger votes_notify after insert or update or delete on public.votes for each row execute function public.notify_event_change();
create trigger blocked_notify after insert on public.blocked_attempts for each row execute function public.notify_event_change();

-- Storage: one public-read bucket for thumbnails, montage media and banners.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lma-media', 'lma-media', true, 52428800,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

create policy "lma-media upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'lma-media');
