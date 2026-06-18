'use client';

// Stats Empire, SprayChart
//
// Plots discrete events as crisp marks over a pitch, encoding `outcome` by BOTH
// color AND shape (dual-encoding → colorblind-safe and theme-agnostic) and
// `value` by mark size (sqrt scale → area-honest). An in-SVG legend names every
// outcome that actually appears, so the chart is self-describing when exported.
// One component serves three uses:
//   • basketball shot chart  (mode="shot": make=disc/accent1, miss=cross/muted)
//   • baseball spray chart    (mode="spray": hit landing spots by outcome)
//   • tennis serve placement  (mode="spray": winners vs errors)
//
// d3 is used for the symbol path generators and the radius scale; React renders
// every mark as JSX <path>/<g>. d3 never mutates React-owned DOM.

import { useMemo } from 'react';
import {
  symbol,
  symbolCircle,
  symbolCross,
  symbolDiamond,
  symbolTriangle,
  type SymbolType,
} from 'd3-shape';
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
   *   "shot"  → made/missed semantics (basketball). Make = filled disc on
   *             accent1, miss = open cross on muted.
   *   "spray" → outcome semantics (baseball/tennis). winner/make = accent1,
   *             error/miss = accent2, neutral = muted.
   * Default "spray".
   */
  mode?: 'spray' | 'shot';
  /** Optional extra classes for the <svg>. */
  className?: string;
}

// Each distinct visual class an event can map to. We collapse the 5 Outcome
// values into these registers so the legend has at most 2-3 rows (not a noisy
// 5) and so make/winner share one swatch, miss/error another.
type MarkKind = 'positive' | 'negative' | 'neutral';

interface MarkStyle {
  /** Which legend row this mark belongs to. */
  kind: MarkKind;
  /** Short human label for the legend swatch. */
  legend: string;
  color: string;
  filled: boolean;
  symbol: SymbolType;
}

