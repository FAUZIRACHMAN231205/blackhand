import { ChevronDown } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cx } from './cx';

/**
 * Form fields: an uppercase label, a bottom-ruled control, then a hint or an
 * error. The error is tied to the control (aria-describedby, aria-invalid) so
 * screen readers announce it, and it replaces the hint rather than stacking.
 */
interface FieldChrome {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
}

const CONTROL =
  'w-full rounded-none border-0 border-b border-ink bg-transparent px-0 py-2.5 font-sans text-base text-ink placeholder:text-mute focus:shadow-[inset_0_-1px_0_0_currentColor] focus:outline-none disabled:opacity-50 aria-[invalid=true]:border-accent-text aria-[invalid=true]:text-ink';

function describedBy(id: string, hint: ReactNode, error?: string | null) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

function Chrome({ id, label, hint, error, className, children }: FieldChrome & { children: ReactNode }) {
  return (
    <div className={cx('grid content-start gap-1.5', className)}>
      <label htmlFor={id} className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="font-sans text-xs text-accent-text">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="font-sans text-xs text-mute">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function TextField({
  id,
  label,
  hint,
  error,
  className,
  ...input
}: FieldChrome & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'>) {
  return (
    <Chrome id={id} label={label} hint={hint} error={error} className={className}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cx(CONTROL, 'min-h-11')}
        {...input}
      />
    </Chrome>
  );
}

export function TextAreaField({
  id,
  label,
  hint,
  error,
  className,
  ...textarea
}: FieldChrome & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'>) {
  return (
    <Chrome id={id} label={label} hint={hint} error={error} className={className}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cx(CONTROL, 'resize-y')}
        {...textarea}
      />
    </Chrome>
  );
}

export function SelectField({
  id,
  label,
  hint,
  error,
  className,
  children,
  ...select
}: FieldChrome & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className'>) {
  return (
    <Chrome id={id} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={cx(CONTROL, 'min-h-11 cursor-pointer appearance-none pr-8')}
          {...select}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-ink"
          aria-hidden
        />
      </div>
    </Chrome>
  );
}
