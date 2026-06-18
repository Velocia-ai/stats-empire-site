// StatTiles, the loud headline numbers.
//
// A responsive grid of big-number tiles built from MetricRow[]. Each tile is
// the hero presentation of a stat: oversized mono numeral, label kicker, unit,
// and an optional context-aware delta chip (up = good).
//
// Pure presentational → stays a Server Component. Theme-token styled so it
// re-themes live with the A/B/C switch.

import clsx from 'clsx';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { MetricRow } from '@/lib/types';

interface StatTilesProps {
  rows: MetricRow[];
}

function DeltaChip({ delta }: { delta: number }) {
  const positive = delta > 0;
  const negative = delta < 0;
  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-mono text-xs font-semibold tabular-nums',
        positive && 'bg-accent1/15 text-accent1',
        negative && 'bg-accent2/15 text-accent2',
        !positive && !negative && 'bg-surfaceAlt text-muted',
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

export function StatTiles({ rows }: StatTilesProps) {
  return (
    <ul
      // Responsive auto-fit grid: tiles flow into as many columns as fit the
      // container (min ~9.5rem each) and wrap onto new rows instead of
      // overflowing a fixed-width track. No fixed col count, so it adapts to
      // any bento column width without clipping.
      className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr))]"
      aria-label="Headline statistics"
    >
      {rows.map((row, idx) => (
        <li
          key={`${row.label}-${idx}`}
          className={clsx(
            // min-w-0 lets the tile shrink below its content's intrinsic width
            // so long numbers can scale down rather than force overflow. Note:
            // NO overflow-hidden here, that was clipping the digits.
            'group relative flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-4 sm:p-5',
            'transition-colors hover:border-accent1/40',
          )}
        >
          {/* faint accent wash on hover (clipped to the rounded card) */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
          >
            <span className="absolute inset-0 bg-gradient-to-br from-accent1/0 to-accent1/0 transition-colors group-hover:from-accent1/[0.06]" />
          </span>

          <div className="relative flex h-full min-w-0 flex-col justify-between gap-3">
            <p className="min-w-0 truncate font-mono text-[0.65rem] font-medium uppercase tracking-[0.16em] text-muted">
              {row.label}
            </p>

            <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-2 gap-y-1">
              {/* Value + unit: min-w-0 + flex-wrap so a long value can wrap its
                  unit to a new line; clamp() font scales the numeral down on
                  narrow tiles. tabular-nums keeps digits aligned. */}
              <p className="flex min-w-0 flex-wrap items-baseline gap-x-1 font-display leading-none">
                <span
                  className="min-w-0 break-words font-bold tabular-nums text-text"
                  style={{ fontSize: 'clamp(1.5rem, 1rem + 2.4vw, 2.25rem)' }}
                >
                  {row.value}
                </span>
                {row.unit ? (
                  <span className="font-mono text-sm font-medium text-muted">{row.unit}</span>
                ) : null}
              </p>
              {row.delta != null ? <DeltaChip delta={row.delta} /> : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default StatTiles;
