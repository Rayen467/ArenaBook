# ArenaBook — SvelteKit Prototype

ArenaBook sekarang dimigrasikan dari prototype HTML/JavaScript menjadi aplikasi **SvelteKit + TypeScript** dengan UI interaktif dan struktur komponen yang siap dikembangkan ke backend nyata.

## Frontend stack

- SvelteKit + TypeScript
- Tailwind CSS v4 melalui `@tailwindcss/vite`
- Komponen lokal bergaya shadcn-svelte (`Button`, `Card`, `Badge`)
- Bits UI untuk dialog/sheet yang accessible
- Motion untuk micro-animation dan staggered reveal
- Lucide Svelte untuk icon

## Flow yang sudah ada

### User
1. Pilih lapangan.
2. Pilih tanggal dan slot tersedia.
3. Atur durasi.
4. Isi nama, WhatsApp, alamat.
5. Tambah perlengkapan.
6. Buat booking.
7. Transfer manual.
8. Upload bukti transfer + nominal + nomor referensi.
9. Sistem melakukan pre-screen.
10. Status menjadi `PENDING_VERIFICATION` sampai admin memutuskan.

### Pre-screen bukti

Prototype tidak mengklaim screenshot sebagai bukti bahwa dana pasti masuk. Sistem hanya membantu admin dengan:
- mencocokkan nominal bukti dengan invoice;
- mencatat nomor referensi;
- membuat SHA-256 fingerprint file di browser;
- mendeteksi fingerprint yang pernah digunakan booking lain;
- meneruskan hasilnya ke antrean admin.

### Admin
- Dashboard ringkas.
- Antrean verifikasi pembayaran.
- Review nominal, fingerprint, referensi, dan file.
- Approve: `payment = PAID` dan `booking = CONFIRMED`.
- Reject: `payment = REJECTED` dan `booking = PAYMENT_ISSUE`.
- Manajemen booking.
- Inventaris prototype.
- Denda adaptif ON/OFF + mode otomatis/manual.

## Bot/asisten

Belum diaktifkan. Sesuai roadmap, bot menjadi lapisan penghubung admin setelah website, database, autentikasi, storage bukti, dan workflow pembayaran stabil.

## Local development

```bash
npm install
npm run dev
```

### Docker

```bash
docker compose up --build
```

Buka `http://localhost:5173`.

> Docker dipakai untuk konsistensi environment development. Anti-double-booking nantinya tetap harus ditangani di PostgreSQL dengan transaksi/constraint, bukan hanya Docker.

## Production next step

- PostgreSQL/Supabase
- Auth user/admin
- booking hold + expiry
- exclusion constraint anti-overlap
- object storage bukti pembayaran
- audit log server-side
- webhook/payment gateway saat akses merchant tersedia
- Redis/queue hanya jika dibutuhkan untuk expiry/notifikasi/bot
