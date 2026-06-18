'use client';

// =============================================================================
// RECHARTS INTEGRATION POINT
// -----------------------------------------------------------------------------
// This is the single, explicit Recharts integration for Stats Empire. All other
// viz primitives are hand-rolled SVG; trend/momentum charts go through Recharts
// (ResponsiveContainer + AreaChart) here.
//
// Theming: Recharts renders raw SVG that does NOT pick up Tailwind utility
// classes for stroke/fill the way DOM elements do, so we resolve the theme's
// CSS custom properties (--color-accent1, --color-muted, …) from the document
// at runtime and feed those concrete color strings into the chart. A small
// effect re-reads them whenever the active [data-theme] changes, keeping the
// chart in lockstep with the A/B/C switch. Per-series `TrendSeries.color`
// overrides the theme accent when provided.
// =============================================================================

import { useEffect, useId, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TrendSeries } from '@/lib/types';

interface TrendChartProps {
  label: string;
  xLabels: string[];
  series: TrendSeries[];
}

interface ThemeColors {
  accent1: string;
  accent2: string;
  muted: string;
  border: string;
  surface: string;
  text: string;
}

const FALLBACK: ThemeColors = {
  accent1: '#c6f432',
  accent2: '#22b8e6',
  muted: '#9aa7bd',
  border: '#2a3548',
  surface: '#121826',
  text: '#f4f7fb',
};

/** Read the live computed value of a CSS custom property off <html>. */
function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(FALLBACK);

  useEffect(() => {
    const resolve = () =>
      setColors({
        accent1: readVar('--color-accent1', FALLBACK.accent1),
        accent2: readVar('--color-accent2', FALLBACK.accent2),
        muted: readVar('--color-muted', FALLBACK.muted),
        border: readVar('--color-border', FALLBACK.border),
        surface: readVar('--color-surface', FALLBACK.surface),
        text: readVar('--color-text', FALLBACK.text),
      });

    resolve();

    // Re-resolve whenever the active theme (data-theme on <html>) changes.
    const observer = new MutationObserver(resolve);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
}

/** Cycle through the two theme accents for series without an explicit color. */
function seriesColor(series: TrendSeries, index: number, theme: ThemeColors): string {
  if (series.color) return series.color;
  return index % 2 === 0 ? theme.accent1 : theme.accent2;
}

interface TooltipPayloadEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  theme,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
  theme: ThemeColors;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-lg border border-border bg-surface px-3 py-2 shadow-lg"
      style={{ borderColor: theme.border, backgroundColor: theme.surface }}
    >
      <p className="mb-1 font-mono text-[0.65rem] uppercase tracking-widest text-muted">
        {label}
      </p>
      <ul className="space-y-0.5">
        {payload.map((entry, i) => (
          <li key={i} className="flex items-center gap-2 font-mono text-xs tabular-nums text-text">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted">{entry.name}</span>
            <span className="ml-auto font-semibold">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrendChart({ label, xLabels, series }: TrendChartProps) {
  const theme = useThemeColors();
  const gradientPrefix = useId().replace(/[:]/g, '');

  // Pivot TrendSeries[] (column-oriented) into Recharts row records keyed by x.
  const data = xLabels.map((x, i) => {
    const row: Record<string, number | string> = { x };
    series.forEach((s) => {
      row[s.name] = s.data[i];
    });
    return row;
  });

  return (
    <section
      className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
      aria-label={label}
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-text">
          {label}
        </h3>
        <ul className="flex flex-wrap items-center gap-3">
          {series.map((s, i) => (
            <li key={s.name} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: seriesColor(s, i, theme) }}
              />
              <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                {s.name}
              </span>
            </li>
          ))}
        </ul>
      </header>

      {/* Accessible text fallback for screen readers */}
      <p className="sr-only">
        {label}: trend chart across {xLabels.join(', ')} for series{' '}
        {series.map((s) => s.name).join(', ')}.
      </p>

      <div className="h-56 w-full sm:h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <defs>
              {series.map((s, i) => {
                const c = seriesColor(s, i, theme);
                return (
                  <linearGradient
                    key={s.name}
                    id={`${gradientPrefix}-${i}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={c} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={c} stopOpacity={0} />
                  </linearGradient>
                );
              })}
            </defs>

            <CartesianGrid
              vertical={false}
              stroke={theme.border}
              strokeOpacity={0.5}
              strokeDasharray="2 4"
            />
            <XAxis
              dataKey="x"
              tick={{ fill: theme.muted, fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={{ stroke: theme.border }}
              dy={4}
            />
            <YAxis
              tick={{ fill: theme.muted, fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              cursor={{ stroke: theme.muted, strokeOpacity: 0.4, strokeDasharray: '3 3' }}
              content={<ChartTooltip theme={theme} />}
            />

            {series.map((s, i) => {
              const c = seriesColor(s, i, theme);
              return (
                <Area
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  stroke={c}
                  strokeWidth={2}
                  fill={`url(#${gradientPrefix}-${i})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: c }}
                  isAnimationActive={false}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default TrendChart;
