-- Board QR ("Late? Scan to vote") can be collapsed by the admin. Stored in settings.board_qr
-- (missing = shown) so the TV and Live control agree and a refresh keeps it.
create or replace function public.show_qr(p_token text, p_event uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  ev public.events := public._show_event(p_token, p_event);
begin
  update public.events set settings = settings || jsonb_build_object('board_qr', p_on) where id = ev.id;
end $$;

revoke execute on function public.show_qr(text, uuid, boolean) from public, anon, authenticated;
grant execute on function public.show_qr(text, uuid, boolean) to anon, authenticated;
