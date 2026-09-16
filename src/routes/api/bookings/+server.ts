import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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
  return json({ booking: data }, { status: 201 });
};
