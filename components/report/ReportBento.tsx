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
import { TrendChart } from '@/components/viz/TrendChart';
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

/** Render the right hero spatial overlay for a sport's spatialKind. */
function HeroSpatial({
  data,
  pitch,
  animate,
}: {
  data: SportData;
  pitch: PitchType;
  animate: boolean;
}) {
  switch (data.spatialKind) {
    case 'shot':
      return <SprayChart points={data.spray} pitch={pitch} mode="shot" className="absolute inset-0" />;
    case 'heatmap':
      return <Heatmap cells={data.heatmap} pitch={pitch} className="absolute inset-0" />;
    case 'passmap':
      return <TrajectoryLines paths={data.trajectories} pitch={pitch} animate={animate} className="absolute inset-0" />;
    case 'spray':
    default:
      return <SprayChart points={data.spray} pitch={pitch} mode="spray" className="absolute inset-0" />;
  }
}

/** Compact outcome tally for the hero tile meta (e.g. "9 made · 7 missed"). */
function outcomeTally(points: SpatialPoint[]): string {
  const counts = new Map<string, number>();
  points.forEach((p) => {
    const o = p.outcome ?? 'neutral';
    counts.set(o, (counts.get(o) ?? 0) + 1);
  });
  const WORDS: Record<string, string> = {
    make: 'made',
    miss: 'missed',
    winner: 'winners',
    error: 'errors',
    neutral: 'touches',
  };
  return Array.from(counts.entries())
    .map(([o, n]) => `${n} ${WORDS[o] ?? o}`)
    .join(' · ');
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
}: {
  children: React.ReactNode;
  pitch: PitchType;
  /** Floor on the rendered height (px) so small tiles stay legible. */
  minHeight?: number;
}) {
  return (
    <div className="flex w-full justify-center">
      <div
        className="relative overflow-hidden rounded-xl bg-bg"
        style={{ width: '100%', maxWidth: STACK_MAX_W[pitch], minHeight }}
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
            <p className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.3em] text-accent1 lg:text-xs">
              What you get
            </p>
            <h2
              id="report-bento-heading"
              className="mt-3 font-display font-bold leading-[1.1] tracking-tight text-text text-[clamp(1.75rem,5vw,3.5rem)]"
            >
              A coach-ready report
            </h2>
            <p className="mt-4 font-body text-sm leading-relaxed text-muted sm:text-base lg:text-[1.0625rem]">
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
                <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                  {data.displayName}
                </span>
              }
              className="sm:col-span-2 lg:col-span-4 lg:row-span-2"
            >
              <SpatialStack pitch={pitch} minHeight={340}>
                <HeroSpatial data={data} pitch={pitch} animate={!prefersReduced} />
              </SpatialStack>
              <p className="mt-3 font-body text-xs leading-relaxed text-muted">
                {spatial.caption}{' '}
                <span className="text-text/80">{outcomeTally(data.spray)}.</span>
              </p>
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

            {/* TRAJECTORY tile, spans 3/6 cols */}
            <BentoTile
              index={3}
              contentKey={sport}
              eyebrow="Movement"
              title="Trajectories"
              meta={
                <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                  {data.trajectories.length} paths
                </span>
              }
              className="sm:col-span-1 lg:col-span-3"
            >
              {/* A touch more floor height than the other spatial tiles so the
                  interactive TrajectoryLines legend (top-left, scales with the
                  viewBox) has room to breathe and its rows stay comfortably
                  clickable without crowding the drawn paths. */}
              <SpatialStack pitch={pitch} minHeight={300}>
                <TrajectoryLines
                  paths={data.trajectories}
                  pitch={pitch}
                  animate={!prefersReduced}
                  className="absolute inset-0"
                />
              </SpatialStack>
            </BentoTile>

            {/* MOMENTUM / trend tile (Recharts), spans 3/6 cols */}
            <BentoTile
              index={4}
              contentKey={sport}
              eyebrow="Momentum"
              title="Form trend"
              flushBody
              className="sm:col-span-2 lg:col-span-3"
            >
              <div className="px-5 pb-5 sm:px-6 sm:pb-6">
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
                <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                  {data.metrics.length} metrics
                </span>
              }
              className="sm:col-span-2 lg:col-span-6"
            >
              <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                <MetricTable rows={data.metrics} />
              </div>
            </BentoTile>
        </div>
      </div>
    </section>
  );
}
