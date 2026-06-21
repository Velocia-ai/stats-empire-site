'use client';

// Stats Empire, Heatmap
//
// A PRECISE positional density field over a pitch, broadcast / Second-Spectrum
// grade. Takes HeatCell[] (normalized 0..1 grid coords + weight) and paints a
// continuous activity-density surface with DISTINCT hotspots and soft falloff
// edges, NOT one uniform blob.
//
// HOW IT READS AS REAL DENSITY:
//   1. Each weighted cell is expanded into a small deterministic cloud of
//      jittered sample points, the count proportional to its weight, so a
//      high-weight cell contributes many samples and a low-weight cell only a
//      couple. (Deterministic PRNG → identical on SSR + client, no hydration
//      mismatch.)
//   2. d3.contourDensity() runs a Gaussian kernel-density estimate over those
//      pixel-space samples at a FINE resolution (small cellSize) and a TIGHT
//      bandwidth (~half a grid step), so neighbouring cells resolve into
//      separate hotspots with smooth falloff instead of merging into a smear.
//   3. We oversample the iso-density thresholds (many thin bands), then map
//      each band's density rank to a position t in [0,1] on a MULTI-STOP ramp:
//      transparent edge -> cool accent2 mid -> hot accent1 core, with a CALM
//      peak opacity (~0.7, never solid). Cool->hot reads as low->high at a
//      glance and is built only from the two theme accents, so it re-skins live.
//   4. A soft Gaussian bloom melts adjacent bands into one continuous glow while
//      keeping the hotspots and falloff edges intact.
//   5. An in-SVG vertical Low..High legend shows the same ramp.
//
// ANIMATION: the field blooms in (opacity 0 -> 1 + a tiny scale settle) once,
// when it first scrolls into view. Reduced-motion safe: when the user prefers
// reduced motion (or before hydration), it renders the final settled state with
// no transform and no transition, so the field is always fully visible.
//
// d3 is used ONLY to compute the density contours (geometry / numbers). It never
// touches the DOM React owns: every <path>/<rect>/<stop> is rendered by React.

import { useMemo, useRef } from 'react';
import { contourDensity } from 'd3-contour';
import { geoPath } from 'd3-geo';
import { max as d3max } from 'd3-array';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import type { HeatCell, PitchType } from '@/lib/types';
import { makeProjector, shortId, viewBoxAttr } from './geometry';

export interface HeatmapProps {
  /** Cells in normalized 0..1 space with weight 0..1 (or any positive scale). */
  cells: HeatCell[];
  /** Pitch whose viewBox/coordinate space the cells live in. */
  pitch: PitchType;
  /** Number of colour tiers in the ramp (density bands collapse onto these). Default 7. */
  steps?: number;
  /** Optional extra classes for the <svg>. */
  className?: string;
}

// Multi-stop perceptual ramp, expressed as positions t in [0,1] (low->high).
// Each stop carries which accent it leans on and the fill opacity at that level.
// accent2 = cool (low/mid), accent1 = hot (high). Opacity climbs from a faint
// wash to a CALM peak (~0.72), never solid, so the field reads as density rather
// than a flat lime fill.
interface RampStop {
  /** Position low(0)..high(1). */
  t: number;
  /** Which theme accent this stop blends toward. */
  hot: boolean;
  /** Fill opacity at this stop. */
  opacity: number;
}

// The canonical ramp. We interpolate band colours/opacities against this so the
// number of contour bands is independent of the visible colour resolution.
const RAMP: RampStop[] = [
  { t: 0.0, hot: false, opacity: 0.0 }, // edge: fully transparent falloff
  { t: 0.14, hot: false, opacity: 0.12 }, // first cool wash
  { t: 0.34, hot: false, opacity: 0.26 }, // cool body (accent2)
  { t: 0.54, hot: false, opacity: 0.4 }, // cool->warm transition
  { t: 0.72, hot: true, opacity: 0.54 }, // warming into the hot accent
  { t: 0.88, hot: true, opacity: 0.66 }, // hot
  { t: 1.0, hot: true, opacity: 0.72 }, // hottest core, capped calm peak
];

