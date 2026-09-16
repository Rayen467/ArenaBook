<script lang="ts">
  import { onMount } from 'svelte';
  import { animate, stagger } from 'motion';
  import {
    Home, CalendarDays, ClipboardList, Wallet, LayoutDashboard, ShieldCheck, Package,
    AlertTriangle, Bell, MapPin, Users, ChevronRight, ChevronLeft, CheckCircle,
    Upload, X, Plus, Minus, Eye, Sparkles, Receipt, Image as ImageIcon,
    CalendarRange
  } from '@lucide/svelte';
  import Button from '$lib/components/ui/button/Button.svelte';
  import Card from '$lib/components/ui/card/Card.svelte';
  import Badge from '$lib/components/ui/badge/Badge.svelte';
  import { rupiah } from '$lib/utils';

  type Role = 'user' | 'admin';
  type BookingStatus = 'AWAITING_PAYMENT' | 'PENDING_VERIFICATION' | 'CONFIRMED' | 'PAYMENT_ISSUE' | 'COMPLETED';
  type PaymentStatus = 'UNPAID' | 'PROOF_SUBMITTED' | 'PAID' | 'REJECTED';
  type SlotState = 'free' | 'booked' | 'pending' | 'maintenance';

  type Booking = {
    id: string;
    customer: string;
    phone: string;
    address: string;
    venueId: number;
    venueName: string;
    date: string;
    dateKey: string;
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

  type CalendarCell = {
    key: string;
    date: Date;
    day: number;
    inCurrentMonth: boolean;
    isToday: boolean;
    isPast: boolean;
  };

  const venues = [
    { id: 1, name: 'Futsal Arena A', type: 'Futsal', surface: 'Vinyl Pro', price: 150000, capacity: '10–14 orang', rating: 4.9 },
    { id: 2, name: 'Futsal Arena B', type: 'Futsal', surface: 'Sintetis', price: 135000, capacity: '10–14 orang', rating: 4.8 },
    { id: 3, name: 'Badminton Court 1', type: 'Badminton', surface: 'Karpet BWF', price: 80000, capacity: '2–4 orang', rating: 4.9 },
    { id: 4, name: 'Basket Half Court', type: 'Basket', surface: 'PU Court', price: 120000, capacity: '6–10 orang', rating: 4.7 }
  ];

  const equipmentCatalog = [
    { id: 1, name: 'Bola Futsal', price: 15000, stock: 5 },
    { id: 2, name: 'Rompi Tim', price: 5000, stock: 20 },
    { id: 3, name: 'Sepatu Futsal', price: 25000, stock: 8 }
  ];

  const slotTimes = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];
  const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const weekdayLabels = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
  const todayKey = '2026-09-16';

  const demoBookings: Booking[] = [
    {
      id: 'BK-260916-018', customer: 'Rayhandi Tenri', phone: '08xxxxxxxxxx', address: 'Tangerang',
      venueId: 1, venueName: 'Futsal Arena A', date: '16 Sep 2026', dateKey: '2026-09-16', time: '19:00', duration: 2,
      equipment: [{ name: 'Bola Futsal', qty: 1, subtotal: 15000 }], total: 315000,
      status: 'CONFIRMED', payment: 'PAID', createdAt: '16 Sep 2026 • 14:20',
      audit: ['Pembayaran dikonfirmasi admin • 14:28']
    },
    {
      id: 'BK-260917-021', customer: 'Dimas Saputra', phone: '0812xxxx1122', address: 'Rajeg, Tangerang',
      venueId: 2, venueName: 'Futsal Arena B', date: '17 Sep 2026', dateKey: '2026-09-17', time: '20:00', duration: 2,
      equipment: [], total: 270000, status: 'PENDING_VERIFICATION', payment: 'PROOF_SUBMITTED',
      createdAt: '16 Sep 2026 • 15:02', proofName: 'bukti-transfer-dimas.jpg', proofHash: 'demo-hash-dimas',
      proofAmount: 270000, proofReference: 'TRX19022818', proofDuplicate: false, proofAmountMatch: true,
      audit: ['Bukti pembayaran dikirim • 15:05']
    }
  ];

  let role = $state<Role>('user');
  let view = $state('booking');
  let selectedVenueId = $state(1);
  let selectedDate = $state('2026-09-16');
  let calendarYear = $state(2026);
  let calendarMonth = $state(8);
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
  let selectedDateLabel = $derived(formatLongDate(selectedDate));
  let calendarCells = $derived(makeCalendar(calendarYear, calendarMonth));
  let venueSubtotal = $derived(selectedVenue.price * duration);
  let equipmentSubtotal = $derived(equipmentCatalog.reduce((sum, item) => sum + item.price * (equipmentQty[item.id] ?? 0), 0));
  let bookingTotal = $derived(venueSubtotal + equipmentSubtotal);
  let pendingProofs = $derived(bookings.filter((b) => b.payment === 'PROOF_SUBMITTED'));
  let selectedPaymentBooking = $derived(bookings.find((b) => b.id === selectedPaymentId) ?? null);
  let selectedReviewBooking = $derived(bookings.find((b) => b.id === selectedReviewId) ?? null);

  onMount(() => {
    const saved = localStorage.getItem('arenabook-svelte-bookings');
    if (saved) {
      try { bookings = JSON.parse(saved); } catch { /* keep demo */ }
    }
    reveal();
  });

  function dateKey(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function makeCalendar(year: number, month: number): CalendarCell[] {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const mondayIndex = (first.getDay() + 6) % 7;
    const totalNeeded = Math.ceil((mondayIndex + last.getDate()) / 7) * 7;
    const start = new Date(year, month, 1 - mondayIndex);
    return Array.from({ length: totalNeeded }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = dateKey(date);
      return {
        key,
        date,
        day: date.getDate(),
        inCurrentMonth: date.getMonth() === month,
        isToday: key === todayKey,
        isPast: key < todayKey
      };
    });
  }

  function formatLongDate(key: string) {
    const [y, m, d] = key.split('-').map(Number);
    return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, d));
  }

  function shortDate(key: string) {
    const [y, m, d] = key.split('-').map(Number);
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(y, m - 1, d));
  }

  function prevMonth() {
    if (calendarMonth === 0) { calendarMonth = 11; calendarYear -= 1; }
    else calendarMonth -= 1;
  }

  function nextMonth() {
    if (calendarMonth === 11) { calendarMonth = 0; calendarYear += 1; }
    else calendarMonth += 1;
  }

  function selectCalendarDate(cell: CalendarCell) {
    if (cell.isPast) return;
    selectedDate = cell.key;
    if (!cell.inCurrentMonth) {
      calendarYear = cell.date.getFullYear();
      calendarMonth = cell.date.getMonth();
    }
    const firstFree = slotTimes.find((time) => getSlotState(time) === 'free');
    if (firstFree) selectedSlot = firstFree;
  }

  function dayAvailability(key: string) {
    if (key < todayKey) return { tone: 'past', label: 'Lewat', free: 0 };
    const d = Number(key.slice(-2));
    if ((d + selectedVenueId) % 11 === 0) return { tone: 'maintenance', label: 'Maintenance', free: 0 };
    const free = 5 + ((d * 3 + selectedVenueId) % 8);
    if (free <= 6) return { tone: 'limited', label: `${free} slot`, free };
    return { tone: 'open', label: `${free} slot`, free };
  }

  function getSlotState(time: string): SlotState {
    const day = Number(selectedDate.slice(-2));
    const hour = Number(time.slice(0, 2));
    const seed = (day * 7 + hour * 3 + selectedVenueId * 5) % 17;
    if (seed === 0) return 'maintenance';
    if (seed === 1 || seed === 2 || seed === 3) return 'booked';
    if (seed === 4 || seed === 5) return 'pending';
    return 'free';
  }

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
      animate(nodes, { opacity: [0, 1], y: [10, 0] }, { duration: 0.34, delay: stagger(0.025), ease: [0.22, 1, 0.36, 1] });
    });
  }

  function go(next: string) {
    view = next;
    window.setTimeout(reveal, 20);
  }

  function setRole(next: Role) {
    role = next;
    view = next === 'user' ? 'booking' : 'admin-home';
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
    const id = `BK-${selectedDate.replaceAll('-', '').slice(2)}-${String(Math.floor(Math.random() * 900) + 100)}`;
    const booking: Booking = {
      id, customer: customerName, phone: customerPhone, address: customerAddress,
      venueId: selectedVenue.id, venueName: selectedVenue.name, date: shortDate(selectedDate), dateKey: selectedDate,
      time: selectedSlot, duration, equipment, total: bookingTotal,
      status: 'AWAITING_PAYMENT', payment: 'UNPAID',
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
  <title>ArenaBook — Booking Lapangan</title>
  <meta name="description" content="Booking lapangan dan perlengkapan dengan kalender bulanan dan verifikasi pembayaran admin." />
</svelte:head>

<div class="min-h-screen bg-[#f4f7f5] text-slate-900">
  <aside class="fixed inset-y-0 left-0 z-40 hidden w-[244px] flex-col bg-arena-950 text-white lg:flex">
    <div class="flex h-[76px] items-center gap-3 border-b border-white/8 px-5">
      <div class="grid size-10 place-items-center rounded-2xl bg-emerald-400 font-black text-emerald-950">A</div>
      <div><div class="text-sm font-extrabold tracking-tight">ArenaBook</div><div class="text-[10px] text-white/38">Booking & operations</div></div>
    </div>
    <div class="px-4 pt-4"><div class="rounded-2xl border border-white/8 bg-white/[.035] p-2"><div class="mb-2 px-2 text-[9px] font-bold uppercase tracking-[.16em] text-white/35">Mode demo</div><div class="grid grid-cols-2 rounded-xl bg-black/20 p-1"><button onclick={() => setRole('user')} class={`rounded-lg px-2 py-2 text-[11px] font-bold transition ${role === 'user' ? 'bg-white/10 text-emerald-300' : 'text-white/42 hover:text-white/70'}`}>User</button><button onclick={() => setRole('admin')} class={`rounded-lg px-2 py-2 text-[11px] font-bold transition ${role === 'admin' ? 'bg-white/10 text-emerald-300' : 'text-white/42 hover:text-white/70'}`}>Admin</button></div></div></div>
    <nav class="mt-5 flex-1 space-y-1 px-3">
      {#if role === 'user'}
        <button onclick={() => go('user-home')} class={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${view === 'user-home' ? 'bg-white/8 text-white' : 'text-white/43 hover:bg-white/5 hover:text-white/75'}`}><Home size={16}/> Beranda</button>
        <button onclick={() => go('booking')} class={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${view === 'booking' ? 'bg-white/8 text-white' : 'text-white/43 hover:bg-white/5 hover:text-white/75'}`}><CalendarDays size={16}/> Booking</button>
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
    <div class="p-4"><div class="rounded-2xl border border-emerald-400/10 bg-emerald-400/[.04] p-3"><div class="flex items-center gap-2 text-[10px] font-bold text-emerald-300"><span class="size-1.5 rounded-full bg-emerald-400"></span> SvelteKit Prototype</div><p class="mt-1.5 text-[9px] leading-4 text-white/35">Kalender bulanan aktif. Bot admin belum diaktifkan.</p></div></div>
  </aside>

  <main class="min-h-screen lg:pl-[244px]">
    <header class="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-slate-200/70 bg-[#f7faf8]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8"><div><div class="text-[9px] font-bold uppercase tracking-[.17em] text-emerald-700/70">{role} / {view.replaceAll('-', ' ')}</div><div class="mt-0.5 text-sm font-extrabold tracking-tight">{role === 'user' ? 'ArenaBook Experience' : 'Operational Console'}</div></div><div class="flex items-center gap-2"><button aria-label="Notifikasi" class="relative grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900"><Bell size={17}/>{#if pendingProofs.length}<span class="absolute right-2 top-2 size-1.5 rounded-full bg-rose-500"></span>{/if}</button><div class="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 sm:flex"><div class="grid size-7 place-items-center rounded-lg bg-arena-900 text-[9px] font-black text-emerald-300">RT</div><div><div class="text-[10px] font-bold">Rayhandi</div><div class="text-[8px] text-slate-400">{role === 'user' ? 'User demo' : 'Admin demo'}</div></div></div></div></header>

    <div class="mx-auto max-w-[1460px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      {#if view === 'user-home'}
        <section class="space-y-5"><div class="motion-in grid overflow-hidden rounded-[32px] bg-arena-950 text-white lg:grid-cols-[1.08fr_.92fr]"><div class="p-7 sm:p-10 lg:p-12"><div class="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/8 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.16em] text-emerald-300"><Sparkles size={12}/> Booking lebih tenang</div><h1 class="max-w-2xl text-4xl font-black leading-[1.03] tracking-[-.045em] sm:text-5xl">Pilih tanggal.<br/><span class="text-emerald-400">Lihat satu bulan penuh.</span></h1><p class="mt-5 max-w-xl text-[13px] leading-6 text-white/52">Kalender bulanan membuat jadwal lebih mudah dibaca tanpa harus menggeser strip tanggal satu per satu.</p><div class="mt-7 flex flex-wrap gap-2"><Button onclick={() => go('booking')} size="lg">Buka kalender <ChevronRight size={15}/></Button><Button onclick={() => go('user-bookings')} variant="secondary" size="lg">Booking saya</Button></div></div><div class="grid-noise relative hidden min-h-[410px] lg:block"><div class="absolute inset-8 rounded-[28px] border border-white/12 bg-[radial-gradient(circle_at_55%_35%,rgba(46,174,111,.55),rgba(8,37,24,.8)_56%,rgba(6,19,13,.8))]"></div><div class="absolute bottom-10 left-12 rounded-2xl border border-white/10 bg-white/90 p-4 text-slate-900 shadow-2xl"><div class="text-[9px] font-bold uppercase tracking-wider text-slate-400">Kalender aktif</div><div class="mt-1 text-sm font-black">September 2026</div><div class="mt-0.5 text-[9px] text-slate-500">30 hari • jadwal per tanggal</div></div></div></div></section>
      {:else if view === 'booking'}
        <section class="space-y-5">
          <div class="motion-in flex flex-col justify-between gap-3 xl:flex-row xl:items-end"><div><div class="text-[9px] font-black uppercase tracking-[.15em] text-emerald-700">Booking lapangan</div><h1 class="mt-1 text-2xl font-black tracking-[-.035em]">Pilih tanggal dari kalender penuh</h1><p class="mt-1 max-w-2xl text-[11px] leading-5 text-slate-500">Bukan lagi 7 hari segaris. Kalender mengikuti jumlah hari sebenarnya pada setiap bulan, lalu jadwal jam muncul sesuai tanggal yang dipilih.</p></div><div class="flex flex-wrap items-center gap-3 text-[9px] text-slate-500"><span class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-emerald-400"></span>Banyak slot</span><span class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-amber-400"></span>Terbatas</span><span class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-slate-300"></span>Maintenance / lewat</span></div></div>
          <div class="grid gap-4 xl:grid-cols-[270px_minmax(0,1fr)]">
            <Card class="motion-in h-max p-3"><div class="px-2 pb-2 pt-1 text-[9px] font-black uppercase tracking-[.13em] text-slate-400">Pilih lapangan</div><div class="space-y-1">{#each venues as venue}<button onclick={() => selectedVenueId = venue.id} class={`w-full rounded-2xl border p-3 text-left transition ${selectedVenueId === venue.id ? 'border-emerald-200 bg-emerald-50' : 'border-transparent hover:bg-slate-50'}`}><div class="flex items-start justify-between gap-2"><div><div class="text-[11px] font-black">{venue.name}</div><div class="mt-1 text-[9px] text-slate-400">{venue.type} • {venue.surface}</div></div><div class="text-[9px] font-bold text-emerald-700">★ {venue.rating}</div></div><div class="mt-2 text-[10px] font-bold">{rupiah(venue.price)}<span class="font-normal text-slate-400">/jam</span></div></button>{/each}</div></Card>
            <div class="space-y-4">
              <Card class="motion-in overflow-hidden">
                <div class="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div class="flex items-center gap-2"><div class="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CalendarRange size={17}/></div><div><h2 class="text-base font-black">{monthNames[calendarMonth]} {calendarYear}</h2><div class="mt-0.5 text-[9px] text-slate-400">Klik tanggal aktif untuk melihat slot jam</div></div></div></div><div class="flex items-center gap-2"><button aria-label="Bulan sebelumnya" onclick={prevMonth} class="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700"><ChevronLeft size={15}/></button><button onclick={() => { calendarYear = 2026; calendarMonth = 8; selectedDate = todayKey; }} class="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold text-slate-600 transition hover:border-emerald-300">Hari ini</button><button aria-label="Bulan berikutnya" onclick={nextMonth} class="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700"><ChevronRight size={15}/></button></div></div>
                <div class="p-3 sm:p-5"><div class="grid grid-cols-7 border-b border-slate-100 pb-2">{#each weekdayLabels as label}<div class="py-1 text-center text-[8px] font-black uppercase tracking-wider text-slate-400">{label}</div>{/each}</div><div class="mt-2 grid grid-cols-7 gap-1.5 sm:gap-2">{#each calendarCells as cell}{@const info = dayAvailability(cell.key)}<button disabled={cell.isPast} onclick={() => selectCalendarDate(cell)} class={`relative min-h-[72px] rounded-xl border p-2 text-left transition sm:min-h-[84px] sm:p-2.5 ${selectedDate === cell.key ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400/10' : cell.isPast ? 'cursor-not-allowed border-transparent bg-slate-50/60 text-slate-300' : cell.inCurrentMonth ? 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm' : 'border-slate-100 bg-slate-50/55 text-slate-400 hover:border-slate-200'}`}><div class="flex items-start justify-between gap-1"><span class={`text-[11px] font-black sm:text-xs ${cell.isToday ? 'grid size-6 place-items-center rounded-full bg-arena-950 text-white' : ''}`}>{cell.day}</span>{#if selectedDate === cell.key}<CheckCircle size={12} class="text-emerald-600"/>{/if}</div>{#if !cell.isPast}<div class="mt-3 hidden sm:block"><span class={`inline-flex items-center gap-1 text-[8px] font-bold ${info.tone === 'open' ? 'text-emerald-700' : info.tone === 'limited' ? 'text-amber-600' : 'text-slate-400'}`}><span class={`size-1.5 rounded-full ${info.tone === 'open' ? 'bg-emerald-400' : info.tone === 'limited' ? 'bg-amber-400' : 'bg-slate-300'}`}></span>{info.label}</span></div>{/if}</button>{/each}</div><div class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"><div><div class="text-[8px] font-bold uppercase tracking-wider text-slate-400">Tanggal dipilih</div><div class="mt-1 text-[11px] font-black capitalize">{selectedDateLabel}</div></div><Badge tone="success">{dayAvailability(selectedDate).label}</Badge></div></div>
              </Card>
              <Card class="motion-in overflow-hidden"><div class="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div class="text-[9px] font-black uppercase tracking-wider text-emerald-700">Jadwal jam</div><h2 class="mt-1 text-base font-black">{selectedVenue.name}</h2><div class="mt-1 text-[9px] capitalize text-slate-400">{selectedDateLabel}</div></div><div class="flex items-center gap-2"><MapPin size={12} class="text-slate-400"/><span class="text-[9px] text-slate-500">Indoor Arena • {selectedVenue.capacity}</span></div></div><div class="p-5"><div class="grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-6">{#each slotTimes as time}{@const state = getSlotState(time)}<button disabled={state !== 'free'} onclick={() => selectedSlot = time} class={`slot-shine relative overflow-hidden rounded-xl border px-2 py-3 text-left transition ${state === 'free' ? selectedSlot === time ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400/10' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md' : state === 'booked' ? 'cursor-not-allowed border-rose-100 bg-rose-50 text-rose-400' : state === 'pending' ? 'cursor-not-allowed border-amber-100 bg-amber-50 text-amber-600' : 'cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400'}`}><div class="text-[11px] font-black">{time}</div><div class="mt-1 text-[8px] capitalize opacity-70">{state === 'free' ? selectedSlot === time ? 'Dipilih' : 'Tersedia' : state}</div></button>{/each}</div><div class="mt-5 flex flex-col gap-3 rounded-2xl bg-arena-950 p-4 text-white sm:flex-row sm:items-center sm:justify-between"><div><div class="text-[9px] text-white/40">Pilihan kamu</div><div class="mt-1 text-xs font-bold">{selectedVenue.name} • {shortDate(selectedDate)} • {selectedSlot}</div></div><Button onclick={() => checkoutOpen = true}>Lanjut checkout <ChevronRight size={14}/></Button></div></div></Card>
            </div>
          </div>
        </section>
      {:else if view === 'user-bookings'}
        <section class="space-y-4"><div class="motion-in flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div class="text-[9px] font-black uppercase tracking-[.15em] text-emerald-700">Riwayat booking</div><h1 class="mt-1 text-2xl font-black tracking-tight">Booking saya</h1></div><Button size="sm" onclick={() => go('booking')}><Plus size={14}/> Booking baru</Button></div><div class="grid gap-3">{#each bookings.filter((b) => b.customer === 'Rayhandi Tenri') as booking}<Card class="motion-in p-5"><div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div class="flex flex-wrap items-center gap-2"><Badge tone={statusTone(booking.status)}>{booking.status}</Badge><Badge tone={paymentTone(booking.payment)}>{booking.payment}</Badge></div><h2 class="mt-2 text-sm font-black">{booking.venueName}</h2><div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-slate-400"><span>{booking.id}</span><span>{booking.date}</span><span>{booking.time} • {booking.duration} jam</span></div></div><div class="flex items-center gap-2"><div class="mr-2"><div class="text-[9px] text-slate-400">Total</div><div class="text-sm font-black">{rupiah(booking.total)}</div></div>{#if booking.payment === 'UNPAID' || booking.payment === 'REJECTED'}<Button size="sm" onclick={() => openPayment(booking.id)}>Upload bukti</Button>{:else}<Button variant="outline" size="sm"><Receipt size={13}/> Invoice</Button>{/if}</div></div></Card>{/each}</div></section>
      {:else if view === 'transactions'}
        <section class="space-y-4"><div class="motion-in"><div class="text-[9px] font-black uppercase tracking-[.15em] text-emerald-700">Keuangan</div><h1 class="mt-1 text-2xl font-black">Transaksi</h1></div><Card class="motion-in overflow-x-auto p-2"><table class="w-full min-w-[720px] border-collapse text-left"><thead><tr class="text-[8px] uppercase tracking-wider text-slate-400"><th class="p-3">Booking</th><th class="p-3">Lapangan</th><th class="p-3">Tanggal</th><th class="p-3">Total</th><th class="p-3">Payment</th></tr></thead><tbody>{#each bookings.filter((b) => b.customer === 'Rayhandi Tenri') as booking}<tr class="border-t border-slate-100 text-[10px]"><td class="p-3 font-bold">{booking.id}</td><td class="p-3">{booking.venueName}</td><td class="p-3">{booking.date}</td><td class="p-3 font-bold">{rupiah(booking.total)}</td><td class="p-3"><Badge tone={paymentTone(booking.payment)}>{booking.payment}</Badge></td></tr>{/each}</tbody></table></Card></section>
      {:else if view === 'admin-home'}
        <section class="space-y-5"><div class="motion-in flex items-end justify-between"><div><div class="text-[9px] font-black uppercase tracking-[.15em] text-emerald-700">Operasional</div><h1 class="mt-1 text-2xl font-black">Dashboard admin</h1></div><Button size="sm" onclick={() => go('verification')}><ShieldCheck size={14}/> Verifikasi pembayaran</Button></div><div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Card class="motion-in p-4"><div class="text-[9px] font-bold uppercase text-slate-400">Total booking</div><div class="mt-2 text-2xl font-black">{bookings.length}</div></Card><Card class="motion-in p-4"><div class="text-[9px] font-bold uppercase text-slate-400">Perlu verifikasi</div><div class="mt-2 text-2xl font-black text-amber-600">{pendingProofs.length}</div></Card><Card class="motion-in p-4"><div class="text-[9px] font-bold uppercase text-slate-400">Paid</div><div class="mt-2 text-2xl font-black text-emerald-700">{bookings.filter((b) => b.payment === 'PAID').length}</div></Card><Card class="motion-in p-4"><div class="text-[9px] font-bold uppercase text-slate-400">Payment issue</div><div class="mt-2 text-2xl font-black text-rose-600">{bookings.filter((b) => b.payment === 'REJECTED').length}</div></Card></div></section>
      {:else if view === 'verification'}
        <section class="space-y-4"><div class="motion-in"><div class="text-[9px] font-black uppercase tracking-[.15em] text-emerald-700">Payment review</div><h1 class="mt-1 text-2xl font-black">Verifikasi pembayaran</h1></div><div class="grid gap-3">{#if pendingProofs.length}{#each pendingProofs as booking}<Card class="motion-in p-5"><div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div class="flex gap-3"><div class="grid size-11 place-items-center rounded-2xl bg-amber-50 text-amber-600"><ImageIcon size={18}/></div><div><div class="flex flex-wrap gap-2"><Badge tone="warning">REVIEW</Badge>{#if booking.proofDuplicate}<Badge tone="danger">DUPLICATE</Badge>{/if}{#if booking.proofAmountMatch}<Badge tone="success">NOMINAL COCOK</Badge>{:else}<Badge tone="danger">NOMINAL BEDA</Badge>{/if}</div><h2 class="mt-2 text-sm font-black">{booking.customer} • {booking.id}</h2></div></div><div class="flex items-center gap-2"><Button variant="outline" size="sm" onclick={() => reviewBooking(booking.id)}><Eye size={13}/> Review</Button><Button size="sm" onclick={() => approvePayment(booking.id)}><CheckCircle size={13}/> Approve</Button></div></div></Card>{/each}{:else}<Card class="motion-in p-10 text-center"><CheckCircle size={28} class="mx-auto text-emerald-500"/><h2 class="mt-3 text-sm font-black">Antrean bersih</h2></Card>{/if}</div></section>
      {:else if view === 'admin-bookings'}
        <section class="space-y-4"><div class="motion-in"><div class="text-[9px] font-black uppercase tracking-[.15em] text-emerald-700">Manajemen</div><h1 class="mt-1 text-2xl font-black">Semua booking</h1></div><Card class="motion-in overflow-x-auto p-2"><table class="w-full min-w-[850px] border-collapse text-left"><thead><tr class="text-[8px] uppercase tracking-wider text-slate-400"><th class="p-3">Booking</th><th class="p-3">Customer</th><th class="p-3">Lapangan</th><th class="p-3">Jadwal</th><th class="p-3">Total</th><th class="p-3">Payment</th></tr></thead><tbody>{#each bookings as booking}<tr class="border-t border-slate-100 text-[10px]"><td class="p-3 font-black">{booking.id}</td><td class="p-3">{booking.customer}</td><td class="p-3">{booking.venueName}</td><td class="p-3">{booking.date} • {booking.time}</td><td class="p-3 font-bold">{rupiah(booking.total)}</td><td class="p-3"><Badge tone={paymentTone(booking.payment)}>{booking.payment}</Badge></td></tr>{/each}</tbody></table></Card></section>
      {:else if view === 'equipment'}
        <section class="space-y-4"><div class="motion-in"><div class="text-[9px] font-black uppercase tracking-[.15em] text-emerald-700">Inventory</div><h1 class="mt-1 text-2xl font-black">Perlengkapan</h1></div><div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{#each equipmentCatalog as item}<Card class="motion-in p-5"><div class="flex items-start justify-between"><div class="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Package size={17}/></div><Badge tone={item.stock < 6 ? 'warning' : 'success'}>{item.stock} unit</Badge></div><h2 class="mt-4 text-sm font-black">{item.name}</h2><div class="mt-1 text-[10px] text-slate-400">{rupiah(item.price)} / booking</div></Card>{/each}</div></section>
      {:else if view === 'penalty'}
        <section class="space-y-4"><div class="motion-in"><div class="text-[9px] font-black uppercase tracking-[.15em] text-emerald-700">Policy engine</div><h1 class="mt-1 text-2xl font-black">Denda adaptif</h1></div><div class="grid gap-4 lg:grid-cols-2"><Card class="motion-in p-5"><div class="flex items-center justify-between"><div><div class="text-[9px] font-bold uppercase text-slate-400">Denda keterlambatan</div><h2 class="mt-1 text-base font-black">Global policy</h2></div><button aria-label="Aktifkan atau nonaktifkan denda" onclick={() => penaltyEnabled = !penaltyEnabled} class={`relative h-8 w-14 rounded-full transition ${penaltyEnabled ? 'bg-emerald-400' : 'bg-slate-200'}`}><span class={`absolute top-1 size-6 rounded-full bg-white shadow transition ${penaltyEnabled ? 'left-7' : 'left-1'}`}></span></button></div><div class="mt-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1"><button onclick={() => penaltyMode = 'adaptive'} class={`rounded-lg py-2 text-[10px] font-bold ${penaltyMode === 'adaptive' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400'}`}>Otomatis adaptif</button><button onclick={() => penaltyMode = 'manual'} class={`rounded-lg py-2 text-[10px] font-bold ${penaltyMode === 'manual' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400'}`}>Manual admin</button></div></Card><Card class="motion-in bg-arena-950 p-5 text-white"><div class="text-[9px] font-black uppercase tracking-wider text-emerald-300">Contoh keputusan</div><h2 class="mt-1 text-base font-black">19:00–20:00 → selesai 20:17</h2><p class="mt-3 text-[10px] leading-5 text-white/45">Ada booking berikutnya mulai pukul 20:00. Sistem membuat kandidat denda hanya jika jadwal berikutnya terdampak.</p></Card></div></section>
      {/if}
    </div>
  </main>

  <nav class="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-2xl backdrop-blur lg:hidden">{#if role === 'user'}<button onclick={() => go('user-home')} class={`grid place-items-center gap-1 rounded-xl py-2 text-[8px] font-bold ${view === 'user-home' ? 'bg-arena-900 text-white' : 'text-slate-400'}`}><Home size={14}/>Home</button><button onclick={() => go('booking')} class={`grid place-items-center gap-1 rounded-xl py-2 text-[8px] font-bold ${view === 'booking' ? 'bg-arena-900 text-white' : 'text-slate-400'}`}><CalendarDays size={14}/>Booking</button><button onclick={() => go('user-bookings')} class={`grid place-items-center gap-1 rounded-xl py-2 text-[8px] font-bold ${view === 'user-bookings' ? 'bg-arena-900 text-white' : 'text-slate-400'}`}><ClipboardList size={14}/>Saya</button><button onclick={() => setRole('admin')} class="grid place-items-center gap-1 rounded-xl py-2 text-[8px] font-bold text-slate-400"><ShieldCheck size={14}/>Admin</button>{:else}<button onclick={() => go('admin-home')} class={`grid place-items-center gap-1 rounded-xl py-2 text-[8px] font-bold ${view === 'admin-home' ? 'bg-arena-900 text-white' : 'text-slate-400'}`}><LayoutDashboard size={14}/>Admin</button><button onclick={() => go('verification')} class={`grid place-items-center gap-1 rounded-xl py-2 text-[8px] font-bold ${view === 'verification' ? 'bg-arena-900 text-white' : 'text-slate-400'}`}><ShieldCheck size={14}/>Verify</button><button onclick={() => go('admin-bookings')} class={`grid place-items-center gap-1 rounded-xl py-2 text-[8px] font-bold ${view === 'admin-bookings' ? 'bg-arena-900 text-white' : 'text-slate-400'}`}><ClipboardList size={14}/>Booking</button><button onclick={() => setRole('user')} class="grid place-items-center gap-1 rounded-xl py-2 text-[8px] font-bold text-slate-400"><Home size={14}/>User</button>{/if}</nav>
</div>

{#if checkoutOpen}
  <div class="fixed inset-0 z-50 bg-arena-950/55 backdrop-blur-[2px]" onclick={() => checkoutOpen = false}></div>
  <div class="fixed inset-y-0 right-0 z-[60] w-full max-w-[470px] overflow-y-auto bg-[#fbfdfc] p-5 shadow-2xl sm:p-7"><div class="flex items-start justify-between"><div><div class="text-[9px] font-black uppercase tracking-[.14em] text-emerald-700">Checkout</div><h2 class="mt-1 text-xl font-black">Selesaikan booking</h2><p class="mt-1 text-[10px] text-slate-400">Lengkapi identitas sebelum slot ditahan.</p></div><button aria-label="Tutup checkout" onclick={() => checkoutOpen = false} class="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"><X size={15}/></button></div><div class="mt-5 rounded-2xl bg-arena-950 p-4 text-white"><div class="flex items-center justify-between"><div><div class="text-[9px] text-white/40">{selectedVenue.name}</div><div class="mt-1 text-xs font-bold capitalize">{selectedDateLabel} • {selectedSlot}</div></div><div class="text-right"><div class="text-[8px] text-white/35">Durasi</div><div class="mt-1 text-xs font-black">{duration} jam</div></div></div></div><div class="mt-5 grid gap-3"><label class="text-[9px] font-bold text-slate-500">Nama lengkap<input bind:value={customerName} class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-400"/></label><label class="text-[9px] font-bold text-slate-500">WhatsApp<input bind:value={customerPhone} placeholder="08xxxxxxxxxx" class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-400"/></label><label class="text-[9px] font-bold text-slate-500">Alamat<textarea bind:value={customerAddress} rows="3" class="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-emerald-400"></textarea></label></div><div class="mt-5"><div class="text-[9px] font-black uppercase tracking-wider text-slate-400">Durasi booking</div><div class="mt-2 flex gap-2">{#each [1,2,3,4] as hours}<button onclick={() => duration = hours} class={`rounded-xl border px-3 py-2 text-[10px] font-bold ${duration === hours ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>{hours} jam</button>{/each}</div></div><div class="mt-5"><div class="text-[9px] font-black uppercase tracking-wider text-slate-400">Perlengkapan</div><div class="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">{#each equipmentCatalog as item}<div class="flex items-center gap-3 border-b border-slate-100 p-3 last:border-0"><div class="grid size-9 place-items-center rounded-xl bg-slate-50 text-slate-500"><Package size={14}/></div><div class="min-w-0 flex-1"><div class="text-[10px] font-bold">{item.name}</div><div class="mt-0.5 text-[8px] text-slate-400">{rupiah(item.price)} • stok {item.stock}</div></div><div class="flex items-center gap-1"><button aria-label={`Kurangi ${item.name}`} onclick={() => adjustEquipment(item.id,-1)} class="grid size-7 place-items-center rounded-lg border border-slate-200"><Minus size={11}/></button><span class="w-6 text-center text-[10px] font-black">{equipmentQty[item.id] ?? 0}</span><button aria-label={`Tambah ${item.name}`} onclick={() => adjustEquipment(item.id,1)} class="grid size-7 place-items-center rounded-lg border border-slate-200"><Plus size={11}/></button></div></div>{/each}</div></div><div class="mt-5 space-y-2 border-t border-slate-200 pt-4 text-[10px]"><div class="flex justify-between text-slate-500"><span>Lapangan</span><b class="text-slate-800">{rupiah(venueSubtotal)}</b></div><div class="flex justify-between text-slate-500"><span>Perlengkapan</span><b class="text-slate-800">{rupiah(equipmentSubtotal)}</b></div><div class="flex justify-between border-t border-dashed border-slate-200 pt-3"><span class="font-bold">Total</span><b class="text-lg font-black text-emerald-700">{rupiah(bookingTotal)}</b></div></div><Button class="mt-5 w-full" size="lg" onclick={createBooking}>Buat booking & lanjut bayar <ChevronRight size={14}/></Button></div>
{/if}

{#if paymentOpen}
  <div class="fixed inset-0 z-50 bg-arena-950/55 backdrop-blur-[2px]" onclick={() => paymentOpen = false}></div>
  <div class="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-24px)] max-w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-[#fbfdfc] p-5 shadow-2xl sm:p-7"><div class="flex items-start justify-between"><div><div class="text-[9px] font-black uppercase tracking-[.14em] text-emerald-700">Pembayaran manual</div><h2 class="mt-1 text-xl font-black">Upload bukti transfer</h2><p class="mt-1 text-[10px] text-slate-400">Bukti tidak otomatis dianggap lunas.</p></div><button aria-label="Tutup pembayaran" onclick={() => paymentOpen = false} class="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"><X size={15}/></button></div>{#if selectedPaymentBooking}<div class="mt-5 grid gap-3 sm:grid-cols-2"><div class="rounded-2xl bg-arena-950 p-4 text-white"><div class="text-[8px] uppercase tracking-wider text-white/35">Total invoice</div><div class="mt-1 text-xl font-black text-emerald-300">{rupiah(selectedPaymentBooking.total)}</div></div><div class="rounded-2xl border border-slate-200 bg-white p-4"><div class="text-[8px] uppercase tracking-wider text-slate-400">Transfer ke</div><div class="mt-1 text-xs font-black">BCA • 1234567890</div></div></div><div class="mt-4 grid gap-3 sm:grid-cols-2"><label class="text-[9px] font-bold text-slate-500">Nominal transfer<input type="number" bind:value={transferAmount} class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-400"/></label><label class="text-[9px] font-bold text-slate-500">Nomor referensi<input bind:value={transferReference} class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-400"/></label></div><label class="mt-3 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center"><Upload size={20} class="text-emerald-600"/><span class="mt-2 text-[10px] font-bold">{proofFile ? proofFile.name : 'Pilih screenshot bukti transfer'}</span><input class="hidden" type="file" accept="image/png,image/jpeg,image/webp" onchange={handleProofFile}/></label><Button class="mt-4 w-full" size="lg" onclick={submitProof}><Upload size={14}/> Kirim untuk verifikasi admin</Button>{/if}</div>
{/if}

{#if reviewOpen && selectedReviewBooking}
  <div class="fixed inset-0 z-50 bg-arena-950/55 backdrop-blur-[2px]" onclick={() => reviewOpen = false}></div>
  <div class="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-24px)] max-w-[590px] -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-[#fbfdfc] p-5 shadow-2xl sm:p-7"><div class="flex items-start justify-between"><div><div class="text-[9px] font-black uppercase tracking-[.14em] text-emerald-700">Admin review</div><h2 class="mt-1 text-xl font-black">Verifikasi bukti</h2></div><button aria-label="Tutup review" onclick={() => reviewOpen = false} class="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"><X size={15}/></button></div><div class="mt-5 rounded-2xl bg-arena-950 p-4 text-white"><div class="flex justify-between"><div><div class="text-[9px] text-white/40">{selectedReviewBooking.id}</div><div class="mt-1 text-sm font-black">{selectedReviewBooking.customer}</div></div><div class="text-right"><div class="text-[8px] text-white/35">Invoice</div><div class="mt-1 text-lg font-black text-emerald-300">{rupiah(selectedReviewBooking.total)}</div></div></div></div><div class="mt-4 grid gap-2 sm:grid-cols-2"><div class={`rounded-2xl border p-3 ${selectedReviewBooking.proofAmountMatch ? 'border-emerald-100 bg-emerald-50' : 'border-rose-100 bg-rose-50'}`}><div class="text-[8px] uppercase text-slate-400">Nominal bukti</div><div class="mt-1 text-xs font-black">{rupiah(selectedReviewBooking.proofAmount ?? 0)}</div></div><div class={`rounded-2xl border p-3 ${selectedReviewBooking.proofDuplicate ? 'border-rose-100 bg-rose-50' : 'border-emerald-100 bg-emerald-50'}`}><div class="text-[8px] uppercase text-slate-400">Fingerprint</div><div class="mt-1 text-xs font-black">{selectedReviewBooking.proofDuplicate ? 'Duplikat terdeteksi' : 'Tidak ditemukan duplikat'}</div></div></div><div class="mt-4 grid grid-cols-2 gap-2"><Button variant="danger" onclick={() => rejectPayment(selectedReviewBooking.id)}><X size={14}/> Tolak</Button><Button onclick={() => approvePayment(selectedReviewBooking.id)}><CheckCircle size={14}/> Dana masuk — Approve</Button></div></div>
{/if}

{#if flash}<div class="fixed bottom-20 right-4 z-[80] max-w-[320px] rounded-2xl bg-arena-950 px-4 py-3 text-[10px] font-semibold text-white shadow-2xl lg:bottom-5"><div class="flex items-center gap-2"><CheckCircle size={14} class="text-emerald-400"/>{flash}</div></div>{/if}
