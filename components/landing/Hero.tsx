'use client';

// Stats Empire, Hero
//
// The Court Vision hero. Bold display headline + subhead from lib/content HERO,
// a loud dual CTA, and the signature animated visual: a sport "tactics card"
// that ROTATES/MORPHS across the three featured pitches, tennis → soccer →
// basketball, auto-cycling on a timer (or driven by the featured-sport chips).
//
// The visual reuses the shipped viz primitives:
//   • PitchBackground, accurate, theme-tokenized field for the active sport.
//   • TrajectoryLines, that sport's real trajectories, drawing on with the
//                        framer pathLength chalk-arc motion (the signature feel).
// Behind everything sits <CourtBackdrop/> for the immersive court-blue glow.
//
// CTAs (per build spec):
//   • Primary  "Start free, no card"   → opens the freemium funnel.
//   • Secondary "See a sample report"   → anchors to the live report section.
//
// Featured-sport chips lead with Tennis / Soccer / Basketball (FEATURED_SPORTS
// order) and let the visitor pin the visual to a sport.
//
// Flow wiring matches the suite (FinalCta/SiteNav): pass `onStart` to open a
// local useFreemiumFlow, or omit it and rely on the app-wide
// useFreemiumTrigger() (requires a <FreemiumFlowProvider> ancestor).
//
// Reduced-motion safe: auto-rotation pauses, transitions cross-fade instantly,
// and the trajectory draw-on falls back to fully-drawn paths (handled inside
// TrajectoryLines + CourtBackdrop).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, FileText, Zap } from 'lucide-react';

import { HERO, PROOF_STATS } from '@/lib/content';
import { FEATURED_SPORTS, SPORTS, getSportData } from '@/lib/sports';
import type { SportKey } from '@/lib/types';
import { PitchBackground, TrajectoryLines } from '@/components/viz';
import { useFreemiumTrigger } from '@/components/freemium';
import Reveal from '@/components/Reveal';
import CourtBackdrop from './CourtBackdrop';
import { ProvenanceBadge } from './Provenance';

export interface HeroProps {
  /**
   * Open the freemium flow. If omitted, the hero uses the app-wide
   * useFreemiumTrigger() (requires a <FreemiumFlowProvider> ancestor).
   */
  onStart?: () => void;
  /** Anchor target for the secondary "See a sample report" CTA. */
  sampleHref?: string;
  /** Extra classes for the <section>. */
  className?: string;
  /** Ms between auto-rotations of the featured sport. Default 4200. */
  rotateMs?: number;
}

// Lead with the featured trio. Map keys → display names via the SPORTS meta so
// labels stay in sync with the registry.
const SPORT_NAME = new Map(SPORTS.map((s) => [s.key, s.name] as const));

export default function Hero({ onStart, ...rest }: HeroProps) {
  // Match FinalCta: explicit onStart wins; else resolve the app-wide trigger on
  // a dedicated path so the hook is only called when no callback is supplied.
  return onStart ? (
    <HeroView onStart={onStart} {...rest} />
  ) : (
    <HeroWithTrigger {...rest} />
  );
}

function HeroWithTrigger(props: Omit<HeroProps, 'onStart'>) {
  const { open } = useFreemiumTrigger();
  return <HeroView onStart={open} {...props} />;
}

