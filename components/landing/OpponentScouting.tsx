'use client';

// Stats Empire, OpponentScouting (Feature B)
//
// A compact, high-value section selling the forward-looking PRE-MATCH dossier
// on your next opponent. Most of the suite looks backward (what happened in the
// match you just played); this points the same hybrid pipeline at the team you
// are about to face, so a coach walks in with a plan built on patterns.
//
// Layout: a two-column "tactics dossier" card. The left rail is the pitch:
// positioning, badge and CTA; the right is the scouting checklist (tendencies,
// set-piece habits, weaknesses, personnel shifts, the coach-ready plan). A faint
// PlayTrajectory backdrop ties it to the tactics-board language of the page.
//
// CTA wiring matches Pricing / Hero / FinalCta: pass `onStart` to drive a local
// freemium flow, or omit it under a <FreemiumFlowProvider> and the component
// resolves the app-wide useFreemiumTrigger(). All colour/type via var(--color-*)
// tokens. Reduced-motion safe.

import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowRight, Crosshair, Target } from 'lucide-react';
import clsx from 'clsx';
import { OPPONENT_SCOUTING } from '@/lib/content';
import type { OpponentScouting as OpponentScoutingContent } from '@/lib/content';
import { useFreemiumTrigger } from '@/components/freemium';
import { PlayTrajectory } from './ChalkLines';

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
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-12% 0px -12% 0px' });
  const show = reduce ? true : inView;

  return (
    <section
      id="opponent-scouting"
      aria-labelledby="opponent-scouting-heading"
      className={clsx('relative w-full px-5 py-20 sm:px-8 sm:py-28', className)}
    >
      <div ref={ref} className="relative mx-auto max-w-6xl">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 28 }}
          animate={show ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl border border-accent1/40 bg-surface shadow-[0_0_44px_-16px_var(--color-accent1)]"
        >
          {/* Faint tactics-board play arc tying the dossier to the page. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden opacity-40"
          >
            <PlayTrajectory className="absolute inset-0" />
          </div>
          <span
            aria-hidden="true"
            className="grid-texture-fine pointer-events-none absolute inset-0"
          />

          <div className="relative grid grid-cols-1 gap-10 p-7 sm:p-10 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
            {/* ---- Left rail: positioning + CTA ---------------------------- */}
            <div className="flex flex-col">
              <p className="inline-flex w-fit items-center gap-2 rounded-full bg-accent2/15 px-3 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-accent2">
                <Target className="h-3.5 w-3.5" aria-hidden="true" />
                {content.badge}
              </p>

              <p className="mt-5 font-mono text-xs font-medium uppercase tracking-[0.22em] text-accent1">
                {content.eyebrow}
              </p>
              <h2
                id="opponent-scouting-heading"
                className="mt-4 font-display text-3xl font-bold leading-[1.05] text-text sm:text-4xl"
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
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-accent1 px-6 py-3 font-mono text-sm font-semibold uppercase tracking-wider text-bg transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2 motion-reduce:transform-none"
                >
                  {content.cta.label}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
                    aria-hidden="true"
                  />
                </button>
                <p className="mt-3 font-body text-xs text-muted">
                  Available as an add-on on top of any match report.
                </p>
              </div>
            </div>

            {/* ---- Right: the scouting checklist --------------------------- */}
            <div className="rounded-3xl border border-border bg-bg/60 p-6 sm:p-7">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-accent1">
                Inside the dossier
              </p>
              <ul className="mt-5 flex flex-col gap-4">
                {content.items.map((item, idx) => (
                  <motion.li
                    key={item}
                    initial={reduce ? false : { opacity: 0, x: 12 }}
                    animate={show ? { opacity: 1, x: 0 } : undefined}
                    transition={{
                      duration: 0.45,
                      delay: reduce ? 0 : 0.15 + idx * 0.08,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="flex items-start gap-3 text-sm leading-relaxed text-text"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-accent1/30 bg-accent1/10 text-accent1"
                    >
                      <Crosshair className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                    {item}
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
