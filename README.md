# ArenaBook

ArenaBook adalah sistem booking lapangan dan perlengkapan berbasis **SvelteKit + TypeScript + Tailwind CSS + Supabase**.

## Status

Project sedang dimigrasikan dari prototype ke fondasi production:

- Supabase Auth untuk USER / ADMIN
- PostgreSQL sebagai source of truth
- anti-double-booking di level database
- booking hold dan expiry
- inventaris perlengkapan per slot
- pembayaran manual dengan bukti transfer private
- SHA-256 fingerprint untuk membantu mendeteksi bukti duplikat
- verifikasi akhir oleh admin
- Row Level Security (RLS)
- audit log
- denda adaptif / manual

## Stack

- SvelteKit 5
- TypeScript
- Tailwind CSS 4
- Bits UI
- Motion
- Supabase PostgreSQL / Auth / Storage
- Vercel
- Docker Compose untuk development

## Environment

Salin `.env.example` menjadi `.env` untuk development atau masukkan environment variables yang sama ke Vercel:

```env
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

`SUPABASE_SECRET_KEY` bersifat opsional untuk fondasi saat ini dan **tidak boleh pernah** diberi prefix `PUBLIC_`.

## Database

Migration produksi berada di:

```text
supabase/migrations/20260916000100_arenabook_production.sql
```

Migration ini membuat schema booking, payment proof, RLS, storage policy, RPC booking/payment, seed venue/perlengkapan, dan constraint PostgreSQL untuk mencegah jadwal overlap pada lapangan yang sama.

## Payment proof

Bukti transfer bukan bukti mutlak dana sudah masuk. ArenaBook hanya melakukan pre-screening seperti nominal, nomor referensi, file validation, dan fingerprint SHA-256. Status `PAID` hanya diberikan setelah admin benar-benar memeriksa mutasi/rekening dan melakukan approve.

## Development

```bash
npm install
npm run dev
```

atau dengan Docker:

```bash
docker compose up --build
```

## Build verification

Setiap push ke `main` menjalankan GitHub Actions:

```text
npm install
npm run check
npm run build
```

Vercel terhubung ke repository ini dan melakukan deployment otomatis dari branch `main`.
