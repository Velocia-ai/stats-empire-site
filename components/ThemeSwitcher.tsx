'use client';

import clsx from 'clsx';
import { useTheme } from '@/components/ThemeProvider';
import type { ThemeKey } from '@/lib/types';

const THEME_OPTIONS: { key: ThemeKey; label: string; name: string }[] = [
  { key: 'evolved', label: 'A', name: 'Evolved Empire' },
  { key: 'court', label: 'B', name: 'Court Vision' },
  { key: 'precision', label: 'C', name: 'Precision Grid' },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1"
    >
      {THEME_OPTIONS.map((option) => {
        const active = theme === option.key;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${option.name} theme`}
            title={option.name}
            onClick={() => setTheme(option.key)}
            className={clsx(
              'flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-semibold transition-colors',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2',
              active
                ? 'bg-accent1 text-bg'
                : 'text-muted hover:text-text hover:bg-surfaceAlt',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default ThemeSwitcher;
