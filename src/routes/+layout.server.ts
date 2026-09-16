import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  const backendReady = Boolean(locals.supabase);
  const user = await locals.getVerifiedUser();

  if (!user || !locals.supabase) {
    return { backendReady, user: null, profile: null };
  }

  const { data: profile } = await locals.supabase
    .from('profiles')
    .select('id, role, full_name, phone, address')
    .eq('id', user.id)
    .maybeSingle();

  return { backendReady, user, profile: profile ?? null };
};
