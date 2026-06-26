'use client';

// Stats Empire, BentoTile
//
// The framed container that gives the report its "bento box" identity. A tile
// is a premium, composed card: a mono eyebrow kicker, a display title, an
// optional trailing meta slot, and a body that holds a viz primitive. Tiles
// carry their own grid span via `className` from the parent so the grid reads
// as deliberately composed (a hero, a couple of mediums, a wide strip) rather
// than a uniform wall of identical cards.
//
// Theme-tokenized throughout (var(--color-*) via Tailwind utilities). Tiles are
// kept calm: no corner glow, restrained borders, and only a gentle body
// cross-fade when the active sport changes. Reduced-motion safe throughout.

import clsx from 'clsx';
import { motion, useReducedMotion } from 'framer-motion';
import type { Key, ReactNode } from 'react';

export interface BentoTileProps {
  /** Mono kicker above the title, e.g. "Spatial" / "Coverage". */
  eyebrow?: string;
  /** Display-font tile title. */
  title?: string;
  /** Optional right-aligned meta (chip, count, legend). */
  meta?: ReactNode;
  /** Tile body, typically a viz primitive or composed stack. */
  children: ReactNode;
  /**
   * When set, the tile BODY cross-fades whenever this key changes (e.g. the
   * active sport). The framed tile itself stays mounted, so the morph is
   * smooth and never stalls. Reduced-motion → instant swap.
   */
  contentKey?: Key;
  /**
   * Reveal order within the grid. Drives a small, capped stagger so the tiles
   * cascade in a deliberate reading-order sequence (hero first, then across and
   * down) rather than every tile animating at once. Default 0.
   */
  index?: number;
  /**
   * When true the body becomes a flush, edge-to-edge surface (used by spatial
   * tiles so the pitch bleeds to the tile border). Default false keeps padding.
   */
  flushBody?: boolean;
  /** Accent the tile border (used to make the hero tile dominant). */
  hero?: boolean;
  /** Grid span + sizing classes from the parent grid. */
  className?: string;
}

// Per-tile entrance stagger so the grid cascades in a deliberate reading order
// rather than every tile arriving at once. Capped so the full sweep stays brisk.
const STAGGER_STEP = 0.08; // s per tile
const STAGGER_CAP = 0.42; // s, so the full cascade never feels slow

export default function BentoTile({
  eyebrow,
  title,
  meta,
  children,
  contentKey,
  index = 0,
  flushBody = false,
  hero = false,
  className,
}: BentoTileProps) {
  const prefersReduced = useReducedMotion();

  // The tile FRAME reveals in a precise order driven by `index` (a small, capped
  // stagger → a deliberate reading-order cascade, never random). The entrance is
  // a COMPOSITOR-driven CSS keyframe (`.bento-tile-in`), NOT a JS/rAF animation,
  // chosen deliberately for two guarantees:
  //  1. SSR / no-JS / reduced-motion safe. The tile's resting state is full
  //     opacity; the keyframe only animates FROM hidden, so if it never runs the
  //     tile still reads fully visible. The frame can therefore NEVER permanently
  //     gate the viz inside it. (The global prefers-reduced-motion rule in
  //     globals.css collapses the duration, so reduced-motion users get an
  //     instant snap to the visible resting state.)
  //  2. It does not fight the child viz. Each viz owns its OWN useInView draw-on;
  //     the frame entrance is a separate, additive CSS layer that always settles
  //     visible, so the viz animate independently when first seen.
  const delay = Math.min(index * STAGGER_STEP, STAGGER_CAP);

  return (
    <motion.section
      // `layout` keeps the grid morph smooth when tiles reflow across sport
      // changes. The entrance itself is CSS (see `.bento-tile-in` below), kept
      // off framer so the resting state is always visible without rAF.
      layout
      className={clsx(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-surface',
        hero ? 'border-accent1/30' : 'border-border',
        'transition-colors hover:border-border/70',
        // Reduced motion: skip the entrance class entirely (the tile renders at
        // its visible resting state). Otherwise play the staggered CSS rise.
        !prefersReduced && 'bento-tile-in',
        className,
      )}
      style={prefersReduced ? undefined : { animationDelay: `${delay}s` }}
    >
      {(eyebrow || title || meta) && (
        <header className="relative flex items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6 lg:px-7 lg:pt-7">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.22em] text-accent1 sm:text-[0.75rem] lg:text-[0.875rem]">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h3 className="mt-1.5 truncate font-display text-lg font-semibold tracking-tight text-text sm:text-2xl lg:text-[1.75rem] lg:leading-tight">
                {title}
              </h3>
            ) : null}
          </div>
          {meta ? <div className="shrink-0 text-right">{meta}</div> : null}
        </header>
      )}

      <div
        className={clsx(
          'relative flex min-h-0 flex-1 flex-col',
          flushBody ? 'mt-4' : 'p-5 pt-3 sm:p-6 sm:pt-3 lg:px-7 lg:pb-7',
        )}
      >
        {contentKey !== undefined ? (
          // Keyed body fade: changing `contentKey` (the active sport) remounts
          // this subtree, so React swaps in the new children immediately and
          // framer-motion plays a quick fade. No AnimatePresence / exit, so the
          // swap can never stall. `animate` always targets opacity 1, so even
          // mid-flight the body resolves visible, so it never gates the viz.
          // Reduced-motion → instant swap.
          <motion.div
            key={contentKey}
            className="flex min-h-0 flex-1 flex-col"
            initial={prefersReduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: prefersReduced ? 0 : 0.28, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        ) : (
          children
        )}
      </div>
    </motion.section>
  );
}
