import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const authMessage = (message: string) => {
  if (message === 'Invalid login credentials') return 'Email atau password salah. Coba periksa lagi.';
  if (message === 'Email not confirmed') return 'Email belum dikonfirmasi. Buka email verifikasi atau kirim ulang link konfirmasi.';
  if (message.toLowerCase().includes('already registered')) return 'Email ini sudah terdaftar. Silakan masuk atau kirim ulang email konfirmasi.';
  if (message.toLowerCase().includes('rate limit')) return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  return message;
};

export const load: PageServerLoad = async ({ locals }) => {
  const user = await locals.getVerifiedUser();
  if (user) throw redirect(303, '/');
  return { backendReady: Boolean(locals.supabase) };
};

export const actions: Actions = {
  login: async ({ request, locals }) => {
    if (!locals.supabase) return fail(503, { mode: 'login', message: 'Backend ArenaBook belum tersedia.' });

    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');

    if (!email || !password) {
      return fail(400, { mode: 'login', message: 'Email dan password wajib diisi.', email });
    }

    const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
    if (error) return fail(400, { mode: 'login', message: authMessage(error.message), email });

    throw redirect(303, '/');
  },

  signup: async ({ request, locals, url }) => {
    if (!locals.supabase) return fail(503, { mode: 'signup', message: 'Backend ArenaBook belum tersedia.' });

    const form = await request.formData();
    const fullName = String(form.get('full_name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');
    const passwordConfirm = String(form.get('password_confirm') ?? '');

    if (fullName.length < 3) {
      return fail(400, { mode: 'signup', message: 'Nama lengkap minimal 3 karakter.', fullName, email });
    }
    if (!email || !email.includes('@')) {
      return fail(400, { mode: 'signup', message: 'Masukkan alamat email yang valid.', fullName, email });
    }
    if (password.length < 8) {
      return fail(400, { mode: 'signup', message: 'Password minimal 8 karakter.', fullName, email });
    }
    if (password !== passwordConfirm) {
      return fail(400, { mode: 'signup', message: 'Password dan ulangi password belum sama.', fullName, email });
    }

    const { error } = await locals.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${url.origin}/auth/confirm`
      }
    });

    if (error) {
      return fail(400, { mode: 'signup', message: authMessage(error.message), fullName, email });
    }

    return {
      mode: 'signup',
      success: true,
      message: 'Akun berhasil dibuat. Buka email kamu lalu klik link konfirmasi sebelum masuk.',
      fullName,
      email
    };
  },

  resend: async ({ request, locals, url }) => {
    if (!locals.supabase) return fail(503, { mode: 'signup', message: 'Backend ArenaBook belum tersedia.' });

    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    if (!email) return fail(400, { mode: 'signup', message: 'Masukkan email akun yang ingin dikonfirmasi.' });

    const { error } = await locals.supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${url.origin}/auth/confirm` }
    });

    if (error) return fail(400, { mode: 'signup', message: authMessage(error.message), email });

    return {
      mode: 'signup',
      success: true,
      message: 'Email konfirmasi baru sudah dikirim. Gunakan link yang paling baru.',
      email
    };
  }
};