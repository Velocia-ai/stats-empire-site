'use client';

// Stats Empire, OpponentScouting (Feature B)
//
// A compact, high-value section selling the forward-looking PRE-MATCH dossier
// on your next opponent. Most of the suite looks backward (what happened in the
// match you just played); this points the same hybrid pipeline at the team you
// are about to face, so a coach walks in with a plan built on patterns.
//
// Layout: a calm two-column "tactics dossier" card. The left rail is the pitch:
// positioning, badge and CTA; the right is the scouting checklist. The card
// carries the section's single lime accent (the CTA and a soft border), with
// generous whitespace instead of decorative backdrops.
//
// CTA wiring matches Pricing / Hero / FinalCta: pass `onStart` to drive a local
// freemium flow, or omit it under a <FreemiumFlowProvider> and the component
// resolves the app-wide useFreemiumTrigger(). All colour/type via var(--color-*)
// tokens. Reduced-motion safe via the shared <Reveal> primitive.

import { ArrowRight, Crosshair, Target } from 'lucide-react';
import clsx from 'clsx';
import { OPPONENT_SCOUTING } from '@/lib/content';
import type { OpponentScouting as OpponentScoutingContent } from '@/lib/content';
import { useFreemiumTrigger } from '@/components/freemium';
import Reveal from '@/components/Reveal';

export interface OpponentScoutingProps {
  /** Optional override; defaults to the canonical OPPONENT_SCOUTING copy. */
  content?: OpponentScoutingContent;
  /**
   * Open the freemium flow. If omitted, the component uses the app-wide
   * useFreemiumTrigger() (requires a <FreemiumFlowProvider> ancestor).
   */
  onStart?: () => void;
  className?: string;
}

export default function OpponentScouting({
  content = OPPONENT_SCOUTING,
  onStart,
  className,
}: OpponentScoutingProps) {
  return onStart ? (
    <OpponentScoutingView content={content} onStart={onStart} className={className} />
  ) : (
    <OpponentScoutingWithTrigger content={content} className={className} />
  );
}

// Split so useFreemiumTrigger() (which throws without a provider) is only called
// when no explicit onStart is supplied. Same pattern as Pricing.
function OpponentScoutingWithTrigger({
  content,
  className,
}: {
  content: OpponentScoutingContent;
  className?: string;
}) {
  const { open } = useFreemiumTrigger();
  return <OpponentScoutingView content={content} onStart={open} className={className} />;
}

function OpponentScoutingView({
  content,
  onStart,
  className,
}: {
  content: OpponentScoutingContent;
  onStart: () => void;
  className?: string;
}) {
  return (
    <section
      id="opponent-scouting"
      aria-labelledby="opponent-scouting-heading"
      className={clsx('relative w-full py-16 sm:py-28 lg:py-32', className)}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="overflow-hidden rounded-3xl border border-accent1/25 bg-surface">
          <div className="grid grid-cols-1 gap-8 p-7 sm:gap-10 sm:p-10 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
            {/* ---- Left rail: positioning + CTA ---------------------------- */}
            <div className="flex flex-col">
              <p className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-bg/40 px-3 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
                <Target className="h-3.5 w-3.5" aria-hidden="true" />
                {content.badge}
              </p>

              <p className="mt-6 font-mono text-xs font-medium uppercase tracking-[0.22em] text-accent1">
                {content.eyebrow}
              </p>
              <h2
                id="opponent-scouting-heading"
                className="mt-4 font-display text-[clamp(1.6rem,4.5vw,2.5rem)] font-bold leading-[1.05] text-text"
              >
                {content.headline}
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted">
                {content.subhead}
              </p>

              <div className="mt-auto pt-8">
                <button
                  type="button"
                  onClick={onStart}
                  className="group inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-accent1 px-6 py-3 font-mono text-sm font-semibold uppercase tracking-wider text-bg transition-colors hover:bg-accent1/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent1"
                >
                  {content.cta.label}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <p className="mt-3 font-body text-xs text-muted">
                  Available as an add-on on top of any match report.
                </p>
              </div>
            </div>

            {/* ---- Right: the scouting checklist --------------------------- */}
            <div className="rounded-3xl border border-border bg-bg/40 p-6 sm:p-7">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted">
                Inside the dossier
              </p>
              <ul className="mt-6 flex flex-col gap-4">
                {content.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-relaxed text-text"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-accent1/25 bg-accent1/[0.08] text-accent1"
                    >
                      <Crosshair className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
