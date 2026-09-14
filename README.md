# ArenaBook

ArenaBook adalah demo sistem booking lapangan dan penyewaan perlengkapan olahraga dengan dua aktor: **User** dan **Admin**.

## Fitur User
- Dashboard dan booking mendatang
- Pemilihan lapangan dan jadwal mingguan
- Status slot: tersedia, pending, booked, maintenance
- Checkout perlengkapan dengan stok simulasi
- Pembayaran online (QRIS / VA / E-Wallet) dan offline (bayar di lokasi)
- Riwayat booking
- Riwayat transaksi
- Invoice

## Fitur Admin
- Dashboard operasional
- Kalender semua lapangan
- Manajemen booking
- Inventaris perlengkapan
- Monitoring transaksi
- Denda adaptif ON/OFF
- Override / pembebasan denda dengan audit trail
- Laporan pendapatan, okupansi, dan metode pembayaran

## Denda Adaptif
Denda dapat dinyalakan atau dimatikan. Pada mode adaptif, keterlambatan hanya menimbulkan denda jika melewati toleransi dan mengganggu booking berikutnya. Admin tetap dapat override atau membebaskan denda, dengan histori audit tetap tercatat.

## Status MVP
Versi ini adalah **interactive front-end demo** tanpa database produksi. Pembayaran online masih simulasi UI dan belum terhubung ke payment gateway merchant atau webhook backend.

## Deployment
Project disiapkan sebagai static SPA agar ringan dan dapat dideploy langsung ke Vercel.
