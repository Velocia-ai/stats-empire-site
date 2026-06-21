'use client';

// Stats Empire, SprayChart
//
// Plots discrete events as crisp, FILLED marks over a pitch, encoding `outcome`
// by colour (with a subtle shape accent) and `value` by mark size (sqrt scale →
// area-honest). Built to broadcast / Stats Perform grade: every marker is a
// solid disc with a soft outer glow and a thin contrasting ring so it stays
// legible over any pitch fill and any Court Vision theme. An in-SVG legend names
// every outcome that actually appears, so the chart is self-describing when
// exported. One component serves three uses:
//   • basketball shot chart  (mode="shot": make=disc/lime, miss=ring/warm-red)
//   • baseball spray chart    (mode="spray": hit landing spots by outcome)
//   • tennis serve placement  (mode="spray": winners vs errors)
//
// d3 supplies only the radius scale + extent (numbers); React renders every mark
// as JSX. framer-motion runs a stagger-pop draw-on triggered by the chart's own
// useInView(once); when the viewer prefers reduced motion every mark settles to
// its final state instantly with no animation.

import { useMemo, useRef } from 'react';
import { scaleSqrt } from 'd3-scale';
import { extent } from 'd3-array';
import { motion, useReducedMotion } from 'framer-motion';
import type { Outcome, PitchType, SpatialPoint } from '@/lib/types';
import { makeProjector, viewBoxAttr } from './geometry';

export interface SprayChartProps {
  /** Event points in normalized 0..1 space; `outcome` drives the encoding. */
  points: SpatialPoint[];
  /** Pitch whose coordinate space the points live in. */
  pitch: PitchType;
  /**
   * Visual register:
   *   "shot"  → made/missed semantics (basketball). Make = filled lime disc,
   *             miss = warm-red mark (kept distinct but clearly visible).
   *   "spray" → outcome semantics (baseball/tennis). winner/make = lime,
   *             error/miss = warm red, neutral = muted.
   * Default "spray".
   */
  mode?: 'spray' | 'shot';
  /** Optional extra classes for the <svg>. */
  className?: string;
}

// Each distinct visual class an event can map to. We collapse the 5 Outcome
// values into these registers so the legend has at most 2-3 rows (not a noisy 5)
// and so make/winner share one swatch, miss/error another.
type MarkKind = 'positive' | 'negative' | 'neutral';

interface MarkStyle {
  /** Which legend row this mark belongs to. */
  kind: MarkKind;
  /** Short human label for the legend swatch. */
  legend: string;
  /** Core fill colour (always a visible, saturated colour, never the bg). */
  color: string;
}

// Warm-red for negative outcomes. The Court Vision `--color-accent2` token is
// orange in one theme but CYAN in another, so it cannot be trusted to read as a
// "miss/error". We use a fixed warm red that stays unmistakably negative across
// every theme while still harmonising with the lime accent.
const NEGATIVE_COLOR = '#ff5a4d';

// Resolve an outcome (in a given mode) to its full visual style. Colour is the
// primary channel; a small shape accent (see `kind`) backs it up for
// colour-blind legibility, but every mark is a solid, visible disc.
function styleFor(outcome: Outcome | undefined, mode: 'spray' | 'shot'): MarkStyle {
  const o = outcome ?? 'neutral';
  // make / winner → positive (lime), miss / error → negative (warm red),
  // neutral → muted. `mode` only changes the legend wording.
  switch (o) {
    case 'make':
    case 'winner':
      return {
        kind: 'positive',
        legend: mode === 'shot' ? 'Made' : 'Winner',
        color: 'var(--color-accent1)',
      };
    case 'miss':
    case 'error':
      return {
        kind: 'negative',
        legend: mode === 'shot' ? 'Missed' : 'Error',
        color: NEGATIVE_COLOR,
      };
    case 'neutral':
    default:
      return {
        kind: 'neutral',
        legend: mode === 'shot' ? 'Attempt' : 'In play',
        color: 'var(--color-muted)',
      };
  }
}

// Human-readable outcome names for the accessible summary.
const OUTCOME_WORDS: Record<Outcome, string> = {
  make: 'made',
  miss: 'missed',
  winner: 'winners',
  error: 'errors',
  neutral: 'neutral',
};

// Order legend rows positive → negative → neutral regardless of data order.
const KIND_ORDER: Record<MarkKind, number> = { positive: 0, negative: 1, neutral: 2 };

