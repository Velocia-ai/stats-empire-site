'use client';

// Stats Empire, Pricing
//
// The full pricing surface (#pricing), Court Vision identity. Two halves:
//
//   1) Pay-as-you-scale TOKEN PACKS, the five-rung ladder from pay-per-match
//      ($49) down to Elite ($29/match), with "Academy" flagged most popular.
//      This is the self-serve, per-club tier.
//   2) The custom LEAGUES & FEDERATIONS offering, the premium tier: a branded
//      league portal, a league-wide stat + leaderboard hub, automated highlight
//      reels (weekly / monthly / seasonal) and human-led per-match analysis for
//      every club, on custom terms with a "Talk to us" CTA.
//
// Plus the supporting contract: delivery (12h to 24h), rollover, add-ons and the
// positive value statement, all read verbatim from lib/pricing.ts (single source
// of truth; numbers are never recomputed here).
//
// Every pack/tier "Unlock" CTA opens the freemium funnel. Wiring matches the
// rest of the suite (Hero / SiteNav / FinalCta): pass `onStart` to drive a local
// useFreemiumFlow, or omit it under a <FreemiumFlowProvider> and the component
// resolves the app-wide useFreemiumTrigger().
//
// All color/type via var(--color-*) / var(--font-*) tokens. The chalk-line
// flourishes come from the shared ChalkLines primitives. Reduced-motion safe.

import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clock,
  RefreshCw,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';

import {
  ADDONS,
  DELIVERY,
  LEAGUE_OFFERING,
  ROLLOVER,
  TOKEN_PACKS,
  VALUE_STATEMENT,
  type HighlightCadence,
  type TokenPack,
} from '@/lib/pricing';
import { useFreemiumTrigger } from '@/components/freemium';
import { ChalkUnderline, PlayTrajectory } from './ChalkLines';

export interface PricingProps {
  /**
   * Open the freemium flow. If omitted, the component uses the app-wide
   * useFreemiumTrigger() (requires a <FreemiumFlowProvider> ancestor).
   */
  onStart?: () => void;
  /** Optional extra classes for the outer <section>. */
  className?: string;
}

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export default function Pricing({ onStart, className }: PricingProps) {
  return onStart ? (
    <PricingView onStart={onStart} className={className} />
  ) : (
    <PricingWithTrigger className={className} />
  );
}

// Split so useFreemiumTrigger() (which throws without a provider) is only called
// when no explicit onStart is supplied.
function PricingWithTrigger({ className }: { className?: string }) {
  const { open } = useFreemiumTrigger();
  return <PricingView onStart={open} className={className} />;
}

