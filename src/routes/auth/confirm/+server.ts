import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.supabase) throw redirect(303, '/auth/login');

  const code = url.searchParams.get('code');
  if (code) {
    const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
    if (!error) throw redirect(303, '/');
  }

  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  if (tokenHash && type) {
    const { error } = await locals.supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any
    });
    if (!error) throw redirect(303, '/');
  }

  throw redirect(303, '/auth/login');
};
