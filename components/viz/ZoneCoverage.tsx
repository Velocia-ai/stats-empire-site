'use client';

// Stats Empire, ZoneCoverage
//
// Shades arbitrary polygon zones by their numeric `value` using a quantized
// accent ramp, then draws a centred label + value inside each zone and a value
// legend along the bottom. Serves every sport's zonal read: baseball fielding
// coverage, American football red zone/territory/midfield, basketball defensive
// zones, tennis deuce/ad/net, soccer thirds. Each zone is a single filled,
// crisply-bordered polygon so adjacent zones never visually merge (the old
// version's thin, same-hued borders made neighbouring rectangles look like they
// overlapped).
//
// d3 only computes the quantized value→bucket scale and polygon centroids;
// React renders every polygon, label and legend swatch as JSX. d3 never mutates
// React-owned DOM. All colour comes from var(--color-*) theme tokens, so the
// ramp tracks whichever theme (Court Vision / Evolved / Precision) is active.
//
// Motion: on first scroll into view the zones fade + settle IN SEQUENCE (low →
// high value, then by index) so the coverage reads like it's being painted on,
// and the legend wipes in after. Fully reduced-motion safe: when the user
// prefers reduced motion every element renders in its final state with no
// transition (useInView still flips, but the variants collapse to identical
// from/to).

import { useId, useMemo, useRef } from 'react';
import { scaleQuantize } from 'd3-scale';
import { extent } from 'd3-array';
import { polygonCentroid } from 'd3-polygon';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import type { PitchType, ZonePolygon } from '@/lib/types';
import { makeProjector, projectPoints, viewBoxAttr } from './geometry';

export interface ZoneCoverageProps {
  /** Polygons in normalized 0..1 space, each carrying a numeric `value`. */
  zones: ZonePolygon[];
  /** Pitch whose coordinate space the zones live in. */
  pitch: PitchType;
  /** Number of legend / shading buckets. Default 5. */
  steps?: number;
  /** Hide the in-SVG legend (e.g. when rendering a custom one). Default false. */
  hideLegend?: boolean;
  /** Optional extra classes for the <svg>. */
  className?: string;
}

/**
 * A bucket's appearance. The ramp blends from accent1 (cool/low) toward accent2
 * (hot/high) by laying an accent2 layer of rising opacity over a faint accent1
 * base, giving a genuine low→high perceptual ramp built only from tokens. A
 * `t` (0..1) is carried so the sheen/border weight can track value too.
 */
interface Tier {
  /** Normalized position in the ramp, 0 = lowest bucket, 1 = highest. */
  t: number;
  /** accent1 base-fill opacity (fades out as value climbs). */
  baseOpacity: number;
  /** accent2 over-fill opacity (grows as value climbs). */
  hotOpacity: number;
}

function ramp(steps: number): Tier[] {
  const n = Math.max(1, steps);
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 1 : i / (n - 1); // 0..1 low→high
    return {
      t,
      baseOpacity: 0.34 - 0.2 * t, // 0.34 → 0.14
      hotOpacity: 0.16 + 0.66 * t, // 0.16 → 0.82
    };
  });
}

