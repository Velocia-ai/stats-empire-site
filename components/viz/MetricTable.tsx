// MetricTable, advanced sports-analytics metric table.
//
// Pure presentational (no hooks / no browser APIs) so it stays a Server
// Component and renders without shipping JS. Every metric row can carry:
//   - label/value/unit       → the stat itself, mono tabular numerals
//   - delta                  → context-aware up/down arrow (up = good)
//   - spark (number[])       → inline SVG sparkbar of recent history
//   - max                    → thin progress bar (value / max fill)
//
// Styled entirely against theme tokens (bg-surface, text, accent1, …) so it
// re-themes live with the A/B/C switch.

import clsx from 'clsx';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { MetricRow } from '@/lib/types';

interface MetricTableProps {
  rows: MetricRow[];
  title?: string;
}

/** Coerce a possibly-string MetricRow.value to a number for progress math. */
function numeric(value: string | number): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = parseFloat(value.replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Inline sparkbar, a compact histogram of a row's recent values. */
function SparkBar({ data, label }: { data: number[]; label: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  return (
    <div
      className="flex h-7 items-end gap-[2px]"
      role="img"
      aria-label={`${label} trend, ${data.length} recent values`}
    >
      {data.map((d, i) => {
        const h = ((d - min) / range) * 100;
        const isLast = i === data.length - 1;
        return (
          <span
            key={i}
            className={clsx(
              'w-[3px] rounded-[1px] transition-colors sm:w-1',
              isLast ? 'bg-accent1' : 'bg-muted/45',
            )}
            style={{ height: `${Math.max(h, 8)}%` }}
          />
        );
      })}
    </div>
  );
}

/** Context-aware delta chip, up arrow + accent when positive (good). */
function DeltaBadge({ delta }: { delta: number }) {
  const positive = delta > 0;
  const negative = delta < 0;
  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;
  const formatted = `${delta > 0 ? '+' : ''}${delta}`;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-0.5 font-mono text-xs font-semibold tabular-nums',
        positive && 'text-accent1',
        negative && 'text-accent2',
        !positive && !negative && 'text-muted',
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2.5} />
      {formatted}
      <span className="sr-only">
        {positive ? 'up' : negative ? 'down' : 'no change'}
      </span>
    </span>
  );
}

/** Thin progress bar shown when a row defines `max`. */
function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-surfaceAlt"
      role="progressbar"
      aria-label={`${label} progress`}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-accent1"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function MetricTable({ rows, title }: MetricTableProps) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-border bg-surface"
      aria-label={title ?? 'Advanced metrics'}
    >
      {title ? (
        <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-text">
            {title}
          </h3>
          <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
            {rows.length} metrics
          </span>
        </header>
      ) : null}

      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{title ?? 'Advanced metrics table'}</caption>
        <thead>
          <tr className="border-b border-border">
            <th
              scope="col"
              className="px-4 py-2 font-mono text-[0.6rem] font-medium uppercase tracking-widest text-muted sm:px-5"
            >
              Metric
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-right font-mono text-[0.6rem] font-medium uppercase tracking-widest text-muted"
            >
              Value
            </th>
            <th
              scope="col"
              className="hidden px-3 py-2 text-right font-mono text-[0.6rem] font-medium uppercase tracking-widest text-muted sm:table-cell"
            >
              Δ
            </th>
            <th
              scope="col"
              className="hidden px-3 py-2 font-mono text-[0.6rem] font-medium uppercase tracking-widest text-muted md:table-cell"
            >
              Trend
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const value = numeric(row.value);
            const showProgress = row.max != null && value != null && row.max > 0;
            return (
              <tr
                key={`${row.label}-${idx}`}
                className="group border-b border-border/60 last:border-b-0 transition-colors hover:bg-surfaceAlt/50"
              >
                {/* Label + optional progress bar */}
                <th
                  scope="row"
                  className="px-4 py-3 align-middle font-body text-sm font-medium text-text sm:px-5"
                >
                  <span className="block">{row.label}</span>
                  {showProgress ? (
                    <span className="mt-2 block max-w-[12rem]">
                      <ProgressBar value={value!} max={row.max!} label={row.label} />
                    </span>
                  ) : null}
                </th>

                {/* Value + unit */}
                <td className="whitespace-nowrap px-3 py-3 text-right align-middle">
                  <span className="font-mono text-base font-semibold tabular-nums text-text">
                    {row.value}
                  </span>
                  {row.unit ? (
                    <span className="ml-1 font-mono text-[0.7rem] text-muted">{row.unit}</span>
                  ) : null}
                  {/* Delta inline on small screens (hidden Δ column) */}
                  {row.delta != null ? (
                    <span className="mt-0.5 block sm:hidden">
                      <DeltaBadge delta={row.delta} />
                    </span>
                  ) : null}
                </td>

                {/* Delta column (>= sm) */}
                <td className="hidden whitespace-nowrap px-3 py-3 text-right align-middle sm:table-cell">
                  {row.delta != null ? <DeltaBadge delta={row.delta} /> : (
                    <span className="font-mono text-xs text-muted">-</span>
                  )}
                </td>

                {/* Sparkbar column (>= md) */}
                <td className="hidden px-3 py-3 align-middle md:table-cell">
                  {row.spark && row.spark.length > 0 ? (
                    <SparkBar data={row.spark} label={row.label} />
                  ) : (
                    <span className="font-mono text-xs text-muted">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export default MetricTable;
