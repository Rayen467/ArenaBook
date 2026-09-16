-- ArenaBook production foundation
-- PostgreSQL + Supabase Auth + Storage + RLS

set search_path = public, extensions;
create extension if not exists btree_gist with schema extensions;

-- ---------- ENUMS ----------
do $$ begin
  create type public.app_role as enum ('USER', 'ADMIN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.booking_status as enum (
    'AWAITING_PAYMENT', 'PENDING_VERIFICATION', 'CONFIRMED',
    'CHECKED_IN', 'PLAYING', 'COMPLETED', 'PAYMENT_ISSUE',
    'CANCELLED', 'EXPIRED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum (
    'UNPAID', 'PROOF_SUBMITTED', 'PENDING', 'PAID',
    'REJECTED', 'EXPIRED', 'REFUNDED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.proof_status as enum ('PENDING', 'APPROVED', 'REJECTED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.penalty_status as enum ('DRAFT', 'CONFIRMED', 'WAIVED', 'PAID');
exception when duplicate_object then null; end $$;

-- ---------- TABLES ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'USER',
  full_name text,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null,
  surface text,
  description text,
  price_per_hour bigint not null check (price_per_hour >= 0),
  capacity_min integer not null default 1 check (capacity_min > 0),
  capacity_max integer not null default 1 check (capacity_max >= capacity_min),
  open_time time not null default '08:00',
  close_time time not null default '23:00',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price_per_booking bigint not null check (price_per_booking >= 0),
  stock_total integer not null default 0 check (stock_total >= 0),
  stock_damaged integer not null default 0 check (stock_damaged >= 0 and stock_damaged <= stock_total),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique default (
    'BK-' || to_char(clock_timestamp(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  ),
  user_id uuid not null references auth.users(id) on delete restrict,
  venue_id uuid not null references public.venues(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'Asia/Jakarta',
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  venue_subtotal bigint not null default 0 check (venue_subtotal >= 0),
  equipment_subtotal bigint not null default 0 check (equipment_subtotal >= 0),
  total_amount bigint not null default 0 check (total_amount >= 0),
  status public.booking_status not null default 'AWAITING_PAYMENT',
  payment_status public.payment_status not null default 'UNPAID',
  expires_at timestamptz,
  checked_in_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_valid_time check (ends_at > starts_at)
);

create table if not exists public.booking_equipment (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price bigint not null check (unit_price >= 0),
  subtotal bigint not null check (subtotal >= 0),
  returned_at timestamptz,
  condition_note text,
  primary key (booking_id, equipment_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  payment_code text not null unique default (
    'PAY-' || to_char(clock_timestamp(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  ),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  method text not null default 'MANUAL_TRANSFER' check (method in ('MANUAL_TRANSFER')),
  amount bigint not null check (amount >= 0),
  status public.payment_status not null default 'UNPAID',
  paid_at timestamptz,
  confirmed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  declared_amount bigint not null check (declared_amount >= 0),
  reference_number text not null,
  sha256 text not null,
  is_duplicate boolean not null default false,
  amount_matches boolean not null default false,
  status public.proof_status not null default 'PENDING',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.penalty_rules (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default true,
  mode text not null default 'ADAPTIVE' check (mode in ('ADAPTIVE', 'MANUAL')),
  tolerance_minutes integer not null default 10 check (tolerance_minutes >= 0),
  interval_minutes integer not null default 10 check (interval_minutes > 0),
  amount_per_interval bigint not null default 10000 check (amount_per_interval >= 0),
  max_amount bigint not null default 100000 check (max_amount >= 0),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.penalties (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  type text not null,
  reason text not null,
  late_minutes integer,
  amount bigint not null default 0 check (amount >= 0),
  source text not null default 'AUTO' check (source in ('AUTO', 'MANUAL')),
  status public.penalty_status not null default 'DRAFT',
  waived_by uuid references public.profiles(id) on delete set null,
  waived_reason text,
  confirmed_by uuid references public.profiles(id) on delete set null,
  rule_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists bookings_user_idx on public.bookings(user_id, created_at desc);
create index if not exists bookings_venue_time_idx on public.bookings(venue_id, starts_at, ends_at);
create index if not exists bookings_expiry_idx on public.bookings(expires_at) where expires_at is not null;
create index if not exists proof_hash_idx on public.payment_proofs(sha256);
create index if not exists proof_review_idx on public.payment_proofs(status, created_at desc);

-- Database-level protection against concurrent double booking.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bookings_no_overlap') then
    alter table public.bookings
      add constraint bookings_no_overlap
      exclude using gist (
        venue_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      )
      where (status in (
        'AWAITING_PAYMENT'::public.booking_status,
        'PENDING_VERIFICATION'::public.booking_status,
        'CONFIRMED'::public.booking_status,
        'CHECKED_IN'::public.booking_status,
        'PLAYING'::public.booking_status,
        'PAYMENT_ISSUE'::public.booking_status
      ));
  end if;
end $$;

-- ---------- COMMON HELPERS ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'ADMIN'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Role hanya dapat diubah oleh admin.';
  end if;
  return new;
end;
$$;

create or replace function public.expire_stale_bookings(p_venue_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_count integer := 0;
begin
  with expired as (
    update public.bookings
    set status = 'EXPIRED', payment_status = 'EXPIRED', updated_at = now()
    where status in ('AWAITING_PAYMENT', 'PENDING_VERIFICATION', 'PAYMENT_ISSUE')
      and expires_at is not null
      and expires_at <= now()
      and (p_venue_id is null or venue_id = p_venue_id)
    returning id
  )
  select coalesce(array_agg(id), '{}'::uuid[]), count(*)
  into v_ids, v_count
  from expired;

  if v_count > 0 then
    update public.payments
    set status = 'EXPIRED', updated_at = now()
    where booking_id = any(v_ids) and status <> 'PAID';
  end if;
  return v_count;
end;
$$;

-- ---------- BOOKING RPC ----------
create or replace function public.create_booking(
  p_venue_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_equipment jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_venue public.venues%rowtype;
  v_booking public.bookings%rowtype;
  v_end timestamptz;
  v_local_start timestamp;
  v_local_end timestamp;
  v_venue_subtotal bigint;
  v_equipment_subtotal bigint := 0;
  v_item jsonb;
  v_equipment_id uuid;
  v_qty integer;
  v_eq public.equipment%rowtype;
  v_reserved integer;
begin
  if v_user is null then raise exception 'Authentication required.'; end if;
  if p_duration_minutes < 60 or p_duration_minutes > 240 or mod(p_duration_minutes, 60) <> 0 then
    raise exception 'Durasi harus 1 sampai 4 jam.';
  end if;
  if p_starts_at <= now() then raise exception 'Waktu booking harus di masa depan.'; end if;
  if trim(coalesce(p_customer_name,'')) = '' or trim(coalesce(p_customer_phone,'')) = '' or trim(coalesce(p_customer_address,'')) = '' then
    raise exception 'Data pemesan belum lengkap.';
  end if;

  perform public.expire_stale_bookings(p_venue_id);

  select * into v_venue from public.venues where id = p_venue_id and active = true for update;
  if not found then raise exception 'Lapangan tidak tersedia.'; end if;

  v_end := p_starts_at + make_interval(mins => p_duration_minutes);
  v_local_start := p_starts_at at time zone 'Asia/Jakarta';
  v_local_end := v_end at time zone 'Asia/Jakarta';

  if v_local_start::date <> v_local_end::date then raise exception 'Booking tidak boleh melewati pergantian hari.'; end if;
  if v_local_start::time < v_venue.open_time or v_local_end::time > v_venue.close_time then
    raise exception 'Jam booking di luar jam operasional.';
  end if;

  if exists (
    select 1
    from (
      select value ->> 'equipment_id' as equipment_id, count(*)
      from jsonb_array_elements(coalesce(p_equipment, '[]'::jsonb))
      group by value ->> 'equipment_id'
      having count(*) > 1
    ) duplicates
  ) then
    raise exception 'Perlengkapan duplikat pada payload.';
  end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_equipment, '[]'::jsonb)) loop
    v_equipment_id := (v_item ->> 'equipment_id')::uuid;
    v_qty := coalesce((v_item ->> 'qty')::integer, 0);
    if v_qty <= 0 then raise exception 'Jumlah perlengkapan harus lebih dari 0.'; end if;

    select * into v_eq from public.equipment where id = v_equipment_id and active = true for update;
    if not found then raise exception 'Perlengkapan tidak tersedia.'; end if;

    select coalesce(sum(be.quantity), 0)::integer into v_reserved
    from public.booking_equipment be
    join public.bookings b on b.id = be.booking_id
    where be.equipment_id = v_equipment_id
      and b.status in ('AWAITING_PAYMENT','PENDING_VERIFICATION','CONFIRMED','CHECKED_IN','PLAYING','PAYMENT_ISSUE')
      and (b.expires_at is null or b.expires_at > now())
      and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts_at, v_end, '[)');

    if v_reserved + v_qty > (v_eq.stock_total - v_eq.stock_damaged) then
      raise exception 'Stok % tidak cukup untuk jadwal tersebut.', v_eq.name;
    end if;
    v_equipment_subtotal := v_equipment_subtotal + (v_eq.price_per_booking * v_qty);
  end loop;

  v_venue_subtotal := (v_venue.price_per_hour * p_duration_minutes) / 60;

  begin
    insert into public.bookings (
      user_id, venue_id, starts_at, ends_at,
      customer_name, customer_phone, customer_address,
      venue_subtotal, equipment_subtotal, total_amount,
      status, payment_status, expires_at
    ) values (
      v_user, p_venue_id, p_starts_at, v_end,
      trim(p_customer_name), trim(p_customer_phone), trim(p_customer_address),
      v_venue_subtotal, v_equipment_subtotal, v_venue_subtotal + v_equipment_subtotal,
      'AWAITING_PAYMENT', 'UNPAID', now() + interval '30 minutes'
    ) returning * into v_booking;
  exception when exclusion_violation then
    raise exception 'Slot baru saja diambil pengguna lain. Pilih jam lain.';
  end;

  for v_item in select value from jsonb_array_elements(coalesce(p_equipment, '[]'::jsonb)) loop
    v_equipment_id := (v_item ->> 'equipment_id')::uuid;
    v_qty := (v_item ->> 'qty')::integer;
    select * into v_eq from public.equipment where id = v_equipment_id;
    insert into public.booking_equipment (booking_id, equipment_id, quantity, unit_price, subtotal)
    values (v_booking.id, v_equipment_id, v_qty, v_eq.price_per_booking, v_eq.price_per_booking * v_qty);
  end loop;

  insert into public.payments (booking_id, amount, status)
  values (v_booking.id, v_booking.total_amount, 'UNPAID');

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, metadata)
  values (v_user, 'USER', 'BOOKING_CREATED', 'booking', v_booking.id::text,
    jsonb_build_object('booking_code', v_booking.booking_code, 'total', v_booking.total_amount));

  return jsonb_build_object(
    'id', v_booking.id,
    'booking_code', v_booking.booking_code,
    'status', v_booking.status,
    'payment_status', v_booking.payment_status,
    'starts_at', v_booking.starts_at,
    'ends_at', v_booking.ends_at,
    'expires_at', v_booking.expires_at,
    'total_amount', v_booking.total_amount
  );
end;
$$;

create or replace function public.get_venue_schedule(p_venue_id uuid, p_date date)
returns table (starts_at timestamptz, ends_at timestamptz, state text)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.expire_stale_bookings(p_venue_id);
  return query
  select
    b.starts_at,
    b.ends_at,
    case
      when b.status in ('AWAITING_PAYMENT','PENDING_VERIFICATION','PAYMENT_ISSUE') then 'pending'
      else 'booked'
    end as state
  from public.bookings b
  where b.venue_id = p_venue_id
    and (b.starts_at at time zone 'Asia/Jakarta')::date = p_date
    and b.status in ('AWAITING_PAYMENT','PENDING_VERIFICATION','CONFIRMED','CHECKED_IN','PLAYING','PAYMENT_ISSUE')
    and (b.expires_at is null or b.expires_at > now())
  order by b.starts_at;
end;
$$;

-- ---------- PAYMENT RPC ----------
create or replace function public.submit_payment_proof(
  p_booking_id uuid,
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_file_size bigint,
  p_declared_amount bigint,
  p_reference_number text,
  p_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_payment public.payments%rowtype;
  v_proof public.payment_proofs%rowtype;
  v_duplicate boolean;
  v_match boolean;
begin
  if v_user is null then raise exception 'Authentication required.'; end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found or v_booking.user_id <> v_user then raise exception 'Booking tidak ditemukan.'; end if;

  perform public.expire_stale_bookings(v_booking.venue_id);
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.status = 'EXPIRED' then raise exception 'Booking sudah kedaluwarsa.'; end if;
  if v_booking.payment_status = 'PAID' then raise exception 'Booking sudah lunas.'; end if;
  if v_booking.status not in ('AWAITING_PAYMENT','PAYMENT_ISSUE') then raise exception 'Booking belum dapat menerima bukti baru.'; end if;

  select * into v_payment from public.payments where booking_id = p_booking_id for update;
  v_duplicate := exists(select 1 from public.payment_proofs where sha256 = p_sha256 and booking_id <> p_booking_id);
  v_match := p_declared_amount = v_booking.total_amount;

  insert into public.payment_proofs (
    booking_id, payment_id, user_id, storage_path, original_filename,
    mime_type, file_size, declared_amount, reference_number, sha256,
    is_duplicate, amount_matches, status
  ) values (
    p_booking_id, v_payment.id, v_user, p_storage_path, p_original_filename,
    p_mime_type, p_file_size, p_declared_amount, trim(p_reference_number), p_sha256,
    v_duplicate, v_match, 'PENDING'
  ) returning * into v_proof;

  update public.bookings
  set status = 'PENDING_VERIFICATION', payment_status = 'PROOF_SUBMITTED',
      expires_at = now() + interval '6 hours', updated_at = now()
  where id = p_booking_id;

  update public.payments set status = 'PENDING', updated_at = now() where id = v_payment.id;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, metadata)
  values (v_user, 'USER', 'PAYMENT_PROOF_SUBMITTED', 'booking', p_booking_id::text,
    jsonb_build_object('proof_id', v_proof.id, 'amount_matches', v_match, 'is_duplicate', v_duplicate));

  return jsonb_build_object(
    'id', v_proof.id,
    'amount_matches', v_match,
    'is_duplicate', v_duplicate,
    'status', v_proof.status
  );
end;
$$;

create or replace function public.review_payment(p_booking_id uuid, p_approve boolean, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_payment public.payments%rowtype;
  v_proof_id uuid;
begin
  if v_admin is null or not public.is_admin() then raise exception 'Admin access required.'; end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking tidak ditemukan.'; end if;
  if v_booking.payment_status <> 'PROOF_SUBMITTED' then raise exception 'Tidak ada bukti yang menunggu review.'; end if;
  select * into v_payment from public.payments where booking_id = p_booking_id for update;
  select id into v_proof_id from public.payment_proofs
    where booking_id = p_booking_id and status = 'PENDING'
    order by created_at desc limit 1;
  if v_proof_id is null then raise exception 'Bukti pembayaran tidak ditemukan.'; end if;

  if p_approve then
    update public.payments
      set status = 'PAID', paid_at = now(), confirmed_by = v_admin, updated_at = now()
      where id = v_payment.id;
    update public.bookings
      set payment_status = 'PAID', status = 'CONFIRMED', expires_at = null, updated_at = now()
      where id = p_booking_id;
    update public.payment_proofs
      set status = 'APPROVED', reviewed_by = v_admin, reviewed_at = now(), review_note = p_note
      where id = v_proof_id;
  else
    update public.payments set status = 'REJECTED', updated_at = now() where id = v_payment.id;
    update public.bookings
      set payment_status = 'REJECTED', status = 'PAYMENT_ISSUE',
          expires_at = now() + interval '30 minutes', updated_at = now()
      where id = p_booking_id;
    update public.payment_proofs
      set status = 'REJECTED', reviewed_by = v_admin, reviewed_at = now(), review_note = p_note
      where id = v_proof_id;
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, metadata)
  values (v_admin, 'ADMIN', case when p_approve then 'PAYMENT_APPROVED' else 'PAYMENT_REJECTED' end,
    'booking', p_booking_id::text, jsonb_build_object('note', p_note));

  select * into v_booking from public.bookings where id = p_booking_id;
  return jsonb_build_object(
    'id', v_booking.id,
    'booking_code', v_booking.booking_code,
    'status', v_booking.status,
    'payment_status', v_booking.payment_status
  );
end;
$$;

-- ---------- TRIGGERS ----------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
for each row execute function public.protect_profile_role();

do $$
declare t text;
begin
  foreach t in array array['profiles','venues','equipment','bookings','payments','penalty_rules','penalties'] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.venues enable row level security;
alter table public.equipment enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_equipment enable row level security;
alter table public.payments enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.penalty_rules enable row level security;
alter table public.penalties enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

drop policy if exists venues_public_read on public.venues;
create policy venues_public_read on public.venues for select to anon, authenticated
using (active = true or public.is_admin());
drop policy if exists venues_admin_write on public.venues;
create policy venues_admin_write on public.venues for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists equipment_public_read on public.equipment;
create policy equipment_public_read on public.equipment for select to anon, authenticated
using (active = true or public.is_admin());
drop policy if exists equipment_admin_write on public.equipment;
create policy equipment_admin_write on public.equipment for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists bookings_owner_admin_read on public.bookings;
create policy bookings_owner_admin_read on public.bookings for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists booking_equipment_owner_admin_read on public.booking_equipment;
create policy booking_equipment_owner_admin_read on public.booking_equipment for select to authenticated
using (exists(select 1 from public.bookings b where b.id = booking_id and (b.user_id = auth.uid() or public.is_admin())));

drop policy if exists payments_owner_admin_read on public.payments;
create policy payments_owner_admin_read on public.payments for select to authenticated
using (exists(select 1 from public.bookings b where b.id = booking_id and (b.user_id = auth.uid() or public.is_admin())));

drop policy if exists proofs_owner_admin_read on public.payment_proofs;
create policy proofs_owner_admin_read on public.payment_proofs for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists penalty_rules_read on public.penalty_rules;
create policy penalty_rules_read on public.penalty_rules for select to authenticated using (true);
drop policy if exists penalty_rules_admin_write on public.penalty_rules;
create policy penalty_rules_admin_write on public.penalty_rules for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists penalties_owner_admin_read on public.penalties;
create policy penalties_owner_admin_read on public.penalties for select to authenticated
using (exists(select 1 from public.bookings b where b.id = booking_id and (b.user_id = auth.uid() or public.is_admin())));
drop policy if exists penalties_admin_write on public.penalties;
create policy penalties_admin_write on public.penalties for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs for select to authenticated using (public.is_admin());

-- RPC permissions: direct mutation of sensitive tables is intentionally not granted.
revoke all on function public.create_booking(uuid,timestamptz,integer,text,text,text,jsonb) from public;
grant execute on function public.create_booking(uuid,timestamptz,integer,text,text,text,jsonb) to authenticated;
revoke all on function public.submit_payment_proof(uuid,text,text,text,bigint,bigint,text,text) from public;
grant execute on function public.submit_payment_proof(uuid,text,text,text,bigint,bigint,text,text) to authenticated;
revoke all on function public.review_payment(uuid,boolean,text) from public;
grant execute on function public.review_payment(uuid,boolean,text) to authenticated;
revoke all on function public.get_venue_schedule(uuid,date) from public;
grant execute on function public.get_venue_schedule(uuid,date) to anon, authenticated;
revoke all on function public.expire_stale_bookings(uuid) from public;

-- ---------- PRIVATE PAYMENT PROOF BUCKET ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists payment_proof_insert_own on storage.objects;
create policy payment_proof_insert_own on storage.objects for insert to authenticated
with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists payment_proof_read_own_admin on storage.objects;
create policy payment_proof_read_own_admin on storage.objects for select to authenticated
using (bucket_id = 'payment-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists payment_proof_delete_own_admin on storage.objects;
create policy payment_proof_delete_own_admin on storage.objects for delete to authenticated
using (bucket_id = 'payment-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ---------- INITIAL CONFIG + DEMO CATALOG BECOMES REAL DATA ----------
insert into public.penalty_rules (id) values (1) on conflict (id) do nothing;

insert into public.venues (id, name, type, surface, price_per_hour, capacity_min, capacity_max, open_time, close_time, active) values
  ('11111111-1111-4111-8111-111111111111','Futsal Arena A','Futsal','Vinyl Pro',150000,10,14,'08:00','23:00',true),
  ('22222222-2222-4222-8222-222222222222','Futsal Arena B','Futsal','Sintetis',135000,10,14,'08:00','23:00',true),
  ('33333333-3333-4333-8333-333333333333','Badminton Court 1','Badminton','Karpet BWF',80000,2,4,'08:00','23:00',true),
  ('44444444-4444-4444-8444-444444444444','Basket Half Court','Basket','PU Court',120000,6,10,'08:00','23:00',true)
on conflict (name) do update set
  type = excluded.type, surface = excluded.surface, price_per_hour = excluded.price_per_hour,
  capacity_min = excluded.capacity_min, capacity_max = excluded.capacity_max,
  open_time = excluded.open_time, close_time = excluded.close_time, active = excluded.active;

insert into public.equipment (id, name, price_per_booking, stock_total, stock_damaged, active) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','Bola Futsal',15000,5,0,true),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','Rompi Tim',5000,20,0,true),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','Sepatu Futsal',25000,8,0,true)
on conflict (name) do update set
  price_per_booking = excluded.price_per_booking,
  stock_total = excluded.stock_total,
  stock_damaged = excluded.stock_damaged,
  active = excluded.active;

-- Bootstrap note:
-- After your first account signs up, promote exactly that trusted account once:
-- update public.profiles set role = 'ADMIN' where id = '<trusted-auth-user-uuid>';