const PEAK_OPACITY = 0.72;

/**
 * Render a precise density heatmap over `pitch`. Cells drive a fine kernel-
 * density estimate; the contour bands are coloured low->high on a cool->hot
 * accent ramp with a calm peak, blurred into one continuous glow, with an
 * in-SVG Low..High legend. Blooms in once on scroll-in (reduced-motion safe).
 */
export default function Heatmap({ cells, pitch, steps = 7, className }: HeatmapProps) {
  const proj = useMemo(() => makeProjector(pitch), [pitch]);
  const uid = useMemo(
    () => shortId(`heat-${pitch}-${cells.length}-${steps}`),
    [pitch, cells.length, steps],
  );

  const ref = useRef<SVGSVGElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const settled = reduce || inView;

  const { bands, legendStops } = useMemo(() => {
    const W = proj.view.width;
    const H = proj.view.height;
    const tiers = Math.max(3, Math.min(steps, 9));

    if (cells.length === 0) {
      return { bands: [] as Band[], legendStops: legendFromRamp() };
    }

    // 1. Expand weighted cells into a sample cloud in PIXEL space. Sample count
    //    scales with weight so density reflects intensity; a small deterministic
    //    jitter (under one grid step) spreads them so the KDE reads as a smooth
    //    field rather than stacked spikes, while staying SSR/CSR-stable.
    const maxW = d3max(cells, (c) => c.weight) ?? 1;
    const step = inferGridStep(cells); // normalized grid pitch
    const jitterX = step.dx * W * 0.42;
    const jitterY = step.dy * H * 0.42;
    const rng = mulberry32(0x5eed ^ cells.length);

    const samples: Array<[number, number]> = [];
    for (const c of cells) {
      const [cx, cy] = proj.point(c.x, c.y);
      // 1..~24 samples across the weight range: dense enough for a smooth KDE,
      // bounded enough to stay cheap. More samples than before so faint cells
      // still register a soft halo rather than vanishing.
      const n = 1 + Math.round((c.weight / maxW) * 23);
      for (let i = 0; i < n; i += 1) {
        samples.push([
          cx + (rng() - 0.5) * 2 * jitterX,
          cy + (rng() - 0.5) * 2 * jitterY,
        ]);
      }
    }

    // 2. Fine kernel-density estimate -> smooth iso-density contour polygons.
    //    cellSize ~ min/110 (finer than before) for crisp hotspot shapes.
    //    bandwidth ~ half a grid step so adjacent cells stay DISTINCT (tighter
    //    than the old ~1.15-step bandwidth that washed everything together).
    const minSide = Math.min(W, H);
    const cellSize = Math.max(2, Math.round(minSide / 110));
    const bandwidth = Math.max(10, minSide * step.avg * 0.55);

    // Oversample the thresholds: many thin bands → smooth colour falloff. We map
    // these back onto `tiers` colour stops, so the visible ramp resolution is
    // decoupled from the geometric band count.
    const nThresholds = Math.max(tiers * 2, 14);

    const density = contourDensity<[number, number]>()
      .x((d) => d[0])
      .y((d) => d[1])
      .size([W, H])
      .cellSize(cellSize)
      .bandwidth(bandwidth)
      .thresholds(nThresholds)(samples);

    // d3 returns contours ascending by density value (faint -> hot). Paint low
    // underneath, hot on top (already this order). Map each band's rank to a
    // position t in [0,1] and sample the ramp for colour + opacity.
    const toPath = geoPath();
    const last = Math.max(1, density.length - 1);
    const bands: Band[] = density
      .map((c, i) => {
        const t = i / last; // 0 (faint, outer) .. 1 (hot, inner core)
        const stop = sampleRamp(t);
        return {
          key: `b-${i}`,
          d: toPath(c) ?? '',
          hot: stop.hot,
          opacity: stop.opacity,
        };
      })
      .filter((b) => b.d.length > 0 && b.opacity > 0.001);

    return { bands, legendStops: legendFromRamp() };
  }, [cells, steps, proj]);

  const W = proj.view.width;
  const H = proj.view.height;
  // Bloom radius tuned to melt band edges into one glow without erasing hotspots.
  const blur = Math.max(2, Math.min(W, H) * 0.013);

  // Legend geometry (in viewBox units), bottom-left, vertical low->high.
  const lg = {
    x: W * 0.04,
    y: H * 0.68,
    w: Math.min(W, H) * 0.03,
    h: H * 0.26,
    pad: Math.min(W, H) * 0.014,
    font: Math.min(W, H) * 0.026,
  };

  // Tiny scale settle pivots on the field centroid so the bloom grows in place.
  const pivot = `${W / 2}px ${H / 2}px`;

  return (
    <svg
      ref={ref}
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
        {/* Soft bloom so the density bands melt into one continuous glow while
            the hotspots + falloff edges stay legible. */}
        <filter id={`${uid}-bloom`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={blur} edgeMode="none" />
        </filter>
        {/* Vertical low->high legend gradient, same cool->hot ramp as the field.
            Built from the two theme accents so it re-skins with the palette. */}
        <linearGradient id={`${uid}-legend`} x1="0" y1="1" x2="0" y2="0">
          {legendStops.map((s) => (
            <stop
              key={s.offset}
              offset={`${(s.offset * 100).toFixed(2)}%`}
              stopColor={s.hot ? 'var(--color-accent1)' : 'var(--color-accent2)'}
              stopOpacity={s.opacity}
            />
          ))}
        </linearGradient>
      </defs>

      {/* The density field: cool (accent2) low/mid bands + hot (accent1) core
          bands, stacked low->high under a soft bloom. Blooms in once on view. */}
      <motion.g
        aria-hidden="true"
        filter={`url(#${uid}-bloom)`}
        initial={reduce ? false : { opacity: 0, scale: 0.965 }}
        animate={settled ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.965 }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: pivot }}
      >
        {bands.map((b) => (
          <path
            key={b.key}
            d={b.d}
            fill={b.hot ? 'var(--color-accent1)' : 'var(--color-accent2)'}
            fillOpacity={b.opacity}
          />
        ))}
      </motion.g>

      {/* In-SVG legend: Low..High vertical ramp. Crisp (not blurred), and fades
          in with the field so it never appears before the data it describes. */}
      {bands.length > 0 && (
        <motion.g
          aria-hidden="true"
          initial={reduce ? false : { opacity: 0 }}
          animate={settled ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: reduce ? 0 : 0.35 }}
        >
          <rect
            x={lg.x}
            y={lg.y}
            width={lg.w}
            height={lg.h}
            rx={lg.w * 0.3}
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
        </motion.g>
      )}
    </svg>
  );
}

