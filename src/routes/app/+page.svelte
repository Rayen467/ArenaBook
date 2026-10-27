<script lang="ts">
  import { onMount } from 'svelte';
  import { goto, invalidateAll } from '$app/navigation';
  import {
    CalendarDays, ClipboardList, Wallet, LayoutDashboard, ShieldCheck, Package,
    AlertTriangle, Bell, MapPin, Users, ChevronRight, ChevronLeft, CheckCircle,
    Upload, X, Plus, Minus, Eye, Receipt, Settings, LogOut, CreditCard,
    Image as ImageIcon, RefreshCw, UserRound, Save, Banknote
  } from '@lucide/svelte';
  import Button from '$lib/components/ui/button/Button.svelte';
  import Card from '$lib/components/ui/card/Card.svelte';
  import Badge from '$lib/components/ui/badge/Badge.svelte';
  import { rupiah } from '$lib/utils';

  let { data } = $props();

  type Venue = {
    id: string; name: string; type: string; surface: string | null; description: string | null;
    price_per_hour: number; capacity_min: number; capacity_max: number;
    open_time: string; close_time: string; active: boolean;
  };
  type Equipment = {
    id: string; name: string; price_per_booking: number; stock_total: number;
    stock_damaged: number; active: boolean;
  };
  type Proof = {
    id: string; original_filename: string; declared_amount: number; reference_number: string;
    sha256: string; is_duplicate: boolean; amount_matches: boolean; status: string; created_at: string;
  };
  type Booking = {
    id: string; booking_code: string; user_id: string; venue_id: string; starts_at: string; ends_at: string;
    customer_name: string; customer_phone: string; customer_address: string;
    venue_subtotal: number; equipment_subtotal: number; total_amount: number;
    status: string; payment_status: string; expires_at: string | null; created_at: string;
    venue?: { id: string; name: string; type: string; surface: string | null; price_per_hour: number } | null;
    booking_equipment?: Array<{ equipment_id: string; quantity: number; unit_price: number; subtotal: number; equipment?: { id: string; name: string } | null }>;
    payment_proofs?: Proof[];
  };
  type Availability = { starts_at: string; ends_at: string; state: 'booked' | 'pending' };
  type CalendarCell = { key: string; date: Date; day: number; inCurrentMonth: boolean; isToday: boolean; isPast: boolean };

  const venues = $derived((data.venues ?? []) as Venue[]);
  const equipment = $derived((data.equipment ?? []) as Equipment[]);
  const bookings = $derived((data.bookings ?? []) as Booking[]);
  const profile = $derived((data.profile ?? null) as any);
  const user = $derived((data.user ?? null) as any);
  const isAdmin = $derived(profile?.role === 'ADMIN');
  const myBookings = $derived(user ? bookings.filter((booking) => booking.user_id === user.id) : []);
  const reviewQueue = $derived(isAdmin ? bookings.filter((booking) => booking.payment_status === 'PROOF_SUBMITTED') : []);

  const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const weekdayLabels = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
  const slotTimes = Array.from({ length: 15 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [todayYear, todayMonth] = todayKey.split('-').map(Number);

  let view = $state(isAdmin ? 'admin-home' : 'booking');
  let selectedVenueId = $state(venues[0]?.id ?? '');
  let selectedSport = $state('Semua');
  const visibleVenues = $derived(selectedSport === 'Semua' ? venues : venues.filter((venue) => venue.type === selectedSport));
  let selectedDate = $state(todayKey);
  let calendarYear = $state(todayYear);
  let calendarMonth = $state(todayMonth - 1);
  let selectedSlot = $state('19:00');
  let duration = $state(2);
  let availability = $state<Availability[]>([]);
  let availabilityBusy = $state(false);
  let checkoutOpen = $state(false);
  let paymentOpen = $state(false);
  let reviewOpen = $state(false);
  let reviewSignedUrl = $state('');
  let reviewProof = $state<Proof | null>(null);
  let selectedReviewBooking = $state<Booking | null>(null);
  let selectedPaymentBooking = $state<Booking | null>(null);
  let equipmentQty = $state<Record<string, number>>({});
  let customerName = $state(profile?.full_name ?? '');
  let customerPhone = $state(profile?.phone ?? '');
  let customerAddress = $state(profile?.address ?? '');
  let transferAmount = $state<number | null>(null);
  let transferReference = $state('');
  let proofFile = $state<File | null>(null);
  let busy = $state(false);
  let flash = $state('');

  let bankName = $state((data.paymentSettings as any)?.bank_name ?? '');
  let accountNumber = $state((data.paymentSettings as any)?.account_number ?? '');
  let accountName = $state((data.paymentSettings as any)?.account_name ?? '');
  let paymentInstructions = $state((data.paymentSettings as any)?.instructions ?? '');

  let penaltyEnabled = $state(Boolean((data.penaltyRule as any)?.enabled ?? true));
  let penaltyMode = $state<'ADAPTIVE' | 'MANUAL'>((data.penaltyRule as any)?.mode === 'MANUAL' ? 'MANUAL' : 'ADAPTIVE');
  let toleranceMinutes = $state(Number((data.penaltyRule as any)?.tolerance_minutes ?? 10));
  let intervalMinutes = $state(Number((data.penaltyRule as any)?.interval_minutes ?? 10));
  let amountPerInterval = $state(Number((data.penaltyRule as any)?.amount_per_interval ?? 10000));
  let maxPenalty = $state(Number((data.penaltyRule as any)?.max_amount ?? 100000));

  const selectedVenue = $derived(venues.find((venue) => venue.id === selectedVenueId) ?? venues[0]);
  const calendarCells = $derived(makeCalendar(calendarYear, calendarMonth));
  const selectedDateLabel = $derived(formatLongDate(selectedDate));
  const venueSubtotal = $derived(selectedVenue ? selectedVenue.price_per_hour * duration : 0);
  const equipmentSubtotal = $derived(equipment.reduce((sum, item) => sum + item.price_per_booking * (equipmentQty[item.id] ?? 0), 0));
  const bookingTotal = $derived(venueSubtotal + equipmentSubtotal);
  const paymentConfigured = $derived(Boolean((data.paymentSettings as any)?.bank_name && (data.paymentSettings as any)?.account_number));

  onMount(() => {
    if (selectedVenueId) loadAvailability();
  });

  function notify(message: string) {
    flash = message;
    window.setTimeout(() => { if (flash === message) flash = ''; }, 3600);
  }

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
      return { key, date, day: date.getDate(), inCurrentMonth: date.getMonth() === month, isToday: key === todayKey, isPast: key < todayKey };
    });
  }

  function formatLongDate(key: string) {
    const [y, m, d] = key.split('-').map(Number);
    return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(y, m - 1, d, 5)));
  }

  function formatBookingDate(value: string) {
    return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }

  function prevMonth() {
    if (calendarMonth === 0) { calendarMonth = 11; calendarYear -= 1; }
    else calendarMonth -= 1;
  }

  function nextMonth() {
    if (calendarMonth === 11) { calendarMonth = 0; calendarYear += 1; }
    else calendarMonth += 1;
  }

  async function selectDate(cell: CalendarCell) {
    if (cell.isPast) return;
    selectedDate = cell.key;
    if (!cell.inCurrentMonth) {
      calendarYear = cell.date.getFullYear();
      calendarMonth = cell.date.getMonth();
    }
    await loadAvailability();
  }

  async function selectVenue(id: string) {
    selectedVenueId = id;
    equipmentQty = {};
    await loadAvailability();
  }

  async function loadAvailability() {
    if (!selectedVenueId) return;
    availabilityBusy = true;
    try {
      const response = await fetch(`/api/availability?venue_id=${encodeURIComponent(selectedVenueId)}&date=${selectedDate}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Gagal mengambil jadwal.');
      availability = result.slots ?? [];
      const firstFree = slotTimes.find((time) => slotState(time, duration) === 'free');
      if (firstFree && slotState(selectedSlot, duration) !== 'free') selectedSlot = firstFree;
    } catch (error) {
      availability = [];
      notify(error instanceof Error ? error.message : 'Gagal mengambil jadwal.');
    } finally {
      availabilityBusy = false;
    }
  }

  function minutes(value: string) {
    const [h, m] = value.slice(0, 5).split(':').map(Number);
    return h * 60 + m;
  }

  function slotState(time: string, hours = duration): 'free' | 'booked' | 'pending' | 'closed' {
    if (!selectedVenue) return 'closed';
    const startMinutes = minutes(time);
    const endMinutes = startMinutes + hours * 60;
    if (startMinutes < minutes(selectedVenue.open_time) || endMinutes > minutes(selectedVenue.close_time)) return 'closed';

    const candidateStart = new Date(`${selectedDate}T${time}:00+07:00`).getTime();
    if (candidateStart <= Date.now()) return 'closed';
    const candidateEnd = candidateStart + hours * 60 * 60 * 1000;
    let state: 'free' | 'booked' | 'pending' = 'free';
    for (const item of availability) {
      const starts = new Date(item.starts_at).getTime();
      const ends = new Date(item.ends_at).getTime();
      if (candidateStart < ends && candidateEnd > starts) {
        if (item.state === 'booked') return 'booked';
        state = 'pending';
      }
    }
    return state;
  }

  function adjustEquipment(id: string, delta: number) {
    const item = equipment.find((entry) => entry.id === id);
    if (!item) return;
    const available = Math.max(0, item.stock_total - item.stock_damaged);
    equipmentQty[id] = Math.max(0, Math.min(available, (equipmentQty[id] ?? 0) + delta));
  }

  async function startCheckout() {
    if (!user) {
      await goto('/auth/login');
      return;
    }
    if (availabilityBusy || slotState(selectedSlot, duration) !== 'free') {
      notify('Slot atau durasi yang dipilih sudah tidak tersedia.');
      await loadAvailability();
      return;
    }
    checkoutOpen = true;
  }

  async function createBooking() {
    if (!user) return goto('/auth/login');
    if (!selectedVenue || !customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      notify('Lengkapi data pemesan terlebih dahulu.');
      return;
    }
    busy = true;
    try {
      const payload = {
        venueId: selectedVenue.id,
        startsAt: new Date(`${selectedDate}T${selectedSlot}:00+07:00`).toISOString(),
        durationMinutes: duration * 60,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        equipment: equipment
          .filter((item) => (equipmentQty[item.id] ?? 0) > 0)
          .map((item) => ({ equipment_id: item.id, qty: equipmentQty[item.id] }))
      };
      const response = await fetch('/api/bookings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Booking gagal dibuat.');

      selectedPaymentBooking = {
        id: result.booking.id,
        booking_code: result.booking.booking_code,
        user_id: user.id,
        venue_id: selectedVenue.id,
        starts_at: result.booking.starts_at,
        ends_at: result.booking.ends_at,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        venue_subtotal: venueSubtotal,
        equipment_subtotal: equipmentSubtotal,
        total_amount: result.booking.total_amount,
        status: result.booking.status,
        payment_status: result.booking.payment_status,
        expires_at: result.booking.expires_at,
        created_at: new Date().toISOString(),
        venue: { id: selectedVenue.id, name: selectedVenue.name, type: selectedVenue.type, surface: selectedVenue.surface, price_per_hour: selectedVenue.price_per_hour }
      };
      transferAmount = result.booking.total_amount;
      transferReference = '';
      proofFile = null;
      checkoutOpen = false;
      paymentOpen = true;
      await invalidateAll();
      await loadAvailability();
      notify(`Booking ${result.booking.booking_code} dibuat dan slot ditahan 30 menit.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Booking gagal dibuat.');
      await loadAvailability();
    } finally {
      busy = false;
    }
  }

  function openPayment(booking: Booking) {
    selectedPaymentBooking = booking;
    transferAmount = booking.total_amount;
    transferReference = '';
    proofFile = null;
    paymentOpen = true;
  }

  async function submitProof() {
    if (!selectedPaymentBooking || !proofFile || !transferAmount || !transferReference.trim()) {
      notify('Bukti transfer, nominal, dan nomor referensi wajib diisi.');
      return;
    }
    if (!paymentConfigured) {
      notify('Rekening pembayaran belum dikonfigurasi admin.');
      return;
    }
    busy = true;
    try {
      const form = new FormData();
      form.set('booking_id', selectedPaymentBooking.id);
      form.set('declared_amount', String(transferAmount));
      form.set('reference_number', transferReference.trim());
      form.set('proof', proofFile);
      const response = await fetch('/api/payments/proof', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Bukti gagal dikirim.');
      paymentOpen = false;
      await invalidateAll();
      await loadAvailability();
      notify(result.proof?.is_duplicate ? 'Bukti diterima, tapi fingerprint duplikat terdeteksi. Admin akan memeriksa.' : 'Bukti pembayaran masuk ke antrean admin.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Bukti gagal dikirim.');
    } finally {
      busy = false;
    }
  }

  async function openReview(booking: Booking) {
    if (!isAdmin) return;
    busy = true;
    try {
      const response = await fetch(`/api/admin/payments/${booking.id}/proof-url`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Bukti tidak dapat dibuka.');
      selectedReviewBooking = booking;
      reviewProof = result.proof;
      reviewSignedUrl = result.signedUrl;
      reviewOpen = true;
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Bukti tidak dapat dibuka.');
    } finally {
      busy = false;
    }
  }

  async function reviewPayment(approve: boolean) {
    if (!selectedReviewBooking) return;
    busy = true;
    try {
      const response = await fetch(`/api/admin/payments/${selectedReviewBooking.id}/review`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ approve })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Review gagal.');
      reviewOpen = false;
      await invalidateAll();
      await loadAvailability();
      notify(approve ? `${result.booking.booking_code} sudah PAID dan CONFIRMED.` : `${result.booking.booking_code} ditolak dan masuk PAYMENT_ISSUE.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Review gagal.');
    } finally {
      busy = false;
    }
  }

  async function savePaymentSettings() {
    busy = true;
    try {
      const response = await fetch('/api/admin/payment-settings', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bankName, accountNumber, accountName, instructions: paymentInstructions })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Pengaturan pembayaran gagal disimpan.');
      await invalidateAll();
      notify('Pengaturan rekening pembayaran tersimpan.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Pengaturan pembayaran gagal disimpan.');
    } finally { busy = false; }
  }

  async function savePenaltyRule() {
    busy = true;
    try {
      const response = await fetch('/api/admin/penalty-rules', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ penaltyEnabled, mode: penaltyMode, toleranceMinutes, intervalMinutes, amountPerInterval, maxAmount: maxPenalty })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Aturan denda gagal disimpan.');
      await invalidateAll();
      notify('Aturan denda tersimpan.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Aturan denda gagal disimpan.');
    } finally { busy = false; }
  }

  function statusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
    if (['CONFIRMED','COMPLETED','CHECKED_IN','PLAYING'].includes(status)) return 'success';
    if (['PAYMENT_ISSUE','CANCELLED'].includes(status)) return 'danger';
    if (['PENDING_VERIFICATION','AWAITING_PAYMENT'].includes(status)) return 'warning';
    return 'neutral';
  }

  function paymentTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
    if (status === 'PAID') return 'success';
    if (['REJECTED','EXPIRED'].includes(status)) return 'danger';
    if (['PROOF_SUBMITTED','PENDING'].includes(status)) return 'warning';
    return 'neutral';
  }
</script>

<svelte:head>
  <title>ArenaBook — Booking Lapangan</title>
  <meta name="description" content="Booking lapangan, perlengkapan, pembayaran, dan operasional admin dalam satu sistem." />
</svelte:head>

<div class="app-shell min-h-screen text-slate-950">
  <aside class="arena-sidebar fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col border-r border-white/[.04] text-white lg:flex">
    <div class="flex h-[76px] items-center gap-3 border-b border-white/8 px-5">
      <div class="grid size-10 place-items-center rounded-2xl bg-emerald-400 font-black text-emerald-950">A</div>
      <div><div class="text-base font-black tracking-[-.02em]">ArenaBook</div><div class="text-xs font-semibold text-white/35">Booking & operations</div></div>
    </div>
    <nav class="mt-5 flex-1 space-y-1 px-3">
      <div class="mb-2 px-3 text-[11px] font-black uppercase tracking-[.16em] text-white/25">Booking</div>
      <button onclick={() => view = 'booking'} class={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${view === 'booking' ? 'bg-emerald-300/12 text-emerald-100 ring-1 ring-inset ring-emerald-300/10' : 'text-white/50 hover:bg-white/[.06] hover:text-white/85'}`}><CalendarDays size={16}/> Booking</button>
      {#if user}
        <button onclick={() => view = 'my-bookings'} class={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${view === 'my-bookings' ? 'bg-emerald-300/12 text-emerald-100 ring-1 ring-inset ring-emerald-300/10' : 'text-white/50 hover:bg-white/[.06] hover:text-white/85'}`}><ClipboardList size={16}/> Booking Saya</button>
        <button onclick={() => view = 'transactions'} class={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${view === 'transactions' ? 'bg-emerald-300/12 text-emerald-100 ring-1 ring-inset ring-emerald-300/10' : 'text-white/50 hover:bg-white/[.06] hover:text-white/85'}`}><Wallet size={16}/> Transaksi</button>
      {/if}
      {#if isAdmin}
        <div class="mb-2 mt-6 px-3 text-[11px] font-black uppercase tracking-[.16em] text-white/25">Admin</div>
        <button onclick={() => view = 'admin-home'} class={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${view === 'admin-home' ? 'bg-emerald-300/12 text-emerald-100 ring-1 ring-inset ring-emerald-300/10' : 'text-white/50 hover:bg-white/[.06] hover:text-white/85'}`}><LayoutDashboard size={16}/> Overview</button>
        <button onclick={() => view = 'verification'} class={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold ${view === 'verification' ? 'bg-emerald-300/12 text-emerald-100 ring-1 ring-inset ring-emerald-300/10' : 'text-white/50 hover:bg-white/[.06] hover:text-white/85'}`}><span class="flex items-center gap-3"><ShieldCheck size={16}/> Verifikasi</span>{#if reviewQueue.length}<span class="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-black text-amber-950">{reviewQueue.length}</span>{/if}</button>
        <button onclick={() => view = 'admin-bookings'} class={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${view === 'admin-bookings' ? 'bg-emerald-300/12 text-emerald-100 ring-1 ring-inset ring-emerald-300/10' : 'text-white/50 hover:bg-white/[.06] hover:text-white/85'}`}><ClipboardList size={16}/> Semua Booking</button>
        <button onclick={() => view = 'equipment'} class={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${view === 'equipment' ? 'bg-emerald-300/12 text-emerald-100 ring-1 ring-inset ring-emerald-300/10' : 'text-white/50 hover:bg-white/[.06] hover:text-white/85'}`}><Package size={16}/> Perlengkapan</button>
        <button onclick={() => view = 'payment-settings'} class={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${view === 'payment-settings' ? 'bg-emerald-300/12 text-emerald-100 ring-1 ring-inset ring-emerald-300/10' : 'text-white/50 hover:bg-white/[.06] hover:text-white/85'}`}><Banknote size={16}/> Pembayaran</button>
        <button onclick={() => view = 'penalty'} class={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${view === 'penalty' ? 'bg-emerald-300/12 text-emerald-100 ring-1 ring-inset ring-emerald-300/10' : 'text-white/50 hover:bg-white/[.06] hover:text-white/85'}`}><AlertTriangle size={16}/> Denda</button>
      {/if}
    </nav>
    <div class="p-4">
      <div class="rounded-2xl border border-emerald-400/10 bg-emerald-400/[.04] p-3">
        <div class="flex items-center gap-2 text-xs font-bold text-emerald-300"><span class="size-1.5 rounded-full bg-emerald-400"></span> Live system</div>
        <p class="mt-1.5 text-[11px] leading-4 text-white/35">Database, auth, dan bukti pembayaran aktif.</p>
      </div>
    </div>
  </aside>

  <main class="min-h-screen pb-24 lg:pb-0 lg:pl-[272px]">
    <header class="arena-topbar sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200/70 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div><div class="text-[11px] font-black uppercase tracking-[.17em] text-emerald-700/70">ArenaBook / {view.replaceAll('-', ' ')}</div><div class="mt-0.5 text-sm font-extrabold tracking-tight">{isAdmin && view.startsWith('admin') || ['verification','equipment','payment-settings','penalty'].includes(view) ? 'Admin Console' : 'Booking Center'}</div></div>
      <div class="flex items-center gap-2">
        <button aria-label="Notifikasi" class="relative grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"><Bell size={17}/>{#if reviewQueue.length}<span class="absolute right-2 top-2 size-1.5 rounded-full bg-rose-500"></span>{/if}</button>
        {#if user}
          <div class="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 sm:flex"><div class="grid size-7 place-items-center rounded-lg bg-arena-900 text-[11px] font-black text-emerald-300"><UserRound size={13}/></div><div><div class="max-w-32 truncate text-xs font-bold">{profile?.full_name || user.email}</div><div class="text-[10px] text-slate-400">{profile?.role ?? 'USER'}</div></div></div>
          <form method="POST" action="/auth/logout"><button aria-label="Keluar" class="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-rose-600"><LogOut size={16}/></button></form>
        {:else}
          <Button size="sm" onclick={() => goto('/auth/login')}>Masuk</Button>
        {/if}
      </div>
    </header>

    <div class="arena-content mx-auto max-w-[1520px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {#if view === 'booking'}
        <section class="space-y-6">
          <div class="booking-hero relative overflow-hidden rounded-[30px] px-5 py-7 text-white sm:px-8 sm:py-9">
            <div class="pointer-events-none absolute -right-12 -top-28 size-[340px] rounded-full border-[65px] border-white/[.055] sm:right-10 sm:size-[430px]"></div>
            <div class="pointer-events-none absolute bottom-[-120px] right-[18%] size-[240px] rotate-45 border-[40px] border-emerald-300/[.075]"></div>
            <div class="relative grid gap-7 xl:grid-cols-[1.25fr_.75fr] xl:items-end">
              <div>
                <div class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-emerald-100 backdrop-blur-sm"><span class="size-1.5 rounded-full bg-emerald-300"></span> BOOKING LAPANGAN ONLINE</div>
                <h1 class="mt-5 max-w-2xl text-[30px] font-black leading-[1.1] tracking-[-.045em] sm:text-4xl lg:text-[44px]">Saatnya main.<br/><span class="text-emerald-300">Lapangan udah siap.</span></h1>
                <p class="mt-4 max-w-xl text-sm leading-7 text-white/65">Pilih lapangan favorit, temukan jam kosong, dan pesan langsung. Nggak perlu bolak-balik tanya jadwal.</p>
                <div class="mt-6 flex flex-wrap gap-2 text-[11px] font-semibold text-white/80">
                  <span class="rounded-full border border-white/15 bg-white/[.07] px-3 py-1.5">{venues.length} pilihan lapangan</span>
                  <span class="rounded-full border border-white/15 bg-white/[.07] px-3 py-1.5">Jadwal diperbarui langsung</span>
                  <span class="rounded-full border border-white/15 bg-white/[.07] px-3 py-1.5">Pembayaran diverifikasi admin</span>
                </div>
              </div>
              <div class="booking-hero-summary rounded-[22px] border border-white/15 bg-white/[.10] p-5 backdrop-blur-md">
                <div class="mb-4 flex items-center justify-between text-xs font-semibold text-white/65"><span>Rencana main kamu</span><CalendarDays size={17}/></div>
                <div class="text-xl font-black tracking-tight">{selectedVenue?.name ?? 'Pilih lapangan'}</div>
                <div class="mt-2 text-sm text-white/70">{selectedDateLabel}</div>
                <div class="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
                  <div><div class="text-[10px] uppercase tracking-wider text-white/50">Mulai</div><div class="mt-1 text-lg font-black">{selectedSlot} WIB</div></div>
                  <div><div class="text-[10px] uppercase tracking-wider text-white/50">Durasi</div><div class="mt-1 text-lg font-black">{duration} jam</div></div>
                </div>
              </div>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <div class="flex items-center gap-3 rounded-[20px] border border-emerald-200 bg-emerald-50 p-4"><span class="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-700 text-xs font-black text-white">01</span><div><div class="text-xs font-black text-emerald-950">Pilih lapangan</div><div class="text-[11px] text-emerald-700/70">Olahraga & fasilitas</div></div></div>
            <div class="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-white/80 p-4"><span class="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-black text-slate-600">02</span><div><div class="text-xs font-black">Tentukan jadwal</div><div class="text-[11px] text-slate-500">Tanggal, jam & durasi</div></div></div>
            <div class="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-white/80 p-4"><span class="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-black text-slate-600">03</span><div><div class="text-xs font-black">Konfirmasi pesanan</div><div class="text-[11px] text-slate-500">Data diri & pembayaran</div></div></div>
          </div>

          <section aria-label="Pilih lapangan">
            <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div class="text-[11px] font-black uppercase tracking-[.15em] text-emerald-700">01 / PILIH LAPANGAN</div>
                <h2 class="mt-1 text-2xl font-black tracking-tight">Mau main apa hari ini?</h2>
                <p class="mt-1 text-sm text-slate-500">Pilih lapangan yang cocok buat tim kamu.</p>
              </div>
              <div class="flex max-w-full gap-2 overflow-x-auto pb-1">
                {#each ['Semua', ...new Set(venues.map((venue) => venue.type))] as type}
                  <button type="button" onclick={() => selectedSport = type}
                    class={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-bold transition ${selectedSport === type ? 'border-arena-950 bg-arena-950 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-400'}`}>{type}</button>
                {/each}
              </div>
            </div>
            {#if visibleVenues.length}
              <div class="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                {#each visibleVenues as venue, idx}
                  <button type="button" onclick={() => { selectVenue(venue.id); }}
                    aria-pressed={selectedVenueId === venue.id}
                    class={`booking-venue-card group relative overflow-hidden rounded-[24px] border p-0 text-left transition-all duration-200 ${selectedVenueId === venue.id ? 'border-emerald-500 bg-white ring-[3px] ring-emerald-400/15' : 'border-slate-200 bg-white hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg'}`}>
                    <div class={`booking-venue-graphic relative flex h-28 items-center justify-between overflow-hidden px-5 ${venue.type.toLowerCase().includes('futsal') ? 'booking-futsal' : venue.type.toLowerCase().includes('badminton') ? 'booking-badminton' : 'booking-basket'}`}>
                      <div class="relative z-10"><div class="text-[11px] font-bold uppercase tracking-[.17em] text-white/65">{venue.type}</div><div class="mt-1 text-2xl font-black tracking-[-.04em] text-white">{String(idx + 1).padStart(2,'0')}</div></div>
                      <div class="booking-court-outline absolute -right-5 -top-10 h-48 w-48 rotate-[28deg] rounded-[28px] border-[3px] border-white/20"></div>
                      <div class="relative z-10 grid size-12 place-items-center rounded-2xl border border-white/20 bg-white/10 text-2xl text-white backdrop-blur-sm">{venue.type.toLowerCase().includes('badminton') ? '🏸' : venue.type.toLowerCase().includes('basket') ? '🏀' : '⚽'}</div>
                    </div>
                    <div class="px-5 pb-5 pt-4">
                      <div class="flex items-start justify-between gap-3">
                        <h3 class="text-base font-black leading-tight tracking-tight">{venue.name}</h3>
                        {#if selectedVenueId === venue.id}<CheckCircle size={19} class="shrink-0 text-emerald-600"/>{:else}<span class="mt-1 size-4 shrink-0 rounded-full border-2 border-slate-200"></span>{/if}
                      </div>
                      <div class="mt-2 flex items-center gap-2 text-xs text-slate-500"><Users size={13}/>{venue.capacity_min}–{venue.capacity_max} orang <span class="text-slate-300">•</span> {venue.surface || 'Lapangan olahraga'}</div>
                      <div class="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
                        <div><div class="text-[10px] text-slate-400">Mulai dari</div><div class="mt-0.5 text-base font-black text-emerald-700">{rupiah(venue.price_per_hour)}<span class="text-[11px] font-medium text-slate-400">/jam</span></div></div>
                        <span class={`rounded-full px-3 py-1.5 text-[11px] font-black ${selectedVenueId === venue.id ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-700'}`}>{selectedVenueId === venue.id ? 'Dipilih' : 'Pilih'}</span>
                      </div>
                    </div>
                  </button>
                {/each}
              </div>
            {:else}
              <div class="rounded-[24px] border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Belum ada lapangan untuk kategori ini.</div>
            {/if}
          </section>

          <section aria-label="Pilih jadwal" class="space-y-4">
            <div>
              <div class="text-[11px] font-black uppercase tracking-[.15em] text-emerald-700">02 / JADWAL MAIN</div>
              <h2 class="mt-1 text-2xl font-black tracking-tight">Pilih waktu yang pas.</h2>
              <p class="mt-1 text-sm text-slate-500">Jam yang sudah dipesan tidak bisa dipilih ulang.</p>
            </div>
            <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(285px,.55fr)]">
              <Card class="overflow-hidden">
                <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
                  <div><div class="text-[11px] font-black uppercase tracking-wider text-emerald-700">Pilih tanggal</div><h3 class="mt-1 text-xl font-black">{monthNames[calendarMonth]} {calendarYear}</h3></div>
                  <div class="flex items-center gap-2">
                    <button type="button" aria-label="Bulan sebelumnya" onclick={prevMonth} class="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white hover:border-emerald-400"><ChevronLeft size={17}/></button>
                    <button type="button" onclick={() => { calendarYear = todayYear; calendarMonth = todayMonth - 1; selectedDate = todayKey; loadAvailability(); }} class="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold hover:border-emerald-400">Hari ini</button>
                    <button type="button" aria-label="Bulan berikutnya" onclick={nextMonth} class="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white hover:border-emerald-400"><ChevronRight size={17}/></button>
                  </div>
                </div>
                <div class="p-4 sm:p-5">
                  <div class="grid grid-cols-7 gap-1 border-b border-slate-100 pb-3">{#each weekdayLabels as label}<div class="py-1 text-center text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div>{/each}</div>
                  <div class="mt-3 grid grid-cols-7 gap-1 sm:gap-2">
                    {#each calendarCells as cell}
                      <button type="button" disabled={cell.isPast} onclick={() => selectDate(cell)} aria-pressed={selectedDate === cell.key} aria-label={`${cell.day} ${monthNames[cell.date.getMonth()]} ${cell.date.getFullYear()}`}
                        class={`relative flex min-h-[48px] flex-col items-center justify-center rounded-xl border text-sm font-extrabold transition sm:min-h-[62px] ${selectedDate === cell.key ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-600/15' : cell.isPast ? 'cursor-not-allowed border-transparent text-slate-300' : cell.inCurrentMonth ? 'border-slate-100 bg-slate-50/70 hover:border-emerald-400 hover:bg-emerald-50' : 'border-transparent text-slate-400 hover:bg-slate-50'}`}>
                        {cell.day}
                        {#if cell.isToday}<span class={`absolute bottom-1 size-1 rounded-full ${selectedDate === cell.key ? 'bg-white' : 'bg-emerald-500'}`}></span>{/if}
                      </button>
                    {/each}
                  </div>
                  <div class="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600"><CalendarDays size={15} class="shrink-0 text-emerald-700"/><span class="font-bold capitalize">{selectedDateLabel}</span></div>
                </div>
              </Card>
              <div class="space-y-4">
                <Card class="p-5">
                  <div class="text-[11px] font-black uppercase tracking-wider text-emerald-700">Durasi</div>
                  <h3 class="mt-1 text-lg font-black">Berapa lama mau main?</h3>
                  <div class="mt-4 grid grid-cols-4 gap-2">
                    {#each [1,2,3,4] as hours}
                      <button type="button" onclick={() => { duration = hours; loadAvailability(); }} class={`rounded-xl border px-2 py-3 text-xs font-black transition ${duration === hours ? 'border-arena-950 bg-arena-950 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-400'}`}>{hours} jam</button>
                    {/each}
                  </div>
                  <p class="mt-3 text-xs leading-5 text-slate-500">Harga lapangan {rupiah(venueSubtotal)} untuk {duration} jam. Perlengkapan bisa ditambah saat checkout.</p>
                </Card>
                <Card class="p-5">
                  <div class="mb-3 flex items-center justify-between"><div><div class="text-[11px] font-black uppercase tracking-wider text-emerald-700">Jam mulai</div><h3 class="mt-1 text-lg font-black">Pilih slot tersedia</h3></div>{#if availabilityBusy}<RefreshCw size={16} class="animate-spin text-emerald-600"/>{/if}</div>
                  <div class="grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-3 2xl:grid-cols-4">
                    {#each slotTimes as time}
                      {@const state = slotState(time, duration)}
                      <button type="button" disabled={availabilityBusy || state !== 'free'} onclick={() => selectedSlot = time}
                        aria-pressed={selectedSlot === time && state === 'free'}
                        class={`flex min-h-12 flex-col items-center justify-center rounded-xl border px-2 py-2 text-xs font-black transition ${state === 'free' ? selectedSlot === time ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400' : state === 'pending' ? 'cursor-not-allowed border-amber-100 bg-amber-50 text-amber-600' : state === 'booked' ? 'cursor-not-allowed border-rose-100 bg-rose-50 text-rose-500' : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'}`}>
                        <span>{time}</span><span class="mt-0.5 text-[9px] font-semibold opacity-70">{state === 'free' ? 'Kosong' : state === 'pending' ? 'Ditahan' : state === 'booked' ? 'Terisi' : 'Tutup'}</span>
                      </button>
                    {/each}
                  </div>
                  <div class="mt-4 flex flex-wrap gap-3 text-[10px] font-medium text-slate-500"><span><span class="mr-1 text-emerald-600">●</span>Kosong</span><span><span class="mr-1 text-amber-500">●</span>Ditahan</span><span><span class="mr-1 text-rose-500">●</span>Terisi</span></div>
                </Card>
              </div>
            </div>
          </section>

          <div class="sticky bottom-[84px] z-20 overflow-hidden rounded-[24px] border border-emerald-300/10 bg-arena-950 px-5 py-4 text-white shadow-[0_22px_65px_-28px_rgba(7,17,13,.8)] sm:px-6 lg:bottom-5">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <div class="text-[10px] font-black uppercase tracking-wider text-emerald-300">Ringkasan pesanan</div>
                <div class="mt-1 truncate text-sm font-black">{selectedVenue?.name ?? 'Pilih lapangan'} <span class="font-normal text-white/45">• {selectedDate} • {selectedSlot}</span></div>
                <div class="mt-1 text-xl font-black text-emerald-300">{rupiah(venueSubtotal)} <span class="text-xs font-medium text-white/40">/ {duration} jam</span></div>
              </div>
              <Button class="w-full shrink-0 sm:w-auto" size="lg" onclick={startCheckout} disabled={availabilityBusy || slotState(selectedSlot, duration) !== 'free'}>{availabilityBusy ? 'Memeriksa jadwal…' : slotState(selectedSlot, duration) !== 'free' ? 'Pilih jam tersedia' : user ? 'Lanjut ke checkout' : 'Masuk untuk booking'} <ChevronRight size={16}/></Button>
            </div>
          </div>
        </section>
      {:else if view === 'my-bookings'}
        <section class="space-y-4"><div><div class="text-[11px] font-black uppercase tracking-[.15em] text-emerald-700">Akun</div><h1 class="mt-1 text-2xl font-black">Booking Saya</h1></div>{#if !myBookings.length}<Card class="p-10 text-center"><ClipboardList size={28} class="mx-auto text-slate-300"/><h2 class="mt-3 text-sm font-black">Belum ada booking</h2></Card>{:else}<div class="grid gap-3">{#each myBookings as booking}<Card class="p-5"><div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div class="flex flex-wrap gap-2"><Badge tone={statusTone(booking.status)}>{booking.status}</Badge><Badge tone={paymentTone(booking.payment_status)}>{booking.payment_status}</Badge></div><h2 class="mt-2 text-sm font-black">{booking.venue?.name ?? booking.booking_code}</h2><div class="mt-1 text-[11px] text-slate-400">{booking.booking_code} • {formatBookingDate(booking.starts_at)}</div></div><div class="flex items-center gap-2"><div class="mr-2 text-right"><div class="text-[10px] text-slate-400">Total</div><div class="text-sm font-black">{rupiah(booking.total_amount)}</div></div>{#if ['UNPAID','REJECTED'].includes(booking.payment_status)}<Button size="sm" onclick={() => openPayment(booking)}>Bayar</Button>{:else}<Button variant="outline" size="sm"><Receipt size={13}/> Invoice</Button>{/if}</div></div></Card>{/each}</div>{/if}</section>
      {:else if view === 'transactions'}
        <section class="space-y-4"><div><div class="text-[11px] font-black uppercase tracking-[.15em] text-emerald-700">Keuangan</div><h1 class="mt-1 text-2xl font-black">Transaksi Saya</h1></div><Card class="overflow-x-auto p-2"><table class="w-full min-w-[720px] text-left"><thead><tr class="text-[10px] uppercase tracking-wider text-slate-400"><th class="p-3">Booking</th><th class="p-3">Jadwal</th><th class="p-3">Total</th><th class="p-3">Pembayaran</th></tr></thead><tbody>{#each myBookings as booking}<tr class="border-t border-slate-100 text-xs"><td class="p-3 font-black">{booking.booking_code}</td><td class="p-3">{formatBookingDate(booking.starts_at)}</td><td class="p-3 font-bold">{rupiah(booking.total_amount)}</td><td class="p-3"><Badge tone={paymentTone(booking.payment_status)}>{booking.payment_status}</Badge></td></tr>{/each}</tbody></table></Card></section>
      {:else if view === 'admin-home' && isAdmin}
        <section class="space-y-5">
          <div class="overflow-hidden rounded-[30px] bg-arena-950 p-5 text-white shadow-[0_28px_80px_-48px_rgba(7,17,13,.8)] sm:p-7">
            <div class="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div class="text-[11px] font-black uppercase tracking-[.16em] text-emerald-300">Operational overview</div>
                <h1 class="mt-2 text-3xl font-black tracking-[-.04em]">Kontrol operasional dalam satu layar.</h1>
                <p class="mt-2 max-w-2xl text-sm leading-6 text-white/42">Pantau booking, pembayaran, dan antrean verifikasi tanpa pindah-pindah sistem.</p>
              </div>
              <Button variant="secondary" onclick={() => view = 'verification'}><ShieldCheck size={15}/> Buka antrean verifikasi</Button>
            </div>
          </div>
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card class="group overflow-hidden p-5"><div class="flex items-start justify-between"><div><div class="text-[11px] font-black uppercase tracking-wider text-slate-400">Total booking</div><div class="mt-3 text-3xl font-black tracking-[-.04em]">{bookings.length}</div></div><div class="grid size-10 place-items-center rounded-2xl bg-slate-100 text-slate-500"><ClipboardList size={17}/></div></div><div class="mt-4 text-[11px] text-slate-400">Semua booking tersimpan</div></Card>
            <Card class="group overflow-hidden p-5"><div class="flex items-start justify-between"><div><div class="text-[11px] font-black uppercase tracking-wider text-slate-400">Perlu verifikasi</div><div class="mt-3 text-3xl font-black tracking-[-.04em] text-amber-600">{reviewQueue.length}</div></div><div class="grid size-10 place-items-center rounded-2xl bg-amber-50 text-amber-600"><ShieldCheck size={17}/></div></div><div class="mt-4 text-[11px] text-slate-400">Bukti pembayaran menunggu</div></Card>
            <Card class="group overflow-hidden p-5"><div class="flex items-start justify-between"><div><div class="text-[11px] font-black uppercase tracking-wider text-slate-400">Pembayaran lunas</div><div class="mt-3 text-3xl font-black tracking-[-.04em] text-emerald-700">{bookings.filter((b) => b.payment_status === 'PAID').length}</div></div><div class="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><CheckCircle size={17}/></div></div><div class="mt-4 text-[11px] text-slate-400">Sudah dikonfirmasi admin</div></Card>
            <Card class="group overflow-hidden p-5"><div class="flex items-start justify-between"><div><div class="text-[11px] font-black uppercase tracking-wider text-slate-400">Perlu perhatian</div><div class="mt-3 text-3xl font-black tracking-[-.04em] text-rose-600">{bookings.filter((b) => b.status === 'PAYMENT_ISSUE').length}</div></div><div class="grid size-10 place-items-center rounded-2xl bg-rose-50 text-rose-600"><AlertTriangle size={17}/></div></div><div class="mt-4 text-[11px] text-slate-400">Payment issue / tindakan admin</div></Card>
          </div>
        </section>
      {:else if view === 'verification' && isAdmin}
        <section class="space-y-4"><div><div class="text-[11px] font-black uppercase tracking-[.15em] text-emerald-700">Payment review</div><h1 class="mt-1 text-2xl font-black">Verifikasi Pembayaran</h1><p class="mt-1 text-sm text-slate-500">Screenshot hanya pre-screen. Admin tetap cek mutasi rekening sebelum approve.</p></div>{#if !reviewQueue.length}<Card class="p-10 text-center"><CheckCircle size={28} class="mx-auto text-emerald-500"/><h2 class="mt-3 text-sm font-black">Antrean bersih</h2></Card>{:else}<div class="grid gap-3">{#each reviewQueue as booking}{@const proof = booking.payment_proofs?.[0]}<Card class="p-5"><div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div class="flex gap-3"><div class="grid size-11 place-items-center rounded-2xl bg-amber-50 text-amber-600"><ImageIcon size={18}/></div><div><div class="flex flex-wrap gap-2"><Badge tone="warning">REVIEW</Badge>{#if proof?.is_duplicate}<Badge tone="danger">DUPLIKAT</Badge>{/if}{#if proof?.amount_matches}<Badge tone="success">NOMINAL COCOK</Badge>{:else}<Badge tone="danger">NOMINAL BEDA</Badge>{/if}</div><h2 class="mt-2 text-sm font-black">{booking.customer_name} • {booking.booking_code}</h2><div class="mt-1 text-[11px] text-slate-400">Invoice {rupiah(booking.total_amount)} • {formatBookingDate(booking.starts_at)}</div></div></div><Button size="sm" onclick={() => openReview(booking)}><Eye size={13}/> Buka bukti</Button></div></Card>{/each}</div>{/if}</section>
      {:else if view === 'admin-bookings' && isAdmin}
        <section class="space-y-4"><div><div class="text-[11px] font-black uppercase tracking-[.15em] text-emerald-700">Manajemen</div><h1 class="mt-1 text-2xl font-black">Semua Booking</h1></div><Card class="overflow-x-auto p-2"><table class="w-full min-w-[940px] text-left"><thead><tr class="text-[10px] uppercase tracking-wider text-slate-400"><th class="p-3">Kode</th><th class="p-3">Customer</th><th class="p-3">Lapangan</th><th class="p-3">Jadwal</th><th class="p-3">Total</th><th class="p-3">Payment</th><th class="p-3">Booking</th></tr></thead><tbody>{#each bookings as booking}<tr class="border-t border-slate-100 text-xs"><td class="p-3 font-black">{booking.booking_code}</td><td class="p-3">{booking.customer_name}</td><td class="p-3">{booking.venue?.name ?? '-'}</td><td class="p-3">{formatBookingDate(booking.starts_at)}</td><td class="p-3 font-bold">{rupiah(booking.total_amount)}</td><td class="p-3"><Badge tone={paymentTone(booking.payment_status)}>{booking.payment_status}</Badge></td><td class="p-3"><Badge tone={statusTone(booking.status)}>{booking.status}</Badge></td></tr>{/each}</tbody></table></Card></section>
      {:else if view === 'equipment' && isAdmin}
        <section class="space-y-4"><div><div class="text-[11px] font-black uppercase tracking-[.15em] text-emerald-700">Inventory</div><h1 class="mt-1 text-2xl font-black">Perlengkapan</h1></div><div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{#each equipment as item}<Card class="p-5"><div class="flex items-start justify-between"><div class="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Package size={17}/></div><Badge tone={item.stock_total - item.stock_damaged < 5 ? 'warning' : 'success'}>{item.stock_total - item.stock_damaged} tersedia</Badge></div><h2 class="mt-4 text-sm font-black">{item.name}</h2><div class="mt-1 text-xs text-slate-400">{rupiah(item.price_per_booking)} / booking • {item.stock_damaged} rusak</div></Card>{/each}</div></section>
      {:else if view === 'payment-settings' && isAdmin}
        <section class="space-y-4"><div><div class="text-[11px] font-black uppercase tracking-[.15em] text-emerald-700">Pembayaran manual</div><h1 class="mt-1 text-2xl font-black">Rekening Pembayaran</h1><p class="mt-1 text-sm text-slate-500">Data ini yang ditampilkan ke user saat checkout. Tidak ada nomor rekening dummy pada mode production.</p></div><Card class="max-w-2xl p-5"><div class="grid gap-3 sm:grid-cols-2"><label class="text-[11px] font-bold text-slate-500">Bank<input bind:value={bankName} class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-400"/></label><label class="text-[11px] font-bold text-slate-500">Nomor rekening<input bind:value={accountNumber} class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-400"/></label><label class="text-[11px] font-bold text-slate-500 sm:col-span-2">Nama pemilik<input bind:value={accountName} class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-400"/></label><label class="text-[11px] font-bold text-slate-500 sm:col-span-2">Instruksi<textarea bind:value={paymentInstructions} rows="4" class="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-emerald-400"></textarea></label></div><Button class="mt-4" onclick={savePaymentSettings} disabled={busy}><Save size={14}/> Simpan rekening</Button></Card></section>
      {:else if view === 'penalty' && isAdmin}
        <section class="space-y-4"><div><div class="text-[11px] font-black uppercase tracking-[.15em] text-emerald-700">Policy engine</div><h1 class="mt-1 text-2xl font-black">Aturan Denda</h1></div><Card class="max-w-2xl p-5"><div class="flex items-center justify-between"><div><div class="text-[11px] font-bold uppercase text-slate-400">Denda keterlambatan</div><h2 class="mt-1 text-base font-black">Global policy</h2></div><button aria-label="Aktifkan denda" onclick={() => penaltyEnabled = !penaltyEnabled} class={`relative h-8 w-14 rounded-full transition ${penaltyEnabled ? 'bg-emerald-400' : 'bg-slate-200'}`}><span class={`absolute top-1 size-6 rounded-full bg-white shadow transition ${penaltyEnabled ? 'left-7' : 'left-1'}`}></span></button></div><div class="mt-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1"><button onclick={() => penaltyMode = 'ADAPTIVE'} class={`rounded-lg py-2 text-xs font-bold ${penaltyMode === 'ADAPTIVE' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400'}`}>Otomatis adaptif</button><button onclick={() => penaltyMode = 'MANUAL'} class={`rounded-lg py-2 text-xs font-bold ${penaltyMode === 'MANUAL' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400'}`}>Manual admin</button></div><div class="mt-4 grid gap-3 sm:grid-cols-2"><label class="text-[11px] font-bold text-slate-500">Toleransi (menit)<input type="number" bind:value={toleranceMinutes} class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs"/></label><label class="text-[11px] font-bold text-slate-500">Interval (menit)<input type="number" bind:value={intervalMinutes} class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs"/></label><label class="text-[11px] font-bold text-slate-500">Nominal / interval<input type="number" bind:value={amountPerInterval} class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs"/></label><label class="text-[11px] font-bold text-slate-500">Maksimum denda<input type="number" bind:value={maxPenalty} class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs"/></label></div><Button class="mt-4" onclick={savePenaltyRule} disabled={busy}><Save size={14}/> Simpan aturan</Button></Card></section>
      {/if}
    </div>
  </main>

  <nav class="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 gap-1 rounded-[22px] border border-slate-200/80 bg-white/92 p-1.5 shadow-[0_20px_60px_-24px_rgba(15,23,42,.45)] backdrop-blur-xl lg:hidden">
    {#if isAdmin}
      <button onclick={() => view = 'admin-home'} class={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[10px] font-extrabold transition ${view === 'admin-home' ? 'bg-arena-950 text-emerald-300' : 'text-slate-400'}`}><LayoutDashboard size={16}/>Admin</button>
      <button onclick={() => view = 'verification'} class={`relative flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[10px] font-extrabold transition ${view === 'verification' ? 'bg-arena-950 text-emerald-300' : 'text-slate-400'}`}><ShieldCheck size={16}/>Verifikasi{#if reviewQueue.length}<span class="absolute right-3 top-2 size-2 rounded-full bg-rose-500"></span>{/if}</button>
      <button onclick={() => view = 'admin-bookings'} class={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[10px] font-extrabold transition ${view === 'admin-bookings' ? 'bg-arena-950 text-emerald-300' : 'text-slate-400'}`}><ClipboardList size={16}/>Booking</button>
      <button onclick={() => view = 'booking'} class={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[10px] font-extrabold transition ${view === 'booking' ? 'bg-arena-950 text-emerald-300' : 'text-slate-400'}`}><CalendarDays size={16}/>Lapangan</button>
    {:else}
      <button onclick={() => view = 'booking'} class={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[10px] font-extrabold transition ${view === 'booking' ? 'bg-arena-950 text-emerald-300' : 'text-slate-400'}`}><CalendarDays size={16}/>Booking</button>
      <button onclick={() => view = 'my-bookings'} disabled={!user} class={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[10px] font-extrabold transition disabled:opacity-35 ${view === 'my-bookings' ? 'bg-arena-950 text-emerald-300' : 'text-slate-400'}`}><ClipboardList size={16}/>Pesanan</button>
      <button onclick={() => view = 'transactions'} disabled={!user} class={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[10px] font-extrabold transition disabled:opacity-35 ${view === 'transactions' ? 'bg-arena-950 text-emerald-300' : 'text-slate-400'}`}><Wallet size={16}/>Transaksi</button>
      <button onclick={() => goto('/auth/login')} class="flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[10px] font-extrabold text-slate-400"><UserRound size={16}/>{user ? 'Akun' : 'Masuk'}</button>
    {/if}
  </nav>
</div>

{#if checkoutOpen}
  <button aria-label="Tutup checkout" class="fixed inset-0 z-50 bg-arena-950/55 backdrop-blur-[2px]" onclick={() => checkoutOpen = false}></button>
  <div class="fixed inset-y-0 right-0 z-[60] w-full max-w-[470px] overflow-y-auto bg-[#f8faf8] p-5 shadow-2xl sm:p-7"><div class="flex items-start justify-between"><div><div class="text-[11px] font-black uppercase tracking-[.14em] text-emerald-700">Checkout</div><h2 class="mt-1 text-xl font-black">Konfirmasi booking</h2></div><button aria-label="Tutup" onclick={() => checkoutOpen = false} class="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white"><X size={15}/></button></div><div class="mt-5 rounded-2xl bg-arena-950 p-4 text-white"><div class="text-[11px] text-white/40">{selectedVenue?.name}</div><div class="mt-1 text-xs font-bold">{selectedDate} • {selectedSlot} • {duration} jam</div></div><div class="mt-5 grid gap-3"><label class="text-[11px] font-bold text-slate-500">Nama lengkap<input bind:value={customerName} class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"/></label><label class="text-[11px] font-bold text-slate-500">WhatsApp<input bind:value={customerPhone} class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"/></label><label class="text-[11px] font-bold text-slate-500">Alamat<textarea bind:value={customerAddress} rows="3" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs"></textarea></label></div><div class="mt-5"><div class="text-[11px] font-black uppercase tracking-wider text-slate-400">Durasi</div><div class="mt-2 flex gap-2">{#each [1,2,3,4] as hours}<button onclick={() => { duration = hours; }} class={`rounded-xl border px-3 py-2 text-xs font-bold ${duration === hours ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>{hours} jam</button>{/each}</div></div><div class="mt-5"><div class="text-[11px] font-black uppercase tracking-wider text-slate-400">Perlengkapan</div><div class="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">{#each equipment as item}<div class="flex items-center gap-3 border-b border-slate-100 p-3 last:border-0"><div class="min-w-0 flex-1"><div class="text-xs font-bold">{item.name}</div><div class="mt-0.5 text-[10px] text-slate-400">{rupiah(item.price_per_booking)} • tersedia {item.stock_total - item.stock_damaged}</div></div><div class="flex items-center gap-1"><button aria-label={`Kurangi ${item.name}`} onclick={() => adjustEquipment(item.id,-1)} class="grid size-7 place-items-center rounded-lg border border-slate-200"><Minus size={11}/></button><span class="w-6 text-center text-xs font-black">{equipmentQty[item.id] ?? 0}</span><button aria-label={`Tambah ${item.name}`} onclick={() => adjustEquipment(item.id,1)} class="grid size-7 place-items-center rounded-lg border border-slate-200"><Plus size={11}/></button></div></div>{/each}</div></div><div class="mt-5 space-y-2 border-t border-slate-200 pt-4 text-xs"><div class="flex justify-between"><span class="text-slate-500">Lapangan</span><b>{rupiah(venueSubtotal)}</b></div><div class="flex justify-between"><span class="text-slate-500">Perlengkapan</span><b>{rupiah(equipmentSubtotal)}</b></div><div class="flex justify-between border-t border-dashed border-slate-200 pt-3"><span class="font-bold">Total</span><b class="text-lg font-black text-emerald-700">{rupiah(bookingTotal)}</b></div></div><Button class="mt-5 w-full" size="lg" onclick={createBooking} disabled={busy || slotState(selectedSlot, duration) !== 'free'}>{busy ? 'Memproses…' : 'Buat booking & tahan slot'} <ChevronRight size={14}/></Button></div>
{/if}

{#if paymentOpen && selectedPaymentBooking}
  <button aria-label="Tutup pembayaran" class="fixed inset-0 z-50 bg-arena-950/55 backdrop-blur-[2px]" onclick={() => paymentOpen = false}></button>
  <div class="fixed left-1/2 top-1/2 z-[60] max-h-[92vh] w-[calc(100%-24px)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] bg-[#f8faf8] p-5 shadow-2xl sm:p-7"><div class="flex items-start justify-between"><div><div class="text-[11px] font-black uppercase tracking-[.14em] text-emerald-700">Pembayaran manual</div><h2 class="mt-1 text-xl font-black">{selectedPaymentBooking.booking_code}</h2></div><button aria-label="Tutup" onclick={() => paymentOpen = false} class="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white"><X size={15}/></button></div><div class="mt-5 grid gap-3 sm:grid-cols-2"><div class="rounded-2xl bg-arena-950 p-4 text-white"><div class="text-[10px] uppercase tracking-wider text-white/35">Total invoice</div><div class="mt-1 text-xl font-black text-emerald-300">{rupiah(selectedPaymentBooking.total_amount)}</div>{#if selectedPaymentBooking.expires_at}<div class="mt-2 text-[10px] text-white/40">Hold sampai {formatBookingDate(selectedPaymentBooking.expires_at)}</div>{/if}</div><div class={`rounded-2xl border p-4 ${paymentConfigured ? 'border-slate-200 bg-white' : 'border-amber-200 bg-amber-50'}`}><div class="text-[10px] uppercase tracking-wider text-slate-400">Transfer ke</div>{#if paymentConfigured}<div class="mt-1 text-xs font-black">{(data.paymentSettings as any)?.bank_name} • {(data.paymentSettings as any)?.account_number}</div><div class="mt-1 text-[11px] text-slate-500">a.n. {(data.paymentSettings as any)?.account_name || '-'}</div>{:else}<div class="mt-1 text-xs font-bold text-amber-700">Rekening belum dikonfigurasi admin.</div>{/if}</div></div>{#if (data.paymentSettings as any)?.instructions}<div class="mt-3 rounded-2xl bg-slate-50 p-3 text-[11px] leading-4 text-slate-600">{(data.paymentSettings as any).instructions}</div>{/if}<div class="mt-4 grid gap-3 sm:grid-cols-2"><label class="text-[11px] font-bold text-slate-500">Nominal transfer<input type="number" bind:value={transferAmount} class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"/></label><label class="text-[11px] font-bold text-slate-500">Nomor referensi<input bind:value={transferReference} class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"/></label></div><label class="mt-3 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center"><Upload size={20} class="text-emerald-600"/><span class="mt-2 text-xs font-bold">{proofFile ? proofFile.name : 'Pilih screenshot bukti transfer'}</span><span class="mt-1 text-[10px] text-slate-400">JPG / PNG / WEBP • maks 5 MB</span><input class="hidden" type="file" accept="image/png,image/jpeg,image/webp" onchange={(event) => { proofFile = (event.currentTarget as HTMLInputElement).files?.[0] ?? null; }}/></label><Button class="mt-4 w-full" size="lg" onclick={submitProof} disabled={busy || !paymentConfigured}><Upload size={14}/> {busy ? 'Mengirim…' : 'Kirim bukti untuk verifikasi'}</Button></div>
{/if}

{#if reviewOpen && selectedReviewBooking && reviewProof}
  <button aria-label="Tutup review" class="fixed inset-0 z-50 bg-arena-950/55 backdrop-blur-[2px]" onclick={() => reviewOpen = false}></button>
  <div class="fixed left-1/2 top-1/2 z-[60] max-h-[92vh] w-[calc(100%-24px)] max-w-[700px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] bg-[#f8faf8] p-5 shadow-2xl sm:p-7"><div class="flex items-start justify-between"><div><div class="text-[11px] font-black uppercase tracking-[.14em] text-emerald-700">Admin review</div><h2 class="mt-1 text-xl font-black">{selectedReviewBooking.booking_code}</h2></div><button aria-label="Tutup" onclick={() => reviewOpen = false} class="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white"><X size={15}/></button></div><div class="mt-5 grid gap-4 lg:grid-cols-[1.15fr_.85fr]"><div class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">{#if reviewSignedUrl}<img src={reviewSignedUrl} alt="Bukti transfer" class="max-h-[480px] w-full object-contain"/>{/if}</div><div class="space-y-3"><div class="rounded-2xl bg-arena-950 p-4 text-white"><div class="text-[10px] text-white/35">Invoice</div><div class="mt-1 text-lg font-black text-emerald-300">{rupiah(selectedReviewBooking.total_amount)}</div><div class="mt-2 text-[11px] text-white/45">{selectedReviewBooking.customer_name}</div></div><div class={`rounded-2xl border p-3 ${reviewProof.amount_matches ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}><div class="text-[10px] uppercase text-slate-400">Nominal pada bukti</div><div class="mt-1 text-sm font-black">{rupiah(reviewProof.declared_amount)}</div><div class={`mt-1 text-[10px] font-bold ${reviewProof.amount_matches ? 'text-emerald-700' : 'text-rose-700'}`}>{reviewProof.amount_matches ? 'Sesuai invoice' : 'Tidak sesuai invoice'}</div></div><div class={`rounded-2xl border p-3 ${reviewProof.is_duplicate ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}><div class="text-[10px] uppercase text-slate-400">Fingerprint SHA-256</div><div class="mt-1 text-[11px] font-bold">{reviewProof.is_duplicate ? 'Duplikat terdeteksi' : 'Belum ditemukan duplikat'}</div></div><div class="rounded-2xl border border-slate-200 bg-white p-3"><div class="text-[10px] uppercase text-slate-400">Referensi</div><div class="mt-1 text-xs font-bold">{reviewProof.reference_number}</div></div></div></div><div class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-4 text-amber-800"><b>Final check:</b> pastikan dana benar-benar terlihat pada rekening/mutasi. Screenshot dan fingerprint bukan bukti mutlak uang masuk.</div><div class="mt-4 grid grid-cols-2 gap-2"><Button variant="danger" onclick={() => reviewPayment(false)} disabled={busy}><X size={14}/> Tolak</Button><Button onclick={() => reviewPayment(true)} disabled={busy}><CheckCircle size={14}/> Dana masuk — Approve</Button></div></div>
{/if}

{#if flash}<div class="fixed bottom-5 right-4 z-[90] max-w-[340px] rounded-2xl bg-arena-950 px-4 py-3 text-xs font-semibold text-white shadow-2xl"><div class="flex items-center gap-2"><CheckCircle size={14} class="text-emerald-400"/>{flash}</div></div>{/if}