export default function ZoneCoverage({
  zones,
  pitch,
  steps = 5,
  hideLegend = false,
  className,
}: ZoneCoverageProps) {
  const proj = useMemo(() => makeProjector(pitch), [pitch]);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const clipId = `zc-clip-${uid}`;
  const sheenId = `zc-sheen-${uid}`;

  const ref = useRef<SVGSVGElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-12% 0px -12% 0px' });
  const prefersReduced = useReducedMotion();
  // When reduced motion is preferred, collapse all transitions to zero so every
  // element renders straight into its final state.
  const animateOn = inView && !prefersReduced;

  const { shapes, legend, lo, hi } = useMemo(() => {
    if (zones.length === 0) {
      return { shapes: [] as Shape[], legend: [] as LegendBucket[], lo: 0, hi: 1 };
    }
    const [eLo = 0, eHi = 1] = extent(zones, (z) => z.value) as [number, number];
    const lo = eLo;
    const hi = eHi === eLo ? eLo + 1 : eHi;
    const tiers = ramp(steps);

    // Map value → bucket index 0..steps-1.
    const bucket = scaleQuantize<number>()
      .domain([lo, hi])
      .range(tiers.map((_, i) => i));

    const shapes: Shape[] = zones.map((z, i) => {
      const pts = projectPoints(proj, z.points);
      const pointsStr = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
      const [cx, cy] = polygonCentroid(pts);
      const bi = bucket(z.value);
      const tier = tiers[bi] ?? tiers[0];
      return {
        id: z.id,
        label: z.label,
        value: z.value,
        pointsStr,
        cx,
        cy,
        bucketIndex: bi,
        sourceIndex: i,
        ...tier,
      };
    });

    // Legend buckets: even value steps across [lo, hi], coloured by the same ramp.
    const legend: LegendBucket[] = tiers.map((tier, i) => {
      const t0 = lo + ((hi - lo) * i) / steps;
      const t1 = lo + ((hi - lo) * (i + 1)) / steps;
      return { ...tier, t0, t1 };
    });

    return { shapes, legend, lo: eLo, hi: eHi };
  }, [zones, steps, proj]);

  // Paint order: lowest-value zones first, then climbing, so the coverage
  // "heats up" as it draws on. Ties resolve by original index for stability.
  const paintOrder = useMemo(() => {
    return shapes
      .map((s, idx) => idx)
      .sort((a, b) => {
        const za = shapes[a];
        const zb = shapes[b];
        if (za.bucketIndex !== zb.bucketIndex) return za.bucketIndex - zb.bucketIndex;
        return za.sourceIndex - zb.sourceIndex;
      });
  }, [shapes]);
  const orderOf = useMemo(() => {
    const m = new Map<number, number>();
    paintOrder.forEach((shapeIdx, pos) => m.set(shapeIdx, pos));
    return m;
  }, [paintOrder]);

  const { width: W, height: H } = proj.view;
  const labelSize = W * 0.024;
  const valueSize = W * 0.021;
  const stagger = 0.07; // seconds between consecutive zone reveals
  const zoneDur = 0.55;

  return (
    <svg
      ref={ref}
      viewBox={viewBoxAttr(pitch)}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Zone coverage: ${zones.length} zones, values ${formatVal(lo)} to ${formatVal(hi)}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        {/* Clip everything to the field frame so stray coords can't overflow
            (or visually collide with) the pitch and read as overlap. */}
        <clipPath id={clipId}>
          <rect x={0} y={0} width={W} height={H} />
        </clipPath>
        {/* Subtle top-down sheen laid over each zone fill so flat polygons gain
            a touch of broadcast-grade depth without changing the value read. */}
        <linearGradient id={sheenId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-text)" stopOpacity={0.1} />
          <stop offset="42%" stopColor="var(--color-text)" stopOpacity={0} />
          <stop offset="100%" stopColor="var(--color-bg)" stopOpacity={0.14} />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {shapes.map((s) => {
          const order = orderOf.get(s.sourceIndex) ?? 0;
          const delay = order * stagger;
          return (
            <motion.g
              key={s.id}
              // Start hidden + slightly shrunk, settle to full when in view. When
              // reduced motion is preferred we skip the shrink and the duration is
              // zeroed below, so it snaps straight to the final state.
              initial={prefersReduced ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: inView ? 1 : 0, scale: 1 }}
              // Group scales subtly out of its own centroid as it fades in.
              style={{ transformOrigin: `${s.cx}px ${s.cy}px` }}
              transition={
                animateOn
                  ? {
                      opacity: { duration: zoneDur, delay, ease: 'easeOut' },
                      scale: { duration: zoneDur, delay, ease: [0.16, 1, 0.3, 1] },
                    }
                  : { duration: 0 }
              }
            >
              {/* 1. faint accent1 base so even the lowest bucket reads on dark bg */}
              <polygon points={s.pointsStr} fill="var(--color-accent1)" fillOpacity={s.baseOpacity} />
              {/* 2. accent2 hot layer, opacity encodes the value */}
              <polygon points={s.pointsStr} fill="var(--color-accent2)" fillOpacity={s.hotOpacity} />
              {/* 3. sheen overlay for depth (does not affect the value read) */}
              <polygon points={s.pointsStr} fill={`url(#${sheenId})`} />
              {/* 4. crisp border: dark inner casing + bright outer line so every
                     zone is cleanly separated from its neighbours (no merge).
                     Border weight rises a touch with value so hot zones lead. */}
              <polygon
                points={s.pointsStr}
                fill="none"
                stroke="var(--color-bg)"
                strokeOpacity={0.9}
                strokeWidth={3.5}
                strokeLinejoin="round"
              />
              <polygon
                points={s.pointsStr}
                fill="none"
                stroke="var(--color-text)"
                strokeOpacity={0.55 + 0.4 * s.t}
                strokeWidth={1.4 + 0.8 * s.t}
                strokeLinejoin="round"
              />

              {/* Zone label + value at the centroid, on a legibility plate */}
              <ZoneCaption
                cx={s.cx}
                cy={s.cy}
                label={s.label}
                value={formatVal(s.value)}
                labelSize={labelSize}
                valueSize={valueSize}
              />
            </motion.g>
          );
        })}
      </g>

      {!hideLegend && legend.length > 0 && (
        <Legend
          buckets={legend}
          viewW={W}
          viewH={H}
          loLabel={formatVal(lo)}
          hiLabel={formatVal(hi)}
          reveal={inView}
          animateOn={animateOn}
          // Legend wipes in once the zones have started settling.
          delay={prefersReduced ? 0 : paintOrder.length * stagger * 0.5 + 0.1}
        />
      )}
    </svg>
  );
}

