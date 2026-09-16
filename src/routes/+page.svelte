<script lang="ts">
  import { onMount } from 'svelte';
  import { Dialog } from 'bits-ui';
  import { animate, stagger } from 'motion';
  import {
    Home, Calendar, ClipboardList, Wallet, LayoutDashboard, ShieldCheck, Package,
    DollarSign, AlertTriangle, Bell, Search, MapPin, Clock, Users, ChevronRight,
    CheckCircle, Upload, CreditCard, X, Plus, Minus, Eye, Banknote, Lock,
    Sparkles, ArrowUpRight, Receipt, Image as ImageIcon, Timer, BadgeCheck
  } from '@lucide/svelte';
  import Button from '$lib/components/ui/button/Button.svelte';
  import Card from '$lib/components/ui/card/Card.svelte';
  import Badge from '$lib/components/ui/badge/Badge.svelte';
  import { rupiah } from '$lib/utils';

  type Role = 'user' | 'admin';
  type BookingStatus = 'AWAITING_PAYMENT' | 'PENDING_VERIFICATION' | 'CONFIRMED' | 'PAYMENT_ISSUE' | 'COMPLETED';
  type PaymentStatus = 'UNPAID' | 'PROOF_SUBMITTED' | 'PAID' | 'REJECTED';

  type Booking = {
    id: string;
    customer: string;
    phone: string;
    address: string;
    venueId: number;
    venueName: string;
    date: string;
    time: string;
    duration: number;
    equipment: { name: string; qty: number; subtotal: number }[];
    total: number;
    status: BookingStatus;
    payment: PaymentStatus;
    createdAt: string;
    proofName?: string;
    proofHash?: string;
    proofAmount?: number;
    proofReference?: string;
    proofDuplicate?: boolean;
    proofAmountMatch?: boolean;
    audit?: string[];
  };

  const venues = [
    { id: 1, name: 'Futsal Arena A', type: 'Futsal', surface: 'Vinyl Pro', price: 150000, capacity: '10–14 orang', rating: 4.9 },
    { id: 2, name: 'Futsal Arena B', type: 'Futsal', surface: 'Sintetis', price: 135000, capacity: '10–14 orang', rating: 4.8 },
    { id: 3, name: 'Badminton Court 1', type: 'Badminton', surface: 'Karpet BWF', price: 80000, capacity: '2–4 orang', rating: 4.9 },
    { id: 4, name: 'Basket Half Court', type: 'Basket', surface: 'PU Court', price: 120000, capacity: '6–10 orang', rating: 4.7 }
  ];

  const days = [
    { key: '2026-09-16', dow: 'Rab', date: '16', label: '16 Sep 2026' },
    { key: '2026-09-17', dow: 'Kam', date: '17', label: '17 Sep 2026' },
    { key: '2026-09-18', dow: 'Jum', date: '18', label: '18 Sep 2026' },
    { key: '2026-09-19', dow: 'Sab', date: '19', label: '19 Sep 2026' },
    { key: '2026-09-20', dow: 'Min', date: '20', label: '20 Sep 2026' },
    { key: '2026-09-21', dow: 'Sen', date: '21', label: '21 Sep 2026' },
    { key: '2026-09-22', dow: 'Sel', date: '22', label: '22 Sep 2026' }
  ];

  const slots = [
    { time: '08:00', state: 'free' }, { time: '09:00', state: 'free' }, { time: '10:00', state: 'booked' },
    { time: '11:00', state: 'booked' }, { time: '12:00', state: 'free' }, { time: '13:00', state: 'free' },
    { time: '14:00', state: 'pending' }, { time: '15:00', state: 'free' }, { time: '16:00', state: 'maintenance' },
    { time: '17:00', state: 'free' }, { time: '18:00', state: 'booked' }, { time: '19:00', state: 'free' },
    { time: '20:00', state: 'free' }, { time: '21:00', state: 'free' }, { time: '22:00', state: 'free' }
  ];

  const equipmentCatalog = [
    { id: 1, name: 'Bola Futsal', price: 15000, stock: 5 },
    { id: 2, name: 'Rompi Tim', price: 5000, stock: 20 },
    { id: 3, name: 'Sepatu Futsal', price: 25000, stock: 8 }
  ];

  const demoBookings: Booking[] = [
    {
      id: 'BK-260916-018', customer: 'Rayhandi Tenri', phone: '08xxxxxxxxxx', address: 'Tangerang',
      venueId: 1, venueName: 'Futsal Arena A', date: '16 Sep 2026', time: '19:00', duration: 2,
      equipment: [{ name: 'Bola Futsal', qty: 1, subtotal: 15000 }], total: 315000,
      status: 'CONFIRMED', payment: 'PAID', createdAt: '16 Sep 2026 • 14:20',
      audit: ['Pembayaran dikonfirmasi admin • 14:28']
    },
    {
      id: 'BK-260917-021', customer: 'Dimas Saputra', phone: '0812xxxx1122', address: 'Rajeg, Tangerang',
      venueId: 2, venueName: 'Futsal Arena B', date: '17 Sep 2026', time: '20:00', duration: 2,
      equipment: [], total: 270000, status: 'PENDING_VERIFICATION', payment: 'PROOF_SUBMITTED',
      createdAt: '16 Sep 2026 • 15:02', proofName: 'bukti-transfer-dimas.jpg', proofHash: 'demo-hash-dimas',
      proofAmount: 270000, proofReference: 'TRX19022818', proofDuplicate: false, proofAmountMatch: true,
      audit: ['Bukti pembayaran dikirim • 15:05']
    }
  ];

  let role = $state<Role>('user');
  let view = $state('user-home');
  let selectedVenueId = $state(1);
  let selectedDay = $state(days[0].key);
  let selectedSlot = $state('19:00');
  let duration = $state(2);
  let checkoutOpen = $state(false);
  let paymentOpen = $state(false);
  let reviewOpen = $state(false);
  let selectedPaymentId = $state<string | null>(null);
  let selectedReviewId = $state<string | null>(null);
  let bookings = $state<Booking[]>([...demoBookings]);
  let equipmentQty = $state<Record<number, number>>({ 1: 1, 2: 0, 3: 0 });
  let customerName = $state('Rayhandi Tenri');
  let customerPhone = $state('');
  let customerAddress = $state('');
  let transferAmount = $state<number | null>(null);
  let transferReference = $state('');
  let proofFile = $state<File | null>(null);
  let proofHash = $state('');
  let penaltyEnabled = $state(true);
  let penaltyMode = $state<'adaptive' | 'manual'>('adaptive');
  let flash = $state('');

  let selectedVenue = $derived(venues.find((v) => v.id === selectedVenueId) ?? venues[0]);
  let selectedDayData = $derived(days.find((d) => d.key === selectedDay) ?? days[0]);
  let venueSubtotal = $derived(selectedVenue.price * duration);
  let equipmentSubtotal = $derived(equipmentCatalog.reduce((sum, item) => sum + item.price * (equipmentQty[item.id] ?? 0), 0));
  let bookingTotal = $derived(venueSubtotal + equipmentSubtotal);
  let pendingProofs = $derived(bookings.filter((b) => b.payment === 'PROOF_SUBMITTED'));
  let selectedPaymentBooking = $derived(bookings.find((b) => b.id === selectedPaymentId) ?? null);
  let selectedReviewBooking = $derived(bookings.find((b) => b.id === selectedReviewId) ?? null);

  onMount(() => {
    const saved = localStorage.getItem('arenabook-svelte-bookings');
    if (saved) {
      try { bookings = JSON.parse(saved); } catch { /* keep demo state */ }
    }
    reveal();
  });

  function persist() {
    localStorage.setItem('arenabook-svelte-bookings', JSON.stringify(bookings));
  }

  function notify(message: string) {
    flash = message;
    window.setTimeout(() => { if (flash === message) flash = ''; }, 3200);
  }

  function reveal() {
    requestAnimationFrame(() => {
      const nodes = document.querySelectorAll('.motion-in');
      if (!nodes.length) return;
      animate(nodes, { opacity: [0, 1], y: [12, 0] }, { duration: 0.42, delay: stagger(0.035), ease: [0.22, 1, 0.36, 1] });
    });
  }

  function go(next: string) {
    view = next;
    window.setTimeout(reveal, 20);
  }

  function setRole(next: Role) {
    role = next;
    view = next === 'user' ? 'user-home' : 'admin-home';
    window.setTimeout(reveal, 20);
  }

  function adjustEquipment(id: number, delta: number) {
    const item = equipmentCatalog.find((e) => e.id === id);
    if (!item) return;
    equipmentQty[id] = Math.max(0, Math.min(item.stock, (equipmentQty[id] ?? 0) + delta));
  }

  function createBooking() {
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      notify('Lengkapi nama, WhatsApp, dan alamat terlebih dahulu.');
      return;
    }
    const equipment = equipmentCatalog
      .filter((item) => (equipmentQty[item.id] ?? 0) > 0)
      .map((item) => ({ name: item.name, qty: equipmentQty[item.id], subtotal: item.price * equipmentQty[item.id] }));
    const id = `BK-${selectedDay.replaceAll('-', '').slice(2)}-${String(Math.floor(Math.random() * 900) + 100)}`;
    const booking: Booking = {
      id,
      customer: customerName,
      phone: customerPhone,
      address: customerAddress,
      venueId: selectedVenue.id,
      venueName: selectedVenue.name,
      date: selectedDayData.label,
      time: selectedSlot,
      duration,
      equipment,
      total: bookingTotal,
      status: 'AWAITING_PAYMENT',
      payment: 'UNPAID',
      createdAt: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
      audit: ['Booking dibuat dari website']
    };
    bookings = [booking, ...bookings];
    persist();
    checkoutOpen = false;
    selectedPaymentId = id;
    transferAmount = booking.total;
    transferReference = '';
    proofFile = null;
    proofHash = '';
    paymentOpen = true;
    notify('Booking ditahan sementara. Lanjutkan upload bukti pembayaran.');
  }

  function openPayment(id: string) {
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;
    selectedPaymentId = id;
    transferAmount = booking.total;
    transferReference = '';
    proofFile = null;
    proofHash = '';
    paymentOpen = true;
  }

  async function handleProofFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    proofFile = file;
    proofHash = '';
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    proofHash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function submitProof() {
    if (!selectedPaymentBooking || !proofFile || !proofHash || !transferAmount || !transferReference.trim()) {
      notify('Bukti transfer, nominal, dan nomor referensi wajib diisi.');
      return;
    }
    const duplicate = bookings.some((b) => b.id !== selectedPaymentBooking.id && b.proofHash === proofHash);
    const amountMatch = transferAmount === selectedPaymentBooking.total;
    const target = bookings.find((b) => b.id === selectedPaymentBooking.id);
    if (!target) return;
    target.proofName = proofFile.name;
    target.proofHash = proofHash;
    target.proofAmount = transferAmount;
    target.proofReference = transferReference.trim();
    target.proofDuplicate = duplicate;
    target.proofAmountMatch = amountMatch;
    target.payment = 'PROOF_SUBMITTED';
    target.status = 'PENDING_VERIFICATION';
    target.audit = [...(target.audit ?? []), `Bukti pembayaran dikirim • ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`];
    bookings = [...bookings];
    persist();
    paymentOpen = false;
    notify('Bukti masuk ke antrean verifikasi admin.');
    go('user-bookings');
  }

  function reviewBooking(id: string) {
    selectedReviewId = id;
    reviewOpen = true;
  }

  function approvePayment(id: string) {
    const target = bookings.find((b) => b.id === id);
    if (!target) return;
    target.payment = 'PAID';
    target.status = 'CONFIRMED';
    target.audit = [...(target.audit ?? []), `Admin mengonfirmasi dana masuk • ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`];
    bookings = [...bookings];
    persist();
    reviewOpen = false;
    notify(`${id} sudah PAID dan CONFIRMED.`);
  }

  function rejectPayment(id: string) {
    const target = bookings.find((b) => b.id === id);
    if (!target) return;
    target.payment = 'REJECTED';
    target.status = 'PAYMENT_ISSUE';
    target.audit = [...(target.audit ?? []), `Admin menolak bukti pembayaran • ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`];
    bookings = [...bookings];
    persist();
    reviewOpen = false;
    notify(`${id} ditandai bermasalah.`);
  }

  function statusTone(status: BookingStatus) {
    if (status === 'CONFIRMED' || status === 'COMPLETED') return 'success';
    if (status === 'PAYMENT_ISSUE') return 'danger';
    if (status === 'PENDING_VERIFICATION') return 'warning';
    return 'neutral';
  }

  function paymentTone(status: PaymentStatus) {
    if (status === 'PAID') return 'success';
    if (status === 'REJECTED') return 'danger';
    if (status === 'PROOF_SUBMITTED') return 'warning';
    return 'neutral';
  }
