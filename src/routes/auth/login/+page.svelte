<script lang="ts">
  import {
    ArrowLeft, ArrowRight, CalendarCheck2, CheckCircle2, Eye, EyeOff,
    LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound
  } from '@lucide/svelte';

  let { data, form } = $props();
  let mode = $state<'login' | 'signup'>(form?.mode === 'signup' ? 'signup' : 'login');
  let showPassword = $state(false);
  let showConfirm = $state(false);
</script>

<svelte:head>
  <title>{mode === 'login' ? 'Masuk' : 'Daftar'} — ArenaBook</title>
  <meta name="description" content="Masuk atau buat akun ArenaBook untuk booking lapangan dengan cepat dan aman." />
</svelte:head>

<div class="auth-shell min-h-screen text-slate-950">
  <div class="mx-auto grid min-h-screen max-w-[1500px] lg:grid-cols-[1.05fr_.95fr]">
    <section class="auth-brand-panel relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between">
      <div class="auth-grid absolute inset-0 opacity-40"></div>
      <div class="absolute -right-24 top-20 size-80 rounded-full bg-emerald-400/20 blur-3xl"></div>
      <div class="absolute -bottom-28 left-12 size-96 rounded-full bg-lime-300/10 blur-3xl"></div>

      <div class="relative z-10 flex items-center justify-between">
        <a href="/app" class="flex items-center gap-3">
          <div class="grid size-11 place-items-center rounded-2xl bg-emerald-400 text-sm font-black text-emerald-950 shadow-[0_18px_45px_-20px_rgba(52,211,153,.9)]">A</div>
          <div>
            <div class="text-base font-black tracking-[-.02em] text-white">ArenaBook</div>
            <div class="text-[11px] font-semibold text-white/40">Sports booking system</div>
          </div>
        </a>
        <div class="rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-[11px] font-bold text-emerald-200">Secure booking</div>
      </div>

      <div class="relative z-10 max-w-xl">
        <div class="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[.08] px-3 py-1.5 text-[11px] font-bold text-emerald-200">
          <Sparkles size={13}/> Booking yang lebih simpel
        </div>
        <h1 class="max-w-lg text-5xl font-black leading-[1.02] tracking-[-.055em] text-white">
          Main lebih cepat.<br/><span class="text-emerald-300">Booking tanpa ribet.</span>
        </h1>
        <p class="mt-5 max-w-lg text-[15px] leading-7 text-white/48">
          Pilih lapangan, cek slot real-time, tambah perlengkapan, lalu pantau status booking dari satu tempat.
        </p>

        <div class="mt-8 grid gap-3 sm:grid-cols-3">
          <div class="auth-feature-card"><CalendarCheck2 size={18}/><b>Jadwal real-time</b><span>Slot langsung dari database.</span></div>
          <div class="auth-feature-card"><ShieldCheck size={18}/><b>Pembayaran aman</b><span>Diverifikasi admin sebelum lunas.</span></div>
          <div class="auth-feature-card"><CheckCircle2 size={18}/><b>Status jelas</b><span>Booking dan pembayaran mudah dipantau.</span></div>
        </div>
      </div>

      <div class="relative z-10 flex items-center justify-between text-[11px] text-white/28">
        <span>ArenaBook • Production</span>
        <span>Supabase Auth + PostgreSQL</span>
      </div>
    </section>

    <section class="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
      <div class="w-full max-w-[520px]">
        <div class="mb-8 flex items-center justify-between lg:hidden">
          <a href="/app" class="flex items-center gap-3">
            <div class="grid size-10 place-items-center rounded-2xl bg-arena-950 text-sm font-black text-emerald-300">A</div>
            <div>
              <div class="text-sm font-black">ArenaBook</div>
              <div class="text-[10px] text-slate-400">Sports booking</div>
            </div>
          </a>
          <a href="/app" class="grid size-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500"><ArrowLeft size={16}/></a>
        </div>

        <div class="mb-7">
          <div class="text-[11px] font-black uppercase tracking-[.18em] text-emerald-700">
            {mode === 'login' ? 'Selamat datang kembali' : 'Buat akun ArenaBook'}
          </div>
          <h2 class="mt-2 text-3xl font-black tracking-[-.04em]">
            {mode === 'login' ? 'Masuk ke akun kamu' : 'Mulai booking lapangan'}
          </h2>
          <p class="mt-2 text-sm leading-6 text-slate-500">
            {mode === 'login'
              ? 'Gunakan email dan password yang sudah terdaftar.'
              : 'Daftar sekali, konfirmasi email, lalu akun langsung bisa dipakai untuk booking.'}
          </p>
        </div>

        <div class="mb-6 grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5">
          <button
            type="button"
            onclick={() => mode = 'login'}
            class={`rounded-xl px-4 py-3 text-sm font-bold transition ${mode === 'login' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >Masuk</button>
          <button
            type="button"
            onclick={() => mode = 'signup'}
            class={`rounded-xl px-4 py-3 text-sm font-bold transition ${mode === 'signup' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >Daftar akun</button>
        </div>

        {#if !data.backendReady}
          <div class="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            Backend ArenaBook belum terhubung. Coba lagi setelah konfigurasi Supabase aktif.
          </div>
        {/if}

        {#if form?.message}
          <div class={`mb-5 flex gap-3 rounded-2xl border p-4 text-sm leading-6 ${form?.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
            <div class={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${form?.success ? 'bg-emerald-100' : 'bg-rose-100'}`}>
              {#if form?.success}<CheckCircle2 size={14}/>{:else}<span class="text-xs font-black">!</span>{/if}
            </div>
            <div>{form.message}</div>
          </div>
        {/if}

        {#if mode === 'login'}
          <form method="POST" action="?/login" class="space-y-4">
            <label class="auth-label">
              <span>Email</span>
              <div class="auth-input-wrap">
                <Mail size={17}/>
                <input name="email" type="email" autocomplete="email" value={form?.email ?? ''} placeholder="nama@email.com" required />
              </div>
            </label>

            <label class="auth-label">
              <span>Password</span>
              <div class="auth-input-wrap">
                <LockKeyhole size={17}/>
                <input name="password" type={showPassword ? 'text' : 'password'} autocomplete="current-password" placeholder="Masukkan password" required />
                <button type="button" aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} onclick={() => showPassword = !showPassword} class="auth-eye">
                  {#if showPassword}<EyeOff size={17}/>{:else}<Eye size={17}/>{/if}
                </button>
              </div>
            </label>

            <button disabled={!data.backendReady} class="auth-primary-button">
              Masuk ke ArenaBook <ArrowRight size={17}/>
            </button>
          </form>

          <div class="mt-6 rounded-2xl border border-slate-200 bg-white/70 p-4 text-center text-sm text-slate-500">
            Belum punya akun?
            <button type="button" onclick={() => mode = 'signup'} class="ml-1 font-black text-emerald-700 hover:text-emerald-600">Daftar sekarang</button>
          </div>
        {:else}
          <form method="POST" action="?/signup" class="space-y-4">
            <label class="auth-label">
              <span>Nama lengkap</span>
              <div class="auth-input-wrap">
                <UserRound size={17}/>
                <input name="full_name" autocomplete="name" value={form?.fullName ?? ''} placeholder="Nama sesuai identitas" required />
              </div>
            </label>

            <label class="auth-label">
              <span>Email</span>
              <div class="auth-input-wrap">
                <Mail size={17}/>
                <input name="email" type="email" autocomplete="email" value={form?.email ?? ''} placeholder="nama@email.com" required />
              </div>
            </label>

            <label class="auth-label">
              <span>Password</span>
              <div class="auth-input-wrap">
                <LockKeyhole size={17}/>
                <input name="password" type={showPassword ? 'text' : 'password'} minlength="8" autocomplete="new-password" placeholder="Minimal 8 karakter" required />
                <button type="button" aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} onclick={() => showPassword = !showPassword} class="auth-eye">
                  {#if showPassword}<EyeOff size={17}/>{:else}<Eye size={17}/>{/if}
                </button>
              </div>
            </label>

            <label class="auth-label">
              <span>Ulangi password</span>
              <div class="auth-input-wrap">
                <LockKeyhole size={17}/>
                <input name="password_confirm" type={showConfirm ? 'text' : 'password'} minlength="8" autocomplete="new-password" placeholder="Ketik ulang password" required />
                <button type="button" aria-label={showConfirm ? 'Sembunyikan password' : 'Tampilkan password'} onclick={() => showConfirm = !showConfirm} class="auth-eye">
                  {#if showConfirm}<EyeOff size={17}/>{:else}<Eye size={17}/>{/if}
                </button>
              </div>
            </label>

            <div class="flex items-start gap-2 rounded-2xl bg-emerald-50 px-3.5 py-3 text-xs leading-5 text-emerald-800">
              <ShieldCheck size={16} class="mt-0.5 shrink-0"/>
              <span>Setelah daftar, buka email ArenaBook dan klik link konfirmasi sebelum login.</span>
            </div>

            <button disabled={!data.backendReady} class="auth-primary-button">
              Buat akun <ArrowRight size={17}/>
            </button>
          </form>

          <div class="mt-6 rounded-2xl border border-slate-200 bg-white/70 p-4 text-center text-sm text-slate-500">
            Sudah punya akun?
            <button type="button" onclick={() => mode = 'login'} class="ml-1 font-black text-emerald-700 hover:text-emerald-600">Masuk</button>
          </div>

          <div class="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,.4)]">
            <div class="text-sm font-black">Belum menerima email konfirmasi?</div>
            <p class="mt-1 text-xs leading-5 text-slate-500">Masukkan email akun yang sudah didaftarkan. Kami kirim link baru.</p>
            <form method="POST" action="?/resend" class="mt-3 flex flex-col gap-2 sm:flex-row">
              <div class="auth-input-wrap min-w-0 flex-1">
                <Mail size={16}/>
                <input name="email" type="email" autocomplete="email" value={form?.email ?? ''} placeholder="nama@email.com" required />
              </div>
              <button disabled={!data.backendReady} class="h-12 shrink-0 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50">
                Kirim ulang
              </button>
            </form>
          </div>
        {/if}
      </div>
    </section>
  </div>
</div>