<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'danger';
  type Size = 'sm' | 'md' | 'lg' | 'icon';

  interface Props {
    children?: Snippet;
    variant?: Variant;
    size?: Size;
    class?: string;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    onclick?: (event: MouseEvent) => void;
    title?: string;
  }

  let {
    children,
    variant = 'default',
    size = 'md',
    class: className = '',
    type = 'button',
    disabled = false,
    onclick,
    title
  }: Props = $props();

  const variants: Record<Variant, string> = {
    default: 'bg-gradient-to-br from-emerald-300 to-emerald-400 text-emerald-950 hover:from-emerald-200 hover:to-emerald-300 shadow-[0_14px_35px_-18px_rgba(16,185,129,.9)]',
    secondary: 'bg-white/8 text-white hover:bg-white/12 border border-white/10 backdrop-blur',
    outline: 'bg-white/90 text-slate-800 hover:bg-white border border-slate-200 shadow-[0_10px_28px_-24px_rgba(15,23,42,.35)]',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-900/[.05]',
    danger: 'bg-gradient-to-br from-rose-500 to-rose-600 text-white hover:from-rose-400 hover:to-rose-500 shadow-[0_14px_35px_-20px_rgba(244,63,94,.8)]'
  };

  const sizes: Record<Size, string> = {
    sm: 'h-10 px-4 text-xs rounded-xl',
    md: 'h-11 px-4 text-sm rounded-xl',
    lg: 'h-12 px-5 text-sm rounded-2xl',
    icon: 'size-10 rounded-xl'
  };
</script>

<button
  {type}
  {disabled}
  {onclick}
  {title}
  class={cn(
    'inline-flex items-center justify-center gap-2 font-extrabold tracking-[-.01em] transition duration-200 active:scale-[.98] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/15',
    variants[variant],
    sizes[size],
    className
  )}
>
  {@render children?.()}
</button>