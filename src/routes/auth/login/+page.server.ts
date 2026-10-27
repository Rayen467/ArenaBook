import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const connectionMessage =
  'Koneksi layanan akun ArenaBook sedang bermasalah. Coba lagi beberapa saat. Jika tetap gagal, hubungi admin.';

function authMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('fetch failed') || lower.includes('failed to fetch') || lower.includes('network') || lower.includes('timeout')) {
    return connectionMessage;
  }
  if (lower.includes('invalid login credentials')) return 'Email atau password salah. Periksa kembali data login kamu.';
  if (lower.includes('email not confirmed')) return 'Email belum dikonfirmasi. Cek inbox atau kirim ulang link verifikasi di halaman Daftar.';
  if (lower.includes('already registered')) return 'Email sudah terdaftar. Silakan masuk memakai akun ini.';
  if (lower.includes('rate limit') || lower.includes('too many requests')) return 'Terlalu banyak percobaan. Tunggu beberapa menit sebelum mencoba lagi.';
  if (lower.includes('email address') && lower.includes('invalid')) return 'Alamat email tidak valid. Cek penulisan email kamu.';
  return message;
}

export const load: PageServerLoad = async ({ locals }) => {
  try {
    const user = await locals.getVerifiedUser();
    if (user) throw redirect(303, '/');
  } catch (error) {
    // Preserve SvelteKit redirects; only ignore transient auth network failures.
    if (error && typeof error === 'object' && 'status' in error && 'location' in error) throw error;
  }
  return { backendReady: Boolean(locals.supabase) };
};

export const actions: Actions = {
  login: async ({ request, locals }) => {
    if (!locals.supabase) return fail(503, { mode: 'login', message: connectionMessage });

    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');
    if (!email || !password) return fail(400, { mode: 'login', message: 'Email dan password wajib diisi.', email });

    try {
      const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
      if (error) return fail(400, { mode: 'login', message: authMessage(error.message), email });
    } catch {
      return fail(503, { mode: 'login', message: connectionMessage, email });
    }
    throw redirect(303, '/');
  },

  signup: async ({ request, locals, url }) => {
    if (!locals.supabase) return fail(503, { mode: 'signup', message: connectionMessage });

    const form = await request.formData();
    const fullName = String(form.get('full_name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');
    const passwordConfirm = String(form.get('password_confirm') ?? '');
    if (fullName.length < 3) return fail(400, { mode: 'signup', message: 'Nama lengkap minimal 3 karakter.', fullName, email });
    if (!email || !email.includes('@')) return fail(400, { mode: 'signup', message: 'Masukkan alamat email yang valid.', fullName, email });
    if (password.length < 8) return fail(400, { mode: 'signup', message: 'Password minimal 8 karakter.', fullName, email });
    if (password !== passwordConfirm) return fail(400, { mode: 'signup', message: 'Password dan ulangi password belum sama.', fullName, email });

    try {
      const { error } = await locals.supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: url.origin + '/auth/confirm'
        }
      });
      if (error) return fail(400, { mode: 'signup', message: authMessage(error.message), fullName, email });
    } catch {
      return fail(503, { mode: 'signup', message: connectionMessage, fullName, email });
    }

    return { mode: 'signup', success: true, message: 'Pendaftaran diterima. Cek inbox atau spam, lalu klik link konfirmasi email untuk mengaktifkan akun.', fullName, email };
  },

  resend: async ({ request, locals, url }) => {
    if (!locals.supabase) return fail(503, { mode: 'signup', message: connectionMessage });

    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    if (!email || !email.includes('@')) return fail(400, { mode: 'signup', message: 'Masukkan email akun yang valid.' });

    try {
      const { error } = await locals.supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: url.origin + '/auth/confirm' }
      });
      if (error) return fail(400, { mode: 'signup', message: authMessage(error.message), email });
    } catch {
      return fail(503, { mode: 'signup', message: connectionMessage, email });
    }

    return { mode: 'signup', success: true, message: 'Permintaan kirim ulang diterima. Cek email terbaru, termasuk folder spam.', email };
  }
};