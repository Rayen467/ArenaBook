<script lang="ts">
  type DemoBooking = {
    id: string;
    customer: string;
    venue: string;
    schedule: string;
    total: number;
    payment: 'UNPAID' | 'PROOF_SUBMITTED' | 'PAID' | 'REJECTED';
    status: 'AWAITING_PAYMENT' | 'PENDING_VERIFICATION' | 'CONFIRMED' | 'PAYMENT_ISSUE';
  };

  type DemoMessage = {
    id: number;
    from: 'admin' | 'bot';
    text: string;
    action?: { type: 'approve' | 'reject'; bookingId: string };
  };

  const rupiah = (value: number) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(value);

  let bookings = $state<DemoBooking[]>([
    { id: 'BK-260919-A1F3', customer: 'Rayhandi Tenri', venue: 'Futsal Arena A', schedule: '19 Sep • 19:00–21:00', total: 315000, payment: 'PROOF_SUBMITTED', status: 'PENDING_VERIFICATION' },
    { id: 'BK-260919-D8K2', customer: 'Dimas Saputra', venue: 'Futsal Arena B', schedule: '19 Sep • 20:00–22:00', total: 270000, payment: 'PAID', status: 'CONFIRMED' },
    { id: 'BK-260920-M4P8', customer: 'Maya Putri', venue: 'Badminton Court 1', schedule: '20 Sep • 08:00–10:00', total: 160000, payment: 'UNPAID', status: 'AWAITING_PAYMENT' }
  ]);

  let messages = $state<DemoMessage[]>([
    { id: 1, from: 'bot', text: 'ArenaBook Admin Assistant siap. Ini mode DEMO untuk presentasi — tidak mengubah database asli. Coba ketik “booking malam ini siapa aja?” atau “approve Rayhandi”.' }
  ]);
  let input = $state('');
  let seq = 2;

  const quickPrompts = [
    'booking malam ini siapa aja?',
    'pembayaran yang belum dicek',
    'approve yang Rayhandi',
    'jam 8 malam kosong?',
    'detail booking Rayhandi'
  ];

  function push(from: DemoMessage['from'], text: string, action?: DemoMessage['action']) {
    messages = [...messages, { id: seq++, from, text, action }];
    setTimeout(() => document.getElementById('chat-end')?.scrollIntoView({ behavior: 'smooth' }), 10);
  }

  function normalize(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function findMention(text: string) {
    const n = normalize(text);
    return bookings.find((booking) => normalize(booking.customer).split(' ').some((part) => part.length > 2 && n.includes(part)));
  }

  function send(value = input) {
    const text = value.trim();
    if (!text) return;
    input = '';
    push('admin', text);
    const n = normalize(text);

    if (n.includes('booking') && (n.includes('malam') || n.includes('hari ini') || n.includes('siapa'))) {
      const today = bookings.filter((booking) => booking.schedule.startsWith('19 Sep'));
      push('bot', `Booking malam ini (${today.length})\n\n${today.map((booking, index) => `${index + 1}. ${booking.customer}\n${booking.venue} • ${booking.schedule}\n${rupiah(booking.total)} • ${booking.status}`).join('\n\n')}`);
      return;
    }

    if (n.includes('pending') || n.includes('belum dicek') || n.includes('verifikasi') || n.includes('pembayaran')) {
      const pending = bookings.filter((booking) => booking.payment === 'PROOF_SUBMITTED');
      push('bot', pending.length
        ? `Menunggu verifikasi (${pending.length})\n\n${pending.map((booking) => `${booking.id} — ${booking.customer}\n${rupiah(booking.total)} • bukti sudah dikirim`).join('\n\n')}`
        : 'Antrean pembayaran bersih.');
      return;
    }

    if (n.includes('approve') || n.includes('udah masuk') || n.includes('sudah masuk') || n.includes('aman')) {
      const booking = findMention(text) ?? bookings.find((item) => item.payment === 'PROOF_SUBMITTED');
      if (!booking) { push('bot', 'Booking yang dimaksud belum jelas. Sebut nama customer atau kode booking.'); return; }
      push('bot', `Konfirmasi dana masuk?\n\n${booking.id} — ${booking.customer}\n${booking.venue} • ${booking.schedule}\n${rupiah(booking.total)}\n\nBelum ada data yang diubah.`, { type: 'approve', bookingId: booking.id });
      return;
    }

    if (n.includes('tolak') || n.includes('reject') || n.includes('belum masuk')) {
      const booking = findMention(text) ?? bookings.find((item) => item.payment === 'PROOF_SUBMITTED');
      if (!booking) { push('bot', 'Booking yang dimaksud belum jelas.'); return; }
      push('bot', `Tolak bukti pembayaran?\n\n${booking.id} — ${booking.customer}\n${rupiah(booking.total)}\n\nBelum ada data yang diubah.`, { type: 'reject', bookingId: booking.id });
      return;
    }

    if (n.includes('jam 8') && n.includes('malam') && n.includes('kosong')) {
      push('bot', '19 Sep pukul 20:00\n\nTersedia:\n• Badminton Court 1\n• Basket Half Court\n\nTerpakai/tertahan:\n• Futsal Arena A\n• Futsal Arena B');
      return;
    }

    if (n.includes('detail') || n.includes('rincian')) {
      const booking = findMention(text);
      if (!booking) { push('bot', 'Sebut nama customer yang mau dicek.'); return; }
      push('bot', `${booking.id} — ${booking.customer}\n${booking.venue}\n${booking.schedule}\nTotal ${rupiah(booking.total)}\nPayment: ${booking.payment}\nBooking: ${booking.status}`);
      return;
    }

    push('bot', 'Gue belum yakin maksudnya. Coba: “booking malam ini”, “pembayaran belum dicek”, “approve Rayhandi”, atau “jam 8 malam kosong?”.');
  }

  function confirmAction(message: DemoMessage) {
    if (!message.action) return;
    const target = bookings.find((booking) => booking.id === message.action?.bookingId);
    if (!target) return;
    if (message.action.type === 'approve') {
      target.payment = 'PAID';
      target.status = 'CONFIRMED';
      bookings = [...bookings];
      message.action = undefined;
      messages = [...messages];
      push('bot', `✅ Pembayaran ${target.id} dikonfirmasi.\nStatus sekarang: PAID / CONFIRMED`);
    } else {
      target.payment = 'REJECTED';
      target.status = 'PAYMENT_ISSUE';
      bookings = [...bookings];
      message.action = undefined;
      messages = [...messages];
      push('bot', `❌ Bukti ${target.id} ditolak.\nStatus sekarang: REJECTED / PAYMENT_ISSUE`);
    }
  }

  function cancelAction(message: DemoMessage) {
    message.action = undefined;
    messages = [...messages];
    push('bot', 'Aksi dibatalkan. Tidak ada data yang diubah.');
  }
</script>

<svelte:head>
  <title>Admin Assistant Demo — ArenaBook</title>
  <meta name="description" content="Demo interaktif rule-based Telegram Admin Assistant ArenaBook." />
</svelte:head>

<div class="min-h-screen bg-[#f3f7f5] text-slate-900">
  <header class="border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6">
    <div class="mx-auto flex max-w-6xl items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="grid size-10 place-items-center rounded-2xl bg-emerald-400 font-black text-emerald-950">A</div>
        <div><div class="text-sm font-black">ArenaBook</div><div class="text-[10px] text-slate-400">Admin Assistant</div></div>
      </div>
      <div class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-amber-700">Presentation Demo</div>
    </div>
  </header>

  <main class="mx-auto grid max-w-6xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_320px] lg:py-8">
    <section class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_25px_80px_-55px_rgba(15,23,42,.45)]">
      <div class="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
        <div><div class="text-[9px] font-black uppercase tracking-[.14em] text-emerald-700">Telegram-like console</div><h1 class="mt-1 text-lg font-black">Ngobrol natural, tanpa AI berbayar</h1></div>
        <span class="flex items-center gap-2 text-[9px] font-bold text-emerald-700"><span class="size-2 rounded-full bg-emerald-400"></span> Rule-based</span>
      </div>

      <div class="h-[520px] overflow-y-auto bg-[#eef4f1] p-4 sm:p-5">
        <div class="space-y-3">
          {#each messages as message}
            <div class={`flex ${message.from === 'admin' ? 'justify-end' : 'justify-start'}`}>
              <div class={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-[11px] leading-5 shadow-sm sm:max-w-[72%] ${message.from === 'admin' ? 'rounded-br-md bg-emerald-500 text-white' : 'rounded-bl-md bg-white text-slate-700'}`}>
                {message.text}
                {#if message.action}
                  <div class="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-3">
                    <button onclick={() => confirmAction(message)} class={`rounded-xl px-3 py-2 text-[9px] font-black ${message.action.type === 'approve' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}`}>{message.action.type === 'approve' ? '✅ Ya, approve' : '❌ Ya, tolak'}</button>
                    <button onclick={() => cancelAction(message)} class="rounded-xl bg-slate-100 px-3 py-2 text-[9px] font-black text-slate-500">Batal</button>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
          <div id="chat-end"></div>
        </div>
      </div>

      <div class="border-t border-slate-100 bg-white p-3 sm:p-4">
        <div class="mb-3 flex gap-2 overflow-x-auto pb-1">
          {#each quickPrompts as prompt}
            <button onclick={() => send(prompt)} class="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[9px] font-bold text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700">{prompt}</button>
          {/each}
        </div>
        <form onsubmit={(event) => { event.preventDefault(); send(); }} class="flex gap-2">
          <input bind:value={input} placeholder="Contoh: approve yang Rayhandi" class="h-11 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs outline-none focus:border-emerald-400" />
          <button class="h-11 rounded-2xl bg-emerald-400 px-5 text-[10px] font-black text-emerald-950">Kirim</button>
        </form>
      </div>
    </section>

    <aside class="space-y-4">
      <div class="rounded-[24px] bg-[#071d14] p-5 text-white">
        <div class="text-[9px] font-black uppercase tracking-[.14em] text-emerald-300">Yang didemokan</div>
        <h2 class="mt-2 text-lg font-black">Admin nggak perlu hafal command.</h2>
        <p class="mt-3 text-[10px] leading-5 text-white/50">Parser membaca variasi kalimat sederhana, mencari booking yang dimaksud, lalu meminta konfirmasi sebelum aksi sensitif.</p>
      </div>

      <div class="rounded-[24px] border border-slate-200 bg-white p-4">
        <div class="text-[9px] font-black uppercase tracking-wider text-slate-400">State demo</div>
        <div class="mt-3 space-y-2">
          {#each bookings as booking}
            <div class="rounded-2xl bg-slate-50 p-3">
              <div class="flex items-center justify-between gap-2"><span class="text-[10px] font-black">{booking.customer}</span><span class={`rounded-full px-2 py-1 text-[8px] font-black ${booking.payment === 'PAID' ? 'bg-emerald-100 text-emerald-700' : booking.payment === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{booking.payment}</span></div>
              <div class="mt-1 text-[8px] text-slate-400">{booking.id} • {booking.venue}</div>
            </div>
          {/each}
        </div>
      </div>

      <div class="rounded-[24px] border border-blue-100 bg-blue-50 p-4 text-[9px] leading-5 text-blue-800"><b>Catatan:</b> halaman ini sengaja DEMO. Integrasi Telegram production memakai webhook, secret header, Supabase secret key di server, dan audit log.</div>
    </aside>
  </main>
</div>
