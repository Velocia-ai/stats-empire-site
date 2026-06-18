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
// Theme-tokenized throughout (var(--color-*) via Tailwind utilities); the only
// motion is a layout-aware entrance handled by the parent's AnimatePresence.

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
   * When true the body becomes a flush, edge-to-edge surface (used by spatial
   * tiles so the pitch bleeds to the tile border). Default false keeps padding.
   */
  flushBody?: boolean;
  /** Accent the tile border (used to make the hero tile dominant). */
  hero?: boolean;
  /** Grid span + sizing classes from the parent grid. */
  className?: string;
}

const cardMotion = {
  initial: { opacity: 0, y: 12, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
};

export default function BentoTile({
  eyebrow,
  title,
  meta,
  children,
  contentKey,
  flushBody = false,
  hero = false,
  className,
}: BentoTileProps) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.section
      layout
      {...cardMotion}
      className={clsx(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-surface',
        hero ? 'border-accent1/35' : 'border-border',
        'transition-colors hover:border-accent1/40',
        className,
      )}
    >
      {/* Hero gets a faint corner glow so the eye lands on it first. */}
      {hero ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-accent1/[0.07] blur-2xl"
        />
      ) : null}

      {(eyebrow || title || meta) && (
        <header className="relative flex items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.22em] text-accent1">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h3 className="mt-1 truncate font-display text-base font-semibold tracking-tight text-text sm:text-lg">
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
          flushBody ? 'mt-3' : 'p-4 pt-3 sm:p-5 sm:pt-3',
        )}
      >
        {contentKey !== undefined ? (
          // Keyed body fade-in: changing `contentKey` remounts this subtree, so
          // React swaps in the new children immediately and framer-motion plays
          // a quick fade-in (initial → animate). No AnimatePresence / exit, so
          // there's nothing that can stall the swap. Reduced-motion → instant.
          <motion.div
            key={contentKey}
            className="flex min-h-0 flex-1 flex-col"
            initial={prefersReduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: prefersReduced ? 0 : 0.25, ease: 'easeOut' }}
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
