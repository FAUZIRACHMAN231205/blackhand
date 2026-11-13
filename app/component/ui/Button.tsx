import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cx, focusRing } from './cx';

/**
 * buy       — the one Beli / Bayar action on a screen (dark red)
 * primary   — any other main action (ink)
 * secondary — a second action (outlined)
 * ghost     — cancel / back (underlined text)
 * danger    — delete (dashed outline); always pair with a confirmation step
 */
export type ButtonVariant = 'buy' | 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-none font-sans font-bold uppercase text-center leading-tight transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40';

const VARIANTS: Record<ButtonVariant, string> = {
  buy: 'border border-accent bg-accent text-on-accent hover:opacity-90',
  primary: 'border border-ink bg-ink text-paper hover:opacity-85',
  secondary: 'border border-ink bg-paper text-ink hover:bg-ink hover:text-paper',
  ghost: 'border border-transparent text-ink underline underline-offset-[5px] hover:text-mute',
  danger: 'border border-dashed border-ink bg-paper text-ink hover:bg-ink hover:text-paper',
};

const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-12 px-6 text-[11px] tracking-[0.18em]',
  sm: 'min-h-11 px-4 text-[10px] tracking-[0.16em]',
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

type AsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
    /** Shows a spinner and disables the button while an action runs. */
    loading?: boolean;
  };

type AsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps | 'href'> & {
    /** Renders a link styled as a button. */
    href: string;
  };

export type ButtonProps = AsButton | AsLink;

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = cx(
    BASE,
    VARIANTS[variant],
    SIZES[size],
    variant === 'ghost' && 'px-2',
    fullWidth && 'w-full',
    focusRing,
    className
  );

  if (rest.href !== undefined) {
    const { href, ...anchor } = rest as Omit<AsLink, keyof CommonProps>;
    return (
      <Link href={href} className={classes} {...anchor}>
        {children}
      </Link>
    );
  }

  const { loading = false, disabled, type, ...button } = rest as Omit<AsButton, keyof CommonProps>;
  return (
    <button
      type={type ?? 'button'}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...button}
    >
      {loading && <Loader2 size={14} className="shrink-0 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
