'use client';

// Stats Empire, SportSelector
//
// Step 2 of the freemium flow. The user picks exactly one of the five sports
// from the SPORTS registry. Rendered as a premium, keyboard-navigable card grid
// (radiogroup semantics) with a distinct lucide icon per sport. Selecting a card
// fires onSelect(key); the parent advances the flow.
//
// Theme-tokenized and reduced-motion safe. The "free" promise is reinforced in
// the section header so the message never disappears between steps.

import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  CircleDot,
  Dribbble,
  Gift,
  Target,
  Trophy,
  Volleyball,
  type LucideIcon,
} from 'lucide-react';
import { SPORTS } from '@/lib/sports';
import type { SportKey } from '@/lib/types';

export interface SportSelectorProps {
  /** Currently highlighted sport (controlled), if any. */
  value?: SportKey | null;
  /** Fired when a sport card is chosen. */
  onSelect: (key: SportKey) => void;
}

// Per-sport icon + a short "what you'll see" hook to telegraph the depth.
const SPORT_ICONS: Record<SportKey, LucideIcon> = {
  baseball: CircleDot,
  afl: Trophy,
  basketball: Dribbble,
  tennis: Volleyball,
  soccer: Target,
};

export default function SportSelector({ value, onSelect }: SportSelectorProps) {
  const reduce = useReducedMotion();

  return (
    <section aria-labelledby="sport-selector-title" className="w-full">
      <header className="mb-6 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent1/40 bg-accent1/10 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-widest text-accent1">
          <Gift className="h-3.5 w-3.5" aria-hidden />
          Free game included
        </div>
        <h2
          id="sport-selector-title"
          className="font-display text-2xl font-bold text-text sm:text-3xl"
        >
          Pick your sport
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Choose one and we&apos;ll unlock a complete, professionally-analyzed game, spatial
          charts, advanced metrics and trends, on the house.
        </p>
      </header>

      <div
        role="radiogroup"
        aria-label="Select a sport"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {SPORTS.map((sport, i) => {
          const Icon = SPORT_ICONS[sport.key];
          const selected = value === sport.key;
          return (
            <motion.button
              key={sport.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(sport.key)}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : i * 0.05 }}
              whileHover={reduce ? undefined : { y: -3 }}
              className={[
                'group relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-5 text-left transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2',
                selected
                  ? 'border-accent1 bg-accent1/[0.07]'
                  : 'border-border bg-surface hover:border-accent1/50 hover:bg-surfaceAlt',
              ].join(' ')}
            >
              {/* Hover/selected accent wash */}
              <span
                aria-hidden
                className={[
                  'pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent1 blur-2xl transition-opacity',
                  selected ? 'opacity-20' : 'opacity-0 group-hover:opacity-10',
                ].join(' ')}
              />

              <div className="flex items-center justify-between">
                <span
                  className={[
                    'flex h-11 w-11 items-center justify-center rounded-xl border transition-colors',
                    selected
                      ? 'border-accent1 bg-accent1/15 text-accent1'
                      : 'border-border bg-bg text-text group-hover:text-accent1',
                  ].join(' ')}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <ArrowRight
                  aria-hidden
                  className={[
                    'h-4 w-4 transition-all',
                    selected
                      ? 'text-accent1'
                      : 'translate-x-[-4px] text-muted opacity-0 group-hover:translate-x-0 group-hover:opacity-100',
                  ].join(' ')}
                />
              </div>

              <div>
                <h3 className="font-display text-base font-bold text-text">{sport.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">{sport.tagline}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
