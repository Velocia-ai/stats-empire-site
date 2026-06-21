'use client';

// Stats Empire, Problem
//
// Why HYBRID wins. A single-mode approach (pure-AI auto-tracking, or manual-only
// charting) leaves a gap; the human-led, AI-assisted pipeline closes it.
// Rendered as a calm stack of opposed rows: the struck-through single-mode
// shortfall on one side, the hybrid counter on the other, separated by quiet
// whitespace rather than competing decoration.
//
// The single-mode column reads as a muted, struck-out shortfall; the hybrid
// column reads as the confident, lime accent1 answer, the single accent in this
// marketing section. Mobile stacks vertically; from md up they sit side by side.
//
// Reduced-motion safe throughout via the shared <Reveal> primitive.

import clsx from 'clsx';
import { PROBLEM } from '@/lib/content';
import type { Problem as ProblemContent } from '@/lib/content';
import Reveal from '@/components/Reveal';

interface ProblemProps {
  content?: ProblemContent;
  className?: string;
}

export default function Problem({ content = PROBLEM, className }: ProblemProps) {
  return (
    <section
      id="problem"
      aria-labelledby="problem-heading"
      className={clsx('relative w-full py-16 sm:py-28 lg:py-32', className)}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Section header */}
        <Reveal as="header" className="mb-12 max-w-2xl sm:mb-16">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-muted">
            {content.eyebrow}
          </p>
          <h2
            id="problem-heading"
            className="mt-4 font-display text-[clamp(1.75rem,5vw,3rem)] font-bold leading-[1.05] text-text"
          >
            {content.headline}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
            {content.subhead}
          </p>
        </Reveal>

        {/* Opposed rows, separated by whitespace rather than dividers. */}
        <div className="flex flex-col gap-6 sm:gap-8">
          {content.points.map((point, idx) => (
            <Reveal
              key={idx}
              index={idx}
              className="grid grid-cols-1 items-stretch gap-6 sm:gap-8 md:grid-cols-2"
            >
              {/* Single-mode side, the muted, struck-out shortfall. */}
              <div className="rounded-2xl border border-border/60 bg-surface/40 p-6">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                  Single-mode
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted line-through decoration-border decoration-1">
                  {point.ai}
                </p>
              </div>

              {/* Hybrid side, the warm, confident answer, the one accent. */}
              <div className="relative rounded-2xl border border-accent1/25 bg-accent1/[0.03] p-6">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-accent1">
                  Hybrid
                </p>
                <p className="mt-3 text-sm font-medium leading-relaxed text-text">
                  {point.human}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
