import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendAdminNotification } from '$lib/server/telegram';

function rupiah(value: number | string | null | undefined) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function jadwal(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta', weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  }).format(new Date(value));
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.supabase) return json({ error: 'Backend belum dikonfigurasi.' }, { status: 503 });

  const user = await locals.getVerifiedUser();
  if (!user) return json({ error: 'Silakan login terlebih dahulu.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Payload booking tidak valid.' }, { status: 400 });

  const {
    venueId,
    startsAt,
    durationMinutes,
    customerName,
    customerPhone,
    customerAddress,
    equipment = []
  } = body;

  if (!venueId || !startsAt || !durationMinutes || !customerName || !customerPhone || !customerAddress) {
    return json({ error: 'Data booking belum lengkap.' }, { status: 400 });
  }

  const { data, error } = await locals.supabase.rpc('create_booking', {
    p_venue_id: venueId,
    p_starts_at: startsAt,
    p_duration_minutes: durationMinutes,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_customer_address: customerAddress,
    p_equipment: equipment
  });

  if (error) return json({ error: error.message }, { status: 409 });

  const { data: venue } = await locals.supabase.from('venues').select('name').eq('id', venueId).maybeSingle();
  void sendAdminNotification([
    '🆕 BOOKING BARU',
    '',
    `${data?.booking_code ?? data?.id ?? 'Booking'} — ${customerName}`,
    `${venue?.name ?? 'Lapangan'} • ${jadwal(data?.starts_at ?? startsAt)}`,
    `Durasi: ${Math.round(Number(durationMinutes) / 60)} jam`,
    `Total: ${rupiah(data?.total_amount)}`,
    '',
    'Status: MENUNGGU PEMBAYARAN'
  ].join('\n'));

  return json({ booking: data }, { status: 201 });
};
