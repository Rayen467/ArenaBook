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

  const enabled = Boolean(body.enabled);
  const mode = body.mode === 'MANUAL' ? 'MANUAL' : 'ADAPTIVE';
  const toleranceMinutes = Math.max(0, Math.min(120, Number(body.toleranceMinutes ?? 10)));
  const intervalMinutes = Math.max(1, Math.min(120, Number(body.intervalMinutes ?? 10)));
  const amountPerInterval = Math.max(0, Number(body.amountPerInterval ?? 10000));
  const maxAmount = Math.max(0, Number(body.maxAmount ?? 100000));

  const { data, error } = await locals.supabase
    .from('penalty_rules')
    .update({
      enabled,
      mode,
      tolerance_minutes: toleranceMinutes,
      interval_minutes: intervalMinutes,
      amount_per_interval: amountPerInterval,
      max_amount: maxAmount,
      updated_by: user.id
    })
    .eq('id', 1)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json({ rule: data });
};
