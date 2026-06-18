'use client';

// Stats Empire, Heatmap
//
// Density overlay. Takes HeatCell[] (normalized 0..1 grid coords + weight) and
// paints a smooth, warm activity-density field over a pitch.
//
// HOW IT READS AS REAL DENSITY (not a few faint dots):
//   1. Each weighted cell is expanded into a small cloud of jittered sample
//      points, with the count proportional to its weight. So a high-weight cell
//      contributes many samples and a low-weight cell only a couple.
//   2. d3.contourDensity() runs a Gaussian kernel-density estimate over those
//      pixel-space samples and returns smooth iso-density contour polygons.
//   3. We render the contours as STACKED filled bands, low -> high, each tinted
//      var(--color-accent1) at an increasing opacity, so the field blooms from a
//      faint wash at the edges to a hot core, a genuine continuous heatmap.
//   4. A Gaussian-blur bloom filter softens the band edges into one warm glow.
//
// d3 is used ONLY to compute the density contours (geometry/numbers). It never
// touches the DOM React owns, every <path>/<rect> is rendered by React.

import { useMemo } from 'react';
import { contourDensity } from 'd3-contour';
import { geoPath } from 'd3-geo';
import { max as d3max } from 'd3-array';
import type { HeatCell, PitchType } from '@/lib/types';
import { makeProjector, shortId, viewBoxAttr } from './geometry';

export interface HeatmapProps {
  /** Cells in normalized 0..1 space with weight 0..1 (or any positive scale). */
  cells: HeatCell[];
  /** Pitch whose viewBox/coordinate space the cells live in. */
  pitch: PitchType;
  /** Number of density bands (color tiers). Default 7. */
  steps?: number;
  /** Optional extra classes for the <svg>. */
  className?: string;
}

// Opacity ramp from faint (cool/low) to hot (high). Index 0 = lowest band.
// Tied to the live theme via fill=var(--color-accent1) + fillOpacity so the
// bloom re-skins with the Court Vision palette.
const RAMP = [0.06, 0.12, 0.2, 0.3, 0.42, 0.56, 0.72, 0.88, 0.98];

/**
 * Render a smooth density heatmap over `pitch`. Cells drive a kernel-density
 * estimate; the resulting contour bands are filled low->high on the accent and
 * blurred into a continuous warm bloom, with an in-SVG low..high legend.
 */
