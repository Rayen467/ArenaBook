import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.supabase) return json({ error: 'Backend belum dikonfigurasi.' }, { status: 503 });
  const user = await locals.getVerifiedUser();
  if (!user) return json({ error: 'Silakan login.' }, { status: 401 });

  const { data: profile } = await locals.supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'ADMIN') return json({ error: 'Admin access required.' }, { status: 403 });

  const { data: proof, error } = await locals.supabase
    .from('payment_proofs')
    .select('id, storage_path, original_filename, declared_amount, reference_number, is_duplicate, amount_matches, status, created_at')
    .eq('booking_id', params.bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return json({ error: error.message }, { status: 400 });
  if (!proof) return json({ error: 'Bukti pembayaran tidak ditemukan.' }, { status: 404 });

  const { data: signed, error: signError } = await locals.supabase.storage
    .from('payment-proofs')
    .createSignedUrl(proof.storage_path, 300);

  if (signError) return json({ error: signError.message }, { status: 400 });
  return json({ proof, signedUrl: signed.signedUrl });
};
