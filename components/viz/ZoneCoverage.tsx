'use client';

// Stats Empire, ZoneCoverage
//
// Shades arbitrary polygon zones by a continuous `value`, with a discrete
// legend. Serves every sport's zonal read: baseball fielding coverage, AFL
// forward/mid/back-50, basketball defensive zones, tennis deuce/ad/net, soccer
// thirds. Each zone is a filled polygon labelled with its value.
//
// d3 computes a quantized sequential color scale; React renders the polygons
// and legend as JSX. d3 never mutates React-owned DOM.

import { useMemo } from 'react';
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

// Per-bucket fill opacities over accent1 → darker theme themes still read.
function opacityRamp(steps: number): number[] {
  return Array.from({ length: steps }, (_, i) => 0.16 + (0.62 * i) / Math.max(1, steps - 1));
}

export default function ZoneCoverage({
  zones,
  pitch,
  steps = 5,
  hideLegend = false,
  className,
}: ZoneCoverageProps) {
  const proj = useMemo(() => makeProjector(pitch), [pitch]);

  const { shapes, legend, lo, hi } = useMemo(() => {
    if (zones.length === 0) {
      return { shapes: [], legend: [], lo: 0, hi: 1 };
    }
    const [lo = 0, hi = 1] = extent(zones, (z) => z.value) as [number, number];
    const ramp = opacityRamp(steps);
    // Map value → bucket index 0..steps-1 → opacity tier.
    const bucket = scaleQuantize<number>()
      .domain([lo, hi === lo ? lo + 1 : hi])
      .range(ramp.map((_, i) => i));

    const shapes = zones.map((z) => {
      const pts = projectPoints(proj, z.points);
      const pointsStr = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
      const [cx, cy] = polygonCentroid(pts);
      const tier = bucket(z.value);
      return {
        id: z.id,
        label: z.label,
        value: z.value,
        pointsStr,
        cx,
        cy,
        opacity: ramp[tier] ?? ramp[0],
      };
    });

    // Legend buckets: even value steps across [lo, hi].
    const legend = ramp.map((op, i) => {
      const t0 = lo + ((hi - lo) * i) / steps;
      const t1 = lo + ((hi - lo) * (i + 1)) / steps;
      return { opacity: op, label: `${formatVal(t0)}-${formatVal(t1)}` };
    });

    return { shapes, legend, lo, hi };
  }, [zones, steps, proj]);

  return (
    <svg
      viewBox={viewBoxAttr(pitch)}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Zone coverage: ${zones.length} zones, values ${formatVal(lo)} to ${formatVal(hi)}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <g aria-hidden="true">
        {shapes.map((s) => (
          <g key={s.id}>
            <polygon
              points={s.pointsStr}
              fill="var(--color-accent1)"
              fillOpacity={s.opacity}
              stroke="var(--color-accent1)"
              strokeOpacity={0.55}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            {/* Zone label + value at centroid */}
            <text
              x={s.cx}
              y={s.cy - 2}
              textAnchor="middle"
              fontSize={proj.view.width * 0.022}
              fontFamily="var(--font-display)"
              fill="var(--color-text)"
              style={{ fontWeight: 700 }}
            >
              {s.label}
            </text>
            <text
              x={s.cx}
              y={s.cy + proj.view.width * 0.026}
              textAnchor="middle"
              fontSize={proj.view.width * 0.02}
              fontFamily="var(--font-mono)"
              fill="var(--color-text)"
              fillOpacity={0.85}
            >
              {formatVal(s.value)}
            </text>
          </g>
        ))}
      </g>

      {!hideLegend && legend.length > 0 && (
        <g
          aria-hidden="true"
          transform={`translate(${proj.view.width * 0.03} ${proj.view.height - proj.view.height * 0.06})`}
        >
          {legend.map((l, i) => (
            <g key={i} transform={`translate(${i * proj.view.width * 0.13} 0)`}>
              <rect
                width={proj.view.width * 0.11}
                height={proj.view.height * 0.018}
                rx={2}
                fill="var(--color-accent1)"
                fillOpacity={l.opacity}
                stroke="var(--color-border)"
                strokeWidth={0.5}
              />
              <text
                x={0}
                y={-proj.view.height * 0.008}
                fontSize={proj.view.width * 0.016}
                fontFamily="var(--font-mono)"
                fill="var(--color-muted)"
              >
                {l.label}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
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