function HeroView({
  onStart,
  sampleHref = '#report',
  className,
  rotateMs = 4200,
}: Omit<HeroProps, 'onStart'> & { onStart: () => void }) {
  const reduce = useReducedMotion();
  const featured = FEATURED_SPORTS;

  const [active, setActive] = useState<SportKey>(featured[0]);
  // When the user picks a chip we pause auto-rotation so the visual stays put.
  const [pinned, setPinned] = useState(false);

  const select = useCallback((key: SportKey) => {
    setActive(key);
    setPinned(true);
  }, []);

  // Auto-rotate tennis → soccer → basketball until the user pins a sport.
  useEffect(() => {
    if (pinned || reduce) return;
    const id = window.setInterval(() => {
      setActive((cur) => {
        const i = featured.indexOf(cur);
        return featured[(i + 1) % featured.length];
      });
    }, rotateMs);
    return () => window.clearInterval(id);
  }, [pinned, reduce, featured, rotateMs]);

  const data = useMemo(() => getSportData(active), [active]);

  return (
    <section
      id="top"
      className={['relative isolate overflow-hidden', className].filter(Boolean).join(' ')}
    >
      {/* Signature immersive background */}
      <CourtBackdrop className="absolute inset-0 -z-10" intensity="hero" />
      {/* Bg-to-content fade at the bottom so the hero settles into the page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-bg"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-28 sm:px-8 sm:pt-32 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-28 lg:pt-36">
        {/* ---- Copy column ------------------------------------------------ */}
        <div className="flex flex-col items-start gap-7 text-left">
          <Reveal index={0} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.28em] text-muted backdrop-blur">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent1" />
            {HERO.eyebrow}
          </Reveal>

          <Reveal
            as="h1"
            index={1}
            className="font-display font-extrabold leading-[1.04] tracking-tight text-text [font-size:clamp(2.25rem,6vw,3.75rem)]"
          >
            {HERO.headline}
          </Reveal>

          <Reveal
            as="p"
            index={2}
            className="max-w-xl font-body text-base leading-relaxed text-muted sm:text-lg"
          >
            {HERO.subhead}
          </Reveal>

          {/* Hybrid trust badge: human-verified, senior-audited. */}
          <Reveal index={3}>
            <ProvenanceBadge className="backdrop-blur" />
          </Reveal>

          {/* Dual CTA */}
          <Reveal index={4} className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-accent1 px-7 py-3.5 font-mono text-sm font-semibold uppercase tracking-wider text-bg transition-colors hover:bg-accent1/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent1"
            >
              <Zap className="h-4 w-4" aria-hidden />
              Start free, no card
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>

            <a
              href={sampleHref}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-border bg-surface/40 px-7 py-3.5 font-mono text-sm font-semibold uppercase tracking-wider text-text backdrop-blur transition-colors hover:border-muted hover:bg-surfaceAlt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent1"
            >
              <FileText className="h-4 w-4 text-muted" aria-hidden />
              See a sample report
            </a>
          </Reveal>

          {/* Featured-sport chips (lead with Tennis/Soccer/Basketball) */}
          <Reveal index={5} className="flex flex-col gap-2.5">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-muted">
              Featured coverage
            </span>
            <div role="group" aria-label="Featured sports" className="flex flex-wrap gap-2">
              {featured.map((key) => {
                const isActive = key === active;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => select(key)}
                    aria-pressed={isActive}
                    className={[
                      'min-h-[44px] rounded-full border px-4 font-mono text-xs uppercase tracking-wider transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent1',
                      isActive
                        ? 'border-accent1 bg-accent1 text-bg'
                        : 'border-border bg-surface/40 text-muted hover:border-muted hover:text-text',
                    ].join(' ')}
                  >
                    {SPORT_NAME.get(key) ?? key}
                  </button>
                );
              })}
            </div>
          </Reveal>

          {/* Proof stat strip, calm: numerals read as text, not a second lime field. */}
          <Reveal
            as="dl"
            index={6}
            className="mt-2 grid w-full grid-cols-2 gap-x-6 gap-y-5 border-t border-border/60 pt-7 sm:grid-cols-4 lg:max-w-xl"
          >
            {PROOF_STATS.map((s) => (
              <div key={s.label} className="flex flex-col gap-1">
                <dt className="font-display text-2xl font-extrabold tracking-tight text-text sm:text-3xl">
                  {s.value}
                </dt>
                <dd className="font-body text-[0.7rem] leading-snug text-muted">{s.label}</dd>
              </div>
            ))}
          </Reveal>
        </div>

        {/* ---- Visual column: rotating tactics card ----------------------- */}
        <Reveal index={2} className="relative">
          <div className="relative mx-auto w-full max-w-md">
            {/* Soft focal glow behind the card, the one accent glow this view. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-8 -z-10 rounded-[2rem] bg-accent1/[0.06] blur-3xl"
            />

            <div className="relative overflow-hidden rounded-3xl border border-border bg-surface/60 p-4 shadow-xl backdrop-blur-sm sm:p-6">
              {/* Card chrome: live label + active sport name */}
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.25em] text-muted">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-muted" />
                  Live tactics board
                </span>
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-muted">
                  {SPORT_NAME.get(active)}
                </span>
              </div>

              {/* The morphing pitch + trajectory overlay. AnimatePresence
                  cross-fades between sports; the trajectory layer re-keys on the
                  active sport so its chalk-arc draw-on replays each rotation. */}
              <div className="relative aspect-[4/5] w-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    className="absolute inset-0"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.015 }}
                    transition={{ duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {/* Stacked layers share the same viewBox → align pixel-perfect. */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <PitchBackground pitch={data.pitch} className="max-h-full" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <TrajectoryLines
                        key={`traj-${active}`}
                        paths={data.trajectories}
                        pitch={data.pitch}
                        animate
                        className="max-h-full"
                      />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Rotation dots, also reflect/control the active sport. */}
              <div className="mt-4 flex items-center justify-center gap-2">
                {featured.map((key) => {
                  const isActive = key === active;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => select(key)}
                      aria-label={`Show ${SPORT_NAME.get(key)} tactics`}
                      aria-pressed={isActive}
                      className="group flex h-6 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent1"
                    >
                      <span
                        aria-hidden
                        className={[
                          'h-1.5 rounded-full transition-all',
                          isActive
                            ? 'w-6 bg-accent1'
                            : 'w-1.5 bg-border group-hover:bg-muted',
                        ].join(' ')}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
