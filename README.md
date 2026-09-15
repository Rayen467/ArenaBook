# ArenaBook

Prototype web booking lapangan dan perlengkapan dengan 2 aktor: **User** dan **Admin**.

## Fokus versi ini

Versi ini sengaja **belum mengaktifkan bot/asisten chat**. Fondasi website dan alur pembayaran manual diselesaikan terlebih dahulu.

### User
- Pilih lapangan, tanggal, jam, dan durasi.
- Checkout dengan identitas dan alamat.
- Tambah perlengkapan.
- Invoice dan total otomatis.
- Transfer manual.
- Upload bukti transfer.
- Isi nominal, bank/e-wallet pengirim, dan nomor referensi.
- Melihat status: `AWAITING_PAYMENT` → `PROOF_SUBMITTED` → `PAID` → `CONFIRMED`.

### Pre-screen bukti pembayaran
Prototype tidak mengklaim bisa memastikan uang masuk hanya dari screenshot. Pre-screen hanya membantu admin dengan:
- Validasi tipe/ukuran file gambar.
- Kecocokan nominal dengan invoice.
- Nomor referensi transaksi.
- SHA-256 fingerprint untuk mendeteksi file bukti yang dipakai ulang pada booking berbeda.

Keputusan final tetap dilakukan admin setelah mengecek rekening/mutasi.

### Admin
- Antrean pembayaran yang perlu diverifikasi.
- Review hasil pre-screen.
- Approve jika dana benar-benar masuk.
- Reject bila bukti bermasalah.
- Approve otomatis mengubah `payment = PAID` dan `booking = CONFIRMED`.
- Audit log keputusan.
- Tabel booking dan transaksi.
- Denda adaptif ON/OFF tetap tersedia.

## Catatan teknis
Prototype memakai HTML/CSS/JavaScript tanpa dependency dan menyimpan state demo di `localStorage`. Untuk produksi, tahap berikutnya adalah backend/database persistent, object storage bukti pembayaran, autentikasi, audit log server-side, dan baru kemudian integrasi bot/asisten admin.
