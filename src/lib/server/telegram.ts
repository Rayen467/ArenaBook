import { env as privateEnv } from '$env/dynamic/private';

type InlineButton = { text: string; callback_data?: string; url?: string };
export type InlineKeyboard = InlineButton[][];

type TelegramResult<T = unknown> = { ok: boolean; result?: T; description?: string };

const apiBase = () => {
  const token = privateEnv.TELEGRAM_BOT_TOKEN?.trim();
  return token ? `https://api.telegram.org/bot${token}` : null;
};

export function telegramConfigured() {
  return Boolean(apiBase() && privateEnv.TELEGRAM_ADMIN_CHAT_IDS?.trim());
}

export function telegramWebhookConfigured() {
  return Boolean(telegramConfigured() && privateEnv.TELEGRAM_WEBHOOK_SECRET?.trim());
}

export function adminChatIds(): string[] {
  return (privateEnv.TELEGRAM_ADMIN_CHAT_IDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isAllowedAdminChat(chatId: string | number | null | undefined) {
  if (chatId === null || chatId === undefined) return false;
  return adminChatIds().includes(String(chatId));
}

export function verifyTelegramWebhookSecret(value: string | null) {
  const expected = privateEnv.TELEGRAM_WEBHOOK_SECRET?.trim();
  return Boolean(expected && value && value === expected);
}

async function telegramCall<T = unknown>(method: string, payload: Record<string, unknown>): Promise<TelegramResult<T>> {
  const base = apiBase();
  if (!base) return { ok: false, description: 'TELEGRAM_BOT_TOKEN belum dikonfigurasi.' };

  try {
    const response = await fetch(`${base}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = (await response.json().catch(() => ({ ok: false, description: 'Respons Telegram tidak valid.' }))) as TelegramResult<T>;
    if (!response.ok && data.ok) return { ok: false, description: `Telegram HTTP ${response.status}` };
    return data;
  } catch (error) {
    return { ok: false, description: error instanceof Error ? error.message : 'Gagal menghubungi Telegram.' };
  }
}

export async function sendTelegramMessage(chatId: string | number, text: string, keyboard?: InlineKeyboard) {
  return telegramCall('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    reply_markup: keyboard?.length ? { inline_keyboard: keyboard } : undefined
  });
}

export async function sendAdminNotification(text: string, keyboard?: InlineKeyboard) {
  if (!telegramConfigured()) return { sent: 0, skipped: true as const };
  let sent = 0;
  const failures: string[] = [];
  for (const chatId of adminChatIds()) {
    const result = await sendTelegramMessage(chatId, text, keyboard);
    if (result.ok) sent += 1;
    else failures.push(`${chatId}: ${result.description ?? 'unknown error'}`);
  }
  return { sent, skipped: false as const, failures };
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return telegramCall('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false
  });
}

export async function editTelegramMessage(chatId: string | number, messageId: number, text: string, keyboard?: InlineKeyboard) {
  return telegramCall('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    disable_web_page_preview: true,
    reply_markup: keyboard?.length ? { inline_keyboard: keyboard } : undefined
  });
}

export async function getTelegramWebhookInfo() {
  return telegramCall('getWebhookInfo', {});
}

export async function configureTelegramWebhook(origin: string) {
  const secret = privateEnv.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) return { ok: false, description: 'TELEGRAM_WEBHOOK_SECRET belum dikonfigurasi.' };
  return telegramCall('setWebhook', {
    url: `${origin.replace(/\/$/, '')}/api/telegram/webhook`,
    secret_token: secret,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: false
  });
}
