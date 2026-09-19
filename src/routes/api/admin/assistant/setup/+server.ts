import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { configureTelegramWebhook, sendAdminNotification, telegramWebhookConfigured } from '$lib/server/telegram';

async function requireAdmin(locals: App.Locals) {
  if (!locals.supabase) return { ok: false as const, status: 503, error: 'Backend belum dikonfigurasi.' };
  const user = await locals.getVerifiedUser();
  if (!user) return { ok: false as const, status: 401, error: 'Silakan login.' };
  const { data: profile } = await locals.supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'ADMIN') return { ok: false as const, status: 403, error: 'Admin access required.' };
  return { ok: true as const };
}

export const POST: RequestHandler = async ({ locals, url }) => {
  const access = await requireAdmin(locals);
  if (!access.ok) return json({ error: access.error }, { status: access.status });
  if (!telegramWebhookConfigured()) {
    return json({ error: 'TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_IDS, atau TELEGRAM_WEBHOOK_SECRET belum lengkap.' }, { status: 400 });
  }

  const result = await configureTelegramWebhook(url.origin);
  if (!result.ok) return json({ error: result.description ?? 'Gagal memasang webhook.' }, { status: 400 });

  await sendAdminNotification('✅ ArenaBook Admin Assistant aktif. Webhook Telegram sudah terpasang. Ketik “help” untuk contoh perintah.');
  return json({ ok: true, webhookUrl: `${url.origin}/api/telegram/webhook` });
};