export default function Heatmap({ cells, pitch, steps = 7, className }: HeatmapProps) {
  const proj = useMemo(() => makeProjector(pitch), [pitch]);
  const uid = useMemo(
    () => shortId(`heat-${pitch}-${cells.length}-${steps}`),
    [pitch, cells.length, steps],
  );

  const { bands, ramp } = useMemo(() => {
    const W = proj.view.width;
    const H = proj.view.height;
    const tiers = Math.max(3, Math.min(steps, RAMP.length));

    if (cells.length === 0) {
      return { bands: [] as Band[], ramp: rampFor(tiers) };
    }

    // 1. Expand weighted cells into a sample cloud in PIXEL space. The number of
    //    samples scales with weight so density reflects intensity, and a small
    //    deterministic jitter (one grid step wide) spreads them so the KDE reads
    //    as a smooth field rather than stacked spikes.
    const maxW = d3max(cells, (c) => c.weight) ?? 1;
    const step = inferGridStep(cells); // normalized grid pitch
    const jitterX = step.dx * W * 0.5;
    const jitterY = step.dy * H * 0.5;
    const rng = mulberry32(0x5eed ^ cells.length);

    const samples: Array<[number, number]> = [];
    for (const c of cells) {
      const [cx, cy] = proj.point(c.x, c.y);
      // 1..~16 samples across the weight range; keeps total bounded but dense.
      const n = 1 + Math.round((c.weight / maxW) * 15);
      for (let i = 0; i < n; i += 1) {
        samples.push([
          cx + (rng() - 0.5) * 2 * jitterX,
          cy + (rng() - 0.5) * 2 * jitterY,
        ]);
      }
    }

    // 2. Kernel-density estimate -> smooth iso-density contour polygons.
    //    Bandwidth ~ one grid step so neighbouring cells merge into one bloom
    //    without washing the whole pitch flat.
    const bandwidth = Math.max(12, Math.min(W, H) * (step.avg * 1.15));
    const density = contourDensity<[number, number]>()
      .x((d) => d[0])
      .y((d) => d[1])
      .size([W, H])
      .cellSize(Math.max(4, Math.round(Math.min(W, H) / 64)))
      .bandwidth(bandwidth)
      .thresholds(tiers)(samples);

    // d3 returns contours ascending by value (low density first). We want to
    // paint low underneath and hot on top, which is already this order.
    const toPath = geoPath();
    const bands: Band[] = density
      .map((c, i) => ({
        key: `b-${i}`,
        d: toPath(c) ?? '',
        opacity: RAMP[Math.min(i, RAMP.length - 1)],
      }))
      .filter((b) => b.d.length > 0);

    return { bands, ramp: rampFor(tiers) };
  }, [cells, steps, proj]);

  const W = proj.view.width;
  const H = proj.view.height;
  const blur = Math.max(2, Math.min(W, H) * 0.018);

  // Legend geometry (in viewBox units), bottom-left, vertical low->high.
  const lg = {
    x: W * 0.035,
    y: H * 0.7,
    w: W * 0.032,
    h: H * 0.26,
    pad: Math.min(W, H) * 0.012,
    font: Math.min(W, H) * 0.026,
  };

  return (
    <svg
      viewBox={viewBoxAttr(pitch)}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={
        cells.length === 0
          ? 'Positional heatmap (no data)'
          : `Positional density heatmap, ${cells.length} sampled zones, low to high activity`
      }
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        {/* Soft bloom so the density bands melt into one continuous glow. */}
        <filter id={`${uid}-bloom`} x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur stdDeviation={blur} edgeMode="none" />
        </filter>
        {/* Vertical low->high gradient for the legend swatch. */}
        <linearGradient id={`${uid}-legend`} x1="0" y1="1" x2="0" y2="0">
          {ramp.map((stop) => (
            <stop
              key={stop.offset}
              offset={`${stop.offset * 100}%`}
              stopColor="var(--color-accent1)"
              stopOpacity={stop.opacity}
            />
          ))}
        </linearGradient>
      </defs>

      {/* The density field itself: stacked accent bands under a bloom. */}
      <g aria-hidden="true" filter={`url(#${uid}-bloom)`}>
        {bands.map((b) => (
          <path key={b.key} d={b.d} fill="var(--color-accent1)" fillOpacity={b.opacity} />
        ))}
      </g>

      {/* In-SVG legend: low..high vertical ramp. Not blurred, kept crisp. */}
      {bands.length > 0 && (
        <g aria-hidden="true">
          <rect
            x={lg.x}
            y={lg.y}
            width={lg.w}
            height={lg.h}
            rx={lg.w * 0.25}
            fill={`url(#${uid}-legend)`}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
          <text
            x={lg.x + lg.w + lg.pad}
            y={lg.y + lg.font * 0.85}
            fill="var(--color-text)"
            fontSize={lg.font}
            fontFamily="var(--font-body)"
            style={{ fontWeight: 600 }}
          >
            High
          </text>
          <text
            x={lg.x + lg.w + lg.pad}
            y={lg.y + lg.h}
            fill="var(--color-muted)"
            fontSize={lg.font}
            fontFamily="var(--font-body)"
          >
            Low
          </text>
        </g>
      )}
    </svg>
  );
}

interface Band {
  key: string;
  d: string;
  opacity: number;
}

/** Build legend gradient stops (offset 0 = bottom/low) for `tiers` bands. */
function rampFor(tiers: number): Array<{ offset: number; opacity: number }> {
  const n = Math.min(tiers, RAMP.length);
  return Array.from({ length: n }, (_, i) => ({
    offset: n === 1 ? 0 : i / (n - 1),
    opacity: RAMP[Math.min(i, RAMP.length - 1)],
  }));
}

/**
 * Infer the grid pitch (normalized dx, dy, and avg) from the smallest positive
 * gap between distinct x and y coords. Drives jitter spread + KDE bandwidth so
 * the field is dense but not over-smoothed. Falls back to a sane default.
 */
function inferGridStep(cells: HeatCell[]): { dx: number; dy: number; avg: number } {
  const minGap = (vals: number[]) => {
    const arr = Array.from(new Set(vals)).sort((a, b) => a - b);
    let g = Infinity;
    for (let i = 1; i < arr.length; i += 1) g = Math.min(g, arr[i] - arr[i - 1]);
    return Number.isFinite(g) && g > 0 ? g : 0.08;
  };
  const dx = minGap(cells.map((c) => c.x));
  const dy = minGap(cells.map((c) => c.y));
  return { dx, dy, avg: (dx + dy) / 2 };
}

/** Tiny deterministic PRNG so jitter is stable across SSR/CSR (no hydration mismatch). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
