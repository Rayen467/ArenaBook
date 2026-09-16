import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.supabase) return json({ error: 'Backend belum dikonfigurasi.' }, { status: 503 });

  const venueId = url.searchParams.get('venue_id');
  const date = url.searchParams.get('date');
  if (!venueId || !date) return json({ error: 'venue_id dan date wajib diisi.' }, { status: 400 });

  const { data, error } = await locals.supabase.rpc('get_venue_schedule', {
    p_venue_id: venueId,
    p_date: date
  });

  if (error) return json({ error: error.message }, { status: 400 });
  return json({ slots: data ?? [] });
};
