'use client';

// Stats Empire, ProductHero
//
// A short hero for the /product showcase route. No full-screen CourtBackdrop
// (that is the home hero's signature); this is a compact, focused intro to the
// coach-ready report with a single funnel CTA and a cross-link to pricing.
//
// Wiring matches the suite: the primary button resolves the app-wide freemium
// funnel via useFreemiumTrigger() (requires the <FreemiumFlowProvider> mounted
// in app/layout.tsx). All color/type via var(--color-*) tokens; reduced-motion
// safe (no entrance animation here, the page below carries the motion).

import Link from 'next/link';
import { ArrowRight, FileText, Zap } from 'lucide-react';

import { ProvenanceBadge } from '@/components/landing';
import { useFreemiumTrigger } from '@/components/freemium';

export interface ProductHeroProps {
  /** Optional extra classes for the outer <section>. */
  className?: string;
}

export default function ProductHero({ className }: ProductHeroProps) {
  const { open } = useFreemiumTrigger();

  return (
    <section
      id="top"
      aria-labelledby="product-hero-heading"
      className={[
        'relative w-full overflow-hidden px-5 pb-12 pt-28 sm:px-8 sm:pt-32 lg:pt-36',
        className ?? '',
      ].join(' ')}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-texture" />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-10 h-56 w-[34rem] max-w-full -translate-x-1/2 rounded-full bg-accent1/[0.08] blur-3xl"
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent1/30 bg-surface/60 px-4 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.28em] text-accent1 backdrop-blur">
          <FileText className="h-3.5 w-3.5" aria-hidden />
          The coach-ready report
        </span>

        <h1
          id="product-hero-heading"
          className="mt-6 font-display text-4xl font-extrabold leading-[1.04] tracking-tight text-text sm:text-5xl"
        >
          See exactly what lands in your report.
        </h1>

        <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-muted sm:text-lg">
          One premium, coach-ready surface per match: spatial maps, headline
          stats, an advanced metric table and a momentum trend, all logged by a
          human and signed off by a senior analyst. Toggle the sport below to
          see it morph, then try a real game free.
        </p>

        <ProvenanceBadge className="mt-6 backdrop-blur" />

        <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
          <button
            type="button"
            onClick={open}
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-accent1 px-7 py-3.5 font-mono text-sm font-semibold uppercase tracking-wider text-bg transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2"
          >
            <Zap className="h-4 w-4" aria-hidden />
            Try a free game
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </button>

          <Link
            href="/pricing"
            className="group inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface/40 px-7 py-3.5 font-mono text-sm font-semibold uppercase tracking-wider text-text backdrop-blur transition-colors hover:border-accent2/60 hover:bg-surfaceAlt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2"
          >
            View pricing
            <ArrowRight className="h-4 w-4 text-accent2 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
