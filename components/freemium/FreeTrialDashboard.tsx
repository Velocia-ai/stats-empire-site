'use client';

// Stats Empire, FreeTrialDashboard
//
// Step 4, the payoff. Renders the chosen sport's fully-analyzed `freeGame` with
// the REAL viz primitives so the user feels the granular depth they get for
// free: a stacked spatial chart (PitchBackground + the sport-appropriate data
// layer), headline StatTiles, an advanced MetricTable, and a momentum
// TrendChart.
//
// Two persistent conversion elements frame the data:
//   • a sticky "FREE TRIAL" banner that never lets the value-prop fade, and
//   • a soft token upsell ("unlock more matches") that sells the next step
//     WITHOUT gating anything currently on screen.
//
// All viz primitives are theme-tokenized, so the whole dashboard re-skins with
// the A/B/C switch. Reduced-motion safe via framer-motion's useReducedMotion.

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Coins, Sparkles, Star } from 'lucide-react';
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
import { getSportData } from '@/lib/sports';
import type { SportData, SportKey } from '@/lib/types';

export interface FreeTrialDashboardProps {
  /** Which sport's free game to render. */
  sport: SportKey;
  /** Optional: open the token-purchase / upgrade flow from the upsell CTA. */
  onBuyTokens?: () => void;
  /** Optional: restart the flow / pick another sport. */
  onRestart?: () => void;
}

// Pick the primitive that matches each sport's spatialKind, sharing the one
// normalized 0..1 coordinate space the primitives all use.
function SpatialLayer({ data }: { data: SportData }) {
  switch (data.spatialKind) {
    case 'shot':
      return <SprayChart points={data.spray} pitch={data.pitch} mode="shot" />;
    case 'spray':
      return <SprayChart points={data.spray} pitch={data.pitch} mode="spray" />;
    case 'heatmap':
      return <Heatmap cells={data.heatmap} pitch={data.pitch} />;
    case 'passmap':
      return <TrajectoryLines paths={data.trajectories} pitch={data.pitch} animate />;
    default:
      return null;
  }
}

// Human-readable label for the spatial panel header.
const SPATIAL_LABEL: Record<SportData['spatialKind'], string> = {
  spray: 'Spray Chart',
  shot: 'Shot Chart',
  heatmap: 'Positional Heatmap',
  passmap: 'Pass Network',
};

export default function FreeTrialDashboard({
  sport,
  onBuyTokens,
  onRestart,
}: FreeTrialDashboardProps) {
  const reduce = useReducedMotion();
  const data = getSportData(sport);
  const game = data.freeGame;

  const fade = (delay: number) =>
    reduce
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay },
        };

  return (
    <div className="w-full">
      {/* Persistent FREE TRIAL banner */}
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-accent1/30 bg-bg/85 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-accent1">
            <BadgeCheck className="h-4 w-4" aria-hidden />
            Free Trial · Full Depth Unlocked
          </span>
          <button
            type="button"
            onClick={onBuyTokens}
            className="inline-flex items-center gap-1.5 rounded-full border border-accent1/50 bg-accent1/10 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-accent1 transition-colors hover:bg-accent1/20"
          >
            <Coins className="h-3.5 w-3.5" aria-hidden />
            Get more matches
          </button>
        </div>
      </div>

      {/* Game header */}
      <motion.header {...fade(0)} className="mb-6">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">
          {game.date} · {game.matchup}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold leading-tight text-text sm:text-3xl">
          {game.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{game.headline}</p>
      </motion.header>

      {/* Headline tiles */}
      <motion.section {...fade(0.06)} aria-label="Key game metrics" className="mb-6">
        <StatTiles rows={game.summaryMetrics} />
      </motion.section>

      {/* Main grid: spatial viz + advanced table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <motion.section
          {...fade(0.12)}
          aria-label={`${data.displayName} ${SPATIAL_LABEL[data.spatialKind]}`}
          className="lg:col-span-3"
        >
          <PanelHeader
            kicker="Spatial Breakdown"
            title={SPATIAL_LABEL[data.spatialKind]}
          />
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-surface">
            <PitchBackground pitch={data.pitch} className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-0 h-full w-full">
              <SpatialLayer data={data} />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">
            Every event from this game, plotted to scale. Pan across {data.zones.length} tracked
            zones and {data.spray.length || data.trajectories.length} logged events.
          </p>
        </motion.section>

        <motion.section
          {...fade(0.18)}
          aria-label="Advanced metrics"
          className="lg:col-span-2"
        >
          <PanelHeader kicker="Box Score+" title="Advanced Metrics" />
          <div className="rounded-xl border border-border bg-surface p-4">
            <MetricTable rows={data.metrics} />
          </div>
        </motion.section>
      </div>

      {/* Trend / momentum */}
      <motion.section {...fade(0.24)} aria-label="Form and momentum" className="mt-6">
        <PanelHeader kicker="Form Curve" title={data.trend.label} />
        <div className="rounded-xl border border-border bg-surface p-4">
          <TrendChart
            label={data.trend.label}
            xLabels={data.trend.xLabels}
            series={data.trend.series}
          />
        </div>
      </motion.section>

      {/* Soft token upsell, sells the NEXT match, never gates this one */}
      <motion.section {...fade(0.3)} className="mt-8">
        <div className="relative overflow-hidden rounded-2xl border border-accent1/40 bg-surface p-6 sm:p-8">
          <div className="grid-texture pointer-events-none absolute inset-0" aria-hidden />
          <span
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent1 opacity-10 blur-3xl"
          />
          <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <div className="mb-2 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-accent1">
                <Star className="h-3.5 w-3.5" aria-hidden />
                You just saw one game, free
              </div>
              <h2 className="font-display text-xl font-bold text-text sm:text-2xl">
                Run this depth on every match you care about.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Top up tokens to analyze more games across all five sports, spatial charts,
                advanced metrics and trends, with no subscription lock-in. This trial game stays
                yours, free.
              </p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
              <motion.button
                type="button"
                onClick={onBuyTokens}
                whileHover={reduce ? undefined : { scale: 1.02 }}
                whileTap={reduce ? undefined : { scale: 0.98 }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent1 px-6 py-3.5 font-display text-base font-bold text-bg shadow-lg"
              >
                <Coins className="h-4 w-4" aria-hidden />
                Buy tokens
                <ArrowRight className="h-4 w-4" aria-hidden />
              </motion.button>
              {onRestart && (
                <button
                  type="button"
                  onClick={onRestart}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted transition-colors hover:border-accent1/50 hover:text-text"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Try another sport free
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

function PanelHeader({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <span className="font-mono text-[11px] uppercase tracking-widest text-accent2">{kicker}</span>
      <span className="h-px flex-1 bg-border" aria-hidden />
      <h2 className="font-display text-sm font-bold text-text">{title}</h2>
    </div>
  );
}
