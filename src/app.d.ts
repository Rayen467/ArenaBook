import type { SupabaseClient, User } from '@supabase/supabase-js';

declare global {
  namespace App {
    interface Locals {
      supabase?: SupabaseClient;
      getVerifiedUser: () => Promise<User | null>;
    }

    interface PageData {
      user?: User | null;
      profile?: {
        id: string;
        role: 'USER' | 'ADMIN';
        full_name: string | null;
        phone: string | null;
        address: string | null;
      } | null;
      backendReady?: boolean;
    }
  }
}

export {};
