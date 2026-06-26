'use client';

// Stats Empire, FinalCta
//
// The closing call-to-action, the one section allowed a single soft atmospheric
// glow. Court Vision identity is kept with a quiet tactics-board panel, but the
// noisy dual chalk arcs were retired for calm restraint: one barely-there lime
// halo behind the headline, no competing orange. Headline leads with "Turn
// footage into wins" and the primary button opens the freemium funnel.
//
// Wiring: pass `onStart` to open the flow directly (e.g. from a local
// useFreemiumFlow on the page). If omitted, the component falls back to the
// app-wide useFreemiumTrigger(), so it also works when mounted anywhere under a
// <FreemiumFlowProvider>. The supporting copy + secondary link come from the
// typed FINAL_CTA content.
//
// All color/type via var(--color-*) / var(--font-*) tokens; entrance via the
// shared <Reveal> primitive, reduced-motion safe.

import { ArrowRight, Zap } from 'lucide-react';

import { FINAL_CTA } from '@/lib/content';
import { useFreemiumTrigger } from '@/components/freemium';
import { Reveal } from '@/components/Reveal';

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
  return (
    <section
      aria-labelledby="final-cta-heading"
      className={[
        'relative py-16 sm:py-28 lg:py-32',
        className ?? '',
      ].join(' ')}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-surface/60 px-6 py-14 text-center backdrop-blur sm:px-12 sm:py-20">
          {/* The single soft atmospheric glow allowed in this viewport: one quiet
              lime halo behind the headline, nothing competing. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-64 w-[28rem] max-w-full -translate-x-1/2 rounded-full bg-accent1/[0.06] blur-3xl"
          />

          <div className="relative z-10 flex flex-col items-center gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg/60 px-4 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.3em] text-accent1 backdrop-blur">
              {FINAL_CTA.eyebrow}
            </span>

            <h2
              id="final-cta-heading"
              className="font-display font-bold leading-[1.05] tracking-tight text-[clamp(1.875rem,5.6vw,3.75rem)]"
            >
              Turn footage into wins.
            </h2>

            <p className="max-w-xl font-body text-base leading-relaxed text-muted sm:text-lg lg:text-xl">
              {FINAL_CTA.subhead}
            </p>

            <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onStart}
                className="group inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accent1 px-8 py-4 font-mono text-sm font-semibold uppercase tracking-wider text-bg transition-colors hover:bg-accent1/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent1"
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
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border px-8 py-4 font-mono text-sm font-semibold uppercase tracking-wider text-text transition-colors hover:bg-surfaceAlt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent1"
              >
                {FINAL_CTA.secondaryCta.label}
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
