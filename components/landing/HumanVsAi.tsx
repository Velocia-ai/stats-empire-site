'use client';

// Stats Empire, HumanVsAi
//
// An advanced two-column comparison grid across the dimensions coaches care
// about (HUMAN_VS_AI.rows): pure-AI auto-trackers vs the human-led, AI-assisted
// (hybrid) approach. The "Stats Empire · Hybrid" column is the highlighted
// winner: a glowing lime accent1 rail, a chalk underline on the header, and a
// check chip on every cell, while the "AI / auto" column stays muted with a
// warning-orange cross chip.
//
// Layout: on mobile each row becomes a stacked mini-card (dimension label, then
// the two contrasting values). From md up it's a true aligned grid with a
// sticky-feel highlighted middle column and a header that draws its chalk
// underline on scroll.
//
// Reduced-motion safe throughout.

import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import clsx from 'clsx';
import { HUMAN_VS_AI } from '@/lib/content';
import type { HumanVsAi as HumanVsAiContent } from '@/lib/content';
import { ChalkUnderline } from './ChalkLines';

interface HumanVsAiProps {
  content?: HumanVsAiContent;
  className?: string;
}

export default function HumanVsAi({ content = HUMAN_VS_AI, className }: HumanVsAiProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px -10% 0px' });
  const show = reduce ? true : inView;

  return (
    <section
      id="human-vs-ai"
      aria-labelledby="hva-heading"
      className={clsx('relative w-full px-5 py-20 sm:px-8 sm:py-28', className)}
    >
      <div className="mx-auto max-w-5xl">
        <header className="max-w-2xl">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-accent1">
            {content.eyebrow}
          </p>
          <h2
            id="hva-heading"
            className="mt-4 font-display text-3xl font-bold leading-[1.05] text-text sm:text-4xl md:text-5xl"
          >
            {content.headline}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
            {content.subhead}
          </p>
        </header>

        <div
          ref={ref}
          role="table"
          aria-label="Hybrid, human-led plus AI-assisted, versus pure-AI trackers, by dimension"
          className="mt-12 overflow-hidden rounded-3xl border border-border bg-surface/40"
        >
          {/* Header row (hidden on mobile; the dimension label heads each card instead) */}
          <div
            role="row"
            className="hidden grid-cols-[1.1fr_1fr_1.1fr] items-end gap-px border-b border-border md:grid"
          >
            <div role="columnheader" className="px-5 py-4">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted">
                Dimension
              </span>
            </div>
            <div role="columnheader" className="px-5 py-4">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-accent2/90">
                Pure-AI auto-trackers
              </span>
            </div>
            {/* Highlighted winner column header */}
            <div
              role="columnheader"
              className="relative px-5 py-4 before:absolute before:inset-x-0 before:top-0 before:h-full before:bg-accent1/[0.05]"
            >
              <span className="relative inline-flex flex-col">
                <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-accent1">
                  Stats Empire · Hybrid
                </span>
                <span className="mt-1.5 block w-full">
                  <ChalkUnderline delay={0.2} />
                </span>
              </span>
            </div>
          </div>

          {/* Data rows */}
          <div role="rowgroup">
            {content.rows.map((row, idx) => (
              <motion.div
                key={row.dimension}
                role="row"
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={show ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: 0.45, delay: idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
                className={clsx(
                  'grid grid-cols-1 gap-px border-b border-border last:border-b-0',
                  'md:grid-cols-[1.1fr_1fr_1.1fr] md:items-stretch',
                )}
              >
                {/* Dimension */}
                <div role="rowheader" className="px-5 pt-5 md:flex md:items-center md:py-5">
                  <span className="font-display text-sm font-semibold text-text md:text-base">
                    {row.dimension}
                  </span>
                </div>

                {/* AI cell */}
                <div
                  role="cell"
                  className="flex items-start gap-2.5 px-5 pb-2 pt-3 md:items-center md:py-5"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent2/15 text-accent2 md:mt-0"
                  >
                    <X className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-sm leading-snug text-muted">{row.ai}</span>
                </div>

                {/* Human cell, highlighted winner column */}
                <div
                  role="cell"
                  className={clsx(
                    'relative flex items-start gap-2.5 px-5 pb-5 pt-1 md:items-center md:py-5',
                    'before:absolute before:inset-0 before:bg-accent1/[0.05]',
                    'md:before:border-l md:before:border-accent1/20',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="relative mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent1/20 text-accent1 md:mt-0"
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="relative text-sm font-medium leading-snug text-text">
                    {row.human}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
