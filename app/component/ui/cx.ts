/** Join class names, skipping empty ones: cx('a', cond && 'b'). */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Visible keyboard focus, the same everywhere: a 2px accent-text outline. */
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-accent-text';
