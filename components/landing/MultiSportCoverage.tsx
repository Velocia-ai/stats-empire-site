'use client';

// Stats Empire, MultiSportCoverage
//
// The "what we cover" section, Court Vision identity. Tennis, soccer and
// basketball lead as three large primary cards, each rendering its REAL
// PitchBackground from components/viz, a signature metric pulled live from
// getSportData(), and a chalk-line "play arc" that draws on (framer-motion
// pathLength) as the card enters view, like a coach sketching the winning play
// onto the surface. Baseball/softball and AFL stay available as smaller
// "also covered" tiles below the featured three.
//
// All color/typography comes from the var(--color-*) / var(--font-*) tokens, so
// the section re-skins to Court Vision under data-theme="court". Every motion is
// guarded by useReducedMotion(); the play arcs simply render fully drawn when
// reduced motion is requested.

import { useMemo } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

import { FEATURED_SPORTS, SPORTS, getSportData } from '@/lib/sports';
import type { MetricRow, SportKey, SportMeta } from '@/lib/types';

import PitchBackground from '@/components/viz/PitchBackground';

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
  afl: 'Disposals',
};

// A short human framing for the signature metric, what the card is "drawing".
const SIGNATURE_CAPTION: Record<SportKey, string> = {
  tennis: 'Serve placement & rally patterns',
  soccer: 'xG shot maps & pass networks',
  basketball: 'Shot charts & true-shooting',
  baseball: 'Spray charts & exit velocity',
  afl: 'Contested possession & zones',
};

function signatureMetric(key: SportKey): MetricRow {
  const { metrics } = getSportData(key);
  return metrics.find((m) => m.label === SIGNATURE_LABEL[key]) ?? metrics[0];
}

function metricDisplay(m: MetricRow): string {
  const v = typeof m.value === 'number' ? String(m.value) : m.value;
  return m.unit ? `${v}${m.unit === '%' || m.unit === '°' ? '' : ' '}${m.unit}` : v;
}

// A representative "play arc" per pitch, a normalized 0..1 path we draw across
// the surface as the signature gesture for that sport. Points are picked to read
// well over each pitch's markings (see PitchBackground geometry).
const PLAY_ARC: Record<SportKey, [number, number][]> = {
  // Serve from baseline corner, over the net, into the far service box.
  tennis: [[0.18, 0.9], [0.46, 0.62], [0.72, 0.3]],
  // Build-up carry up the spine, then a cutback into the box.
  soccer: [[0.5, 0.82], [0.42, 0.5], [0.6, 0.28], [0.5, 0.12]],
  // Drive from the wing to the rim.
  basketball: [[0.86, 0.5], [0.62, 0.28], [0.5, 0.12]],
  // Pulled line drive into the left-field gap.
  baseball: [[0.5, 0.86], [0.36, 0.6], [0.24, 0.36]],
  // Centre clearance forward to the goal square.
  afl: [[0.5, 0.5], [0.5, 0.34], [0.5, 0.2]],
};

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export interface MultiSportCoverageProps {
  /** Optional extra classes for the outer <section>. */
  className?: string;
}

