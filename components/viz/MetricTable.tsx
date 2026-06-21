'use client';

// MetricTable, advanced sports-analytics metric table.
//
// Promoted to a Client Component so its numbers can COUNT UP and its bars can
// DRAW ON the first time the table scrolls into view. The public prop API
// (`rows: MetricRow[]`, `title?`) is unchanged, so every call site keeps
// working. Each metric row can carry:
//   - label/value/unit       → the stat itself, mono tabular numerals
//   - delta                  → context-aware up/down chip (up = good)
//   - spark (number[])       → inline SVG sparkbar of recent history
//   - max                    → thin progress bar (value / max fill)
//
// Styled entirely against theme tokens (bg-surface, text, accent1, …) so it
// re-themes live with the A/B/C switch, and reduced-motion safe: count-ups
// settle to their final value instantly, and every bar renders at its final
// width/height with no transition.

import { useRef } from 'react';
import clsx from 'clsx';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import type { MetricRow } from '@/lib/types';
import { formatCount, parseNumericValue, useCountUp } from '@/lib/useCountUp';

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

/** Animated value cell. Counts up once in view; settles instantly if reduced. */
function MetricValue({ value, active }: { value: MetricRow['value']; active: boolean }) {
  const parsed = parseNumericValue(value);
  const n = useCountUp(parsed.target, active);
  const text = parsed.numeric
    ? `${parsed.prefix}${formatCount(n, parsed.decimals as number)}${parsed.suffix}`
    : String(value);

  return (
    <span
      className="break-words font-mono font-semibold tabular-nums text-text"
      style={{ fontSize: 'clamp(0.85rem, 0.6rem + 0.9vw, 1rem)' }}
    >
      {text}
    </span>
  );
}

/**
 * Inline sparkbar, a compact histogram of a row's recent values. Bars grow up
 * from the baseline on enter, staggered left-to-right; the latest bar reads in
 * accent so the eye lands on "now". Settles to full height under reduced motion.
 */
function SparkBar({ data, label, active }: { data: number[]; label: string; active: boolean }) {
  const reduce = useReducedMotion();
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
        const h = Math.max(((d - min) / range) * 100, 8);
        const isLast = i === data.length - 1;
        return (
          <motion.span
            key={i}
            className={clsx(
              'w-[3px] origin-bottom rounded-[1px] sm:w-1',
              isLast ? 'bg-accent1' : 'bg-muted/45',
            )}
            style={{ height: `${h}%` }}
            initial={reduce ? false : { scaleY: 0, opacity: 0 }}
            animate={active || reduce ? { scaleY: 1, opacity: 1 } : { scaleY: 0, opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
              delay: reduce ? 0 : 0.1 + i * 0.04,
            }}
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

/** Thin progress bar shown when a row defines `max`. Draws to width on enter. */
function ProgressBar({
  value,
  max,
  label,
  active,
}: {
  value: number;
  max: number;
  label: string;
  active: boolean;
}) {
  const reduce = useReducedMotion();
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
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-accent1/80 to-accent1"
        initial={reduce ? false : { width: 0 }}
        animate={active || reduce ? { width: `${pct}%` } : { width: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : 0.15 }}
      />
    </div>
  );
}

export function MetricTable({ rows, title }: MetricTableProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const active = reduce ? true : inView;

  return (
    <section
      ref={ref}
      className="overflow-hidden rounded-2xl border border-border bg-surface"
      aria-label={title ?? 'Advanced metrics'}
    >
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <h3 className="min-w-0 truncate font-display text-sm font-semibold uppercase tracking-[0.14em] text-text">
            {title}
          </h3>
          <span className="shrink-0 font-mono text-[0.65rem] uppercase tracking-widest text-muted">
            {rows.length} metrics
          </span>
        </header>
      ) : null}

      {/* fixed table layout + full width keeps columns from being pushed wider
          than the container by long values; per-column widths below allocate a
          generous, capped share to the Value column so numbers never clip. */}
      <table className="w-full table-fixed border-collapse text-left">
        <colgroup>
          <col />
          <col className="w-[34%] sm:w-[26%]" />
          <col className="hidden w-[16%] sm:table-column" />
          <col className="hidden w-[22%] md:table-column" />
        </colgroup>
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
                className="group border-b border-border/60 transition-colors last:border-b-0 hover:bg-surfaceAlt/50"
              >
                {/* Label + optional progress bar */}
                <th
                  scope="row"
                  className="min-w-0 px-4 py-3 align-middle font-body text-sm font-medium text-text sm:px-5"
                >
                  <span className="block break-words">{row.label}</span>
                  {showProgress ? (
                    <span className="mt-2 block max-w-[12rem]">
                      <ProgressBar value={value!} max={row.max!} label={row.label} active={active} />
                    </span>
                  ) : null}
                </th>

                {/* Value + unit. No whitespace-nowrap (that forced overflow);
                    the value group wraps its unit when the column is tight and
                    the numeral scales via clamp(). tabular-nums aligns digits. */}
                <td className="px-3 py-3 text-right align-middle">
                  <span className="inline-flex max-w-full flex-wrap items-baseline justify-end gap-x-1">
                    <span className="sr-only">{row.value}{row.unit ? ` ${row.unit}` : ''}</span>
                    <span aria-hidden="true" className="contents">
                      <MetricValue value={row.value} active={active} />
                      {row.unit ? (
                        <span className="font-mono text-[0.7rem] text-muted">{row.unit}</span>
                      ) : null}
                    </span>
                  </span>
                  {/* Delta inline on small screens (hidden Δ column) */}
                  {row.delta != null ? (
                    <span className="mt-0.5 block sm:hidden">
                      <DeltaBadge delta={row.delta} />
                    </span>
                  ) : null}
                </td>

                {/* Delta column (>= sm) */}
                <td className="hidden px-3 py-3 text-right align-middle sm:table-cell">
                  {row.delta != null ? (
                    <DeltaBadge delta={row.delta} />
                  ) : (
                    <span className="font-mono text-xs text-muted">-</span>
                  )}
                </td>

                {/* Sparkbar column (>= md) */}
                <td className="hidden overflow-hidden px-3 py-3 align-middle md:table-cell">
                  {row.spark && row.spark.length > 0 ? (
                    <SparkBar data={row.spark} label={row.label} active={active} />
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
