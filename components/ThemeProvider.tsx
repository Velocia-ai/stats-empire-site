'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ThemeKey } from '@/lib/types';

// Bumped to '-v2' so any value persisted by an earlier build (which defaulted
// to 'evolved') is ignored, Court Vision must win as the new default identity.
const STORAGE_KEY = 'stats-empire-theme-v2';
// Court Vision is the default brand identity. SSR + first client render both
// start here (see app/layout.tsx data-theme="court"). localStorage is written
// ONLY when the user explicitly switches, so the default wins for everyone who
// hasn't deliberately chosen another theme.
const DEFAULT_THEME: ThemeKey = 'court';
const THEME_KEYS: readonly ThemeKey[] = ['evolved', 'court', 'precision'] as const;

function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === 'string' && (THEME_KEYS as readonly string[]).includes(value);
}

interface ThemeContextValue {
  theme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  themes: readonly ThemeKey[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>(DEFAULT_THEME);

  // Hydrate from localStorage after mount (SSR renders DEFAULT_THEME).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isThemeKey(stored)) {
        setThemeState(stored);
      }
    } catch {
      // localStorage may be unavailable (private mode / blocked), ignore.
    }
  }, []);

  // Reflect the active theme onto <html data-theme> so CSS tokens apply.
  // NOTE: we do NOT persist here, persisting the default-on-mount value is what
  // made a stale choice override the default. Persistence happens in setTheme.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback((next: ThemeKey) => {
    setThemeState(next);
    // Persist ONLY on an explicit user choice.
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable (private mode / blocked), ignore.
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, themes: THEME_KEYS }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return ctx;
}
