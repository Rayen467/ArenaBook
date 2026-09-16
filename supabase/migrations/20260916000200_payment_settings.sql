-- Payment destination settings for production manual transfer.

create table if not exists public.payment_settings (
  id smallint primary key default 1 check (id = 1),
  bank_name text,
  account_number text,
  account_name text,
  qris_label text,
  instructions text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.payment_settings (id) values (1) on conflict (id) do nothing;

alter table public.payment_settings enable row level security;

drop policy if exists payment_settings_read on public.payment_settings;
create policy payment_settings_read on public.payment_settings
for select to anon, authenticated
using (true);

drop policy if exists payment_settings_admin_write on public.payment_settings;
create policy payment_settings_admin_write on public.payment_settings
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop trigger if exists payment_settings_set_updated_at on public.payment_settings;
create trigger payment_settings_set_updated_at
before update on public.payment_settings
for each row execute function public.set_updated_at();
