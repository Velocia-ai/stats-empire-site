'use client';

// Stats Empire, FreeSampleCta
//
// The product page's free-sample call to action. Owns id="free-game" so the
// hero / footer "Free sample report" links resolve here, and the button opens
// the full freemium funnel (signup -> pick sport -> unlock -> live dashboard)
// via the app-wide useFreemiumTrigger(). The funnel itself renders the real
// FreeTrialDashboard once a sport is chosen, so we surface a clear CTA rather
// than mounting a sport-locked dashboard inline.
//
// All color/type via var(--color-*) tokens; reduced-motion safe.

import { ArrowRight, Sparkles } from 'lucide-react';

import { useFreemiumTrigger } from '@/components/freemium';
import Reveal from '@/components/Reveal';

export interface FreeSampleCtaProps {
  /** Optional extra classes for the outer <section>. */
  className?: string;
}

export default function FreeSampleCta({ className }: FreeSampleCtaProps) {
  const { open } = useFreemiumTrigger();

  return (
    <section
      id="free-game"
      aria-labelledby="free-sample-heading"
      className={[
        'relative w-full px-5 py-16 sm:px-8 sm:py-28 lg:py-32',
        className ?? '',
      ].join(' ')}
    >
      <Reveal className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-accent1/30 bg-surface/60 px-6 py-14 text-center backdrop-blur sm:px-12 sm:py-16">
        {/* The one calm atmospheric spot for this card: a single soft lime glow. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-48 w-[26rem] max-w-full -translate-x-1/2 rounded-full bg-accent1/[0.06] blur-3xl"
        />

        <div className="relative z-10 flex flex-col items-center gap-5">
          <span className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-bg/60 px-4 font-mono text-[0.7rem] uppercase tracking-[0.3em] text-accent1 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            100% free, no card
          </span>

          <h2
            id="free-sample-heading"
            className="font-display font-bold leading-[1.1] tracking-tight text-text text-[clamp(1.75rem,5vw,3rem)]"
          >
            Try a real match, fully analyzed, free.
          </h2>

          <p className="max-w-xl font-body text-base leading-relaxed text-muted sm:text-lg lg:text-[1.1875rem]">
            Pick a sport and unlock one complete game on the house: the same
            spatial maps, advanced metric table and momentum trend your coaching
            staff would get on every report. No setup, no commitment.
          </p>

          <button
            type="button"
            onClick={open}
            className="group mt-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-accent1 px-7 py-3.5 font-mono text-sm font-semibold uppercase tracking-wider text-bg transition-colors hover:bg-accent1/90"
          >
            Unlock a free game
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </Reveal>
    </section>
  );
}
