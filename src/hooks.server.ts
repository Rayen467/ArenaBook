import { createServerClient } from '@supabase/ssr';
import { env } from '$env/dynamic/public';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const url = env.PUBLIC_SUPABASE_URL;
  const key = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (url && key) {
    event.locals.supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => event.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) {
            event.cookies.set(name, value, { ...options, path: '/' });
          }
        }
      }
    });
  }

  event.locals.getVerifiedUser = async () => {
    if (!event.locals.supabase) return null;
    const { data, error } = await event.locals.supabase.auth.getUser();
    if (error) return null;
    return data.user ?? null;
  };

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });
};
