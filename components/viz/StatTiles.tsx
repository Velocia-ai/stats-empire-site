'use client';

// StatTiles, the loud headline numbers.
//
// A responsive grid of big-number tiles built from MetricRow[]. Each tile is
// the hero presentation of a stat: an oversized mono numeral that COUNTS UP the
// first time the grid scrolls into view, a label kicker, an optional unit, a
// context-aware delta chip (up = good), an optional inline sparkline of recent
// history, and a thin accent rule that draws in under the numeral.
//
// Promoted to a Client Component so the numbers can animate; the public prop
// API (`rows: MetricRow[]`) is unchanged, so every existing call site keeps
// working. Theme-token styled so it re-themes live with the A/B/C switch, and
// reduced-motion safe: count-ups settle to their final value instantly and the
// accent rule renders full-width with no transition.

import { useRef } from 'react';
import clsx from 'clsx';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import type { MetricRow } from '@/lib/types';
import { formatCount, parseNumericValue, useCountUp } from '@/lib/useCountUp';

interface StatTilesProps {
  rows: MetricRow[];
}

/** Animated big numeral. Counts up once in view; settles instantly if reduced. */
function StatValue({ value, active }: { value: MetricRow['value']; active: boolean }) {
  const parsed = parseNumericValue(value);
  const n = useCountUp(parsed.target, active);

  if (!parsed.numeric) {
    return (
      <span
        className="min-w-0 break-words font-bold tabular-nums text-text"
        style={{ fontSize: 'clamp(1.5rem, 1rem + 2.4vw, 3.5rem)' }}
      >
        {value}
      </span>
    );
  }

  return (
    <span
      className="min-w-0 break-words font-bold tabular-nums text-text"
      style={{ fontSize: 'clamp(1.5rem, 1rem + 2.4vw, 3.5rem)' }}
    >
      {parsed.prefix}
      {formatCount(n, parsed.decimals as number)}
      {parsed.suffix}
    </span>
  );
}

function DeltaChip({ delta }: { delta: number }) {
  const positive = delta > 0;
  const negative = delta < 0;
  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-mono text-xs font-semibold tabular-nums ring-1 ring-inset',
        positive && 'bg-accent1/15 text-accent1 ring-accent1/25',
        negative && 'bg-accent2/15 text-accent2 ring-accent2/25',
        !positive && !negative && 'bg-surfaceAlt text-muted ring-border',
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" strokeWidth={3} />
      {`${delta > 0 ? '+' : ''}${delta}`}
      <span className="sr-only">
        {positive ? 'increase' : negative ? 'decrease' : 'no change'}
      </span>
    </span>
  );
}

/**
 * Compact inline sparkline of a tile's recent history. SVG path in a 100x28
 * userSpace box, scaled to fill; the final point gets an accent node so the
 * eye lands on "where it is now". Draw-on reveal is gated by `active`.
 */
function Sparkline({ data, label, active }: { data: number[]; label: string; active: boolean }) {
  const reduce = useReducedMotion();
  if (data.length < 2) return null;

  const W = 100;
  const H = 28;
  const pad = 2;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = (W - pad * 2) / (data.length - 1);

  const pts = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (d - min) / range) * (H - pad * 2);
    return [x, y] as const;
  });

  const linePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1][0].toFixed(2)},${H - pad} L${pts[0][0].toFixed(2)},${H - pad} Z`;
  const last = pts[pts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`${label} recent trend`}
      className="h-7 w-full"
    >
      <path d={areaPath} fill="var(--color-accent1)" fillOpacity={0.1} />
      {reduce ? (
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-accent1)"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        <motion.path
          d={linePath}
          fill="none"
          stroke="var(--color-accent1)"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={active ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      )}
      <motion.circle
        cx={last[0]}
        cy={last[1]}
        r={2.2}
        fill="var(--color-accent1)"
        initial={reduce ? false : { opacity: 0 }}
        animate={active || reduce ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.3, delay: reduce ? 0 : 0.85 }}
      />
    </svg>
  );
}

export function StatTiles({ rows }: StatTilesProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -12% 0px' });
  const active = reduce ? true : inView;

  return (
    <ul
      ref={ref}
      // Responsive auto-fit grid: tiles flow into as many columns as fit the
      // container (min ~9.5rem each) and wrap onto new rows instead of
      // overflowing a fixed-width track. No fixed col count, so it adapts to
      // any bento column width without clipping.
      className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr))]"
      aria-label="Headline statistics"
    >
      {rows.map((row, idx) => {
        const hasSpark = !!row.spark && row.spark.length >= 2;
        return (
          <li
            key={`${row.label}-${idx}`}
            className={clsx(
              // min-w-0 lets the tile shrink below its content's intrinsic width
              // so long numbers can scale down rather than force overflow. Note:
              // NO overflow-hidden on the tile itself, that clipped the digits.
              'group relative flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-4 sm:p-5',
              'transition-colors duration-300 hover:border-accent1/40',
            )}
          >
            {/* faint accent wash on hover (clipped to the rounded card) */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
            >
              <span className="absolute inset-0 bg-gradient-to-br from-accent1/0 to-accent1/0 transition-colors duration-300 group-hover:from-accent1/[0.07]" />
            </span>

            <div className="relative flex h-full min-w-0 flex-col justify-between gap-3">
              <p className="min-w-0 truncate font-mono text-[0.65rem] font-medium uppercase tracking-[0.16em] text-muted sm:text-xs lg:text-[0.8125rem]">
                {row.label}
              </p>

              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-2 gap-y-1">
                  {/* Value + unit: min-w-0 + flex-wrap so a long value can wrap
                      its unit to a new line; clamp() scales the numeral down on
                      narrow tiles. tabular-nums keeps digits aligned. */}
                  <p className="flex min-w-0 flex-wrap items-baseline gap-x-1 font-display leading-none">
                    <span className="sr-only">{row.value}{row.unit ? ` ${row.unit}` : ''}</span>
                    <span aria-hidden="true" className="contents">
                      <StatValue value={row.value} active={active} />
                      {row.unit ? (
                        <span className="font-mono text-sm font-medium text-muted lg:text-lg">
                          {row.unit}
                        </span>
                      ) : null}
                    </span>
                  </p>
                  {row.delta != null ? <DeltaChip delta={row.delta} /> : null}
                </div>

                {/* Thin accent rule that draws in under the numeral, a quiet
                    "live data" cue that grounds the figure. Settles full-width
                    instantly under reduced motion. */}
                <motion.span
                  aria-hidden="true"
                  className="mt-2.5 block h-px origin-left rounded-full bg-gradient-to-r from-accent1/70 to-accent1/0"
                  initial={reduce ? false : { scaleX: 0 }}
                  animate={active || reduce ? { scaleX: 1 } : { scaleX: 0 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : Math.min(idx * 0.05, 0.3) }}
                />

                {hasSpark ? (
                  <div className="mt-2">
                    <Sparkline data={row.spark!} label={row.label} active={active} />
                  </div>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default StatTiles;
