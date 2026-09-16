import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.supabase) return json({ error: 'Backend belum dikonfigurasi.' }, { status: 503 });
  const user = await locals.getVerifiedUser();
  if (!user) return json({ error: 'Silakan login.' }, { status: 401 });

  const { data: profile } = await locals.supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'ADMIN') return json({ error: 'Admin access required.' }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Payload tidak valid.' }, { status: 400 });

  const payload = {
    bank_name: String(body.bankName ?? '').trim() || null,
    account_number: String(body.accountNumber ?? '').trim() || null,
    account_name: String(body.accountName ?? '').trim() || null,
    qris_label: String(body.qrisLabel ?? '').trim() || null,
    instructions: String(body.instructions ?? '').trim() || null,
    updated_by: user.id
  };

  const { data, error } = await locals.supabase
    .from('payment_settings')
    .update(payload)
    .eq('id', 1)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json({ settings: data });
};
