-- ArenaBook production security hardening.

alter function public.set_updated_at() set search_path = public;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;
revoke execute on function public.expire_stale_bookings(uuid) from public, anon, authenticated;
revoke execute on function public.create_booking(uuid,timestamptz,integer,text,text,text,jsonb) from public, anon;
revoke execute on function public.submit_payment_proof(uuid,text,text,text,bigint,bigint,text,text) from public, anon;
revoke execute on function public.review_payment(uuid,boolean,text) from public, anon;
revoke execute on function public.is_admin() from public, anon;

grant execute on function public.create_booking(uuid,timestamptz,integer,text,text,text,jsonb) to authenticated;
grant execute on function public.submit_payment_proof(uuid,text,text,text,bigint,bigint,text,text) to authenticated;
grant execute on function public.review_payment(uuid,boolean,text) to authenticated;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.expire_stale_bookings(uuid) to service_role;

drop policy if exists venues_public_read on public.venues;
create policy venues_public_read on public.venues
for select to anon
using (active = true);

drop policy if exists venues_authenticated_read on public.venues;
create policy venues_authenticated_read on public.venues
for select to authenticated
using (active = true or public.is_admin());

drop policy if exists equipment_public_read on public.equipment;
create policy equipment_public_read on public.equipment
for select to anon
using (active = true);

drop policy if exists equipment_authenticated_read on public.equipment;
create policy equipment_authenticated_read on public.equipment
for select to authenticated
using (active = true or public.is_admin());