</script>

<svelte:head>
  <title>ArenaBook — SvelteKit Booking Platform</title>
  <meta name="description" content="Booking lapangan dan perlengkapan dengan verifikasi pembayaran admin." />
</svelte:head>

<div class="min-h-screen bg-[#f4f7f5] text-slate-900">
  <aside class="fixed inset-y-0 left-0 z-40 hidden w-[244px] flex-col bg-arena-950 text-white lg:flex">
    <div class="flex h-[76px] items-center gap-3 border-b border-white/8 px-5">
      <div class="grid size-10 place-items-center rounded-2xl bg-emerald-400 font-black text-emerald-950">A</div>
      <div><div class="text-sm font-extrabold tracking-tight">ArenaBook</div><div class="text-[10px] text-white/38">Booking & operations</div></div>
    </div>

    <div class="px-4 pt-4">
      <div class="rounded-2xl border border-white/8 bg-white/[.035] p-2">
        <div class="mb-2 px-2 text-[9px] font-bold uppercase tracking-[.16em] text-white/35">Mode demo</div>
        <div class="grid grid-cols-2 rounded-xl bg-black/20 p-1">
          <button onclick={() => setRole('user')} class={`rounded-lg px-2 py-2 text-[11px] font-bold transition ${role === 'user' ? 'bg-white/10 text-emerald-300' : 'text-white/42 hover:text-white/70'}`}>User</button>
          <button onclick={() => setRole('admin')} class={`rounded-lg px-2 py-2 text-[11px] font-bold transition ${role === 'admin' ? 'bg-white/10 text-emerald-300' : 'text-white/42 hover:text-white/70'}`}>Admin</button>
        </div>
      </div>
    </div>

    <nav class="mt-5 flex-1 space-y-1 px-3">
      {#if role === 'user'}
        <button onclick={() => go('user-home')} class={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${view === 'user-home' ? 'bg-white/8 text-white' : 'text-white/43 hover:bg-white/5 hover:text-white/75'}`}><Home size={16}/> Beranda</button>
        <button onclick={() => go('booking')} class={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${view === 'booking' ? 'bg-white/8 text-white' : 'text-white/43 hover:bg-white/5 hover:text-white/75'}`}><Calendar size={16}/> Booking</button>
        <button onclick={() => go('user-bookings')} class={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${view === 'user-bookings' ? 'bg-white/8 text-white' : 'text-white/43 hover:bg-white/5 hover:text-white/75'}`}><ClipboardList size={16}/> Booking Saya</button>
        <button onclick={() => go('transactions')} class={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${view === 'transactions' ? 'bg-white/8 text-white' : 'text-white/43 hover:bg-white/5 hover:text-white/75'}`}><Wallet size={16}/> Transaksi</button>
      {:else}
        <button onclick={() => go('admin-home')} class={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${view === 'admin-home' ? 'bg-white/8 text-white' : 'text-white/43 hover:bg-white/5 hover:text-white/75'}`}><LayoutDashboard size={16}/> Overview</button>
        <button onclick={() => go('verification')} class={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${view === 'verification' ? 'bg-white/8 text-white' : 'text-white/43 hover:bg-white/5 hover:text-white/75'}`}><span class="flex items-center gap-3"><ShieldCheck size={16}/> Verifikasi</span>{#if pendingProofs.length}<span class="rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-amber-950">{pendingProofs.length}</span>{/if}</button>
        <button onclick={() => go('admin-bookings')} class={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${view === 'admin-bookings' ? 'bg-white/8 text-white' : 'text-white/43 hover:bg-white/5 hover:text-white/75'}`}><ClipboardList size={16}/> Booking</button>
        <button onclick={() => go('equipment')} class={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${view === 'equipment' ? 'bg-white/8 text-white' : 'text-white/43 hover:bg-white/5 hover:text-white/75'}`}><Package size={16}/> Perlengkapan</button>
        <button onclick={() => go('penalty')} class={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${view === 'penalty' ? 'bg-white/8 text-white' : 'text-white/43 hover:bg-white/5 hover:text-white/75'}`}><AlertTriangle size={16}/> Denda</button>
      {/if}
    </nav>

    <div class="p-4">
      <div class="rounded-2xl border border-emerald-400/10 bg-emerald-400/[.04] p-3">
        <div class="flex items-center gap-2 text-[10px] font-bold text-emerald-300"><span class="size-1.5 rounded-full bg-emerald-400"></span> SvelteKit Prototype</div>
        <p class="mt-1.5 text-[9px] leading-4 text-white/35">Bot admin belum diaktifkan. Fokus fondasi booking & pembayaran.</p>
      </div>
    </div>
  </aside>

  <main class="min-h-screen lg:pl-[244px]">
    <header class="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-slate-200/70 bg-[#f7faf8]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div>
        <div class="text-[9px] font-bold uppercase tracking-[.17em] text-emerald-700/70">{role} / {view.replaceAll('-', ' ')}</div>
        <div class="mt-0.5 text-sm font-extrabold tracking-tight">{role === 'user' ? 'ArenaBook Experience' : 'Operational Console'}</div>
      </div>
      <div class="flex items-center gap-2">
        <button class="relative grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900"><Bell size={17}/>{#if pendingProofs.length}<span class="absolute right-2 top-2 size-1.5 rounded-full bg-rose-500"></span>{/if}</button>
        <div class="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 sm:flex"><div class="grid size-7 place-items-center rounded-lg bg-arena-900 text-[9px] font-black text-emerald-300">RT</div><div><div class="text-[10px] font-bold">Rayhandi</div><div class="text-[8px] text-slate-400">{role === 'user' ? 'User demo' : 'Admin demo'}</div></div></div>
      </div>
    </header>

    <div class="mx-auto max-w-[1380px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      {#if view === 'user-home'}
        <section class="space-y-5">
          <div class="motion-in grid overflow-hidden rounded-[32px] bg-arena-950 text-white shadow-[0_32px_80px_-42px_rgba(3,19,12,.7)] lg:grid-cols-[1.08fr_.92fr]">
            <div class="relative z-10 p-7 sm:p-10 lg:p-12">
              <div class="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/8 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.16em] text-emerald-300"><Sparkles size={12}/> Booking lebih tenang</div>
              <h1 class="max-w-2xl text-4xl font-black leading-[1.03] tracking-[-.045em] sm:text-5xl">Pilih jadwal.<br/><span class="text-emerald-400">Slot tetap aman.</span></h1>
              <p class="mt-5 max-w-xl text-[13px] leading-6 text-white/52">Booking lapangan dan perlengkapan dalam satu alur. Pembayaran manual tetap transparan karena bukti masuk antrean verifikasi admin.</p>
              <div class="mt-7 flex flex-wrap gap-2"><Button onclick={() => go('booking')} size="lg">Booking sekarang <ChevronRight size={15}/></Button><Button onclick={() => go('user-bookings')} variant="secondary" size="lg">Booking saya</Button></div>
              <div class="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-white/45"><span class="flex items-center gap-1.5"><CheckCircle size={13} class="text-emerald-400"/> Anti double-booking</span><span class="flex items-center gap-1.5"><ShieldCheck size={13} class="text-emerald-400"/> Admin verification</span><span class="flex items-center gap-1.5"><Lock size={13} class="text-emerald-400"/> Bukti fingerprint</span></div>
            </div>
            <div class="grid-noise relative hidden min-h-[420px] overflow-hidden lg:block">
              <div class="absolute inset-8 rounded-[28px] border border-white/12 bg-[radial-gradient(circle_at_55%_35%,rgba(46,174,111,.55),rgba(8,37,24,.8)_56%,rgba(6,19,13,.8))]"></div>
              <div class="absolute inset-x-[18%] top-[21%] h-[56%] border border-white/25"></div>
              <div class="absolute bottom-10 left-12 rounded-2xl border border-white/10 bg-white/90 p-4 text-slate-900 shadow-2xl backdrop-blur"><div class="text-[9px] font-bold uppercase tracking-wider text-slate-400">Slot rekomendasi</div><div class="mt-1 text-sm font-black">19:00 — 21:00</div><div class="mt-0.5 text-[9px] text-slate-500">Futsal Arena A • {rupiah(300000)}</div></div>
              <div class="absolute right-10 top-12 rounded-2xl border border-white/10 bg-[#102a1f]/90 p-4 text-white shadow-2xl"><div class="text-[9px] text-white/40">Availability</div><div class="mt-1 flex items-center gap-2 text-xs font-bold"><span class="size-2 rounded-full bg-emerald-400"></span> Live schedule</div></div>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card class="motion-in p-4"><div class="text-[9px] font-bold uppercase tracking-wider text-slate-400">Booking aktif</div><div class="mt-2 text-2xl font-black tracking-tight">{bookings.filter((b) => b.status === 'CONFIRMED').length}</div><div class="mt-1 text-[10px] text-slate-400">Sudah dikonfirmasi</div></Card>
            <Card class="motion-in p-4"><div class="text-[9px] font-bold uppercase tracking-wider text-slate-400">Menunggu verifikasi</div><div class="mt-2 text-2xl font-black tracking-tight">{bookings.filter((b) => b.status === 'PENDING_VERIFICATION').length}</div><div class="mt-1 text-[10px] text-amber-600">Perlu keputusan admin</div></Card>
            <Card class="motion-in p-4"><div class="text-[9px] font-bold uppercase tracking-wider text-slate-400">Lapangan</div><div class="mt-2 text-2xl font-black tracking-tight">{venues.length}</div><div class="mt-1 text-[10px] text-slate-400">Aktif pada prototype</div></Card>
            <Card class="motion-in p-4"><div class="text-[9px] font-bold uppercase tracking-wider text-slate-400">Metode bayar</div><div class="mt-2 text-2xl font-black tracking-tight">Manual</div><div class="mt-1 text-[10px] text-slate-400">Gateway menyusul</div></Card>
          </div>

          <div class="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
            <Card class="motion-in overflow-hidden">
              <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><div class="text-[9px] font-black uppercase tracking-[.13em] text-emerald-700">Booking mendatang</div><h2 class="mt-1 text-lg font-black tracking-tight">Jadwal paling dekat</h2></div><Button variant="ghost" size="sm" onclick={() => go('user-bookings')}>Lihat semua <ArrowUpRight size={13}/></Button></div>
              <div class="p-5">
                {#if bookings[0]}
                  <div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div class="flex flex-wrap items-start justify-between gap-3"><div><Badge tone={statusTone(bookings[0].status)}>{bookings[0].status}</Badge><h3 class="mt-2 text-sm font-black">{bookings[0].venueName}</h3><p class="mt-1 text-[10px] text-slate-500">{bookings[0].date} • {bookings[0].time} • {bookings[0].duration} jam</p></div><div class="text-right"><div class="text-[9px] text-slate-400">Total</div><div class="mt-1 text-sm font-black">{rupiah(bookings[0].total)}</div></div></div>
                  </div>
                {/if}
              </div>
            </Card>
            <Card class="motion-in p-5">
              <div class="text-[9px] font-black uppercase tracking-[.13em] text-emerald-700">Cara kerja pembayaran</div>
              <h2 class="mt-1 text-lg font-black tracking-tight">Aman tanpa klaim palsu</h2>
              <div class="mt-4 space-y-3">
                {#each [['1','Upload bukti','File dicek & dibuat fingerprint.'],['2','Pre-screen','Nominal, referensi, duplikasi.'],['3','Admin approve','Dana dicek ke rekening lalu konfirmasi.']] as step}
                  <div class="flex gap-3"><div class="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-[10px] font-black text-emerald-700">{step[0]}</div><div><div class="text-[11px] font-bold">{step[1]}</div><div class="mt-0.5 text-[9px] leading-4 text-slate-400">{step[2]}</div></div></div>
                {/each}
              </div>
            </Card>
          </div>
        </section>
      {:else if view === 'booking'}
        <section class="space-y-5">
          <div class="motion-in flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div class="text-[9px] font-black uppercase tracking-[.15em] text-emerald-700">Booking lapangan</div><h1 class="mt-1 text-2xl font-black tracking-[-.035em]">Pilih slot yang pas</h1><p class="mt-1 text-[11px] text-slate-500">Jadwal yang merah atau kuning tidak dapat dipilih.</p></div><div class="flex items-center gap-2 text-[9px] text-slate-500"><span class="size-2 rounded-full bg-emerald-400"></span>Tersedia <span class="ml-2 size-2 rounded-full bg-rose-400"></span>Booked <span class="ml-2 size-2 rounded-full bg-amber-400"></span>Pending</div></div>

          <div class="grid gap-4 lg:grid-cols-[280px_1fr]">
            <Card class="motion-in h-max p-3">
              <div class="px-2 pb-2 pt-1 text-[9px] font-black uppercase tracking-[.13em] text-slate-400">Lapangan</div>
              <div class="space-y-1">
                {#each venues as venue}
                  <button onclick={() => selectedVenueId = venue.id} class={`w-full rounded-2xl border p-3 text-left transition ${selectedVenueId === venue.id ? 'border-emerald-200 bg-emerald-50' : 'border-transparent hover:bg-slate-50'}`}>
                    <div class="flex items-start justify-between gap-2"><div><div class="text-[11px] font-black">{venue.name}</div><div class="mt-1 text-[9px] text-slate-400">{venue.type} • {venue.surface}</div></div><div class="text-[9px] font-bold text-emerald-700">★ {venue.rating}</div></div>
                    <div class="mt-2 text-[10px] font-bold">{rupiah(venue.price)}<span class="font-normal text-slate-400">/jam</span></div>
                  </button>
                {/each}
              </div>
            </Card>

            <Card class="motion-in overflow-hidden">
              <div class="border-b border-slate-100 p-5">
                <div class="flex flex-wrap items-start justify-between gap-3"><div><h2 class="text-base font-black">{selectedVenue.name}</h2><div class="mt-1 flex flex-wrap gap-3 text-[9px] text-slate-400"><span class="flex items-center gap-1"><MapPin size={11}/> Indoor Arena</span><span class="flex items-center gap-1"><Users size={11}/> {selectedVenue.capacity}</span><span class="flex items-center gap-1"><CreditCard size={11}/> {rupiah(selectedVenue.price)}/jam</span></div></div><Badge tone="success">OPEN</Badge></div>
              </div>
              <div class="border-b border-slate-100 p-4">
                <div class="grid grid-cols-7 gap-1.5">
                  {#each days as day}
                    <button onclick={() => selectedDay = day.key} class={`rounded-xl px-1 py-2.5 text-center transition ${selectedDay === day.key ? 'bg-arena-900 text-white shadow-lg shadow-emerald-950/10' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><div class="text-[8px] font-bold uppercase">{day.dow}</div><div class="mt-1 text-xs font-black">{day.date}</div></button>
                  {/each}
                </div>
              </div>
              <div class="p-5">
                <div class="mb-3 flex items-center justify-between"><div><div class="text-[9px] font-black uppercase tracking-wider text-slate-400">Slot {selectedDayData.label}</div><div class="mt-1 text-[10px] text-slate-500">Klik slot hijau untuk memilih jam mulai.</div></div></div>
                <div class="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {#each slots as slot}
                    <button
                      disabled={slot.state !== 'free'}
                      onclick={() => selectedSlot = slot.time}
                      class={`slot-shine relative overflow-hidden rounded-xl border px-2 py-3 text-left transition ${slot.state === 'free' ? selectedSlot === slot.time ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400/10' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md' : slot.state === 'booked' ? 'cursor-not-allowed border-rose-100 bg-rose-50 text-rose-400' : slot.state === 'pending' ? 'cursor-not-allowed border-amber-100 bg-amber-50 text-amber-600' : 'cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400'}`}
                    >
                      <div class="text-[11px] font-black">{slot.time}</div><div class="mt-1 text-[8px] capitalize opacity-70">{slot.state === 'free' ? (selectedSlot === slot.time ? 'Dipilih' : 'Tersedia') : slot.state}</div>
                    </button>
                  {/each}
                </div>
                <div class="mt-5 flex flex-col gap-3 rounded-2xl bg-arena-950 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
                  <div><div class="text-[9px] text-white/40">Pilihan kamu</div><div class="mt-1 text-xs font-bold">{selectedVenue.name} • {selectedDayData.label} • {selectedSlot}</div></div>
                  <Button onclick={() => checkoutOpen = true}>Lanjut checkout <ChevronRight size={14}/></Button>
                </div>
              </div>
            </Card>
          </div>
        </section>
      {:else if view === 'user-bookings'}
        <section class="space-y-4">
          <div class="motion-in flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div class="text-[9px] font-black uppercase tracking-[.15em] text-emerald-700">Riwayat booking</div><h1 class="mt-1 text-2xl font-black tracking-tight">Booking saya</h1><p class="mt-1 text-[11px] text-slate-500">Status booking dan pembayaran berjalan secara terpisah.</p></div><Button size="sm" onclick={() => go('booking')}><Plus size={14}/> Booking baru</Button></div>
          <div class="grid gap-3">
            {#each bookings.filter((b) => b.customer === 'Rayhandi Tenri') as booking}
              <Card class="motion-in p-5">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><Badge tone={statusTone(booking.status)}>{booking.status}</Badge><Badge tone={paymentTone(booking.payment)}>{booking.payment}</Badge></div><h2 class="mt-2 text-sm font-black">{booking.venueName}</h2><div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-slate-400"><span>{booking.id}</span><span>{booking.date}</span><span>{booking.time} • {booking.duration} jam</span></div></div>
                  <div class="flex items-center gap-2 lg:text-right"><div class="mr-2"><div class="text-[9px] text-slate-400">Total</div><div class="text-sm font-black">{rupiah(booking.total)}</div></div>{#if booking.payment === 'UNPAID' || booking.payment === 'REJECTED'}<Button size="sm" onclick={() => openPayment(booking.id)}>Upload bukti</Button>{:else}<Button variant="outline" size="sm"><Receipt size={13}/> Invoice</Button>{/if}</div>
                </div>
                {#if booking.payment === 'PROOF_SUBMITTED'}<div class="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[9px] text-amber-700">Bukti sudah masuk. Admin perlu memastikan dana benar-benar masuk sebelum status menjadi PAID.</div>{/if}
                {#if booking.payment === 'REJECTED'}<div class="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[9px] text-rose-700">Bukti pembayaran ditolak. Silakan unggah bukti baru atau hubungi pengelola.</div>{/if}
              </Card>
            {/each}
          </div>
        </section>
      {:else if view === 'transactions'}
        <section class="space-y-4">
          <div class="motion-in"><div class="text-[9px] font-black uppercase tracking-[.15em] text-emerald-700">Keuangan</div><h1 class="mt-1 text-2xl font-black tracking-tight">Transaksi</h1><p class="mt-1 text-[11px] text-slate-500">Riwayat pembayaran booking dari sisi user.</p></div>
          <Card class="motion-in overflow-x-auto p-2"><table class="w-full min-w-[720px] border-collapse text-left"><thead><tr class="text-[8px] uppercase tracking-wider text-slate-400"><th class="p-3">Booking</th><th class="p-3">Lapangan</th><th class="p-3">Total</th><th class="p-3">Payment</th><th class="p-3">Status</th><th class="p-3"></th></tr></thead><tbody>{#each bookings.filter((b) => b.customer === 'Rayhandi Tenri') as booking}<tr class="border-t border-slate-100 text-[10px]"><td class="p-3 font-bold">{booking.id}</td><td class="p-3">{booking.venueName}</td><td class="p-3 font-bold">{rupiah(booking.total)}</td><td class="p-3"><Badge tone={paymentTone(booking.payment)}>{booking.payment}</Badge></td><td class="p-3"><Badge tone={statusTone(booking.status)}>{booking.status}</Badge></td><td class="p-3 text-right"><Button variant="ghost" size="sm"><Eye size={13}/> Detail</Button></td></tr>{/each}</tbody></table></Card>
        </section>
      {:else if view === 'admin-home'}
        <section class="space-y-5">
          <div class="motion-in flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div class="text-[9px] font-black uppercase tracking-[.15em] text-emerald-700">Operasional</div><h1 class="mt-1 text-2xl font-black tracking-tight">Dashboard admin</h1><p class="mt-1 text-[11px] text-slate-500">Satu layar untuk status booking dan pembayaran yang perlu keputusan.</p></div><Button size="sm" onclick={() => go('verification')}><ShieldCheck size={14}/> Buka verifikasi</Button></div>
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card class="motion-in p-4"><div class="text-[9px] font-bold uppercase text-slate-400">Total booking</div><div class="mt-2 text-2xl font-black">{bookings.length}</div><div class="mt-1 text-[9px] text-slate-400">State demo aktif</div></Card>
            <Card class="motion-in p-4"><div class="text-[9px] font-bold uppercase text-slate-400">Perlu verifikasi</div><div class="mt-2 text-2xl font-black text-amber-600">{pendingProofs.length}</div><div class="mt-1 text-[9px] text-slate-400">Bukti sudah dikirim</div></Card>
            <Card class="motion-in p-4"><div class="text-[9px] font-bold uppercase text-slate-400">Paid</div><div class="mt-2 text-2xl font-black text-emerald-700">{bookings.filter((b) => b.payment === 'PAID').length}</div><div class="mt-1 text-[9px] text-slate-400">Dana dikonfirmasi</div></Card>
            <Card class="motion-in p-4"><div class="text-[9px] font-bold uppercase text-slate-400">Payment issue</div><div class="mt-2 text-2xl font-black text-rose-600">{bookings.filter((b) => b.payment === 'REJECTED').length}</div><div class="mt-1 text-[9px] text-slate-400">Perlu tindak lanjut</div></Card>
          </div>
          <div class="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
            <Card class="motion-in p-5"><div class="flex items-center justify-between"><div><div class="text-[9px] font-black uppercase tracking-wider text-emerald-700">Antrian pembayaran</div><h2 class="mt-1 text-base font-black">Menunggu keputusan</h2></div><Button variant="ghost" size="sm" onclick={() => go('verification')}>Lihat semua</Button></div><div class="mt-4 space-y-2">{#if pendingProofs.length}{#each pendingProofs.slice(0,3) as item}<button onclick={() => reviewBooking(item.id)} class="flex w-full items-center justify-between rounded-2xl border border-slate-100 p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/30"><div><div class="text-[10px] font-black">{item.customer}</div><div class="mt-1 text-[9px] text-slate-400">{item.id} • {rupiah(item.total)}</div></div><ChevronRight size={14} class="text-slate-300"/></button>{/each}{:else}<div class="rounded-2xl bg-slate-50 p-5 text-center text-[10px] text-slate-400">Tidak ada antrean verifikasi.</div>{/if}</div></Card>
            <Card class="motion-in p-5"><div class="text-[9px] font-black uppercase tracking-wider text-emerald-700">Payment safety</div><h2 class="mt-1 text-base font-black">Yang sistem lakukan</h2><div class="mt-4 space-y-3 text-[10px]"><div class="flex items-center gap-2"><BadgeCheck size={15} class="text-emerald-600"/> Bandingkan nominal dengan invoice.</div><div class="flex items-center gap-2"><Lock size={15} class="text-emerald-600"/> SHA-256 fingerprint untuk bukti duplikat.</div><div class="flex items-center gap-2"><Banknote size={15} class="text-emerald-600"/> Dana tetap dicek admin di rekening.</div></div></Card>
          </div>
        </section>
      {:else if view === 'verification'}
        <section class="space-y-4">
          <div class="motion-in"><div class="text-[9px] font-black uppercase tracking-[.15em] text-emerald-700">Payment review</div><h1 class="mt-1 text-2xl font-black tracking-tight">Verifikasi pembayaran</h1><p class="mt-1 text-[11px] text-slate-500">Pre-screen membantu, tetapi admin tetap menjadi keputusan final.</p></div>
          <div class="grid gap-3">
            {#if pendingProofs.length}
              {#each pendingProofs as booking}
                <Card class="motion-in p-5">
                  <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div class="flex gap-3"><div class="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600"><ImageIcon size={18}/></div><div><div class="flex flex-wrap gap-2"><Badge tone="warning">REVIEW</Badge>{#if booking.proofDuplicate}<Badge tone="danger">DUPLICATE</Badge>{/if}{#if booking.proofAmountMatch}<Badge tone="success">NOMINAL COCOK</Badge>{:else}<Badge tone="danger">NOMINAL BEDA</Badge>{/if}</div><h2 class="mt-2 text-sm font-black">{booking.customer} • {booking.id}</h2><div class="mt-1 text-[9px] text-slate-400">{booking.venueName} • {booking.date} • {booking.time}</div></div></div>
                    <div class="flex flex-wrap items-center gap-2"><div class="mr-2"><div class="text-[8px] uppercase text-slate-400">Invoice</div><div class="text-sm font-black">{rupiah(booking.total)}</div></div><Button variant="outline" size="sm" onclick={() => reviewBooking(booking.id)}><Eye size={13}/> Review</Button><Button size="sm" onclick={() => approvePayment(booking.id)}><CheckCircle size={13}/> Approve</Button></div>
                  </div>
                </Card>
              {/each}
            {:else}
              <Card class="motion-in p-10 text-center"><CheckCircle size={28} class="mx-auto text-emerald-500"/><h2 class="mt-3 text-sm font-black">Antrean bersih</h2><p class="mt-1 text-[10px] text-slate-400">Belum ada bukti pembayaran baru.</p></Card>
            {/if}
          </div>
        </section>
      {:else if view === 'admin-bookings'}
        <section class="space-y-4">
          <div class="motion-in"><div class="text-[9px] font-black uppercase tracking-[.15em] text-emerald-700">Manajemen</div><h1 class="mt-1 text-2xl font-black tracking-tight">Semua booking</h1></div>
          <Card class="motion-in overflow-x-auto p-2"><table class="w-full min-w-[850px] border-collapse text-left"><thead><tr class="text-[8px] uppercase tracking-wider text-slate-400"><th class="p-3">Booking</th><th class="p-3">Customer</th><th class="p-3">Lapangan</th><th class="p-3">Jadwal</th><th class="p-3">Total</th><th class="p-3">Payment</th><th class="p-3">Booking</th></tr></thead><tbody>{#each bookings as booking}<tr class="border-t border-slate-100 text-[10px]"><td class="p-3 font-black">{booking.id}</td><td class="p-3">{booking.customer}</td><td class="p-3">{booking.venueName}</td><td class="p-3">{booking.date} • {booking.time}</td><td class="p-3 font-bold">{rupiah(booking.total)}</td><td class="p-3"><Badge tone={paymentTone(booking.payment)}>{booking.payment}</Badge></td><td class="p-3"><Badge tone={statusTone(booking.status)}>{booking.status}</Badge></td></tr>{/each}</tbody></table></Card>
        </section>
      {:else if view === 'equipment'}
        <section class="space-y-4">
          <div class="motion-in"><div class="text-[9px] font-black uppercase tracking-[.15em] text-emerald-700">Inventory</div><h1 class="mt-1 text-2xl font-black tracking-tight">Perlengkapan</h1><p class="mt-1 text-[11px] text-slate-500">Prototype stok berbasis katalog. Reservasi stok per-slot masuk tahap backend.</p></div>
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{#each equipmentCatalog as item}<Card class="motion-in p-5"><div class="flex items-start justify-between"><div class="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Package size={17}/></div><Badge tone={item.stock < 6 ? 'warning' : 'success'}>{item.stock} unit</Badge></div><h2 class="mt-4 text-sm font-black">{item.name}</h2><div class="mt-1 text-[10px] text-slate-400">{rupiah(item.price)} / booking</div><div class="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-emerald-400" style={`width:${Math.min(100, item.stock * 8)}%`}></div></div></Card>{/each}</div>
        </section>
      {:else if view === 'penalty'}
        <section class="space-y-4">
          <div class="motion-in"><div class="text-[9px] font-black uppercase tracking-[.15em] text-emerald-700">Policy engine</div><h1 class="mt-1 text-2xl font-black tracking-tight">Denda adaptif</h1><p class="mt-1 text-[11px] text-slate-500">Tetap ON/OFF dan bisa di-override admin.</p></div>
          <div class="grid gap-4 lg:grid-cols-2">
            <Card class="motion-in p-5"><div class="flex items-center justify-between"><div><div class="text-[9px] font-bold uppercase text-slate-400">Denda keterlambatan</div><h2 class="mt-1 text-base font-black">Global policy</h2></div><button onclick={() => penaltyEnabled = !penaltyEnabled} class={`relative h-8 w-14 rounded-full transition ${penaltyEnabled ? 'bg-emerald-400' : 'bg-slate-200'}`}><span class={`absolute top-1 size-6 rounded-full bg-white shadow transition ${penaltyEnabled ? 'left-7' : 'left-1'}`}></span></button></div><div class="mt-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1"><button onclick={() => penaltyMode = 'adaptive'} class={`rounded-lg py-2 text-[10px] font-bold transition ${penaltyMode === 'adaptive' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400'}`}>Otomatis adaptif</button><button onclick={() => penaltyMode = 'manual'} class={`rounded-lg py-2 text-[10px] font-bold transition ${penaltyMode === 'manual' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400'}`}>Manual admin</button></div><div class="mt-4 space-y-2 text-[10px]"><div class="flex justify-between border-t border-slate-100 py-2"><span class="text-slate-400">Toleransi</span><b>10 menit</b></div><div class="flex justify-between border-t border-slate-100 py-2"><span class="text-slate-400">Tarif</span><b>Rp10.000 / 10 menit</b></div><div class="flex justify-between border-t border-slate-100 py-2"><span class="text-slate-400">Trigger</span><b>Jadwal berikutnya terdampak</b></div></div></Card>
            <Card class="motion-in bg-arena-950 p-5 text-white"><div class="text-[9px] font-black uppercase tracking-wider text-emerald-300">Contoh keputusan</div><h2 class="mt-1 text-base font-black">19:00–20:00 → selesai 20:17</h2><p class="mt-3 text-[10px] leading-5 text-white/45">Ada booking berikutnya mulai pukul 20:00. Dengan toleransi 10 menit, sistem mendeteksi dampak dan membuat kandidat denda. Admin tetap bisa membebaskan.</p><div class="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4"><div class="flex items-center justify-between"><span class="text-[9px] text-white/40">Kandidat denda</span><span class="text-lg font-black text-emerald-300">Rp10.000</span></div></div></Card>
          </div>
        </section>
      {/if}
    </div>
  </main>

  <nav class="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-2xl backdrop-blur lg:hidden">
    {#if role === 'user'}
      <button onclick={() => go('user-home')} class={`grid place-items-center gap-1 rounded-xl py-2 text-[8px] font-bold ${view === 'user-home' ? 'bg-arena-900 text-white' : 'text-slate-400'}`}><Home size={14}/>Home</button><button onclick={() => go('booking')} class={`grid place-items-center gap-1 rounded-xl py-2 text-[8px] font-bold ${view === 'booking' ? 'bg-arena-900 text-white' : 'text-slate-400'}`}><Calendar size={14}/>Booking</button><button onclick={() => go('user-bookings')} class={`grid place-items-center gap-1 rounded-xl py-2 text-[8px] font-bold ${view === 'user-bookings' ? 'bg-arena-900 text-white' : 'text-slate-400'}`}><ClipboardList size={14}/>Saya</button><button onclick={() => setRole('admin')} class="grid place-items-center gap-1 rounded-xl py-2 text-[8px] font-bold text-slate-400"><ShieldCheck size={14}/>Admin</button>
    {:else}
      <button onclick={() => go('admin-home')} class={`grid place-items-center gap-1 rounded-xl py-2 text-[8px] font-bold ${view === 'admin-home' ? 'bg-arena-900 text-white' : 'text-slate-400'}`}><LayoutDashboard size={14}/>Admin</button><button onclick={() => go('verification')} class={`grid place-items-center gap-1 rounded-xl py-2 text-[8px] font-bold ${view === 'verification' ? 'bg-arena-900 text-white' : 'text-slate-400'}`}><ShieldCheck size={14}/>Verify</button><button onclick={() => go('admin-bookings')} class={`grid place-items-center gap-1 rounded-xl py-2 text-[8px] font-bold ${view === 'admin-bookings' ? 'bg-arena-900 text-white' : 'text-slate-400'}`}><ClipboardList size={14}/>Booking</button><button onclick={() => setRole('user')} class="grid place-items-center gap-1 rounded-xl py-2 text-[8px] font-bold text-slate-400"><Home size={14}/>User</button>
    {/if}
  </nav>
</div>

<Dialog.Root bind:open={checkoutOpen}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-arena-950/55 backdrop-blur-[2px]" />
    <Dialog.Content class="fixed inset-y-0 right-0 z-50 w-full max-w-[470px] overflow-y-auto bg-[#fbfdfc] p-5 shadow-2xl sm:p-7">
      <div class="flex items-start justify-between"><div><div class="text-[9px] font-black uppercase tracking-[.14em] text-emerald-700">Checkout</div><Dialog.Title class="mt-1 text-xl font-black tracking-tight">Selesaikan booking</Dialog.Title><Dialog.Description class="mt-1 text-[10px] text-slate-400">Lengkapi identitas sebelum slot ditahan.</Dialog.Description></div><Dialog.Close class="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"><X size={15}/></Dialog.Close></div>
      <div class="mt-5 rounded-2xl bg-arena-950 p-4 text-white"><div class="flex items-center justify-between"><div><div class="text-[9px] text-white/40">{selectedVenue.name}</div><div class="mt-1 text-xs font-bold">{selectedDayData.label} • {selectedSlot}</div></div><div class="text-right"><div class="text-[8px] text-white/35">Durasi</div><div class="mt-1 text-xs font-black">{duration} jam</div></div></div></div>
      <div class="mt-5 grid gap-3"><label class="text-[9px] font-bold text-slate-500">Nama lengkap<input bind:value={customerName} class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-emerald-400"/></label><label class="text-[9px] font-bold text-slate-500">WhatsApp<input bind:value={customerPhone} placeholder="08xxxxxxxxxx" class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-emerald-400"/></label><label class="text-[9px] font-bold text-slate-500">Alamat<textarea bind:value={customerAddress} rows="3" placeholder="Alamat pemesan" class="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none transition focus:border-emerald-400"></textarea></label></div>
      <div class="mt-5"><div class="text-[9px] font-black uppercase tracking-wider text-slate-400">Durasi booking</div><div class="mt-2 flex gap-2">{#each [1,2,3,4] as hours}<button onclick={() => duration = hours} class={`rounded-xl border px-3 py-2 text-[10px] font-bold ${duration === hours ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>{hours} jam</button>{/each}</div></div>
      <div class="mt-5"><div class="text-[9px] font-black uppercase tracking-wider text-slate-400">Perlengkapan</div><div class="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">{#each equipmentCatalog as item}<div class="flex items-center gap-3 border-b border-slate-100 p-3 last:border-0"><div class="grid size-9 place-items-center rounded-xl bg-slate-50 text-slate-500"><Package size={14}/></div><div class="min-w-0 flex-1"><div class="text-[10px] font-bold">{item.name}</div><div class="mt-0.5 text-[8px] text-slate-400">{rupiah(item.price)} • stok {item.stock}</div></div><div class="flex items-center gap-1"><button onclick={() => adjustEquipment(item.id,-1)} class="grid size-7 place-items-center rounded-lg border border-slate-200"><Minus size={11}/></button><span class="w-6 text-center text-[10px] font-black">{equipmentQty[item.id] ?? 0}</span><button onclick={() => adjustEquipment(item.id,1)} class="grid size-7 place-items-center rounded-lg border border-slate-200"><Plus size={11}/></button></div></div>{/each}</div></div>
      <div class="mt-5 space-y-2 border-t border-slate-200 pt-4 text-[10px]"><div class="flex justify-between text-slate-500"><span>Lapangan</span><b class="text-slate-800">{rupiah(venueSubtotal)}</b></div><div class="flex justify-between text-slate-500"><span>Perlengkapan</span><b class="text-slate-800">{rupiah(equipmentSubtotal)}</b></div><div class="flex justify-between border-t border-dashed border-slate-200 pt-3"><span class="font-bold">Total</span><b class="text-lg font-black text-emerald-700">{rupiah(bookingTotal)}</b></div></div>
      <Button class="mt-5 w-full" size="lg" onclick={createBooking}>Buat booking & lanjut bayar <ChevronRight size={14}/></Button>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<Dialog.Root bind:open={paymentOpen}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-arena-950/55 backdrop-blur-[2px]" />
    <Dialog.Content class="fixed left-1/2 top-1/2 z-50 w-[calc(100%-24px)] max-w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-[#fbfdfc] p-5 shadow-2xl sm:p-7">
      <div class="flex items-start justify-between"><div><div class="text-[9px] font-black uppercase tracking-[.14em] text-emerald-700">Pembayaran manual</div><Dialog.Title class="mt-1 text-xl font-black tracking-tight">Upload bukti transfer</Dialog.Title><Dialog.Description class="mt-1 text-[10px] text-slate-400">Bukti tidak otomatis dianggap lunas.</Dialog.Description></div><Dialog.Close class="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"><X size={15}/></Dialog.Close></div>
      {#if selectedPaymentBooking}
        <div class="mt-5 grid gap-3 sm:grid-cols-2"><div class="rounded-2xl bg-arena-950 p-4 text-white"><div class="text-[8px] uppercase tracking-wider text-white/35">Total invoice</div><div class="mt-1 text-xl font-black text-emerald-300">{rupiah(selectedPaymentBooking.total)}</div><div class="mt-2 text-[9px] text-white/40">{selectedPaymentBooking.id}</div></div><div class="rounded-2xl border border-slate-200 bg-white p-4"><div class="text-[8px] uppercase tracking-wider text-slate-400">Transfer ke</div><div class="mt-1 text-xs font-black">BCA • 1234567890</div><div class="mt-1 text-[9px] text-slate-400">ArenaBook Demo</div></div></div>
        <div class="mt-4 rounded-2xl border border-sky-100 bg-sky-50 p-3 text-[9px] leading-4 text-sky-700"><b>Pre-screen saja:</b> sistem membandingkan nominal, nomor referensi, tipe file, dan fingerprint duplikat. Admin tetap cek mutasi rekening.</div>
        <div class="mt-4 grid gap-3 sm:grid-cols-2"><label class="text-[9px] font-bold text-slate-500">Nominal transfer<input type="number" bind:value={transferAmount} class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-400"/></label><label class="text-[9px] font-bold text-slate-500">Nomor referensi<input bind:value={transferReference} placeholder="Contoh: TRX19022818" class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-400"/></label></div>
        <label class="mt-3 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center transition hover:border-emerald-400 hover:bg-emerald-50/30"><Upload size={20} class="text-emerald-600"/><span class="mt-2 text-[10px] font-bold">{proofFile ? proofFile.name : 'Pilih screenshot bukti transfer'}</span><span class="mt-1 text-[8px] text-slate-400">JPG / PNG / WEBP • fingerprint SHA-256 dibuat di browser</span><input class="hidden" type="file" accept="image/png,image/jpeg,image/webp" onchange={handleProofFile}/></label>
        {#if proofHash}<div class="mt-2 truncate rounded-xl bg-slate-100 px-3 py-2 font-mono text-[8px] text-slate-500">SHA-256: {proofHash}</div>{/if}
        <Button class="mt-4 w-full" size="lg" onclick={submitProof}><Upload size={14}/> Kirim untuk verifikasi admin</Button>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<Dialog.Root bind:open={reviewOpen}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-arena-950/55 backdrop-blur-[2px]" />
    <Dialog.Content class="fixed left-1/2 top-1/2 z-50 w-[calc(100%-24px)] max-w-[590px] -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-[#fbfdfc] p-5 shadow-2xl sm:p-7">
      <div class="flex items-start justify-between"><div><div class="text-[9px] font-black uppercase tracking-[.14em] text-emerald-700">Admin review</div><Dialog.Title class="mt-1 text-xl font-black tracking-tight">Verifikasi bukti</Dialog.Title><Dialog.Description class="mt-1 text-[10px] text-slate-400">Gunakan hasil pre-screen sebagai bantuan, bukan bukti mutlak.</Dialog.Description></div><Dialog.Close class="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"><X size={15}/></Dialog.Close></div>
      {#if selectedReviewBooking}
        <div class="mt-5 rounded-2xl bg-arena-950 p-4 text-white"><div class="flex items-start justify-between gap-4"><div><div class="text-[9px] text-white/40">{selectedReviewBooking.id}</div><div class="mt-1 text-sm font-black">{selectedReviewBooking.customer}</div><div class="mt-1 text-[9px] text-white/40">{selectedReviewBooking.venueName} • {selectedReviewBooking.date}</div></div><div class="text-right"><div class="text-[8px] text-white/35">Invoice</div><div class="mt-1 text-lg font-black text-emerald-300">{rupiah(selectedReviewBooking.total)}</div></div></div></div>
        <div class="mt-4 grid gap-2 sm:grid-cols-2"><div class={`rounded-2xl border p-3 ${selectedReviewBooking.proofAmountMatch ? 'border-emerald-100 bg-emerald-50' : 'border-rose-100 bg-rose-50'}`}><div class="text-[8px] uppercase text-slate-400">Nominal bukti</div><div class="mt-1 text-xs font-black">{rupiah(selectedReviewBooking.proofAmount ?? 0)}</div><div class={`mt-1 text-[8px] font-bold ${selectedReviewBooking.proofAmountMatch ? 'text-emerald-700' : 'text-rose-700'}`}>{selectedReviewBooking.proofAmountMatch ? 'Sesuai invoice' : 'Tidak sesuai invoice'}</div></div><div class={`rounded-2xl border p-3 ${selectedReviewBooking.proofDuplicate ? 'border-rose-100 bg-rose-50' : 'border-emerald-100 bg-emerald-50'}`}><div class="text-[8px] uppercase text-slate-400">Fingerprint</div><div class="mt-1 text-xs font-black">{selectedReviewBooking.proofDuplicate ? 'Duplikat terdeteksi' : 'Tidak ditemukan duplikat'}</div><div class="mt-1 text-[8px] text-slate-500">{selectedReviewBooking.proofHash?.slice(0,18)}…</div></div></div>
        <div class="mt-3 rounded-2xl border border-slate-200 bg-white p-3"><div class="grid gap-3 sm:grid-cols-2"><div><div class="text-[8px] uppercase text-slate-400">No. referensi</div><div class="mt-1 text-[10px] font-bold">{selectedReviewBooking.proofReference}</div></div><div><div class="text-[8px] uppercase text-slate-400">Nama file</div><div class="mt-1 text-[10px] font-bold">{selectedReviewBooking.proofName}</div></div></div></div>
        <div class="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-[9px] leading-4 text-amber-700"><b>Langkah admin:</b> cek mutasi/rekening. Kalau dana benar-benar masuk, pilih Approve. Kalau tidak cocok atau belum masuk, pilih Tolak.</div>
        <div class="mt-4 grid grid-cols-2 gap-2"><Button variant="danger" onclick={() => rejectPayment(selectedReviewBooking.id)}><X size={14}/> Tolak</Button><Button onclick={() => approvePayment(selectedReviewBooking.id)}><CheckCircle size={14}/> Dana masuk — Approve</Button></div>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

{#if flash}
  <div class="fixed bottom-20 right-4 z-[80] max-w-[320px] rounded-2xl bg-arena-950 px-4 py-3 text-[10px] font-semibold text-white shadow-2xl lg:bottom-5"><div class="flex items-center gap-2"><CheckCircle size={14} class="text-emerald-400"/>{flash}</div></div>
{/if}
