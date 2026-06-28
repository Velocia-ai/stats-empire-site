'use client';

// Stats Empire, MultiSportCoverage
//
// The "what we cover" section, Court Vision identity. Tennis, soccer and
// basketball lead as three large primary cards, each rendering its REAL
// PitchBackground from components/viz and a signature metric pulled live from
// getSportData(). Baseball/softball and American Football stay available as
// smaller "also covered" tiles below the featured three.
//
// All color/typography comes from the var(--color-*) / var(--font-*) tokens, so
// the section re-skins to Court Vision under data-theme="court". Entrances use
// the shared <Reveal> primitive (fade + gentle rise, once, subtle stagger);
// there is no perpetual or background motion here, keeping the surface calm.

import { useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';

import { FEATURED_SPORTS, SPORTS, getSportData } from '@/lib/sports';
import type { MetricRow, SportKey, SportMeta } from '@/lib/types';

import PitchBackground from '@/components/viz/PitchBackground';
import Reveal from '@/components/Reveal';

// ---------------------------------------------------------------------------
// Signature metric per sport, the single number we headline on each card.
// Chosen by label from the sport's real metrics array (falls back to the first
// metric if the label ever changes upstream).
// ---------------------------------------------------------------------------

const SIGNATURE_LABEL: Record<SportKey, string> = {
  tennis: 'Aces',
  soccer: 'xG',
  basketball: 'PTS',
  baseball: 'AVG',
  americanfootball: 'Pass yds',
};

// A short human framing for the signature metric, what the card is "drawing".
const SIGNATURE_CAPTION: Record<SportKey, string> = {
  tennis: 'Serve placement & rally patterns',
  soccer: 'xG shot maps & pass networks',
  basketball: 'Shot charts & true-shooting',
  baseball: 'Spray charts & exit velocity',
  americanfootball: 'Passing charts & field position',
};

function signatureMetric(key: SportKey): MetricRow {
  const { metrics } = getSportData(key);
  return metrics.find((m) => m.label === SIGNATURE_LABEL[key]) ?? metrics[0];
}

function metricDisplay(m: MetricRow): string {
  const v = typeof m.value === 'number' ? String(m.value) : m.value;
  return m.unit ? `${v}${m.unit === '%' || m.unit === '°' ? '' : ' '}${m.unit}` : v;
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export interface MultiSportCoverageProps {
  /** Optional extra classes for the outer <section>. */
  className?: string;
}

export default function MultiSportCoverage({ className }: MultiSportCoverageProps) {
  const featured = useMemo<SportMeta[]>(
    () =>
      FEATURED_SPORTS.map(
        (k) => SPORTS.find((s) => s.key === k)!,
      ).filter(Boolean),
    [],
  );

  const secondary = useMemo<SportMeta[]>(
    () => SPORTS.filter((s) => !FEATURED_SPORTS.includes(s.key)),
    [],
  );

  return (
    <section
      id="coverage"
      aria-labelledby="coverage-heading"
      className={[
        'relative scroll-mt-20 py-16 sm:py-28 lg:py-32',
        className ?? '',
      ].join(' ')}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Header */}
        <Reveal as="header" className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.3em] text-accent1">
            Coverage
          </p>
          <h2
            id="coverage-heading"
            className="mt-3 font-display font-bold leading-[1.1] tracking-tight text-[clamp(1.75rem,4.8vw,3.75rem)]"
          >
            Three sports we live in.
            <br className="hidden sm:block" /> Five we cover end to end.
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-body text-base leading-relaxed text-muted lg:text-lg">
            Tennis, soccer and basketball lead everything we do, tagged deepest,
            shipped fastest. Baseball/softball and American Football round out
            the roster.
          </p>
        </Reveal>

        {/* Featured three */}
        <ul className="grid gap-6 sm:gap-8 lg:grid-cols-3" role="list">
          {featured.map((meta, i) => (
            <Reveal as="li" index={i} key={meta.key} className="group">
              <FeaturedCard meta={meta} />
            </Reveal>
          ))}
        </ul>

        {/* Also covered */}
        <div className="mt-16 sm:mt-20">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.25em] text-muted">
            Also covered
          </p>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 sm:gap-8" role="list">
            {secondary.map((meta, i) => (
              <Reveal as="li" index={i} key={meta.key}>
                <SecondaryTile meta={meta} />
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Featured card, large, with real pitch + signature metric.
// ---------------------------------------------------------------------------

function FeaturedCard({ meta }: { meta: SportMeta }) {
  const data = getSportData(meta.key);
  const metric = signatureMetric(meta.key);

  return (
    <a
      id={meta.key}
      href={`#${meta.key}`}
      className="block h-full scroll-mt-24 rounded-2xl border border-border bg-surface/60 p-5 transition-colors hover:border-accent1/40"
    >
      {/* Pitch (the data viz) with its floating signature metric */}
      <div className="relative overflow-hidden rounded-xl border border-border/70 bg-bg/40">
        <PitchBackground pitch={data.pitch} className="w-full" />
        {/* Floating signature metric chip */}
        <div className="absolute left-3 top-3 rounded-lg border border-border/70 bg-bg/80 px-3 py-1.5 backdrop-blur">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted">
            {metric.label}
          </p>
          <p className="font-display text-xl font-bold leading-none text-accent1">
            {metricDisplay(metric)}
          </p>
        </div>
      </div>

      {/* Copy */}
      <div className="mt-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold tracking-tight text-text">
            {meta.name}
          </h3>
          <p className="mt-1 font-body text-sm leading-relaxed text-muted">
            {meta.tagline}
          </p>
        </div>
        <ArrowUpRight
          className="mt-1 h-5 w-5 shrink-0 text-muted transition-colors group-hover:text-accent1"
          aria-hidden
        />
      </div>

      <p className="mt-3 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted">
        {SIGNATURE_CAPTION[meta.key]}
      </p>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Secondary tile, compact "also covered", no large pitch.
// ---------------------------------------------------------------------------

function SecondaryTile({ meta }: { meta: SportMeta }) {
  const data = getSportData(meta.key);
  const metric = signatureMetric(meta.key);

  return (
    <a
      id={meta.key}
      href={`#${meta.key}`}
      className="group flex scroll-mt-24 items-center gap-4 rounded-xl border border-border bg-surface/40 p-4 transition-colors hover:border-accent1/30"
    >
      {/* Mini pitch thumbnail */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-bg/40">
        <PitchBackground pitch={data.pitch} className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-base font-bold tracking-tight text-text">
          {meta.name}
        </h3>
        <p className="mt-0.5 truncate font-body text-xs leading-relaxed text-muted">
          {meta.tagline}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-muted">
          {metric.label}
        </p>
        <p className="font-display text-base font-bold leading-none text-text">
          {metricDisplay(metric)}
        </p>
      </div>
    </a>
  );
}
