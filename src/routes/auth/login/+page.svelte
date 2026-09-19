<script lang="ts">
  let { data, form } = $props();
  let mode = $state<'login' | 'signup'>('login');
</script>

<svelte:head><title>Masuk — ArenaBook</title></svelte:head>

<div class="min-h-screen bg-[#f4f7f5] px-4 py-10 text-slate-900">
  <div class="mx-auto max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-40px_rgba(15,23,42,.35)] sm:p-8">
    <div class="mb-6">
      <div class="text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">ArenaBook</div>
      <h1 class="mt-2 text-2xl font-black tracking-tight">{mode === 'login' ? 'Masuk ke akun' : 'Buat akun baru'}</h1>
      <p class="mt-1 text-[11px] leading-5 text-slate-500">Booking asli memakai Supabase Auth dan session cookie SvelteKit.</p>
    </div>

    {#if !data.backendReady}
      <div class="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-5 text-amber-800">Backend belum diberi environment Supabase.</div>
    {/if}
    {#if form?.message}
      <div class={`mb-4 rounded-2xl border p-3 text-[10px] leading-5 ${form?.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{form.message}</div>
    {/if}

    <div class="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
      <button type="button" onclick={() => mode = 'login'} class={`rounded-lg py-2 text-[10px] font-bold ${mode === 'login' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'}`}>Masuk</button>
      <button type="button" onclick={() => mode = 'signup'} class={`rounded-lg py-2 text-[10px] font-bold ${mode === 'signup' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'}`}>Daftar</button>
    </div>

    <form method="POST" action={mode === 'login' ? '?/login' : '?/signup'} class="space-y-3">
      {#if mode === 'signup'}
        <label class="block text-[10px] font-bold text-slate-500">Nama lengkap<input name="full_name" class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-400" /></label>
      {/if}
      <label class="block text-[10px] font-bold text-slate-500">Email<input name="email" type="email" autocomplete="email" value={form?.email ?? ''} class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-400" /></label>
      <label class="block text-[10px] font-bold text-slate-500">Password<input name="password" type="password" minlength="8" autocomplete={mode === 'login' ? 'current-password' : 'new-password'} class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-400" /></label>
      <button disabled={!data.backendReady} class="mt-2 h-11 w-full rounded-xl bg-emerald-400 text-xs font-black text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">{mode === 'login' ? 'Masuk' : 'Daftar akun'}</button>
    </form>

    <div class="my-5 flex items-center gap-3 text-[9px] font-bold uppercase tracking-wider text-slate-300"><span class="h-px flex-1 bg-slate-200"></span>Belum terverifikasi?<span class="h-px flex-1 bg-slate-200"></span></div>

    <form method="POST" action="?/resend" class="space-y-2">
      <label class="block text-[10px] font-bold text-slate-500">Email akun<input name="email" type="email" autocomplete="email" value={form?.email ?? ''} placeholder="nama@email.com" class="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-400" /></label>
      <button disabled={!data.backendReady} class="h-10 w-full rounded-xl border border-emerald-200 bg-emerald-50 text-[10px] font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50">Kirim ulang email konfirmasi</button>
    </form>
  </div>
</div>