// Resolve an outcome (in a given mode) to its full visual style. Shape carries
// meaning when color alone is insufficient (accessibility) and gives each chart
// a signature texture: disc = good, cross = bad, diamond = neutral.
function styleFor(outcome: Outcome | undefined, mode: 'spray' | 'shot'): MarkStyle {
  const o = outcome ?? 'neutral';
  if (mode === 'shot') {
    // Basketball: makes pop (filled lime disc), misses recede (open cross).
    switch (o) {
      case 'make':
      case 'winner':
        return {
          kind: 'positive',
          legend: 'Made',
          color: 'var(--color-accent1)',
          filled: true,
          symbol: symbolCircle,
        };
      case 'miss':
      case 'error':
        return {
          kind: 'negative',
          legend: 'Missed',
          color: 'var(--color-muted)',
          filled: false,
          symbol: symbolCross,
        };
      default:
        return {
          kind: 'neutral',
          legend: 'Attempt',
          color: 'var(--color-muted)',
          filled: false,
          symbol: symbolCircle,
        };
    }
  }
  // Spray: outcome-typed palette (lime = winner, orange = error, muted = in-play).
  switch (o) {
    case 'winner':
    case 'make':
      return {
        kind: 'positive',
        legend: 'Winner',
        color: 'var(--color-accent1)',
        filled: true,
        symbol: symbolCircle,
      };
    case 'error':
    case 'miss':
      return {
        kind: 'negative',
        legend: 'Error',
        color: 'var(--color-accent2)',
        filled: false,
        symbol: symbolCross,
      };
    case 'neutral':
    default:
      return {
        kind: 'neutral',
        legend: 'In play',
        color: 'var(--color-muted)',
        filled: true,
        symbol: symbolDiamond,
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

  const { marks, legend, summary } = useMemo(() => {
    if (points.length === 0) {
      return { marks: [], legend: [], summary: 'no events' };
    }

    // Size marks by `value` if present (e.g. exit velocity, shot distance),
    // else constant. sqrt scale → area-proportional, perceptually honest.
    const vals = points.map((p) => p.value ?? 1);
    const [lo, hi] = extent(vals) as [number, number];
    const baseR = proj.view.width * 0.014;
    const rScale = scaleSqrt()
      .domain([lo ?? 0, hi ?? 1])
      .range([baseR * 0.85, baseR * 2]);
    const flat = lo === hi; // all equal → no meaningful size encoding

    const marks = points.map((p, i) => {
      const st = styleFor(p.outcome, mode);
      const r = flat ? baseR : rScale(p.value ?? lo ?? 1);
      const area = Math.PI * r * r; // d3 symbol size = area in px²
      // Triangle flags the single peak value (the standout play) for emphasis.
      const isPeak = !flat && p.value !== undefined && p.value === hi;
      const sym = isPeak ? symbolTriangle : st.symbol;
      const path = symbol(sym, area)();
      const [cx, cy] = proj.point(p.x, p.y);
      return {
        key: `${i}-${p.x}-${p.y}`,
        cx,
        cy,
        r,
        path: path ?? '',
        color: st.color,
        filled: st.filled,
        isPeak,
        label: p.label,
      };
    });

    // Build the legend from the outcome kinds that actually occur, de-duped.
    const seen = new Map<string, { kind: MarkKind; legend: string; color: string; filled: boolean; symbol: SymbolType }>();
    points.forEach((p) => {
      const st = styleFor(p.outcome, mode);
      if (!seen.has(st.legend)) {
        seen.set(st.legend, {
          kind: st.kind,
          legend: st.legend,
          color: st.color,
          filled: st.filled,
          symbol: st.symbol,
        });
      }
    });
    const legend = Array.from(seen.values()).sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);

    // Accessible tally per outcome.
    const tally = new Map<Outcome, number>();
    points.forEach((p) => {
      const o = p.outcome ?? 'neutral';
      tally.set(o, (tally.get(o) ?? 0) + 1);
    });
    const summary = Array.from(tally.entries())
      .map(([o, n]) => `${n} ${OUTCOME_WORDS[o]}`)
      .join(', ');

    return { marks, legend, summary };
  }, [points, mode, proj]);

  // Legend geometry, in viewBox units, anchored top-left.
  const swatch = proj.view.width * 0.02; // half-size of a legend symbol
  const lgPad = proj.view.width * 0.018;
  const rowH = proj.view.width * 0.052;
  const fontSize = proj.view.width * 0.03;
  const labelGap = proj.view.width * 0.04;
  // Width sized to the longest legend label so the chip never clips.
  const longest = legend.reduce((m, l) => Math.max(m, l.legend.length), 0);
  const lgWidth = legend.length === 0 ? 0 : labelGap + longest * fontSize * 0.6 + lgPad;
  const lgHeight = legend.length === 0 ? 0 : legend.length * rowH + lgPad * 0.4;

  return (
    <svg
      viewBox={viewBoxAttr(pitch)}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${mode === 'shot' ? 'Shot chart' : 'Spray chart'}: ${points.length} events, ${summary}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        {/* Soft outline so a lime/orange mark stays legible over any pitch fill. */}
        <filter id="spray-mark-halo" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation={proj.view.width * 0.004}
            floodColor="var(--color-bg)"
            floodOpacity="0.55"
          />
        </filter>
      </defs>

      <g aria-hidden="true">
        {marks.map((m) => (
          <g key={m.key} transform={`translate(${m.cx} ${m.cy})`} filter="url(#spray-mark-halo)">
            <path
              d={m.path}
              fill={m.filled ? m.color : 'none'}
              fillOpacity={m.filled ? 0.9 : 0}
              stroke={m.color}
              strokeWidth={m.filled ? proj.view.width * 0.002 : proj.view.width * 0.0045}
              strokeOpacity={1}
              strokeLinejoin="round"
            />
            {/* Crisp dark core keeps overlapping marks countable. */}
            {m.filled && (
              <circle r={Math.max(1, m.r * 0.16)} fill="var(--color-bg)" fillOpacity={0.55} />
            )}
          </g>
        ))}
      </g>

      {/* In-SVG legend: names each outcome present, drawn with its real mark. */}
      {legend.length > 0 && (
        <g aria-hidden="true" transform={`translate(${lgPad} ${lgPad})`}>
          <rect
            x={0}
            y={0}
            width={lgWidth}
            height={lgHeight}
            rx={proj.view.width * 0.012}
            fill="var(--color-surface)"
            fillOpacity={0.82}
            stroke="var(--color-border)"
            strokeWidth={proj.view.width * 0.0015}
          />
          {legend.map((l, i) => {
            const cy = rowH * (i + 0.5) + lgPad * 0.2;
            const cx = lgPad * 0.9 + swatch;
            const d = symbol(l.symbol, Math.PI * swatch * swatch * 0.9)() ?? '';
            return (
              <g key={l.legend} transform={`translate(0 ${cy})`}>
                <g transform={`translate(${cx} 0)`}>
                  <path
                    d={d}
                    fill={l.filled ? l.color : 'none'}
                    fillOpacity={l.filled ? 0.9 : 0}
                    stroke={l.color}
                    strokeWidth={l.filled ? proj.view.width * 0.002 : proj.view.width * 0.0045}
                    strokeLinejoin="round"
                  />
                </g>
                <text
                  x={cx + swatch + labelGap * 0.3}
                  y={0}
                  fontSize={fontSize}
                  fill="var(--color-text)"
                  dominantBaseline="central"
                  style={{ fontWeight: 500 }}
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
