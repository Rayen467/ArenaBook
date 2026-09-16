import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.supabase) return json({ error: 'Backend belum dikonfigurasi.' }, { status: 503 });

  const user = await locals.getVerifiedUser();
  if (!user) return json({ error: 'Silakan login terlebih dahulu.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const approve = Boolean(body?.approve);
  const note = String(body?.note ?? '').trim();

  const { data, error } = await locals.supabase.rpc('review_payment', {
    p_booking_id: params.bookingId,
    p_approve: approve,
    p_note: note || null
  });

  if (error) return json({ error: error.message }, { status: error.message.toLowerCase().includes('admin') ? 403 : 400 });
  return json({ booking: data });
};
