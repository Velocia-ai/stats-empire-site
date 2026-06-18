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
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
      aria-label="Headline statistics"
    >
      {rows.map((row, idx) => (
        <li
          key={`${row.label}-${idx}`}
          className={clsx(
            'group relative overflow-hidden rounded-2xl border border-border bg-surface p-4 sm:p-5',
            'transition-colors hover:border-accent1/40',
          )}
        >
          {/* faint accent wash on hover */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent1/0 to-accent1/0 transition-colors group-hover:from-accent1/[0.06]"
          />

          <div className="relative flex h-full flex-col justify-between gap-3">
            <p className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.16em] text-muted">
              {row.label}
            </p>

            <div className="flex items-end justify-between gap-2">
              <p className="flex items-baseline gap-1 font-display leading-none">
                <span className="text-3xl font-bold tabular-nums text-text sm:text-4xl">
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
