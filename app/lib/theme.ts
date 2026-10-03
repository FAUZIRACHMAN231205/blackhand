// Light/dark theme, shared by the root layout's pre-paint script and ThemeContext.

/** localStorage key: 'dark' | 'light' when the visitor chose one; absent means "follow the device". */
export const THEME_STORAGE_KEY = 'theme';

/** Browser chrome colour (status bar, task switcher) for each theme. Matches the page backgrounds. */
export const THEME_COLORS = { light: '#ffffff', dark: '#020617' } as const;

/**
 * Runs inline in <head>, before the first paint, so a dark-mode visitor never
 * sees the light page flash first. Kept tiny and dependency-free; any failure
 * (e.g. storage blocked) just leaves the light default.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

/** The visitor's stored choice, or null to follow the device. */
export function readStoredTheme(): 'dark' | 'light' | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Point every theme-color meta tag at the active theme, overriding their media queries. */
function syncThemeColor(dark: boolean) {
  const color = dark ? THEME_COLORS.dark : THEME_COLORS.light;
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute('content', color));
}

/**
 * Switch the page to a theme in one frame. Transitions are suspended while the
 * class flips — otherwise dozens of elements fade over 300 ms while the rest
 * snap, and the switch looks sluggish and torn.
 */
export function applyTheme(dark: boolean) {
  const root = document.documentElement;
  const freeze = document.createElement('style');
  freeze.textContent = '*,*::before,*::after{transition:none!important}';
  document.head.appendChild(freeze);

  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  syncThemeColor(dark);

  // Force the new styles to compute before transitions come back.
  void window.getComputedStyle(document.body).opacity;
  setTimeout(() => freeze.remove(), 1);
}

/** Bring browser chrome in line with whatever the pre-paint script chose. */
export function syncChromeToPage() {
  syncThemeColor(document.documentElement.classList.contains('dark'));
}
