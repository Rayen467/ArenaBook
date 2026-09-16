import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.supabase) throw redirect(303, '/');

  const user = await locals.getVerifiedUser();
  let profile: Record<string, unknown> | null = null;

  if (user) {
    const { data } = await locals.supabase
      .from('profiles')
      .select('id, role, full_name, phone, address')
      .eq('id', user.id)
      .maybeSingle();
    profile = data ?? null;
  }

  const [venuesRes, equipmentRes, paymentSettingsRes, penaltyRuleRes] = await Promise.all([
    locals.supabase
      .from('venues')
      .select('id, name, type, surface, description, price_per_hour, capacity_min, capacity_max, open_time, close_time, active')
      .eq('active', true)
      .order('name'),
    locals.supabase
      .from('equipment')
      .select('id, name, price_per_booking, stock_total, stock_damaged, active')
      .eq('active', true)
      .order('name'),
    locals.supabase
      .from('payment_settings')
      .select('id, bank_name, account_number, account_name, qris_label, instructions, updated_at')
      .eq('id', 1)
      .maybeSingle(),
    locals.supabase
      .from('penalty_rules')
      .select('id, enabled, mode, tolerance_minutes, interval_minutes, amount_per_interval, max_amount, updated_at')
      .eq('id', 1)
      .maybeSingle()
  ]);

  let bookings: unknown[] = [];
  if (user) {
    const { data } = await locals.supabase
      .from('bookings')
      .select(`
        id,
        booking_code,
        user_id,
        venue_id,
        starts_at,
        ends_at,
        customer_name,
        customer_phone,
        customer_address,
        venue_subtotal,
        equipment_subtotal,
        total_amount,
        status,
        payment_status,
        expires_at,
        checked_in_at,
        started_at,
        ended_at,
        created_at,
        venue:venues(id, name, type, surface, price_per_hour),
        booking_equipment(
          equipment_id,
          quantity,
          unit_price,
          subtotal,
          returned_at,
          condition_note,
          equipment:equipment(id, name)
        ),
        payment_proofs(
          id,
          original_filename,
          declared_amount,
          reference_number,
          sha256,
          is_duplicate,
          amount_matches,
          status,
          created_at
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);
    bookings = data ?? [];
  }

  return {
    backendReady: true,
    user,
    profile,
    venues: venuesRes.data ?? [],
    equipment: equipmentRes.data ?? [],
    paymentSettings: paymentSettingsRes.data ?? null,
    penaltyRule: penaltyRuleRes.data ?? null,
    bookings
  };
};