export default function SprayChart({ points, pitch, mode = 'spray', className }: SprayChartProps) {
  const proj = useMemo(() => makeProjector(pitch), [pitch]);
  const prefersReduced = useReducedMotion();

  // Marks ALWAYS pop in to their final visible state on mount (a pure
  // enhancement), so they can never get stuck invisible if an in-view observer
  // fails to fire. Reduced motion shows them instantly with no animation.
  const ref = useRef<SVGSVGElement>(null);

  // Geometry scale: viewBoxes are ~1000 on their long axis (tennis 540 wide).
  // Derive every size from the smaller axis so marks/glow/legend stay
  // proportional across pitches.
  const { width: vw, height: vh } = proj.view;
  const unit = Math.min(vw, vh) / 1000;

  const { marks, legend, summary } = useMemo(() => {
    if (points.length === 0) {
      return { marks: [] as Mark[], legend: [] as LegendRow[], summary: 'no events' };
    }

    // Size marks by `value` if present (e.g. exit velocity, shot distance), else
    // constant. sqrt scale → area-proportional, perceptually honest. Radii live
    // in viewBox units: floor ~7, ceiling ~14 (scaled per pitch by `unit`).
    const vals = points.map((p) => p.value ?? 1);
    const [lo, hi] = extent(vals) as [number | undefined, number | undefined];
    const minR = 7 * unit;
    const maxR = 14 * unit;
    const flat = lo === undefined || hi === undefined || lo === hi;
    const rScale = scaleSqrt()
      .domain([lo ?? 0, hi ?? 1])
      .range([minR, maxR]);
    // When every value is equal there is no size signal, so sit at a confident
    // middle radius so marks are clearly visible without implying a scale.
    const flatR = (minR + maxR) * 0.5;

    const marks: Mark[] = points.map((p, i) => {
      const st = styleFor(p.outcome, mode);
      const r = flat ? flatR : rScale(p.value ?? lo ?? 1);
      const [cx, cy] = proj.point(p.x, p.y);
      // The single peak value (standout play) gets a slightly bolder ring so the
      // eye has an anchor without changing the clean disc language.
      const isPeak = !flat && p.value !== undefined && p.value === hi;
      return {
        key: `${i}-${p.x.toFixed(4)}-${p.y.toFixed(4)}`,
        cx,
        cy,
        r,
        kind: st.kind,
        color: st.color,
        isPeak,
      };
    });

    // Build the legend from the outcome kinds that actually occur, de-duped.
    const seen = new Map<string, LegendRow>();
    for (const p of points) {
      const st = styleFor(p.outcome, mode);
      if (!seen.has(st.legend)) {
        seen.set(st.legend, { kind: st.kind, legend: st.legend, color: st.color });
      }
    }
    const legend = Array.from(seen.values()).sort(
      (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind],
    );

    // Accessible tally per outcome.
    const tally = new Map<Outcome, number>();
    for (const p of points) {
      const o = p.outcome ?? 'neutral';
      tally.set(o, (tally.get(o) ?? 0) + 1);
    }
    const summary = Array.from(tally.entries())
      .map(([o, n]) => `${n} ${OUTCOME_WORDS[o]}`)
      .join(', ');

    return { marks, legend, summary };
  }, [points, mode, proj, unit]);

  // --- Stagger-pop animation timing -----------------------------------------
  // Each mark pops in over ~0.25s; the whole sequence is capped at ~0.8s so a
  // dense chart never feels slow. With N marks the per-mark delay is spread
  // across the remaining (cap - perMark) budget.
  const perMark = 0.25;
  const totalCap = 0.8;
  const n = Math.max(1, marks.length);
  const stagger = n > 1 ? Math.min(0.04, (totalCap - perMark) / (n - 1)) : 0;

  // --- Legend geometry (viewBox units), pinned to the top-left ---------------
  const lgPad = 18 * unit;
  const lgFont = 22 * unit;
  const lgRow = 32 * unit;
  const lgSwatchR = 10 * unit; // radius of the legend disc
  const lgGap = 14 * unit;
  const longest = legend.reduce((m, l) => Math.max(m, l.legend.length), 0);
  const lgTextW = Math.max(96 * unit, longest * lgFont * 0.6);
  const lgW = lgPad * 2 + lgSwatchR * 2 + lgGap + lgTextW;
  const lgH = lgPad * 2 + Math.max(0, legend.length - 1) * lgRow + lgSwatchR * 2;
  const lgX = 14 * unit;
  const lgY = 14 * unit;

  // Glow blur radius for the soft outer halo behind each mark.
  const glow = 6 * unit;

  return (
    <svg
      ref={ref}
      viewBox={viewBoxAttr(pitch)}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${mode === 'shot' ? 'Shot chart' : 'Spray chart'}: ${points.length} events, ${summary}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        {/* Soft outer glow: a colour-bleed bloom that lifts each mark off the
            pitch. Uses the mark's own fill via SourceAlpha so it tints to match
            (lime marks glow lime, warm-red marks glow red). */}
        <filter id="spray-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={glow} result="blur" />
          <feComponentTransfer in="blur" result="soft">
            <feFuncA type="linear" slope="0.7" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="soft" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g aria-hidden="true">
        {marks.map((m, i) => {
          // Ring + disc radii. The ring is a thin contrasting halo for
          // legibility; the disc is the solid, visible fill.
          const ringW = (m.isPeak ? 2.6 : 1.8) * unit;
          const delay = i * stagger;
          return (
            // Position via a STATIC outer <g> attribute; animate scale/opacity on
            // an inner <motion.g>. framer writes the animation into style.transform,
            // which would OVERRIDE a transform attribute on the same node and
            // collapse every mark to the origin, so position and motion must live
            // on separate nodes.
            <g key={m.key} transform={`translate(${m.cx} ${m.cy})`}>
            <motion.g
              initial={prefersReduced ? false : { scale: 0, opacity: 0 }}
              animate={prefersReduced ? undefined : { scale: 1, opacity: 1 }}
              transition={{
                duration: perMark,
                delay,
                ease: [0.34, 1.4, 0.64, 1], // gentle overshoot, a crisp pop
              }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
              {/* Outer soft glow: a faint, larger same-colour disc, blurred. */}
              <circle r={m.r * 1.05} fill={m.color} fillOpacity={0.22} filter="url(#spray-glow)" />
              {/* Contrasting dark seat ring so marks stay countable when they
                  overlap and legible over light pitch fills. */}
              <circle
                r={m.r + ringW * 0.5}
                fill="none"
                stroke="var(--color-bg)"
                strokeOpacity={0.55}
                strokeWidth={ringW * 2}
              />
              {/* The mark itself: a crisp, solid, clearly-visible disc. */}
              <circle r={m.r} fill={m.color} fillOpacity={0.96} />
              {/* Thin bright rim picks the disc out from its own glow. */}
              <circle
                r={m.r}
                fill="none"
                stroke="var(--color-bg)"
                strokeOpacity={0.85}
                strokeWidth={ringW}
              />
              {/* Specular highlight → a small inset gloss for that premium,
                  rendered-bead look (kept subtle, theme-neutral white). */}
              <circle
                cx={-m.r * 0.28}
                cy={-m.r * 0.28}
                r={m.r * 0.26}
                fill="#ffffff"
                fillOpacity={0.28}
              />
            </motion.g>
            </g>
          );
        })}
      </g>

      {/* In-SVG legend: names each outcome present, drawn with its real mark
          colour. aria-hidden because the <svg> label already conveys the tally
          to assistive tech. */}
      {legend.length > 0 && (
        <g aria-hidden="true" transform={`translate(${lgX} ${lgY})`}>
          <rect
            x={0}
            y={0}
            width={lgW}
            height={lgH}
            rx={10 * unit}
            fill="var(--color-surface)"
            fillOpacity={0.85}
            stroke="var(--color-border)"
            strokeWidth={1.5 * unit}
          />
          {legend.map((l, i) => {
            const cy = lgPad + lgSwatchR + i * lgRow;
            const cx = lgPad + lgSwatchR;
            return (
              <g key={l.legend}>
                {/* Legend swatch = a miniature of the real mark (disc + rim). */}
                <circle cx={cx} cy={cy} r={lgSwatchR} fill={l.color} fillOpacity={0.96} />
                <circle
                  cx={cx}
                  cy={cy}
                  r={lgSwatchR}
                  fill="none"
                  stroke="var(--color-bg)"
                  strokeOpacity={0.85}
                  strokeWidth={1.6 * unit}
                />
                <text
                  x={cx + lgSwatchR + lgGap}
                  y={cy}
                  fontSize={lgFont}
                  fontFamily="var(--font-body, ui-sans-serif, system-ui)"
                  fill="var(--color-text)"
                  dominantBaseline="central"
                  style={{ fontWeight: 600 }}
                >
                  {l.legend}
                </text>
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}

interface Mark {
  key: string;
  cx: number;
  cy: number;
  r: number;
  kind: MarkKind;
  color: string;
  isPeak: boolean;
}

interface LegendRow {
  kind: MarkKind;
  legend: string;
  color: string;
}
