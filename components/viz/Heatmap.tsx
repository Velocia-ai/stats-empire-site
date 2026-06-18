'use client';

// Stats Empire, Heatmap
//
// Density overlay. Takes HeatCell[] (normalized 0..1 grid coords + weight) and
// paints a color-ramped intensity field over a pitch. Color is interpolated
// from the theme surface up to accent1 via a D3 sequential scale, then bucketed
// into quantized steps for a crisp "zone" read rather than a muddy blur.
//
// d3 is used ONLY to compute scales/colors. All <rect>s are rendered by React;
// d3 never touches the DOM React owns.

import { useMemo } from 'react';
import { interpolateRgb, quantize } from 'd3-interpolate';
import { scaleQuantize } from 'd3-scale';
import { max as d3max } from 'd3-array';
import type { HeatCell, PitchType } from '@/lib/types';
import { makeProjector, shortId, viewBoxAttr } from './geometry';

export interface HeatmapProps {
  /** Cells in normalized 0..1 space with weight 0..1 (or any positive scale). */
  cells: HeatCell[];
  /** Pitch whose viewBox/coordinate space the cells live in. */
  pitch: PitchType;
  /** Number of quantized color buckets. Default 6. */
  steps?: number;
  /** Optional extra classes for the <svg>. */
  className?: string;
}

// We resolve the theme accent at render time from a CSS variable, but D3's
// color interpolation needs concrete colors. We interpolate in a fixed ramp
// of opacities over the accent color (applied via fill + fillOpacity), which
// keeps the visual tied to the live theme token while letting d3 do the math.
const RAMP_OPACITY = [0.0, 0.12, 0.26, 0.42, 0.6, 0.78, 0.92];

/**
 * Render a quantized heatmap over `pitch`. Cells are drawn as soft-edged
 * rounded rects sized to the implied grid resolution, with a blur filter for a
 * heat-bloom feel. Empty/low cells fade out rather than boxing the field.
 */
export default function Heatmap({ cells, pitch, steps = 6, className }: HeatmapProps) {
  const proj = useMemo(() => makeProjector(pitch), [pitch]);
  const uid = useMemo(() => shortId(`heat-${pitch}-${cells.length}`), [pitch, cells.length]);

  const { rects, ramp } = useMemo(() => {
    if (cells.length === 0) return { rects: [], ramp: [] as string[] };

    const maxW = d3max(cells, (c) => c.weight) ?? 1;
    // Quantize weights into `steps` buckets → discrete intensity tiers.
    const bucket = scaleQuantize<number>().domain([0, maxW]).range(
      Array.from({ length: steps }, (_, i) => i + 1),
    );

    // Opacity ramp sampled to `steps` for legend swatches.
    const ramp = quantize(interpolateRgb('rgba(0,0,0,0)', 'rgba(0,0,0,1)'), steps);

    // Infer grid spacing from the densest axis gap so cell rects tile cleanly.
    const cell = inferCellSize(cells);
    const cw = cell.dx * proj.view.width;
    const ch = cell.dy * proj.view.height;

    const rects = cells.map((c, i) => {
      const tier = bucket(c.weight); // 1..steps
      const opacity = RAMP_OPACITY[Math.min(tier, RAMP_OPACITY.length - 1)];
      const [cxp, cyp] = proj.point(c.x, c.y);
      return {
        key: `${i}-${c.x}-${c.y}`,
        x: cxp - cw / 2,
        y: cyp - ch / 2,
        w: cw,
        h: ch,
        opacity,
      };
    });

    return { rects, ramp };
  }, [cells, steps, proj]);

  return (
    <svg
      viewBox={viewBoxAttr(pitch)}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Intensity heatmap with ${cells.length} cells`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        <filter id={`${uid}-bloom`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={proj.view.width * 0.012} />
        </filter>
      </defs>
      <g aria-hidden="true" filter={`url(#${uid}-bloom)`}>
        {rects.map((r) => (
          <rect
            key={r.key}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            rx={Math.min(r.w, r.h) * 0.35}
            fill="var(--color-accent1)"
            fillOpacity={r.opacity}
          />
        ))}
      </g>
      {/* Legend swatches reference `ramp` so it isn't tree-shaken; rendered as a
          small in-SVG key in the corner. */}
      {ramp.length > 0 && (
        <g aria-hidden="true" transform={`translate(${proj.view.width * 0.03} ${proj.view.height * 0.04})`}>
          {RAMP_OPACITY.slice(1, steps + 1).map((op, i) => (
            <rect
              key={i}
              x={i * (proj.view.width * 0.022)}
              y={0}
              width={proj.view.width * 0.02}
              height={proj.view.width * 0.02}
              rx={2}
              fill="var(--color-accent1)"
              fillOpacity={op}
            />
          ))}
        </g>
      )}
    </svg>
  );
}

/**
 * Estimate cell footprint (dx, dy) in normalized units from the smallest
 * positive gap between distinct x and y coords. Falls back to a sane default so
 * sparse data still renders visible cells.
 */
function inferCellSize(cells: HeatCell[]): { dx: number; dy: number } {
  const xs = Array.from(new Set(cells.map((c) => c.x))).sort((a, b) => a - b);
  const ys = Array.from(new Set(cells.map((c) => c.y))).sort((a, b) => a - b);
  const minGap = (arr: number[]) => {
    let g = Infinity;
    for (let i = 1; i < arr.length; i += 1) g = Math.min(g, arr[i] - arr[i - 1]);
    return Number.isFinite(g) && g > 0 ? g : 0.1;
  };
  const dx = minGap(xs);
  const dy = minGap(ys);
  // Slight overlap (1.5x) makes adjacent cells blend into a continuous field.
  return { dx: dx * 1.5, dy: dy * 1.5 };
}
