import type { SupabaseClient } from '@supabase/supabase-js';
import type { InlineKeyboard } from './telegram';

const BLOCKING_STATUSES = ['AWAITING_PAYMENT', 'PENDING_VERIFICATION', 'CONFIRMED', 'CHECKED_IN', 'PLAYING', 'PAYMENT_ISSUE'];
const STOP_WORDS = new Set(['approve','approved','konfirmasi','konfirm','yang','udah','sudah','masuk','dana','bayar','pembayaran','tolak','reject','batal','batalkan','booking','pesanan','tadi','aja','ya','dong','nih','ini','itu','coba','tolong','aman','belum']);

type ParsedMessage = {
  intent: 'HELP' | 'PENDING' | 'BOOKINGS' | 'AVAILABILITY' | 'APPROVE' | 'REJECT' | 'CANCEL' | 'DETAIL' | 'UNKNOWN';
  normalized: string;
  bookingCode?: string;
  dateKey: string;
  time?: string;
  ambiguousHour?: number;
  eveningOnly?: boolean;
};

type AssistantReply = { text: string; keyboard?: InlineKeyboard };

function normalize(input: string) {
  return input.toLowerCase().normalize('NFKD').replace(/[^a-z0-9:/\-\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function jakartaDateKey(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const d = Number(parts.find((p) => p.type === 'day')?.value);
  const base = new Date(Date.UTC(y, m - 1, d + offsetDays));
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}-${String(base.getUTCDate()).padStart(2, '0')}`;
}

function nextDateKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

function localRange(dateKey: string, from = '00:00', to = '24:00') {
  const start = new Date(`${dateKey}T${from === '24:00' ? '23:59:59' : `${from}:00`}+07:00`);
  const endKey = to === '24:00' ? nextDateKey(dateKey) : dateKey;
  const end = new Date(`${endKey}T${to === '24:00' ? '00:00:00' : `${to}:00`}+07:00`);
  return { start: start.toISOString(), end: end.toISOString() };
}

function parseDate(text: string) {
  if (/\bbesok\b/.test(text)) return jakartaDateKey(1);
  if (/\blusa\b/.test(text)) return jakartaDateKey(2);
  const explicit = text.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);
  if (explicit) {
    const d = Number(explicit[1]);
    const m = Number(explicit[2]);
    const nowY = Number(jakartaDateKey().slice(0, 4));
    let y = explicit[3] ? Number(explicit[3]) : nowY;
    if (y < 100) y += 2000;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return jakartaDateKey();
}

function parseTime(text: string) {
  const match = text.match(/\b(?:jam|pukul)\s*(\d{1,2})(?::(\d{2}))?\b/);
  if (!match) return {};
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  if (hour > 23 || minute > 59) return {};
  const hasEvening = /\b(malam|sore)\b/.test(text);
  const hasNoon = /\bsiang\b/.test(text);
  const hasMorning = /\b(pagi)\b/.test(text);
  if ((hasEvening || hasNoon) && hour < 12) hour += 12;
  if (hasMorning && hour === 12) hour = 0;
  if (!hasEvening && !hasNoon && !hasMorning && hour <= 12) return { ambiguousHour: hour };
  return { time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` };
}

export function parseAdminMessage(input: string): ParsedMessage {
  const text = normalize(input);
  const code = input.toUpperCase().match(/BK-[A-Z0-9-]+/)?.[0];
  const dateKey = parseDate(text);
  const parsedTime = parseTime(text);
  const eveningOnly = /\b(malam ini|nanti malam|malam)\b/.test(text) && !parsedTime.time;

  let intent: ParsedMessage['intent'] = 'UNKNOWN';
  if (/^(\/start|\/help|help|bantuan|menu|fitur)/.test(text)) intent = 'HELP';
  else if (/\b(approve|konfirmasi|dana masuk|udah masuk|sudah masuk|aman)\b/.test(text)) intent = 'APPROVE';
  else if (/\b(tolak|reject|belum masuk|tidak masuk)\b/.test(text)) intent = 'REJECT';
  else if (/\b(batal|batalkan|cancel)\b/.test(text)) intent = 'CANCEL';
  else if (/\b(bukti|detail|rincian)\b/.test(text)) intent = 'DETAIL';
  else if (/\b(pending|antrean|antrian|verifikasi|pembayaran masuk|bukti masuk)\b/.test(text)) intent = 'PENDING';
  else if (/\b(kosong|tersedia|available|availability)\b/.test(text)) intent = 'AVAILABILITY';
  else if (/\b(booking|jadwal|main|siapa aja|siapa saja)\b/.test(text)) intent = 'BOOKINGS';

  return { intent, normalized: text, bookingCode: code, dateKey, ...parsedTime, eveningOnly };
}

function rupiah(value: number | string | null | undefined) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function dt(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  }).format(new Date(value));
}

