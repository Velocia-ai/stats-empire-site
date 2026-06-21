'use client';

// Stats Empire, SportToggle
//
// Segmented control that drives the report's active sport. Implemented as a
// proper radiogroup (roving-tabindex + arrow-key navigation) for keyboard and
// screen-reader users. The active selection is marked by a framer-motion pill
// that slides between options via a shared layoutId, reduced-motion safe (the
// pill snaps instead of sliding when the user prefers reduced motion).

import clsx from 'clsx';
import { motion, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import type { SportKey, SportMeta } from '@/lib/types';

export interface SportToggleProps {
  /** Ordered options to render (typically SPORTS from the registry). */
  sports: SportMeta[];
  /** Currently selected sport key. */
  value: SportKey;
  /** Fired when the user picks a different sport. */
  onChange: (key: SportKey) => void;
  /** Optional extra classes for the outer container. */
  className?: string;
}

/** Short labels keep the segmented control compact on small screens. */
const SHORT_LABEL: Record<SportKey, string> = {
  baseball: 'Baseball',
  americanfootball: 'Football',
  basketball: 'Basketball',
  tennis: 'Tennis',
  soccer: 'Soccer',
};

export default function SportToggle({
  sports,
  value,
  onChange,
  className,
}: SportToggleProps) {
  const prefersReduced = useReducedMotion();
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeIndex = sports.findIndex((s) => s.key === value);

  // Arrow-key roving focus across the radiogroup (WAI-ARIA radiogroup pattern).
  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    let next = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = (index + 1) % sports.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = (index - 1 + sports.length) % sports.length;
    } else if (e.key === 'Home') {
      next = 0;
    } else if (e.key === 'End') {
      next = sports.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    onChange(sports[next].key);
    btnRefs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Select sport"
      className={clsx(
        'inline-flex flex-wrap items-center gap-1 rounded-full border border-border bg-surface p-1',
        className,
      )}
    >
      {sports.map((sport, i) => {
        const selected = sport.key === value;
        return (
          <button
            key={sport.key}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            // Roving tabindex: only the active option is in the tab order.
            tabIndex={selected || (activeIndex === -1 && i === 0) ? 0 : -1}
            onClick={() => onChange(sport.key)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={clsx(
              'relative isolate inline-flex min-h-[44px] items-center rounded-full px-4 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.12em] transition-colors sm:px-4 sm:text-xs',
              selected ? 'text-bg' : 'text-muted hover:text-text',
            )}
          >
            {selected ? (
              <motion.span
                layoutId="sport-toggle-pill"
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-full bg-accent1"
                transition={
                  prefersReduced
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 420, damping: 34 }
                }
              />
            ) : null}
            {SHORT_LABEL[sport.key]}
          </button>
        );
      })}
    </div>
  );
}
