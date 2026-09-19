import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSupabaseAdmin } from '$lib/server/supabase-admin';
import {
  answerCallbackQuery,
  editTelegramMessage,
  isAllowedAdminChat,
  sendTelegramMessage,
  verifyTelegramWebhookSecret
} from '$lib/server/telegram';
import { executeAdminCallback, executeAdminMessage } from '$lib/server/admin-assistant';

type TelegramUpdate = {
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number };
    from?: { id: number; first_name?: string; username?: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number; first_name?: string; username?: string };
    message?: { message_id: number; chat: { id: number } };
  };
};

export const POST: RequestHandler = async ({ request }) => {
  const secret = request.headers.get('x-telegram-bot-api-secret-token');
  if (!verifyTelegramWebhookSecret(secret)) return json({ ok: false }, { status: 401 });

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  if (!update) return json({ ok: true });

  const client = getSupabaseAdmin();
  if (!client) return json({ ok: true, warning: 'Supabase admin belum dikonfigurasi.' });

  if (update.message?.text) {
    const chatId = update.message.chat.id;
    if (!isAllowedAdminChat(chatId)) return json({ ok: true, ignored: 'unauthorized_chat' });
    const reply = await executeAdminMessage(client, update.message.text);
    await sendTelegramMessage(chatId, reply.text, reply.keyboard);
    return json({ ok: true });
  }

  const callback = update.callback_query;
  if (callback?.data && callback.message) {
    const chatId = callback.message.chat.id;
    if (!isAllowedAdminChat(chatId)) {
      await answerCallbackQuery(callback.id, 'Chat ini tidak terdaftar sebagai admin.');
      return json({ ok: true, ignored: 'unauthorized_chat' });
    }

    const reply = await executeAdminCallback(client, callback.data, String(chatId));
    await answerCallbackQuery(callback.id, 'Diproses.');

    if (callback.data.startsWith('pay_') || callback.data.startsWith('cancel_yes') || callback.data.startsWith('noop')) {
      await editTelegramMessage(chatId, callback.message.message_id, reply.text, reply.keyboard);
    } else {
      await sendTelegramMessage(chatId, reply.text, reply.keyboard);
    }
    return json({ ok: true });
  }

  return json({ ok: true, ignored: 'unsupported_update' });
};
