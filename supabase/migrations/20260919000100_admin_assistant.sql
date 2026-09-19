-- ArenaBook Admin Assistant privileged RPCs
-- These functions are intentionally executable only by Supabase service_role/secret-key clients.

set search_path = public, extensions;

create or replace function public.admin_assistant_review_payment(
  p_booking_id uuid,
  p_approve boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_payment public.payments%rowtype;
  v_proof_id uuid;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking tidak ditemukan.'; end if;
  if v_booking.payment_status <> 'PROOF_SUBMITTED' then raise exception 'Tidak ada bukti yang menunggu review.'; end if;

  select * into v_payment from public.payments where booking_id = p_booking_id for update;
  select id into v_proof_id
  from public.payment_proofs
  where booking_id = p_booking_id and status = 'PENDING'
  order by created_at desc limit 1;
  if v_proof_id is null then raise exception 'Bukti pembayaran tidak ditemukan.'; end if;

  if p_approve then
    update public.payments
      set status = 'PAID', paid_at = now(), confirmed_by = null, updated_at = now()
      where id = v_payment.id;
    update public.bookings
      set payment_status = 'PAID', status = 'CONFIRMED', expires_at = null, updated_at = now()
      where id = p_booking_id;
    update public.payment_proofs
      set status = 'APPROVED', reviewed_by = null, reviewed_at = now(), review_note = p_note
      where id = v_proof_id;
  else
    update public.payments set status = 'REJECTED', updated_at = now() where id = v_payment.id;
    update public.bookings
      set payment_status = 'REJECTED', status = 'PAYMENT_ISSUE',
          expires_at = now() + interval '30 minutes', updated_at = now()
      where id = p_booking_id;
    update public.payment_proofs
      set status = 'REJECTED', reviewed_by = null, reviewed_at = now(), review_note = p_note
      where id = v_proof_id;
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, metadata)
  values (
    null,
    'ADMIN_ASSISTANT',
    case when p_approve then 'PAYMENT_APPROVED' else 'PAYMENT_REJECTED' end,
    'booking',
    p_booking_id::text,
    jsonb_build_object('note', p_note, 'channel', 'TELEGRAM')
  );

  select * into v_booking from public.bookings where id = p_booking_id;
  return jsonb_build_object(
    'id', v_booking.id,
    'booking_code', v_booking.booking_code,
    'status', v_booking.status,
    'payment_status', v_booking.payment_status
  );
end;
$$;

create or replace function public.admin_assistant_cancel_booking(
  p_booking_id uuid,
  p_reason text default 'Dibatalkan oleh admin melalui assistant'
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking tidak ditemukan.'; end if;
  if v_booking.payment_status = 'PAID' then
    raise exception 'Booking sudah dibayar. Gunakan proses refund/dashboard.';
  end if;
  if v_booking.status in ('COMPLETED','CANCELLED','EXPIRED') then
    raise exception 'Booking sudah tidak dapat dibatalkan.';
  end if;

  update public.bookings
  set status = 'CANCELLED', payment_status = 'EXPIRED', expires_at = null, updated_at = now()
  where id = p_booking_id;

  update public.payments
  set status = 'EXPIRED', updated_at = now()
  where booking_id = p_booking_id and status <> 'PAID';

  update public.payment_proofs
  set status = 'REJECTED', reviewed_at = now(), review_note = coalesce(p_reason, 'Booking dibatalkan')
  where booking_id = p_booking_id and status = 'PENDING';

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, metadata)
  values (
    null,
    'ADMIN_ASSISTANT',
    'BOOKING_CANCELLED',
    'booking',
    p_booking_id::text,
    jsonb_build_object('reason', p_reason, 'channel', 'TELEGRAM')
  );

  select * into v_booking from public.bookings where id = p_booking_id;
  return jsonb_build_object(
    'id', v_booking.id,
    'booking_code', v_booking.booking_code,
    'status', v_booking.status,
    'payment_status', v_booking.payment_status
  );
end;
$$;

revoke all on function public.admin_assistant_review_payment(uuid,boolean,text) from public, anon, authenticated;
revoke all on function public.admin_assistant_cancel_booking(uuid,text) from public, anon, authenticated;
grant execute on function public.admin_assistant_review_payment(uuid,boolean,text) to service_role;
grant execute on function public.admin_assistant_cancel_booking(uuid,text) to service_role;
