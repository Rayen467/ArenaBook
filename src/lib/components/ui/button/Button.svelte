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
    default: 'bg-emerald-400 text-emerald-950 hover:bg-emerald-300 shadow-[0_10px_30px_-14px_rgba(52,211,153,.8)]',
    secondary: 'bg-white/8 text-white hover:bg-white/12 border border-white/10',
    outline: 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-200',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
    danger: 'bg-rose-500 text-white hover:bg-rose-400'
  };

  const sizes: Record<Size, string> = {
    sm: 'h-9 px-3 text-xs rounded-xl',
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
    'inline-flex items-center justify-center gap-2 font-semibold transition duration-200 active:scale-[.98] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60',
    variants[variant],
    sizes[size],
    className
  )}
>
  {@render children?.()}
</button>
