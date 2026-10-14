-- Security advisor: pin search_path on the helper functions.
alter function public.norm_name(text) set search_path = public;
alter function public._check_username(text) set search_path = public;
alter function public._deadline(public.events) set search_path = public;
alter function public._locked(public.events) set search_path = public;
alter function public._event_json(public.events) set search_path = public;
alter function public._media_json(uuid) set search_path = public;
alter function public._character_json(public.characters) set search_path = public;
alter function public._slugify(text) set search_path = public;
alter function public._next_join_index(uuid) set search_path = public;
alter function public._event_counts(uuid) set search_path = public;