interface Band {
  key: string;
  d: string;
  /** True if this band sits in the hot (accent1) part of the ramp. */
  hot: boolean;
  opacity: number;
}

/**
 * Sample the multi-stop RAMP at position t in [0,1] (low->high), linearly
 * interpolating opacity between the two surrounding stops. `hot` flips to the
 * accent1 (hot) colour once past the warm transition, so each band is painted
 * with exactly one accent (no per-path gradient needed) while the bloom blends
 * neighbours, giving a smooth cool->hot read.
 */
function sampleRamp(t: number): { hot: boolean; opacity: number } {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  let lo = RAMP[0];
  let hi = RAMP[RAMP.length - 1];
  for (let i = 1; i < RAMP.length; i += 1) {
    if (u <= RAMP[i].t) {
      lo = RAMP[i - 1];
      hi = RAMP[i];
      break;
    }
  }
  const span = hi.t - lo.t || 1;
  const f = (u - lo.t) / span;
  const opacity = Math.min(PEAK_OPACITY, lo.opacity + (hi.opacity - lo.opacity) * f);
  // A band is "hot" once it's mostly into the upper (hot) stop.
  const hot = f >= 0.5 ? hi.hot : lo.hot;
  return { hot, opacity };
}

/** Legend gradient stops from the canonical ramp (offset 0 = bottom/low). */
function legendFromRamp(): Array<{ offset: number; hot: boolean; opacity: number }> {
  return RAMP.map((s) => ({ offset: s.t, hot: s.hot, opacity: s.opacity }));
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
