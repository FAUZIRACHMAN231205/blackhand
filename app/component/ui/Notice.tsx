import type { ReactNode } from 'react';
import { cx } from './cx';

/**
 * A boxed message inside a page, told apart by shape like the tags:
 *   info    — solid rule: something to know (Milik Anda, Terjual)
 *   pending — dashed rule: something temporary (Sedang dibeli, menunggu bayar)
 *   error   — red text: what went wrong and how to fix it
 */
export type NoticeTone = 'info' | 'pending' | 'error';

const TONES: Record<NoticeTone, string> = {
  info: 'border-ink',
  pending: 'border-dashed border-ink',
  error: 'border-accent-text',
};

export default function Notice({
  tone = 'info',
  title,
  children,
  action,
  className,
}: {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  /** A button or link placed after the text. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={cx('grid gap-1.5 border px-4 py-3 font-sans text-sm', TONES[tone], className)}
    >
      {title && (
        <p
          className={cx(
            'text-[11px] font-bold uppercase tracking-[0.18em]',
            tone === 'error' ? 'text-accent-text' : 'text-ink'
          )}
        >
          {title}
        </p>
      )}
      {children && (
        <div className={cx('leading-relaxed', tone === 'error' ? 'text-accent-text' : 'text-mute')}>{children}</div>
      )}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