function PricingView({
  onStart,
  className,
}: {
  onStart: () => void;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className={['relative w-full px-5 py-20 sm:px-8 sm:py-28', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      {/* Faint tactics-board play arc tying the ladder together. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden opacity-50">
        <PlayTrajectory className="absolute inset-0" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* ---- Section header ------------------------------------------- */}
        <header className="max-w-2xl">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-accent1">
            Pricing
          </p>
          <h2
            id="pricing-heading"
            className="mt-4 font-display text-3xl font-bold leading-[1.05] text-text sm:text-4xl md:text-5xl"
          >
            One token, one match.
            <span className="relative ml-2 inline-block text-accent1">
              Cheaper as you scale.
              <ChalkUnderline className="absolute -bottom-1 left-0" />
            </span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
            A token is one fully human-logged match report. Pay per match or buy
            in bulk, the per-match price drops from {usd.format(49)} to{' '}
            {usd.format(29)} as your volume grows.
          </p>
        </header>

        {/* ---- Token packs ---------------------------------------------- */}
        <div
          role="list"
          aria-label="Token packs"
          className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4"
        >
          {TOKEN_PACKS.map((pack, idx) => (
            <PackCard
              key={pack.pack}
              pack={pack}
              index={idx}
              reduce={!!reduce}
              onStart={onStart}
            />
          ))}
        </div>

        {/* ---- Delivery / rollover / add-ons / anchor ------------------- */}
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FactCard icon={Clock} title="Express 12h to 24h" body={DELIVERY.standard} />
          <FactCard icon={Zap} title="Human-led, AI-assisted" body={DELIVERY.express} />
          <FactCard icon={RefreshCw} title="Tokens roll over" body={ROLLOVER} />
          <FactCard
            icon={Sparkles}
            title="Add-ons available"
            body={ADDONS.join(' · ')}
          />
        </ul>

        <p className="mt-6 flex items-start gap-2 rounded-2xl border border-accent2/30 bg-accent2/[0.06] px-5 py-4 font-body text-sm leading-relaxed text-text">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent2" aria-hidden />
          <span>{VALUE_STATEMENT}</span>
        </p>

        {/* ---- Leagues & Federations (custom, premium tier) ------------- */}
        <div className="mt-20">
          <header className="max-w-2xl">
            <p className="inline-flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.22em] text-accent1">
              <Trophy className="h-3.5 w-3.5" aria-hidden />
              {LEAGUE_OFFERING.name}
            </p>
            <h3 className="mt-4 font-display text-2xl font-bold leading-tight text-text sm:text-3xl md:text-4xl">
              A complete intelligence platform for your whole competition.
            </h3>
            <p className="mt-4 text-base leading-relaxed text-muted">
              {LEAGUE_OFFERING.tagline}
            </p>
          </header>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* Highlight cadences */}
            <div className="flex flex-col gap-4">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-accent1">
                Automated highlight reels
              </p>
              <div
                role="list"
                aria-label="Highlight reel cadences"
                className="grid grid-cols-1 gap-4 sm:grid-cols-3"
              >
                {LEAGUE_OFFERING.cadences.map((cadence, idx) => (
                  <CadenceCard
                    key={cadence.name}
                    cadence={cadence}
                    index={idx}
                    reduce={!!reduce}
                  />
                ))}
              </div>
            </div>

            {/* What every league deal includes */}
            <div className="rounded-3xl border border-border bg-surface p-6 sm:p-7">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-accent1">
                Every league deal includes
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {LEAGUE_OFFERING.includes.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-text">
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent1/15 text-accent1"
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 font-mono text-[0.72rem] uppercase tracking-wider text-accent2">
                {LEAGUE_OFFERING.priceNote}
              </p>
              <button
                type="button"
                onClick={onStart}
                className="group mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-accent1/50 px-5 py-3 font-mono text-sm font-semibold uppercase tracking-wider text-accent1 transition-colors hover:bg-accent1 hover:text-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2"
              >
                {LEAGUE_OFFERING.cta}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
                  aria-hidden
                />
              </button>
              <p className="mt-3 text-center font-body text-xs text-muted">
                {LEAGUE_OFFERING.note} Or email{' '}
                <a
                  href="mailto:partnerships@statsempire.com"
                  className="text-accent1 underline-offset-2 hover:underline"
                >
                  partnerships@statsempire.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// One token-pack card. The "Academy" pack is flagged most popular and elevated.
// ---------------------------------------------------------------------------

function PackCard({
  pack,
  index,
  reduce,
  onStart,
}: {
  pack: TokenPack;
  index: number;
  reduce: boolean;
  onStart: () => void;
}) {
  const popular = !!pack.mostPopular;

  return (
    <motion.div
      role="listitem"
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.5, delay: reduce ? 0 : index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      className={[
        'relative flex flex-col overflow-hidden rounded-3xl p-5 sm:p-6',
        popular
          ? 'border border-accent1/55 bg-accent1/[0.05] shadow-[0_0_44px_-14px_var(--color-accent1)] lg:-mt-3 lg:mb-3'
          : 'border border-border bg-surface',
      ].join(' ')}
    >
      <span aria-hidden className="grid-texture-fine pointer-events-none absolute inset-0" />

      {popular && (
        <span className="relative mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent1 px-2.5 py-1 font-mono text-[0.6rem] font-bold uppercase tracking-[0.14em] text-bg">
          <Sparkles className="h-3 w-3" aria-hidden />
          Most popular
        </span>
      )}

      <p className="relative font-display text-base font-bold text-text">{pack.pack}</p>
      <p className="relative mt-1 font-mono text-[0.7rem] uppercase tracking-wider text-muted">
        {pack.tokens === 1 ? '1 token' : `${pack.tokens} tokens`}
      </p>

      {/* Price block: per-match headline + pack total. */}
      <div className="relative mt-5">
        <div className="flex items-baseline gap-1">
          <span
            className={[
              'font-display text-3xl font-extrabold tracking-tight tabular-nums',
              popular ? 'text-accent1' : 'text-text',
            ].join(' ')}
          >
            {usd.format(pack.perMatch)}
          </span>
          <span className="font-mono text-xs text-muted">/ match</span>
        </div>
        <p className="mt-1 font-body text-xs text-muted">
          {pack.tokens === 1
            ? 'Pay per match, no commitment'
            : `${usd.format(pack.price)} total`}
        </p>
      </div>

      {/* Savings vs the $49 baseline. */}
      <p
        className={[
          'relative mt-3 inline-flex w-fit items-center rounded-full px-2.5 py-1 font-mono text-[0.62rem] font-semibold uppercase tracking-wider',
          pack.save > 0 ? 'bg-accent1/15 text-accent1' : 'bg-surfaceAlt text-muted',
        ].join(' ')}
      >
        {pack.save > 0 ? `Save ${pack.save}%` : 'Baseline rate'}
      </p>

      <p className="relative mt-4 flex-1 font-body text-xs leading-relaxed text-muted">
        {pack.bestFor}
      </p>

      <button
        type="button"
        onClick={onStart}
        className={[
          'group relative mt-5 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2',
          popular
            ? 'bg-accent1 text-bg hover:-translate-y-0.5 motion-reduce:transform-none'
            : 'border border-border text-text hover:border-accent1/50 hover:text-accent1',
        ].join(' ')}
      >
        Unlock
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
          aria-hidden
        />
      </button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// One highlight-reel cadence card (weekly / monthly / seasonal).
// ---------------------------------------------------------------------------

function CadenceCard({
  cadence,
  index,
  reduce,
}: {
  cadence: HighlightCadence;
  index: number;
  reduce: boolean;
}) {
  return (
    <motion.div
      role="listitem"
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.5, delay: reduce ? 0 : index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col rounded-3xl border border-border bg-surface p-5 sm:p-6"
    >
      <p className="font-display text-base font-bold text-text">{cadence.name}</p>
      <p className="mt-3 flex-1 font-body text-sm leading-relaxed text-muted">
        {cadence.description}
      </p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Small fact card for the delivery / rollover / add-ons strip.
// ---------------------------------------------------------------------------

function FactCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Clock;
  title: string;
  body: string;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surfaceAlt text-accent1">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <p className="font-display text-sm font-bold text-text">{title}</p>
      <p className="font-body text-xs leading-relaxed text-muted">{body}</p>
    </li>
  );
}
