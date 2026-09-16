import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxBytes = 5 * 1024 * 1024;

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.supabase) return json({ error: 'Backend belum dikonfigurasi.' }, { status: 503 });

  const user = await locals.getVerifiedUser();
  if (!user) return json({ error: 'Silakan login terlebih dahulu.' }, { status: 401 });

  const form = await request.formData();
  const bookingId = String(form.get('booking_id') ?? '').trim();
  const declaredAmount = Number(form.get('declared_amount') ?? 0);
  const referenceNumber = String(form.get('reference_number') ?? '').trim();
  const proof = form.get('proof');

  if (!bookingId || !declaredAmount || !referenceNumber || !(proof instanceof File)) {
    return json({ error: 'Booking, nominal, referensi, dan bukti wajib diisi.' }, { status: 400 });
  }
  if (!allowedTypes.has(proof.type)) return json({ error: 'Format bukti harus JPG, PNG, atau WEBP.' }, { status: 400 });
  if (proof.size > maxBytes) return json({ error: 'Ukuran bukti maksimal 5 MB.' }, { status: 400 });

  const bytes = new Uint8Array(await proof.arrayBuffer());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sha256 = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  const safeName = proof.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120);
  const storagePath = `${user.id}/${bookingId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await locals.supabase.storage
    .from('payment-proofs')
    .upload(storagePath, bytes, { contentType: proof.type, upsert: false });

  if (uploadError) return json({ error: uploadError.message }, { status: 400 });

  const { data, error } = await locals.supabase.rpc('submit_payment_proof', {
    p_booking_id: bookingId,
    p_storage_path: storagePath,
    p_original_filename: proof.name,
    p_mime_type: proof.type,
    p_file_size: proof.size,
    p_declared_amount: declaredAmount,
    p_reference_number: referenceNumber,
    p_sha256: sha256
  });

  if (error) {
    await locals.supabase.storage.from('payment-proofs').remove([storagePath]);
    return json({ error: error.message }, { status: 400 });
  }

  return json({ proof: data }, { status: 201 });
};
