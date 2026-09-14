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

## Arena Assistant — Prototype
Prototype conversational automation sudah ditambahkan langsung ke ArenaBook.

Kemampuan saat ini:
- Membaca data booking, jadwal, transaksi, dan inventaris demo
- Cek slot kosong melalui chat
- Menyiapkan booking dan membuka checkout dari chat
- Melihat booking dan status pembayaran
- Cancel booking dengan pengecekan kepemilikan dan langkah konfirmasi
- Menambah perlengkapan saat checkout
- Mengaktifkan / menonaktifkan denda untuk mode Admin
- Notification / Automation Center untuk event pembayaran, reminder jadwal, pembatalan, dan stok
- Simulasi webhook pembayaran yang mengubah Pending → Paid → Confirmed
- Navigasi halaman ArenaBook melalui perintah chat

Versi prototype menggunakan **rule-based intent engine**, sehingga belum membutuhkan token AI berbayar. Layer AI natural-language dapat ditambahkan kemudian tanpa memberi model akses langsung ke database; aksi tetap harus melalui authorization dan action engine.

## Denda Adaptif
Denda dapat dinyalakan atau dimatikan. Pada mode adaptif, keterlambatan hanya menimbulkan denda jika melewati toleransi dan mengganggu booking berikutnya. Admin tetap dapat override atau membebaskan denda, dengan histori audit tetap tercatat.

## Status MVP
Versi ini adalah **interactive front-end demo** tanpa database produksi. Pembayaran online dan webhook masih simulasi. Integrasi payment gateway, database produksi, WhatsApp, Telegram, Discord, Instagram Messaging, dan AI provider akan menjadi tahap berikutnya.

## Deployment
Project disiapkan sebagai static SPA agar ringan dan dapat dideploy langsung ke Vercel.
