'use client';

// Stats Empire, ZoneCoverage
//
// Shades arbitrary polygon zones by their numeric `value` using a quantized
// accent ramp, then draws a centred label + value inside each zone and a value
// legend along the bottom. Serves every sport's zonal read: baseball fielding
// coverage, American football red zone/territory/midfield, basketball defensive zones, tennis
// deuce/ad/net, soccer thirds. Each zone is a single filled, crisply-bordered
// polygon so adjacent zones never visually merge (the old version's thin,
// same-hued borders made neighbouring rectangles look like they overlapped).
//
// d3 only computes the quantized value→bucket scale and polygon centroids;
// React renders every polygon, label and legend swatch as JSX. d3 never
// mutates React-owned DOM. All colour comes from var(--color-*) theme tokens,
// so the ramp tracks whichever theme (Court Vision / Evolved / Precision) is
// active. No animation → prefers-reduced-motion safe by construction.

import { useId, useMemo } from 'react';
import { scaleQuantize } from 'd3-scale';
import { extent } from 'd3-array';
import { polygonCentroid } from 'd3-polygon';
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
 * base, giving a genuine low→high perceptual ramp built only from tokens.
 */
interface Tier {
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
      baseOpacity: 0.3 - 0.18 * t, // 0.30 → 0.12
      hotOpacity: 0.14 + 0.66 * t, // 0.14 → 0.80
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

  const { shapes, legend, lo, hi } = useMemo(() => {
    if (zones.length === 0) {
      return { shapes: [], legend: [] as LegendBucket[], lo: 0, hi: 1 };
    }
    const [eLo = 0, eHi = 1] = extent(zones, (z) => z.value) as [number, number];
    const lo = eLo;
    const hi = eHi === eLo ? eLo + 1 : eHi;
    const tiers = ramp(steps);

    // Map value → bucket index 0..steps-1.
    const bucket = scaleQuantize<number>()
      .domain([lo, hi])
      .range(tiers.map((_, i) => i));

    const shapes = zones.map((z) => {
      const pts = projectPoints(proj, z.points);
      const pointsStr = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
      const [cx, cy] = polygonCentroid(pts);
      const tier = tiers[bucket(z.value)] ?? tiers[0];
      return {
        id: z.id,
        label: z.label,
        value: z.value,
        pointsStr,
        cx,
        cy,
        baseOpacity: tier.baseOpacity,
        hotOpacity: tier.hotOpacity,
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

  const { width: W, height: H } = proj.view;
  const labelSize = W * 0.024;
  const valueSize = W * 0.021;

  return (
    <svg
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
      </defs>

      <g aria-hidden="true" clipPath={`url(#${clipId})`}>
        {shapes.map((s) => (
          <g key={s.id}>
            {/* 1. faint accent1 base so even the lowest bucket reads on dark bg */}
            <polygon points={s.pointsStr} fill="var(--color-accent1)" fillOpacity={s.baseOpacity} />
            {/* 2. accent2 hot layer, opacity encodes the value */}
            <polygon points={s.pointsStr} fill="var(--color-accent2)" fillOpacity={s.hotOpacity} />
            {/* 3. crisp border: dark inner casing + bright outer line so every
                   zone is cleanly separated from its neighbours (no merge) */}
            <polygon
              points={s.pointsStr}
              fill="none"
              stroke="var(--color-bg)"
              strokeOpacity={0.85}
              strokeWidth={3.5}
              strokeLinejoin="round"
            />
            <polygon
              points={s.pointsStr}
              fill="none"
              stroke="var(--color-text)"
              strokeOpacity={0.9}
              strokeWidth={1.5}
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
          </g>
        ))}
      </g>

      {!hideLegend && legend.length > 0 && (
        <Legend
          buckets={legend}
          viewW={W}
          viewH={H}
          loLabel={formatVal(lo)}
          hiLabel={formatVal(hi)}
        />
      )}
    </svg>
  );
}

// --- sub-renderers ------------------------------------------------------------

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
  const plateW = Math.max(label.length * labelSize * 0.6, valueSize * 4) + labelSize;
  const plateH = labelSize + valueSize + labelSize * 0.9;
  return (
    <g>
      <rect
        x={cx - plateW / 2}
        y={cy - plateH / 2}
        width={plateW}
        height={plateH}
        rx={labelSize * 0.4}
        fill="var(--color-bg)"
        fillOpacity={0.55}
      />
      <text
        x={cx}
        y={cy - valueSize * 0.35}
        textAnchor="middle"
        fontSize={labelSize}
        fontFamily="var(--font-display)"
        fill="var(--color-text)"
        style={{ fontWeight: 700 }}
      >
        {label}
      </text>
      <text
        x={cx}
        y={cy + labelSize * 0.85}
        textAnchor="middle"
        fontSize={valueSize}
        fontFamily="var(--font-mono)"
        fill="var(--color-accent1)"
        style={{ fontWeight: 600 }}
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
}: {
  buckets: LegendBucket[];
  viewW: number;
  viewH: number;
  loLabel: string;
  hiLabel: string;
}) {
  const pad = viewW * 0.03;
  const swatchW = viewW * 0.085;
  const swatchH = viewH * 0.02;
  const gap = viewW * 0.006;
  const stripW = buckets.length * swatchW + (buckets.length - 1) * gap;
  const tickSize = viewW * 0.018;
  // Anchor the strip bottom-left, clear of the very edge.
  const ty = viewH - pad - swatchH;
  return (
    <g aria-hidden="true" transform={`translate(${pad} ${ty})`}>
      <text
        x={0}
        y={-tickSize * 0.7}
        fontSize={tickSize}
        fontFamily="var(--font-mono)"
        fill="var(--color-muted)"
        style={{ fontWeight: 600, letterSpacing: '0.04em' }}
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
        fontFamily="var(--font-mono)"
        fill="var(--color-muted)"
      >
        {loLabel}
      </text>
      <text
        x={stripW}
        y={swatchH + tickSize * 1.2}
        textAnchor="end"
        fontSize={tickSize}
        fontFamily="var(--font-mono)"
        fill="var(--color-muted)"
      >
        {hiLabel}
      </text>
    </g>
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