function venueName(row: any) {
  if (Array.isArray(row?.venue)) return row.venue[0]?.name ?? '-';
  return row?.venue?.name ?? '-';
}

function candidateWords(text: string) {
  return text.split(' ').filter((word) => word.length >= 3 && !STOP_WORDS.has(word) && !/^bk-/.test(word) && !/^\d/.test(word));
}

async function findActionBooking(client: SupabaseClient, parsed: ParsedMessage, statuses: string[]) {
  if (parsed.bookingCode) {
    const { data } = await client.from('bookings')
      .select('id,booking_code,customer_name,total_amount,starts_at,status,payment_status,venue:venues(name)')
      .eq('booking_code', parsed.bookingCode)
      .maybeSingle();
    return data ?? null;
  }

  const { data = [] } = await client.from('bookings')
    .select('id,booking_code,customer_name,total_amount,starts_at,status,payment_status,venue:venues(name)')
    .in('status', statuses)
    .order('created_at', { ascending: false })
    .limit(20);

  const words = candidateWords(parsed.normalized);
  if (words.length) {
    const scored = (data ?? []).map((row: any) => {
      const hay = normalize(`${row.customer_name} ${row.booking_code}`);
      const score = words.reduce((sum, word) => sum + (hay.includes(word) ? 1 : 0), 0);
      return { row, score };
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
    if (scored[0] && (!scored[1] || scored[0].score > scored[1].score)) return scored[0].row;
  }

  return (data ?? []).length === 1 ? (data as any[])[0] : null;
}

function bookingSummary(row: any) {
  return `${row.booking_code} — ${row.customer_name}\n${venueName(row)} • ${dt(row.starts_at)}\n${rupiah(row.total_amount)} • ${row.status} / ${row.payment_status}`;
}

export async function executeAdminMessage(client: SupabaseClient, input: string): Promise<AssistantReply> {
  const parsed = parseAdminMessage(input);

  if (parsed.intent === 'HELP' || parsed.intent === 'UNKNOWN') {
    return {
      text: [
        'ArenaBook Admin Assistant',
        '',
        'Coba ketik bebas seperti:',
        '• “booking malam ini siapa aja?”',
        '• “besok ada booking apa?”',
        '• “pembayaran yang belum dicek”',
        '• “approve yang Rayhandi”',
        '• “tolak BK-260919-ABC123”',
        '• “jam 8 malam kosong?”',
        '• “detail booking Rayhandi”',
        '',
        'Aksi sensitif selalu minta konfirmasi tombol dulu.'
      ].join('\n')
    };
  }

  if (parsed.intent === 'PENDING') {
    const { data = [], error } = await client.from('bookings')
      .select('id,booking_code,customer_name,total_amount,starts_at,status,payment_status,venue:venues(name),payment_proofs(amount_matches,is_duplicate,status,created_at)')
      .eq('payment_status', 'PROOF_SUBMITTED')
      .order('created_at', { ascending: true })
      .limit(20);
    if (error) return { text: `Gagal membaca antrean: ${error.message}` };
    if (!data?.length) return { text: 'Antrean pembayaran bersih. Tidak ada bukti yang menunggu verifikasi.' };
    const lines = data.map((row: any, index: number) => `${index + 1}. ${bookingSummary(row).replace(/\n/g, ' | ')}`);
    return { text: `Menunggu verifikasi (${data.length})\n\n${lines.join('\n')}` };
  }

  if (parsed.intent === 'BOOKINGS') {
    const range = parsed.eveningOnly ? localRange(parsed.dateKey, '17:00', '24:00') : localRange(parsed.dateKey);
    const { data = [], error } = await client.from('bookings')
      .select('id,booking_code,customer_name,total_amount,starts_at,ends_at,status,payment_status,venue:venues(name)')
      .gte('starts_at', range.start).lt('starts_at', range.end)
      .not('status', 'in', '(CANCELLED,EXPIRED)')
      .order('starts_at');
    if (error) return { text: `Gagal membaca jadwal: ${error.message}` };
    if (!data?.length) return { text: `Tidak ada booking ${parsed.eveningOnly ? 'malam ' : ''}${parsed.dateKey}.` };
    return { text: `Booking ${parsed.eveningOnly ? 'malam ' : ''}${parsed.dateKey} (${data.length})\n\n${data.map((row: any) => bookingSummary(row)).join('\n\n')}` };
  }

  if (parsed.intent === 'AVAILABILITY') {
    if (parsed.ambiguousHour !== undefined) {
      return { text: `“Jam ${parsed.ambiguousHour}” masih ambigu. Ketik “jam ${parsed.ambiguousHour} pagi” atau “jam ${parsed.ambiguousHour} malam” supaya gue cek tepat.` };
    }
    if (!parsed.time) return { text: 'Sebutkan jamnya juga, contoh: “besok jam 8 malam kosong?”' };
    const start = new Date(`${parsed.dateKey}T${parsed.time}:00+07:00`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const [{ data: venues = [] }, { data: blocked = [] }] = await Promise.all([
      client.from('venues').select('id,name').eq('active', true).order('name'),
      client.from('bookings').select('venue_id').in('status', BLOCKING_STATUSES).lt('starts_at', end.toISOString()).gt('ends_at', start.toISOString())
    ]);
    const blockedIds = new Set((blocked ?? []).map((row: any) => row.venue_id));
    const free = (venues ?? []).filter((row: any) => !blockedIds.has(row.id));
    if (!free.length) return { text: `${parsed.dateKey} pukul ${parsed.time}: semua lapangan sedang terpakai/tertahan.` };
    return { text: `${parsed.dateKey} pukul ${parsed.time}, tersedia:\n${free.map((row: any) => `• ${row.name}`).join('\n')}` };
  }

  if (parsed.intent === 'APPROVE' || parsed.intent === 'REJECT') {
    const booking = await findActionBooking(client, parsed, ['PENDING_VERIFICATION']);
    if (!booking) return { text: 'Gue belum yakin booking mana yang dimaksud. Sebut nama customer atau kode booking, contoh “approve BK-260919-ABC123”.' };
    const approve = parsed.intent === 'APPROVE';
    return {
      text: `${approve ? 'Konfirmasi dana masuk?' : 'Tolak bukti pembayaran?'}\n\n${bookingSummary(booking)}\n\nAksi belum dijalankan sampai tombol konfirmasi ditekan.`,
      keyboard: [[
        { text: approve ? '✅ Ya, approve' : '❌ Ya, tolak', callback_data: `${approve ? 'pay_ok' : 'pay_no'}:${booking.id}` },
        { text: 'Batal', callback_data: `noop:${booking.id}` }
      ], [{ text: '👁 Lihat bukti', callback_data: `proof:${booking.id}` }]]
    };
  }

  if (parsed.intent === 'CANCEL') {
    const booking = await findActionBooking(client, parsed, ['AWAITING_PAYMENT','PENDING_VERIFICATION','PAYMENT_ISSUE','CONFIRMED']);
    if (!booking) return { text: 'Booking yang mau dibatalkan belum jelas. Sebut nama customer atau kode booking.' };
    if (booking.payment_status === 'PAID') return { text: `Booking ${booking.booking_code} sudah PAID. Pembatalan berbayar harus ditangani dari dashboard/refund flow, jadi bot tidak akan membatalkannya otomatis.` };
    return {
      text: `Batalkan booking ini?\n\n${bookingSummary(booking)}\n\nAksi belum dijalankan.`,
      keyboard: [[
        { text: '🛑 Ya, batalkan', callback_data: `cancel_yes:${booking.id}` },
        { text: 'Jangan', callback_data: `noop:${booking.id}` }
      ]]
    };
  }

  if (parsed.intent === 'DETAIL') {
    const booking = await findActionBooking(client, parsed, BLOCKING_STATUSES.concat(['COMPLETED','CANCELLED','EXPIRED']));
    if (!booking) return { text: 'Booking yang dimaksud belum jelas. Sebut nama atau kode booking.' };
    return {
      text: bookingSummary(booking),
      keyboard: booking.payment_status === 'PROOF_SUBMITTED' ? [[{ text: '👁 Lihat bukti', callback_data: `proof:${booking.id}` }]] : undefined
    };
  }

  return { text: 'Perintah belum dikenali. Ketik “help” untuk contoh kalimat yang bisa dipakai.' };
}

export async function executeAdminCallback(client: SupabaseClient, data: string, chatId: string): Promise<AssistantReply> {
  const [action, bookingId] = data.split(':');
  if (!bookingId) return { text: 'Aksi tidak valid.' };
  if (action === 'noop') return { text: 'Aksi dibatalkan. Tidak ada data yang diubah.' };

  if (action === 'proof') {
    const { data: proof, error } = await client.from('payment_proofs')
      .select('storage_path,original_filename,declared_amount,amount_matches,is_duplicate,created_at')
      .eq('booking_id', bookingId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error || !proof) return { text: 'Bukti pembayaran tidak ditemukan.' };
    const { data: signed, error: signError } = await client.storage.from('payment-proofs').createSignedUrl(proof.storage_path, 300);
    if (signError || !signed?.signedUrl) return { text: `Gagal membuat link bukti: ${signError?.message ?? 'unknown error'}` };
    return {
      text: `Bukti: ${proof.original_filename}\nNominal: ${rupiah(proof.declared_amount)}\nNominal cocok: ${proof.amount_matches ? 'YA' : 'TIDAK'}\nDuplikat: ${proof.is_duplicate ? 'TERDETEKSI' : 'tidak'}\n\nLink berlaku 5 menit.`,
      keyboard: [[{ text: '🖼 Buka bukti', url: signed.signedUrl }]]
    };
  }

  if (action === 'pay_ok' || action === 'pay_no') {
    const approve = action === 'pay_ok';
    const { data: result, error } = await client.rpc('admin_assistant_review_payment', {
      p_booking_id: bookingId,
      p_approve: approve,
      p_note: `Telegram Admin Assistant chat ${chatId}`
    });
    if (error) return { text: `Gagal memproses pembayaran: ${error.message}` };
    return { text: `${approve ? '✅ Pembayaran dikonfirmasi' : '❌ Bukti ditolak'}\n${result?.booking_code ?? bookingId}\nStatus: ${result?.status ?? '-'} / ${result?.payment_status ?? '-'}` };
  }

  if (action === 'cancel_yes') {
    const { data: result, error } = await client.rpc('admin_assistant_cancel_booking', {
      p_booking_id: bookingId,
      p_reason: `Dibatalkan dari Telegram Admin Assistant chat ${chatId}`
    });
    if (error) return { text: `Gagal membatalkan booking: ${error.message}` };
    return { text: `🛑 Booking ${result?.booking_code ?? bookingId} dibatalkan.` };
  }

  return { text: 'Aksi tidak dikenali.' };
}

export function paymentProofKeyboard(bookingId: string): InlineKeyboard {
  return [
    [
      { text: '✅ Dana masuk', callback_data: `pay_ok:${bookingId}` },
      { text: '❌ Tolak', callback_data: `pay_no:${bookingId}` }
    ],
    [{ text: '👁 Lihat bukti', callback_data: `proof:${bookingId}` }]
  ];
}

export function bookingDetailKeyboard(bookingId: string): InlineKeyboard {
  return [[{ text: 'ℹ️ Detail', callback_data: `detail:${bookingId}` }]];
}
