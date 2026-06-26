'use client';

// Stats Empire, HumanVsAi
//
// A calm two-column comparison grid across the dimensions coaches care about
// (HUMAN_VS_AI.rows): pure-AI auto-trackers vs the human-led, AI-assisted
// (hybrid) approach. The "Stats Empire · Hybrid" column is the highlighted
// winner, marked with a quiet lime accent1 wash and a check on every cell, while
// the "AI / auto" column stays muted with a neutral cross. Lime is the single
// accent in this marketing section; orange is reserved for the data viz.
//
// Layout: on mobile each row becomes a stacked mini-card (dimension label, then
// the two contrasting values). From md up it's a true aligned grid with the
// highlighted middle column.
//
// Reduced-motion safe throughout via the shared <Reveal> primitive.

import { Check, X } from 'lucide-react';
import clsx from 'clsx';
import { HUMAN_VS_AI } from '@/lib/content';
import type { HumanVsAi as HumanVsAiContent } from '@/lib/content';
import Reveal from '@/components/Reveal';

interface HumanVsAiProps {
  content?: HumanVsAiContent;
  className?: string;
}

export default function HumanVsAi({ content = HUMAN_VS_AI, className }: HumanVsAiProps) {
  return (
    <section
      id="human-vs-ai"
      aria-labelledby="hva-heading"
      className={clsx('relative w-full py-16 sm:py-28 lg:py-32', className)}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal as="header" className="mb-12 max-w-2xl sm:mb-16">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-muted lg:text-sm">
            {content.eyebrow}
          </p>
          <h2
            id="hva-heading"
            className="mt-4 font-display text-[clamp(1.75rem,4.8vw,3.75rem)] font-bold leading-[1.05] text-text"
          >
            {content.headline}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg lg:text-xl">
            {content.subhead}
          </p>
        </Reveal>

        <div
          role="table"
          aria-label="Hybrid, human-led plus AI-assisted, versus pure-AI trackers, by dimension"
          className="overflow-hidden rounded-3xl border border-border bg-surface/40"
        >
          {/* Header row (hidden on mobile; the dimension label heads each card instead) */}
          <div
            role="row"
            className="hidden grid-cols-[1.1fr_1fr_1.1fr] items-end border-b border-border md:grid"
          >
            <div role="columnheader" className="px-6 py-5">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted">
                Dimension
              </span>
            </div>
            <div role="columnheader" className="px-6 py-5">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted">
                Pure-AI auto-trackers
              </span>
            </div>
            {/* Highlighted winner column header */}
            <div role="columnheader" className="bg-accent1/[0.05] px-6 py-5">
              <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-accent1">
                Stats Empire · Hybrid
              </span>
            </div>
          </div>

          {/* Data rows */}
          <div role="rowgroup">
            {content.rows.map((row, idx) => (
              <Reveal key={row.dimension} index={idx} className="border-b border-border last:border-b-0">
                <div
                  role="row"
                  className={clsx(
                    'grid grid-cols-1',
                    'md:grid-cols-[1.1fr_1fr_1.1fr] md:items-stretch',
                  )}
                >
                {/* Dimension */}
                <div role="rowheader" className="px-6 pt-5 md:flex md:items-center md:py-6">
                  <span className="font-display text-sm font-semibold text-text md:text-base">
                    {row.dimension}
                  </span>
                </div>

                {/* AI cell, muted/neutral */}
                <div
                  role="cell"
                  className="flex items-start gap-2.5 px-6 pb-2 pt-3 md:items-center md:py-6"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-border/40 text-muted md:mt-0"
                  >
                    <X className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-sm leading-snug text-muted">{row.ai}</span>
                </div>

                {/* Human cell, highlighted winner column */}
                <div
                  role="cell"
                  className="flex items-start gap-2.5 bg-accent1/[0.04] px-6 pb-6 pt-1 md:items-center md:py-6 md:border-l md:border-accent1/15"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent1/15 text-accent1 md:mt-0"
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-sm font-medium leading-snug text-text">
                    {row.human}
                  </span>
                </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
