import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const user = await locals.getVerifiedUser();
  if (user) throw redirect(303, '/');
  return { backendReady: Boolean(locals.supabase) };
};

export const actions: Actions = {
  login: async ({ request, locals }) => {
    if (!locals.supabase) return fail(503, { message: 'Supabase belum dikonfigurasi di environment.' });
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');
    if (!email || !password) return fail(400, { message: 'Email dan password wajib diisi.', email });

    const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
    if (error) return fail(400, { message: error.message, email });
    throw redirect(303, '/');
  },

  signup: async ({ request, locals, url }) => {
    if (!locals.supabase) return fail(503, { message: 'Supabase belum dikonfigurasi di environment.' });
    const form = await request.formData();
    const fullName = String(form.get('full_name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');
    if (!fullName || !email || password.length < 8) {
      return fail(400, { message: 'Nama, email, dan password minimal 8 karakter wajib diisi.', fullName, email });
    }

    const { error } = await locals.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${url.origin}/auth/confirm`
      }
    });

    if (error) return fail(400, { message: error.message, fullName, email });
    return { success: true, message: 'Akun dibuat. Cek email untuk konfirmasi.', email };
  },

  resend: async ({ request, locals, url }) => {
    if (!locals.supabase) return fail(503, { message: 'Supabase belum dikonfigurasi di environment.' });
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    if (!email) return fail(400, { message: 'Masukkan email yang ingin dikonfirmasi.' });

    const { error } = await locals.supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${url.origin}/auth/confirm` }
    });

    if (error) return fail(400, { message: error.message, email });
    return { success: true, message: 'Email konfirmasi baru sudah dikirim. Gunakan link yang paling baru.', email };
  }
};