// --- sub-renderers ------------------------------------------------------------

interface Shape extends Tier {
  id: string;
  label: string;
  value: number;
  pointsStr: string;
  cx: number;
  cy: number;
  bucketIndex: number;
  sourceIndex: number;
}

interface LegendBucket extends Tier {
  t0: number;
  t1: number;
}

/** Centred two-line caption (label + value) sitting on a translucent plate. */
function ZoneCaption({
  cx,
  cy,
  label,
  value,
  labelSize,
  valueSize,
}: {
  cx: number;
  cy: number;
  label: string;
  value: string;
  labelSize: number;
  valueSize: number;
}) {
  // Plate sized roughly from text length so it never dwarfs a small zone.
  const plateW = Math.max(label.length * labelSize * 0.58, value.length * valueSize * 0.7, valueSize * 4) + labelSize;
  const plateH = labelSize + valueSize + labelSize * 0.95;
  return (
    <g>
      {/* Soft dark plate keeps the caption legible over any fill density. */}
      <rect
        x={cx - plateW / 2}
        y={cy - plateH / 2}
        width={plateW}
        height={plateH}
        rx={labelSize * 0.42}
        fill="var(--color-bg)"
        fillOpacity={0.62}
        stroke="var(--color-text)"
        strokeOpacity={0.12}
        strokeWidth={1}
      />
      <text
        x={cx}
        y={cy - valueSize * 0.32}
        textAnchor="middle"
        fontSize={labelSize}
        fontFamily="var(--font-display, ui-sans-serif, system-ui, sans-serif)"
        fill="var(--color-text)"
        style={{ fontWeight: 700, letterSpacing: '-0.01em' }}
      >
        {label}
      </text>
      <text
        x={cx}
        y={cy + labelSize * 0.92}
        textAnchor="middle"
        fontSize={valueSize}
        fontFamily="var(--font-mono, ui-monospace, monospace)"
        fill="var(--color-accent1)"
        style={{ fontWeight: 600, letterSpacing: '0.02em' }}
      >
        {value}
      </text>
    </g>
  );
}

