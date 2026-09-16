<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  interface Props {
    children?: Snippet;
    class?: string;
  }

  let { children, class: className = '' }: Props = $props();
</script>

<div class={cn('rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_55px_-35px_rgba(15,23,42,.28)]', className)}>
  {@render children?.()}
</div>
