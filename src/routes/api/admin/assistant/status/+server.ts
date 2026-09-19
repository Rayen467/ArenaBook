import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTelegramWebhookInfo, telegramConfigured, telegramWebhookConfigured } from '$lib/server/telegram';
import { supabaseAdminConfigured } from '$lib/server/supabase-admin';

async function requireAdmin(locals: App.Locals) {
  if (!locals.supabase) return { ok: false as const, status: 503, error: 'Backend belum dikonfigurasi.' };
  const user = await locals.getVerifiedUser();
  if (!user) return { ok: false as const, status: 401, error: 'Silakan login.' };
  const { data: profile } = await locals.supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'ADMIN') return { ok: false as const, status: 403, error: 'Admin access required.' };
  return { ok: true as const };
}

export const GET: RequestHandler = async ({ locals }) => {
  const access = await requireAdmin(locals);
  if (!access.ok) return json({ error: access.error }, { status: access.status });

  const telegram = telegramConfigured();
  const webhook = telegramWebhookConfigured();
  const webhookInfo = telegram && webhook ? await getTelegramWebhookInfo() : null;

  return json({
    supabaseAdmin: supabaseAdminConfigured(),
    telegram,
    webhookSecret: webhook,
    webhookInfo: webhookInfo?.ok ? webhookInfo.result : null,
    webhookError: webhookInfo && !webhookInfo.ok ? webhookInfo.description : null
  });
};
