'use client';

// Stats Empire, ReportBento
//
// The "What you get: A Coach-Ready Report" section. A bento-box grid of varied
// tile sizes that composes the real viz primitives into one premium, high-end
// sports-analytics surface, no generic pie/line clichés.
//
// A segmented SportToggle morphs the entire bento between the 5 sports: the
// hero spatial tile (the right primitive for that sport's spatialKind), the
// zone-coverage tile, the trajectory tile, the headline StatTiles, the advanced
// MetricTable, and the Recharts TrendChart all swap to the new dataset via
// getSportData(). framer-motion drives smooth layout/cross-fade transitions and
// is reduced-motion safe throughout.

import { useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';

import { SPORTS, getSportData } from '@/lib/sports';
import type { PitchType, SpatialPoint, SportData, SportKey } from '@/lib/types';

import {
  Heatmap,
  PitchBackground,
  SprayChart,
  TrajectoryLines,
  ZoneCoverage,
} from '@/components/viz';
import { MetricTable } from '@/components/viz/MetricTable';
import { StatTiles } from '@/components/viz/StatTiles';
// Recharts is heavy (~606KB raw / ~157KB brotli). Import the chart through its
// code-split wrapper so the Recharts/d3 chunk is fetched ONLY on this route, not
// pulled into the shared bundle that the chart-free Home and Pricing pages load.
import { TrendChart } from '@/components/viz/LazyTrendChart';
import Reveal from '@/components/Reveal';

import BentoTile from './BentoTile';
import SportToggle from './SportToggle';

export interface ReportBentoProps {
  /** Sport to show first. Default 'tennis' (the lead featured sport). */
  defaultSport?: SportKey;
  /** Optional extra classes for the outer <section>. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Spatial-tile selection. Each sport's `spatialKind` decides which primitive
// becomes the hero overlay on the PitchBackground, and what we call it.
// ---------------------------------------------------------------------------

interface SpatialMeta {
  eyebrow: string;
  title: string;
  caption: string;
}

const SPATIAL_META: Record<SportData['spatialKind'], SpatialMeta> = {
  shot: {
    eyebrow: 'Shot chart',
    title: 'Make / miss map',
    caption: 'Every attempt by location, makes pop, misses recede.',
  },
  spray: {
    eyebrow: 'Spray chart',
    title: 'Ball-in-play map',
    caption: 'Outcomes dual-encoded by colour and shape.',
  },
  heatmap: {
    eyebrow: 'Territory',
    title: 'Possession heatmap',
    caption: 'Where the work happens, intensity-ramped.',
  },
  passmap: {
    eyebrow: 'Build-up',
    title: 'Pass network & xG',
    caption: 'Progression lines into the final third.',
  },
};

/**
 * Render the right hero spatial overlay for a sport's spatialKind. This covers
 * the STACKED overlays only (shot / heatmap / spray): each returns a layer that
 * the caller drops over a shared PitchBackground via `absolute inset-0`. The
 * `passmap` kind is intentionally NOT handled here, it owns its own field box +
 * below-field legend (see the hero tile's passmap branch) so the interactive
 * PLAYS legend never sits on top of the pitch.
 */
function HeroSpatial({
  data,
  pitch,
}: {
  data: SportData;
  pitch: PitchType;
}) {
  switch (data.spatialKind) {
    case 'shot':
      return <SprayChart points={data.spray} pitch={pitch} mode="shot" className="absolute inset-0" />;
    case 'heatmap':
      return <Heatmap cells={data.heatmap} pitch={pitch} className="absolute inset-0" />;
    case 'spray':
    default:
      return <SprayChart points={data.spray} pitch={pitch} mode="spray" className="absolute inset-0" />;
  }
}

// Outcome → visual register, mirrored EXACTLY from SprayChart.styleFor so the
// HTML breakdown chips below the court read in the same colours as the marks on
// it. positive = lime accent1, negative = a fixed warm red (the accent2 token
// is unreliable across themes), neutral = muted.
type OutcomeKind = 'positive' | 'negative' | 'neutral';
const NEGATIVE_COLOR = '#ff5a4d';
const KIND_COLOR: Record<OutcomeKind, string> = {
  positive: 'var(--color-accent1)',
  negative: NEGATIVE_COLOR,
  neutral: 'var(--color-muted)',
};
const OUTCOME_KIND: Record<string, OutcomeKind> = {
  make: 'positive',
  winner: 'positive',
  miss: 'negative',
  error: 'negative',
  neutral: 'neutral',
};
// Label wording differs by spatial register (shot = made/missed, spray =
// winners/errors), matching the in-SVG legend so chip ↔ mark stay in sync.
const OUTCOME_LABEL: Record<'spray' | 'shot', Record<string, string>> = {
  shot: { make: 'Made', miss: 'Missed', winner: 'Made', error: 'Missed', neutral: 'Attempts' },
  spray: { make: 'Winners', winner: 'Winners', miss: 'Errors', error: 'Errors', neutral: 'In play' },
};
const KIND_ORDER: Record<OutcomeKind, number> = { positive: 0, negative: 1, neutral: 2 };

interface OutcomeStat {
  label: string;
  count: number;
  pct: number;
  kind: OutcomeKind;
  color: string;
}

/** Collapse spray points into ordered, de-duped outcome stats (label+count+pct). */
function outcomeStats(points: SpatialPoint[], mode: 'spray' | 'shot'): OutcomeStat[] {
  const total = points.length || 1;
  const acc = new Map<string, OutcomeStat>();
  points.forEach((p) => {
    const o = p.outcome ?? 'neutral';
    const kind = OUTCOME_KIND[o] ?? 'neutral';
    const label = OUTCOME_LABEL[mode][o] ?? o;
    const cur = acc.get(label);
    if (cur) {
      cur.count += 1;
    } else {
      acc.set(label, { label, count: 1, pct: 0, kind, color: KIND_COLOR[kind] });
    }
  });
  const stats = Array.from(acc.values());
  stats.forEach((s) => {
    s.pct = Math.round((s.count / total) * 100);
  });
  return stats.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
}

/**
 * A one-line "read" of the spray distribution: leads with the dominant positive
 * register and its conversion share, so the tile says something, not just plots.
 */
function outcomeRead(stats: OutcomeStat[], noun: string): string {
  if (stats.length === 0) return 'No events recorded yet.';
  const total = stats.reduce((s, x) => s + x.count, 0);
  const positive = stats.find((s) => s.kind === 'positive');
  if (positive) {
    return `${positive.count} of ${total} ${noun} were ${positive.label.toLowerCase()} (${positive.pct}% conversion).`;
  }
  const top = [...stats].sort((a, b) => b.count - a.count)[0];
  return `${top.count} of ${total} ${noun} were ${top.label.toLowerCase()}.`;
}

/**
 * Compact outcome breakdown rendered as real HTML BELOW the court, inside the
 * hero spray tile. Fills what used to be dead space with a premium, legible
 * read: a one-line summary, then a row of count chips that double as the colour
 * + shape legend (the chip dot matches the on-court mark colour exactly). This
 * makes the tall hero tile read full and intentional rather than a court
 * floating above a void.
 */
function OutcomeBreakdown({
  points,
  mode,
  noun,
}: {
  points: SpatialPoint[];
  mode: 'spray' | 'shot';
  noun: string;
}) {
  const stats = useMemo(() => outcomeStats(points, mode), [points, mode]);
  const read = useMemo(() => outcomeRead(stats, noun), [stats, noun]);

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4">
      <p className="font-body text-xs leading-relaxed text-muted sm:text-sm lg:text-[0.9375rem]">
        {read}
      </p>
      <ul className="flex flex-wrap gap-2" aria-label="Outcome breakdown">
        {stats.map((s) => (
          <li
            key={s.label}
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-bg/60 px-3 py-1.5"
          >
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-bg/80"
              style={{ backgroundColor: s.color }}
            />
            <span className="font-mono text-[0.8125rem] font-semibold tabular-nums text-text sm:text-sm lg:text-[0.9375rem]">
              {s.count}
            </span>
            <span className="font-body text-[0.75rem] uppercase tracking-wide text-muted sm:text-xs lg:text-[0.8125rem]">
              {s.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Stacked spatial layers share ONE frame: the PitchBackground sizes the box via
// its own viewBox aspect, and every overlay is absolutely positioned over the
// SAME viewBox, so markers/heat/zones/paths align pixel-for-pixel. A per-pitch
// max-width keeps tall portrait fields (tennis 540x1000) from blowing the tile's
// height out, while letting wider fields use the full width. `minHeight` floors
// the rendered size so the in-SVG legends + markers never collapse to an
// illegible scale in a small tile. Markers/legends live inside the SVG viewBox,
// so the wrapper's overflow-hidden only clips the rounded corner, never the viz.
const STACK_MAX_W: Record<PitchType, string> = {
  'tennis-court': '20rem', // tall + narrow: cap width so height stays in the tile
  'football-field': '22rem',
  'soccer-pitch': '26rem',
  'baseball-diamond': '100%',
  'basketball-halfcourt': '100%',
};

function SpatialStack({
  children,
  pitch,
  minHeight = 220,
  maxWidth,
}: {
  children: React.ReactNode;
  pitch: PitchType;
  /** Floor on the rendered height (px) so small tiles stay legible. */
  minHeight?: number;
  /**
   * Optional per-instance width cap that overrides the shared per-pitch cap.
   * The spray hero passes a wider cap so the portrait court grows to use more of
   * its tall tile, while the smaller Zone tile keeps the default compact cap.
   */
  maxWidth?: string;
}) {
  return (
    <div className="flex w-full justify-center">
      <div
        className="relative overflow-hidden rounded-xl bg-bg"
        style={{ width: '100%', maxWidth: maxWidth ?? STACK_MAX_W[pitch], minHeight }}
      >
        <PitchBackground pitch={pitch} className="block w-full" />
        <div className="absolute inset-0">{children}</div>
      </div>
    </div>
  );
}

export default function ReportBento({
  defaultSport = 'tennis',
  className = '',
}: ReportBentoProps) {
  const [sport, setSport] = useState<SportKey>(defaultSport);
  const prefersReduced = useReducedMotion();

  const data = useMemo(() => getSportData(sport), [sport]);
  const pitch = data.pitch;
  const spatial = SPATIAL_META[data.spatialKind];

  // Headline tiles get the first four metrics; the table shows the full set.
  const headlineMetrics = useMemo(() => data.metrics.slice(0, 4), [data.metrics]);

  return (
    <section
      aria-labelledby="report-bento-heading"
      className={`relative w-full ${className}`}
    >
      <div className="relative mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-28 lg:py-32">
        {/* ---- Section header ------------------------------------------- */}
        <Reveal
          as="header"
          className="mb-12 flex flex-col gap-6 sm:mb-16 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="max-w-xl">
            <p className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.3em] text-accent1 sm:text-xs lg:text-[0.875rem]">
              What you get
            </p>
            <h2
              id="report-bento-heading"
              className="mt-3 font-display font-bold leading-[1.1] tracking-tight text-text text-[clamp(1.75rem,5vw,4.25rem)]"
            >
              A coach-ready report
            </h2>
            <p className="mt-4 font-body text-sm leading-relaxed text-muted sm:text-base lg:text-[1.25rem]">
              Not a spreadsheet dump, a composed intelligence brief. Spatial maps,
              advanced metrics and momentum trends, tuned to {data.displayName.toLowerCase()}.
              Switch the sport and the whole report re-renders to match.
            </p>
          </div>

          <SportToggle
            sports={SPORTS}
            value={sport}
            onChange={setSport}
            className="self-start sm:self-auto"
          />
        </Reveal>

        {/* ---- Bento grid ---------------------------------------------- */}
        {/* 6-col desktop grid drives the varied tile sizes; collapses to a
            single column on mobile so every tile is full-width and nothing is
            cramped. The grid + tile frames stay mounted across sport changes;
            only each tile's BODY cross-fades (keyed on `sport`), so the morph
            is smooth and never stalls. */}
        {/* The grid + tile frames stay mounted across sport changes; only each
            tile's BODY cross-fades (keyed on `sport`). `index` drives a precise
            reading-order cascade (hero, then across and down) so the reveal is
            deliberate, never random; the frame entrance always settles visible
            so it never gates a viz's own in-view draw-on. Row heights stay
            content-driven (floored by each stack's min-height) so the hero's
            2-row span keeps its intended dominant proportion. */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-6">
            {/* HERO spatial tile, dominant, spans 4/6 cols × 2 rows */}
            <BentoTile
              hero
              index={0}
              contentKey={sport}
              eyebrow={spatial.eyebrow}
              title={spatial.title}
              meta={
                <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted sm:text-[0.7rem] lg:text-[0.8125rem]">
                  {data.displayName}
                </span>
              }
              className="sm:col-span-2 lg:col-span-4 lg:row-span-2"
            >
              {/* Full-height flex column that VERTICALLY CENTERS its content. The
                  hero spans 2 grid rows, so the tile is taller than the portrait
                  court + its breakdown; centring the court / caption / breakdown
                  group splits the leftover height into balanced padding above and
                  below instead of one dead void under the court, so the tile
                  reads as an intentional, premium composition top-to-bottom. */}
              <div className="flex min-h-0 flex-1 flex-col justify-center">
                {data.spatialKind === 'passmap' ? (
                  /* PASSMAP hero (soccer "Pass network & xG", and any sport mapped
                     to passmap). TrajectoryLines owns BOTH the field and the
                     interactive PLAYS legend here via its opt-in `legendBelow`
                     mode: it renders the PitchBackground + drawn paths in a field
                     box, then the legend as a real-HTML sibling STRICTLY BELOW the
                     field. Because the legend is a normal-flow sibling AFTER the
                     relative field box, the field box's bottom is always <= the
                     legend's top, so the legend can never overlap the pitch (the
                     old default-mode docked-in-SVG legend covered the lower
                     third). A portrait-pitch width cap keeps the tall field from
                     eating the whole 2-row tile while the freed space below
                     carries the now-larger, fully-legible legend. */
                  <div
                    className="mx-auto w-full"
                    style={{ maxWidth: pitch === 'tennis-court' ? '17rem' : '24rem' }}
                  >
                    <TrajectoryLines
                      paths={data.trajectories}
                      pitch={pitch}
                      animate={!prefersReduced}
                      legendBelow
                    />
                  </div>
                ) : (
                  <SpatialStack
                    pitch={pitch}
                    minHeight={340}
                    // Portrait courts (tennis) get a wider cap in the tall hero so
                    // the court uses more of the height; wide pitches already fill.
                    maxWidth={pitch === 'tennis-court' ? '24rem' : undefined}
                  >
                    <HeroSpatial data={data} pitch={pitch} />
                  </SpatialStack>
                )}
                <p className="mt-3 font-body text-xs leading-relaxed text-muted sm:text-sm lg:text-[0.9375rem]">
                  {spatial.caption}
                </p>
                {/* Spray/shot heroes plot discrete outcomes, so right under the
                    court the tile carries a real outcome breakdown (count chips
                    that double as the colour legend) + a one-line read, filling
                    what was an empty void and making the tall hero tile read full
                    and premium. Heatmap / passmap heroes have their own self-
                    contained legends (passmap's is the below-field PLAYS legend),
                    so they keep just the caption. */}
                {(data.spatialKind === 'spray' || data.spatialKind === 'shot') && (
                  <OutcomeBreakdown
                    points={data.spray}
                    mode={data.spatialKind === 'shot' ? 'shot' : 'spray'}
                    noun={data.spatialKind === 'shot' ? 'attempts' : 'balls in play'}
                  />
                )}
              </div>
            </BentoTile>

            {/* HEADLINE numbers, wide-ish, spans 2/6 cols */}
            <BentoTile
              index={1}
              contentKey={sport}
              eyebrow="Headline"
              title="Key numbers"
              className="sm:col-span-2 lg:col-span-2"
            >
              <StatTiles rows={headlineMetrics} />
            </BentoTile>

            {/* ZONE coverage tile, spans 2/6 cols */}
            <BentoTile
              index={2}
              contentKey={sport}
              eyebrow="Coverage"
              title="Zone control"
              className="sm:col-span-1 lg:col-span-2"
            >
              <SpatialStack pitch={pitch} minHeight={240}>
                <ZoneCoverage zones={data.zones} pitch={pitch} className="absolute inset-0" />
              </SpatialStack>
            </BentoTile>

            {/* TRAJECTORY tile, a FEATURE tile: spans 4/6 cols x 2 rows so the
                pitch + drawn paths are large and clearly legible on desktop,
                matching the hero's dominant proportion. The field gets a tall
                floor so the lines have room to breathe and never read cramped. */}
            <BentoTile
              hero
              index={3}
              contentKey={sport}
              eyebrow="Movement"
              title="Trajectories"
              meta={
                <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted sm:text-[0.7rem] lg:text-[0.8125rem]">
                  {data.trajectories.length} paths
                </span>
              }
              className="sm:col-span-2 lg:col-span-4 lg:row-span-2"
            >
              {/* TrajectoryLines owns BOTH the field and the legend here via its
                  opt-in `legendBelow` mode: it renders the PitchBackground +
                  drawn paths in a field box, then the interactive legend as a
                  real-HTML sibling STRICTLY BELOW the field, so the legend can
                  never overlap the plays (the previous docked-in-SVG legend
                  covered the lower court). A vertical flex column centres the
                  field+legend group, and a portrait-court width cap keeps the
                  tall court from eating the whole 2-row tile while the freed
                  space below carries the now-larger, fully-legible legend. */}
              <div className="flex min-h-0 flex-1 flex-col justify-center">
                <div
                  className="mx-auto w-full"
                  style={{ maxWidth: pitch === 'tennis-court' ? '17rem' : '24rem' }}
                >
                  <TrajectoryLines
                    paths={data.trajectories}
                    pitch={pitch}
                    animate={!prefersReduced}
                    legendBelow
                  />
                </div>
              </div>
            </BentoTile>

            {/* MOMENTUM / trend tile (Recharts), spans 2/6 cols x 2 rows so it
                sits flush beside the Trajectory feature tile and the grid block
                has no holes (Trajectory 4x2 + Momentum 2x2 fill the full 6 cols
                across two rows). */}
            <BentoTile
              index={4}
              contentKey={sport}
              eyebrow="Momentum"
              title="Form trend"
              flushBody
              className="sm:col-span-2 lg:col-span-2 lg:row-span-2"
            >
              <div className="flex flex-1 items-center px-5 pb-5 sm:px-6 sm:pb-6 lg:px-7 lg:pb-7">
                <TrendChart
                  label={data.trend.label}
                  xLabels={data.trend.xLabels}
                  series={data.trend.series}
                />
              </div>
            </BentoTile>

            {/* ADVANCED metric table, full-width strip across the bottom */}
            <BentoTile
              index={5}
              contentKey={sport}
              eyebrow="Deep dive"
              title="Advanced metrics"
              flushBody
              meta={
                <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted sm:text-[0.7rem] lg:text-[0.8125rem]">
                  {data.metrics.length} metrics
                </span>
              }
              className="sm:col-span-2 lg:col-span-6"
            >
              <div className="px-5 pb-5 sm:px-6 sm:pb-6 lg:px-7 lg:pb-7">
                <MetricTable rows={data.metrics} />
              </div>
            </BentoTile>
        </div>
      </div>
    </section>
  );
}