/** Bottom-left value legend: a strip of ramp swatches with min/max ticks. */
function Legend({
  buckets,
  viewW,
  viewH,
  loLabel,
  hiLabel,
  reveal,
  animateOn,
  delay,
}: {
  buckets: LegendBucket[];
  viewW: number;
  viewH: number;
  loLabel: string;
  hiLabel: string;
  reveal: boolean;
  animateOn: boolean;
  delay: number;
}) {
  const pad = viewW * 0.03;
  const swatchW = viewW * 0.085;
  const swatchH = viewH * 0.022;
  const gap = viewW * 0.006;
  const stripW = buckets.length * swatchW + (buckets.length - 1) * gap;
  const tickSize = viewW * 0.018;
  // Anchor the strip bottom-left, clear of the very edge.
  const ty = viewH - pad - swatchH;
  // Plate behind the whole legend (local coords; the group is translated to the
  // strip origin, so the title sits above y=0 and the ticks below the swatches).
  const plateInset = tickSize * 0.6;
  const plateX = -plateInset;
  const plateY = -tickSize * 1.7;
  const plateW = stripW + plateInset * 2;
  const plateH = tickSize * 1.7 + swatchH + tickSize * 1.6 + plateInset;

  return (
    <motion.g
      aria-hidden="true"
      transform={`translate(${pad} ${ty})`}
      initial={false}
      animate={{ opacity: reveal ? 1 : 0 }}
      transition={animateOn ? { duration: 0.4, delay, ease: 'easeOut' } : { duration: 0 }}
    >
      <rect
        x={plateX}
        y={plateY}
        width={plateW}
        height={plateH}
        rx={tickSize * 0.5}
        fill="var(--color-surface)"
        fillOpacity={0.78}
        stroke="var(--color-border)"
        strokeWidth={1}
      />
      <text
        x={0}
        y={-tickSize * 0.7}
        fontSize={tickSize}
        fontFamily="var(--font-mono, ui-monospace, monospace)"
        fill="var(--color-muted)"
        style={{ fontWeight: 600, letterSpacing: '0.08em' }}
      >
        VALUE
      </text>
      {buckets.map((b, i) => (
        <g key={i} transform={`translate(${i * (swatchW + gap)} 0)`}>
          {/* same two-layer fill as the zones so the legend matches exactly */}
          <rect width={swatchW} height={swatchH} rx={2} fill="var(--color-accent1)" fillOpacity={b.baseOpacity} />
          <rect width={swatchW} height={swatchH} rx={2} fill="var(--color-accent2)" fillOpacity={b.hotOpacity} />
          <rect
            width={swatchW}
            height={swatchH}
            rx={2}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={1}
          />
        </g>
      ))}
      {/* min / max ticks under the strip ends */}
      <text
        x={0}
        y={swatchH + tickSize * 1.2}
        fontSize={tickSize}
        fontFamily="var(--font-mono, ui-monospace, monospace)"
        fill="var(--color-muted)"
      >
        {loLabel}
      </text>
      <text
        x={stripW}
        y={swatchH + tickSize * 1.2}
        textAnchor="end"
        fontSize={tickSize}
        fontFamily="var(--font-mono, ui-monospace, monospace)"
        fill="var(--color-muted)"
      >
        {hiLabel}
      </text>
    </motion.g>
  );
}

// Compact numeric formatting for legend/labels (e.g. 0.42, 12, 1.2k).
function formatVal(v: number): string {
  if (!Number.isFinite(v)) return '-';
  const abs = Math.abs(v);
  if (abs >= 1000) return `${(v / 1000).toFixed(1)}k`;
  if (abs < 1 && abs > 0) return v.toFixed(2);
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}