export default function MultiSportCoverage({ className }: MultiSportCoverageProps) {
  const reduce = useReducedMotion();

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
        'relative scroll-mt-20 overflow-hidden px-6 py-20 sm:py-28',
        className ?? '',
      ].join(' ')}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-texture" />

      <div className="relative mx-auto max-w-6xl">
        {/* Header */}
        <header className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.3em] text-accent1">
            Coverage
          </p>
          <h2
            id="coverage-heading"
            className="mt-3 font-display text-3xl font-bold leading-[1.08] tracking-tight sm:text-5xl"
          >
            Three sports we live in.
            <br className="hidden sm:block" /> Five we cover end to end.
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-body text-base leading-relaxed text-muted">
            Tennis, soccer and basketball lead everything we do, tagged deepest,
            shipped fastest. Baseball/softball and Australian football round out
            the roster.
          </p>
        </header>

        {/* Featured three */}
        <ul className="mt-14 grid gap-5 lg:grid-cols-3" role="list">
          {featured.map((meta, i) => (
            <FeaturedCard key={meta.key} meta={meta} index={i} reduce={!!reduce} />
          ))}
        </ul>

        {/* Also covered */}
        <div className="mt-12">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.25em] text-muted">
            Also covered
          </p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2" role="list">
            {secondary.map((meta) => (
              <SecondaryTile key={meta.key} meta={meta} reduce={!!reduce} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Featured card, large, with real pitch + drawn play arc + signature metric.
// ---------------------------------------------------------------------------

function FeaturedCard({
  meta,
  index,
  reduce,
}: {
  meta: SportMeta;
  index: number;
  reduce: boolean;
}) {
  const data = getSportData(meta.key);
  const metric = signatureMetric(meta.key);

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : index * 0.08 },
    },
  };

  return (
    <motion.li
      variants={cardVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      className="group relative"
    >
      <a
        href={`#${meta.key}`}
        className="block h-full rounded-2xl border border-border bg-surface/60 p-5 backdrop-blur transition-colors hover:border-accent1/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2"
      >
        {/* Pitch + drawn play arc */}
        <div className="relative overflow-hidden rounded-xl border border-border/70 bg-bg/40">
          <PitchBackground pitch={data.pitch} className="w-full" />
          <PlayArc
            sport={meta.key}
            pitch={data.pitch}
            reduce={reduce}
            delay={reduce ? 0 : 0.2 + index * 0.08}
          />
          {/* Floating signature metric chip */}
          <div className="absolute left-3 top-3 rounded-lg border border-accent1/40 bg-bg/80 px-3 py-1.5 backdrop-blur">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted">
              {metric.label}
            </p>
            <p className="font-display text-xl font-bold leading-none text-accent1">
              {metricDisplay(metric)}
            </p>
          </div>
        </div>

        {/* Copy */}
        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-bold tracking-tight text-text">
              {meta.name}
            </h3>
            <p className="mt-1 font-body text-sm leading-relaxed text-muted">
              {meta.tagline}
            </p>
          </div>
          <ArrowUpRight
            className="mt-1 h-5 w-5 shrink-0 text-muted transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent1"
            aria-hidden
          />
        </div>

        <p className="mt-3 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-accent2">
          {SIGNATURE_CAPTION[meta.key]}
        </p>
      </a>
    </motion.li>
  );
}

// ---------------------------------------------------------------------------
// PlayArc, the signature chalk-line draw-on. An SVG path over the pitch in the
// SAME normalized 0..1 space, animated via framer-motion pathLength so it draws
// itself in when the card enters view. Reduced-motion → rendered fully drawn.
// ---------------------------------------------------------------------------

function PlayArc({
  sport,
  reduce,
  delay,
}: {
  sport: SportKey;
  pitch: string;
  reduce: boolean;
  delay: number;
}) {
  const pts = PLAY_ARC[sport];

  // Build a smooth-ish path in a 100x100 box (percent space) so it overlays
  // any pitch viewBox via preserveAspectRatio="none".
  const d = useMemo(() => {
    const [first, ...rest] = pts;
    const move = `M ${first[0] * 100} ${first[1] * 100}`;
    const lines = rest.map(([x, y]) => `L ${x * 100} ${y * 100}`).join(' ');
    return `${move} ${lines}`;
  }, [pts]);

  const end = pts[pts.length - 1];

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      {/* Chalk trail */}
      <motion.path
        d={d}
        fill="none"
        stroke="var(--color-accent2)"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={reduce ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0.9 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: reduce ? 0 : 1.1, ease: 'easeInOut', delay }}
        style={{ filter: 'drop-shadow(0 0 4px var(--color-accent2))' }}
      />
      {/* Endpoint marker, the "spot" the play lands on */}
      <motion.circle
        cx={end[0] * 100}
        cy={end[1] * 100}
        r={1.8}
        fill="var(--color-accent1)"
        vectorEffect="non-scaling-stroke"
        initial={reduce ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : delay + 1.05 }}
        style={{ transformOrigin: `${end[0] * 100}px ${end[1] * 100}px` }}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Secondary tile, compact "also covered", no large pitch.
// ---------------------------------------------------------------------------

function SecondaryTile({ meta, reduce }: { meta: SportMeta; reduce: boolean }) {
  const data = getSportData(meta.key);
  const metric = signatureMetric(meta.key);

  return (
    <motion.li
      initial={{ opacity: 0, y: reduce ? 0 : 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: reduce ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <a
        href={`#${meta.key}`}
        className="group flex items-center gap-4 rounded-xl border border-border bg-surface/40 p-4 transition-colors hover:border-accent1/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2"
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
    </motion.li>
  );
}
