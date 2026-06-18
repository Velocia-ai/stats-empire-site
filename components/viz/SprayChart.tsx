'use client';

// Stats Empire, SprayChart
//
// Plots discrete events as marks over a pitch, encoding `outcome` by BOTH color
// and shape (dual-encoding → colorblind-safe and theme-agnostic). One component
// serves three uses:
//   • basketball shot chart  (mode="shot": make=ring/accent1, miss=cross/muted)
//   • baseball spray chart    (mode="spray": hit landing spots by outcome)
//   • tennis serve placement  (mode="spray": winners vs errors)
//
// d3 is used for the symbol path generators and the radius scale; React renders
// every mark as JSX <path>/<g>. d3 never mutates React-owned DOM.

import { useMemo } from 'react';
import { symbol, symbolCircle, symbolCross, symbolDiamond, symbolTriangle, type SymbolType } from 'd3-shape';
import { scaleSqrt } from 'd3-scale';
import { extent } from 'd3-array';
import type { Outcome, PitchType, SpatialPoint } from '@/lib/types';
import { makeProjector, viewBoxAttr } from './geometry';

export interface SprayChartProps {
  /** Event points in normalized 0..1 space; `outcome` drives the encoding. */
  points: SpatialPoint[];
  /** Pitch whose coordinate space the points live in. */
  pitch: PitchType;
  /**
   * Visual register:
   *   "shot"  → made/missed semantics (basketball). Make = filled ring on
   *             accent1, miss = open cross on muted.
   *   "spray" → outcome semantics (baseball/tennis). winner/make = accent1,
   *             error/miss = accent2, neutral = muted.
   * Default "spray".
   */
  mode?: 'spray' | 'shot';
  /** Optional extra classes for the <svg>. */
  className?: string;
}

// Outcome → CSS color token + d3 symbol generator. Shape carries meaning when
// color alone is insufficient (accessibility) and gives each chart a signature
// texture.
interface MarkStyle {
  color: string;
  filled: boolean;
  symbol: SymbolType;
}

function styleFor(outcome: Outcome | undefined, mode: 'spray' | 'shot'): MarkStyle {
  const o = outcome ?? 'neutral';
  if (mode === 'shot') {
    // Basketball: makes pop, misses recede.
    switch (o) {
      case 'make':
      case 'winner':
        return { color: 'var(--color-accent1)', filled: true, symbol: symbolCircle };
      case 'miss':
      case 'error':
        return { color: 'var(--color-muted)', filled: false, symbol: symbolCross };
      default:
        return { color: 'var(--color-muted)', filled: false, symbol: symbolCircle };
    }
  }
  // Spray: outcome-typed palette.
  switch (o) {
    case 'winner':
    case 'make':
      return { color: 'var(--color-accent1)', filled: true, symbol: symbolCircle };
    case 'error':
    case 'miss':
      return { color: 'var(--color-accent2)', filled: false, symbol: symbolCross };
    case 'neutral':
    default:
      return { color: 'var(--color-muted)', filled: true, symbol: symbolDiamond };
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

export default function SprayChart({ points, pitch, mode = 'spray', className }: SprayChartProps) {
  const proj = useMemo(() => makeProjector(pitch), [pitch]);

  const { marks, summary } = useMemo(() => {
    if (points.length === 0) return { marks: [], summary: 'no events' };

    // Size marks by `value` if present (e.g. exit velocity, shot distance),
    // else constant. sqrt scale → area-proportional, perceptually honest.
    const vals = points.map((p) => p.value ?? 1);
    const [lo, hi] = extent(vals) as [number, number];
    const baseR = proj.view.width * 0.014;
    const rScale = scaleSqrt()
      .domain([lo ?? 0, hi ?? 1])
      .range([baseR * 0.8, baseR * 2]);

    // Triangle reserved for emphasis when a point carries a high value.
    const marks = points.map((p, i) => {
      const st = styleFor(p.outcome, mode);
      const r = lo === hi ? baseR : rScale(p.value ?? lo ?? 1);
      const area = Math.PI * r * r; // d3 symbol size = area in px²
      const sym = p.value !== undefined && p.value === hi ? symbolTriangle : st.symbol;
      const path = symbol(sym, area)();
      const [cx, cy] = proj.point(p.x, p.y);
      return {
        key: `${i}-${p.x}-${p.y}`,
        cx,
        cy,
        path: path ?? '',
        color: st.color,
        filled: st.filled,
        label: p.label,
      };
    });

    // Accessible tally per outcome.
    const tally = new Map<Outcome, number>();
    points.forEach((p) => {
      const o = p.outcome ?? 'neutral';
      tally.set(o, (tally.get(o) ?? 0) + 1);
    });
    const summary = Array.from(tally.entries())
      .map(([o, n]) => `${n} ${OUTCOME_WORDS[o]}`)
      .join(', ');

    return { marks, summary };
  }, [points, mode, proj]);

  return (
    <svg
      viewBox={viewBoxAttr(pitch)}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${mode === 'shot' ? 'Shot chart' : 'Spray chart'}: ${points.length} events, ${summary}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <g aria-hidden="true">
        {marks.map((m) => (
          <g key={m.key} transform={`translate(${m.cx} ${m.cy})`}>
            <path
              d={m.path}
              fill={m.filled ? m.color : 'none'}
              fillOpacity={m.filled ? 0.85 : 0}
              stroke={m.color}
              strokeWidth={m.filled ? 1 : 2}
              strokeLinejoin="round"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
