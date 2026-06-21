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
// Calm restraint: lime accent1 is the single marketing accent and is rationed to
// the one highlighted "Academy" pack plus key labels; everything else sits on
// neutral surfaces separated by whitespace. Entrances use the shared <Reveal>
// primitive. All color/type via var(--color-*) / var(--font-*) tokens.
// Reduced-motion safe.

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
import Reveal from '@/components/Reveal';

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
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className={['relative w-full py-16 sm:py-28 lg:py-32', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* ---- Section header ------------------------------------------- */}
        <Reveal as="header" className="mb-12 max-w-2xl sm:mb-16">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-muted">
            Pricing
          </p>
          <h2
            id="pricing-heading"
            className="mt-4 font-display text-[clamp(1.75rem,5vw,3rem)] font-bold leading-[1.05] text-text"
          >
            One token, one match.{' '}
            <span className="text-accent1">Cheaper as you scale.</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
            A token is one fully human-logged match report. Pay per match or buy
            in bulk, the per-match price drops from {usd.format(49)} to{' '}
            {usd.format(29)} as your volume grows.
          </p>
        </Reveal>

        {/* ---- Token packs ---------------------------------------------- */}
        <div
          role="list"
          aria-label="Token packs"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-5 lg:gap-6"
        >
          {TOKEN_PACKS.map((pack, idx) => (
            <PackCard key={pack.pack} pack={pack} index={idx} onStart={onStart} />
          ))}
        </div>

        {/* ---- Delivery / rollover / add-ons / anchor ------------------- */}
        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
          <FactCard icon={Clock} title="Express 12h to 24h" body={DELIVERY.standard} />
          <FactCard icon={Zap} title="Human-led, AI-assisted" body={DELIVERY.express} />
          <FactCard icon={RefreshCw} title="Tokens roll over" body={ROLLOVER} />
          <FactCard
            icon={Sparkles}
            title="Add-ons available"
            body={ADDONS.join(' · ')}
          />
        </ul>

        <p className="mt-8 flex items-start gap-2 rounded-2xl border border-border bg-surface/40 px-5 py-4 font-body text-sm leading-relaxed text-text">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
          <span>{VALUE_STATEMENT}</span>
        </p>

        {/* ---- Leagues & Federations (custom, premium tier) ------------- */}
        <div className="mt-24 sm:mt-28">
          <Reveal as="header" className="mb-10 max-w-2xl sm:mb-12">
            <p className="inline-flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.22em] text-muted">
              <Trophy className="h-3.5 w-3.5" aria-hidden />
              {LEAGUE_OFFERING.name}
            </p>
            <h3 className="mt-4 font-display text-[clamp(1.5rem,4vw,2.5rem)] font-bold leading-tight text-text">
              A complete intelligence platform for your whole competition.
            </h3>
            <p className="mt-4 text-base leading-relaxed text-muted">
              {LEAGUE_OFFERING.tagline}
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[1.4fr_1fr]">
            {/* Highlight cadences */}
            <div className="flex flex-col gap-6 sm:gap-8">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted">
                Automated highlight reels
              </p>
              <div
                role="list"
                aria-label="Highlight reel cadences"
                className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8"
              >
                {LEAGUE_OFFERING.cadences.map((cadence, idx) => (
                  <CadenceCard key={cadence.name} cadence={cadence} index={idx} />
                ))}
              </div>
            </div>

            {/* What every league deal includes */}
            <Reveal className="rounded-3xl border border-border bg-surface p-6 sm:p-7">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted">
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
              <p className="mt-5 font-mono text-[0.72rem] uppercase tracking-wider text-muted">
                {LEAGUE_OFFERING.priceNote}
              </p>
              <button
                type="button"
                onClick={onStart}
                className="group mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-accent1/50 px-5 py-3 font-mono text-sm font-semibold uppercase tracking-wider text-accent1 transition-colors hover:bg-accent1 hover:text-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent1"
              >
                {LEAGUE_OFFERING.cta}
                <ArrowRight className="h-4 w-4" aria-hidden />
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
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// One token-pack card. The "Academy" pack is the single highlighted plan,
// elevated with a soft lime accent; the rest sit on calm neutral surfaces.
// ---------------------------------------------------------------------------

function PackCard({
  pack,
  index,
  onStart,
}: {
  pack: TokenPack;
  index: number;
  onStart: () => void;
}) {
  const popular = !!pack.mostPopular;

  return (
    <Reveal index={index} className="h-full">
      <div
        role="listitem"
        className={[
          'relative flex h-full flex-col rounded-3xl p-6',
          popular
            ? 'border border-accent1/50 bg-accent1/[0.04] shadow-[0_0_32px_-20px_var(--color-accent1)]'
            : 'border border-border bg-surface',
        ].join(' ')}
      >
      {popular && (
        <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent1 px-2.5 py-1 font-mono text-[0.6rem] font-bold uppercase tracking-[0.14em] text-bg">
          <Sparkles className="h-3 w-3" aria-hidden />
          Most popular
        </span>
      )}

      <p className="font-display text-base font-bold text-text">{pack.pack}</p>
      <p className="mt-1 font-mono text-[0.7rem] uppercase tracking-wider text-muted">
        {pack.tokens === 1 ? '1 token' : `${pack.tokens} tokens`}
      </p>

      {/* Price block: per-match headline + pack total. */}
      <div className="mt-5">
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

      {/* Savings vs the $49 baseline, only the highlighted plan carries the lime
          chip; the rest stay neutral so the accent stays rationed. */}
      <p
        className={[
          'mt-3 inline-flex w-fit items-center rounded-full px-2.5 py-1 font-mono text-[0.62rem] font-semibold uppercase tracking-wider',
          pack.save > 0 && popular
            ? 'bg-accent1/15 text-accent1'
            : 'bg-surfaceAlt text-muted',
        ].join(' ')}
      >
        {pack.save > 0 ? `Save ${pack.save}%` : 'Baseline rate'}
      </p>

      <p className="mt-4 flex-1 font-body text-xs leading-relaxed text-muted">
        {pack.bestFor}
      </p>

      <button
        type="button"
        onClick={onStart}
        className={[
          'group mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent1',
          popular
            ? 'bg-accent1 text-bg hover:bg-accent1/90'
            : 'border border-border text-text hover:border-accent1/50 hover:text-accent1',
        ].join(' ')}
      >
        Unlock
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </button>
      </div>
    </Reveal>
  );
}

// ---------------------------------------------------------------------------
// One highlight-reel cadence card (weekly / monthly / seasonal).
// ---------------------------------------------------------------------------

function CadenceCard({
  cadence,
  index,
}: {
  cadence: HighlightCadence;
  index: number;
}) {
  return (
    <Reveal index={index} className="h-full">
      <div
        role="listitem"
        className="flex h-full flex-col rounded-3xl border border-border bg-surface p-6"
      >
        <p className="font-display text-base font-bold text-text">{cadence.name}</p>
        <p className="mt-3 flex-1 font-body text-sm leading-relaxed text-muted">
          {cadence.description}
        </p>
      </div>
    </Reveal>
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
    <li className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surfaceAlt text-muted">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <p className="font-display text-sm font-bold text-text">{title}</p>
      <p className="font-body text-xs leading-relaxed text-muted">{body}</p>
    </li>
  );
}
