<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  interface Props { children?: Snippet; tone?: Tone; class?: string; }
  let { children, tone = 'neutral', class: className = '' }: Props = $props();

  const tones: Record<Tone, string> = {
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    warning: 'bg-amber-50 text-amber-700 ring-amber-600/10',
    danger: 'bg-rose-50 text-rose-700 ring-rose-600/10',
    neutral: 'bg-slate-100 text-slate-600 ring-slate-600/10',
    info: 'bg-sky-50 text-sky-700 ring-sky-600/10'
  };
</script>

<span class={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ring-1 ring-inset', tones[tone], className)}>
  {@render children?.()}
</span>
