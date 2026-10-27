<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  interface Props {
    children?: Snippet;
    class?: string;
  }

  let { children, class: className = '' }: Props = $props();
</script>

<div class={cn('rounded-[26px] border border-slate-200/75 bg-white/92 shadow-[0_18px_55px_-38px_rgba(15,23,42,.34)] backdrop-blur-sm transition-[box-shadow,border-color] duration-200', className)}>
  {@render children?.()}
</div>