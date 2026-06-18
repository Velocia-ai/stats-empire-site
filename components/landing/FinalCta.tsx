'use client';

// Stats Empire, FinalCta
//
// The closing call-to-action. Court Vision identity: a tactics-board panel with
// animated chalk-line "play arcs" sweeping toward the CTA, like the final play
// drawn before the whistle. Headline leads with "Turn footage into wins" and the
// primary button opens the freemium funnel.
//
// Wiring: pass `onStart` to open the flow directly (e.g. from a local
// useFreemiumFlow on the page). If omitted, the component falls back to the
// app-wide useFreemiumTrigger(), so it also works when mounted anywhere under a
// <FreemiumFlowProvider>. The supporting copy + secondary link come from the
// typed FINAL_CTA content.
//
// All color/type via var(--color-*) / var(--font-*) tokens; motion is
// reduced-motion safe.

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';

import { FINAL_CTA } from '@/lib/content';
import { useFreemiumTrigger } from '@/components/freemium';

export interface FinalCtaProps {
  /**
   * Open the freemium flow. If omitted, the component uses the app-wide
   * useFreemiumTrigger() (requires a <FreemiumFlowProvider> ancestor).
   */
  onStart?: () => void;
  /** Optional extra classes for the outer <section>. */
  className?: string;
}

export default function FinalCta({ onStart, className }: FinalCtaProps) {
  return onStart ? (
    <FinalCtaView onStart={onStart} className={className} />
  ) : (
    <FinalCtaWithTrigger className={className} />
  );
}

// When no onStart is provided, resolve the app-wide trigger. Split into its own
// component so the useFreemiumTrigger() hook is only called on this path (it
// throws without a provider).
function FinalCtaWithTrigger({ className }: { className?: string }) {
  const { open } = useFreemiumTrigger();
  return <FinalCtaView onStart={open} className={className} />;
}

function FinalCtaView({
  onStart,
  className,
}: {
  onStart: () => void;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <section
      aria-labelledby="final-cta-heading"
      className={[
        'relative px-6 py-20 sm:py-28',
        className ?? '',
      ].join(' ')}
    >
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-accent1/30 bg-surface/60 px-6 py-14 text-center backdrop-blur sm:px-12 sm:py-20">
        {/* Tactics-board backdrop: fine grid + drawn play arcs + accent glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0 grid-texture-fine" />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-64 w-[28rem] max-w-full -translate-x-1/2 rounded-full bg-accent1/10 blur-3xl"
        />
        <PlayArcs reduce={!!reduce} />

        <div className="relative z-10 flex flex-col items-center gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg/60 px-4 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.3em] text-accent1 backdrop-blur">
            {FINAL_CTA.eyebrow}
          </span>

          <h2
            id="final-cta-heading"
            className="font-display text-3xl font-bold leading-[1.05] tracking-tight sm:text-5xl"
          >
            Turn footage into wins.
          </h2>

          <p className="max-w-xl font-body text-base leading-relaxed text-muted sm:text-lg">
            {FINAL_CTA.subhead}
          </p>

          <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onStart}
              className="group inline-flex items-center gap-2 rounded-full bg-accent1 px-8 py-4 font-mono text-sm font-semibold uppercase tracking-wider text-bg transition-transform hover:-translate-y-0.5 motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2"
            >
              <Zap className="h-4 w-4" aria-hidden />
              {FINAL_CTA.primaryCta.label}
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
                aria-hidden
              />
            </button>

            <a
              href={FINAL_CTA.secondaryCta.href}
              className="inline-flex items-center gap-2 rounded-full border border-border px-8 py-4 font-mono text-sm font-semibold uppercase tracking-wider text-text transition-colors hover:bg-surfaceAlt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2"
            >
              {FINAL_CTA.secondaryCta.label}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// Two chalk-line arcs that draw on once, sweeping in from the edges toward the
// CTA, the "winning play" gesture. Reduced motion → rendered fully drawn.
function PlayArcs({ reduce }: { reduce: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
      aria-hidden
    >
      <motion.path
        d="M -2 78 C 22 70, 30 40, 50 36"
        fill="none"
        stroke="var(--color-accent2)"
        strokeWidth={1}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: reduce ? 0 : 1.2, ease: 'easeInOut' }}
        style={{ filter: 'drop-shadow(0 0 3px var(--color-accent2))' }}
      />
      <motion.path
        d="M 102 70 C 78 64, 72 38, 50 36"
        fill="none"
        stroke="var(--color-accent1)"
        strokeWidth={1}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: reduce ? 0 : 1.2, ease: 'easeInOut', delay: reduce ? 0 : 0.15 }}
        style={{ filter: 'drop-shadow(0 0 3px var(--color-accent1))' }}
      />
    </svg>
  );
}
