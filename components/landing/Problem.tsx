'use client';

// Stats Empire, Problem
//
// Why HYBRID wins. A single-mode approach (pure-AI auto-tracking, or manual-only
// charting) leaves a gap; the human-led, AI-assisted pipeline closes it.
// Rendered as a stack of opposed rows: the struck-through single-mode shortfall
// on one side, the hybrid counter on the other, joined by a chalk arc that draws
// from the cold (single-mode) side to the warm (hybrid) side as each row enters.
//
// The single-mode column reads as a muted, struck-out shortfall (accent2 /
// orange = warning); the hybrid column reads as the confident, lime accent1
// answer. Mobile stacks vertically; from md up they sit side by side with the
// arc between them.
//
// Reduced-motion safe throughout.

import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { ScanLine, Layers } from 'lucide-react';
import clsx from 'clsx';
import { PROBLEM } from '@/lib/content';
import type { Problem as ProblemContent } from '@/lib/content';

interface ProblemProps {
  content?: ProblemContent;
  className?: string;
}

export default function Problem({ content = PROBLEM, className }: ProblemProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px -10% 0px' });
  const show = reduce ? true : inView;

  return (
    <section
      id="problem"
      aria-labelledby="problem-heading"
      className={clsx('relative w-full px-5 py-20 sm:px-8 sm:py-28', className)}
    >
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <header className="max-w-2xl">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-accent2">
            {content.eyebrow}
          </p>
          <h2
            id="problem-heading"
            className="mt-4 font-display text-3xl font-bold leading-[1.05] text-text sm:text-4xl md:text-5xl"
          >
            {content.headline}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
            {content.subhead}
          </p>
        </header>

        {/* Column legend */}
        <div className="mt-12 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-muted">
            <ScanLine className="h-4 w-4 text-accent2" aria-hidden="true" />
            Single-mode leaves a gap
          </div>
          <span className="hidden font-mono text-xs uppercase tracking-[0.18em] text-border md:block">
            vs
          </span>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-muted md:justify-end">
            <Layers className="h-4 w-4 text-accent1" aria-hidden="true" />
            Human-led, AI-assisted closes it
          </div>
        </div>

        {/* Opposed rows */}
        <div ref={ref} className="mt-4 flex flex-col gap-4">
          {content.points.map((point, idx) => (
            <motion.div
              key={idx}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={show ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.55, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]"
            >
              {/* AI side, the cold, struck-out guess */}
              <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-surface/50 p-5">
                <span
                  aria-hidden="true"
                  className="grid-texture-fine pointer-events-none absolute inset-0"
                />
                <p className="relative font-mono text-[0.6rem] uppercase tracking-[0.2em] text-accent2/80">
                  Single-mode
                </p>
                <p className="relative mt-2 text-sm leading-relaxed text-muted line-through decoration-accent2/50 decoration-1">
                  {point.ai}
                </p>
              </div>

              {/* Chalk connector arc */}
              <div
                aria-hidden="true"
                className="flex items-center justify-center md:w-16"
              >
                <svg
                  viewBox="0 0 64 40"
                  className="h-8 w-16 rotate-90 overflow-visible md:rotate-0"
                  fill="none"
                >
                  <motion.path
                    d="M2 20 C 22 4, 42 36, 60 20"
                    stroke="var(--color-accent1)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeDasharray="0.1 0"
                    initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
                    animate={show ? { pathLength: 1 } : { pathLength: 0 }}
                    transition={{ duration: 0.6, delay: idx * 0.1 + 0.2, ease: 'easeInOut' }}
                  />
                  <motion.circle
                    cx="60"
                    cy="20"
                    r="3"
                    fill="var(--color-accent1)"
                    initial={reduce ? { opacity: 1 } : { opacity: 0 }}
                    animate={show ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.1 + 0.7 }}
                  />
                </svg>
              </div>

              {/* Human side, the warm, confident answer */}
              <div className="relative overflow-hidden rounded-2xl border border-accent1/30 bg-accent1/[0.04] p-5">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-accent1"
                />
                <p className="relative font-mono text-[0.6rem] uppercase tracking-[0.2em] text-accent1">
                  Hybrid
                </p>
                <p className="relative mt-2 text-sm font-medium leading-relaxed text-text">
                  {point.human}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
