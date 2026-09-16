import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.supabase) {
    return {
      backendReady: false,
      venues: [],
      equipment: [],
      bookings: []
    };
  }

  const user = await locals.getVerifiedUser();

  const [{ data: venues }, { data: equipment }] = await Promise.all([
    locals.supabase
      .from('venues')
      .select('id, name, type, surface, price_per_hour, capacity_min, capacity_max, active, open_time, close_time')
      .eq('active', true)
      .order('name'),
    locals.supabase
      .from('equipment')
      .select('id, name, price_per_booking, stock_total, stock_damaged, active')
      .eq('active', true)
      .order('name')
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
        created_at,
        venue:venues(id, name, type, surface, price_per_hour),
        booking_equipment(
          quantity,
          unit_price,
          subtotal,
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
    venues: venues ?? [],
    equipment: equipment ?? [],
    bookings
  };
};
