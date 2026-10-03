'use client';

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';
import {
  THEME_STORAGE_KEY,
  applyTheme,
  readStoredTheme,
  syncChromeToPage,
  systemPrefersDark,
} from '../lib/theme';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// The `dark` class on <html> is the single source of truth: the pre-paint
// script in the root layout sets it, and React reads it from there — so the
// toggle can never disagree with what is on screen.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}
const isDarkNow = () => document.documentElement.classList.contains('dark');
// The server can't know; the class is already right before hydration, and
// React re-reads it straight after.
const isDarkOnServer = () => false;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const isDark = useSyncExternalStore(subscribe, isDarkNow, isDarkOnServer);

  useEffect(() => {
    syncChromeToPage();

    // Follow the device's light/dark switch live — unless the visitor picked a theme here.
    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const onSystemChange = (e: MediaQueryListEvent) => {
      if (!readStoredTheme()) applyTheme(e.matches);
    };
    media?.addEventListener('change', onSystemChange);

    // A choice made in another tab applies here too.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY && e.key !== null) return;
      const stored = readStoredTheme();
      applyTheme(stored ? stored === 'dark' : systemPrefersDark());
    };
    window.addEventListener('storage', onStorage);

    return () => {
      media?.removeEventListener('change', onSystemChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setTheme = useCallback((theme: 'dark' | 'light') => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Not remembered across visits; the switch still applies now.
    }
    applyTheme(theme === 'dark');
  }, []);

  const toggleTheme = useCallback(() => setTheme(isDarkNow() ? 'light' : 'dark'), [setTheme]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
