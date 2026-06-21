'use client';

// =============================================================================
// RECHARTS INTEGRATION POINT
// -----------------------------------------------------------------------------
// This is the single, explicit Recharts integration for Stats Empire. All other
// viz primitives are hand-rolled SVG; trend/momentum charts go through Recharts
// (ResponsiveContainer + ComposedChart) here.
//
// GOAL: the chart must be SELF-EXPLANATORY. A reader who has never seen the data
// should be able to tell, at a glance, WHAT is measured, OVER WHAT (the match
// axis), in WHAT UNITS, WHICH line is which, and WHERE it ended up. So the shell
// renders an explicit title + one-line subtitle, the axes are labelled with
// units, every series has a swatch in a visible legend, gridlines anchor the
// values, and the latest value of each series is pinned with a label dot.
//
// Theming: Recharts renders raw SVG that does NOT pick up Tailwind utility
// classes for stroke/fill the way DOM elements do, so we resolve the theme's
// CSS custom properties (--color-accent1, --color-muted, …) from the document
// at runtime and feed those concrete color strings into the chart. A small
// effect re-reads them whenever the active [data-theme] changes, keeping the
// chart in lockstep with the A/B/C switch. Per-series `TrendSeries.color`
// overrides the theme accent when provided, and if that override is itself a
// `var(--color-*)` token, we resolve it to a concrete color too (raw SVG
// attributes can't consume `var()` reliably).
// =============================================================================

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Label,
  LabelList,
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
  surfaceAlt: string;
  text: string;
}

const FALLBACK: ThemeColors = {
  accent1: '#c6f432',
  accent2: '#22b8e6',
  muted: '#9aa7bd',
  border: '#2a3548',
  surface: '#121826',
  surfaceAlt: '#1a2233',
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
        surfaceAlt: readVar('--color-surface-alt', FALLBACK.surfaceAlt),
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

/**
 * Resolve a series' display color to a concrete value usable in raw SVG.
 * - explicit hex/rgb → used as-is
 * - `var(--color-token)` → resolved live against the active theme
 * - missing → cycles the two theme accents
 */
function seriesColor(series: TrendSeries, index: number, theme: ThemeColors): string {
  const fallback = index % 2 === 0 ? theme.accent1 : theme.accent2;
  const raw = series.color?.trim();
  if (!raw) return fallback;
  const varMatch = raw.match(/^var\(\s*(--[\w-]+)\s*\)$/);
  if (varMatch) return readVar(varMatch[1], fallback);
  return raw;
}

/**
 * Derive a compact unit for a series from EXPLICIT signals in its name only, 
 * never guessed from loose substrings (that mislabels e.g. "Win/UE diff" as a
 * percentage). Two reliable signals:
 *   - a literal "%" anywhere in the name  → "%"
 *   - a trailing parenthetical unit, e.g. "Exit Velo (mph)" → "mph"
 * Anything else is a bare count → "".
 */
function unitFor(name: string): string {
  if (name.includes('%')) return '%';
  const paren = name.match(/\(([^)]{1,6})\)\s*$/);
  if (paren) {
    const u = paren[1].trim();
    // Only accept things that look like units, not descriptive words.
    if (/^(mph|km\/h|°|deg|ft|m|m\/s|s|kg|lb)$/i.test(u)) return u === 'deg' ? '°' : u;
  }
  return '';
}

/**
 * The axis title should name the series WITHOUT re-printing a unit the name
 * already carries (avoids "1st-Serve % (%)" and "Exit Velo (mph) (mph)").
 */
function axisTitle(name: string, unit: string): string {
  if (!unit) return name;
  // Strip a trailing parenthetical unit and a trailing literal "%".
  const base = name
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s*%\s*$/, '')
    .trim();
  return `${base} (${unit})`;
}

/** Format a numeric value with up to one decimal, trimming trailing ".0". */
function fmt(v: number): string {
  if (!Number.isFinite(v)) return '-';
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** Format value + unit for axis/tooltip, with a thin space before "%". */
function fmtUnit(v: number, unit: string): string {
  const num = fmt(v);
  if (!unit) return num;
  return unit === '%' || unit === '°' ? `${num}${unit}` : `${num} ${unit}`;
}

interface TooltipPayloadEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

function ChartTooltip({
  active,
  payload,
  label,
  theme,
  units,
  xCaption,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
  theme: ThemeColors;
  units: Record<string, string>;
  xCaption: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-lg"
      style={{ borderColor: theme.border, backgroundColor: theme.surface }}
    >
      <p className="mb-1 font-mono text-[0.65rem] uppercase tracking-widest text-muted">
        {xCaption} {label}
      </p>
      <ul className="space-y-0.5">
        {payload.map((entry, i) => {
          const key = String(entry.name ?? entry.dataKey ?? '');
          const num = typeof entry.value === 'number' ? entry.value : Number(entry.value);
          return (
            <li
              key={i}
              className="flex items-center gap-2 font-mono text-xs tabular-nums text-text"
            >
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted">{key}</span>
              <span className="ml-auto font-semibold">
                {Number.isFinite(num) ? fmtUnit(num, units[key] ?? '') : String(entry.value)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Split the incoming `label` into a strong title and a softer subtitle.
 * Fixtures use forms like "Points & True Shooting %, last 6 games", we keep
 * the metric part as the title and surface the descriptor as the subtitle.
 */
function splitLabel(label: string): { title: string; subtitle: string } {
  const idx = label.indexOf(',');
  if (idx > 0 && idx < label.length - 1) {
    return { title: label.slice(0, idx).trim(), subtitle: label.slice(idx + 1).trim() };
  }
  return { title: label.trim(), subtitle: '' };
}

export function TrendChart({ label, xLabels, series }: TrendChartProps) {
  const theme = useThemeColors();
  const gradientPrefix = useId().replace(/[:]/g, '');

  // Draw-on gating. The line + area fill trace in via Recharts' native clip-rect
  // reveal the first time the chart scrolls into view, then the last-value pin
  // fades in once the draw completes. Reduced motion (and pre-hydration) skips
  // the animation entirely: everything renders fully drawn, pin already shown.
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: '0px 0px -12% 0px' });
  const shouldAnimate = !reduce && inView;
  const [drawComplete, setDrawComplete] = useState(false);
  useEffect(() => {
    if (reduce) {
      // Reduced motion: nothing animates, reveal the pin immediately.
      setDrawComplete(true);
      return;
    }
    if (!shouldAnimate) return;
    // Animating: hide the pin, then reveal it when the draw ends. A safety
    // timeout (slightly past the longest staggered draw) guarantees the pin
    // appears even if Recharts skips onAnimationEnd for any reason.
    setDrawComplete(false);
    const longest = 1100 + (series.length - 1) * 220 + 200;
    const t = window.setTimeout(() => setDrawComplete(true), longest);
    return () => window.clearTimeout(t);
  }, [reduce, shouldAnimate, series.length]);

  const { title, subtitle } = useMemo(() => splitLabel(label), [label]);

  // Per-series inferred units + resolved colors.
  const units = useMemo(() => {
    const u: Record<string, string> = {};
    series.forEach((s) => {
      u[s.name] = unitFor(s.name);
    });
    return u;
  }, [series]);

  const colors = useMemo(
    () => series.map((s, i) => seriesColor(s, i, theme)),
    [series, theme],
  );

  // Pivot TrendSeries[] (column-oriented) into Recharts row records keyed by x.
  const data = useMemo(
    () =>
      xLabels.map((x, i) => {
        const row: Record<string, number | string> = { x };
        series.forEach((s) => {
          row[s.name] = s.data[i];
        });
        return row;
      }),
    [xLabels, series],
  );

  // Decide whether the two series belong on SEPARATE Y axes. Unit names are too
  // unreliable to drive this (a count and a % can share "", and "Win/UE diff"
  // has no unit at all), so we compare their VALUE RANGES: if the series live on
  // very different scales (their ranges barely overlap, or their magnitudes
  // differ by a large factor) a single shared axis would flatten one of them, so
  // each gets its own native scale. Matching scales share the left axis.
  const useDualAxis = useMemo(() => {
    if (series.length !== 2) return false;
    const stats = series.map((s) => {
      const vals = s.data.filter((v) => Number.isFinite(v));
      if (vals.length === 0) return null;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      return { min, max, mid: (min + max) / 2 };
    });
    if (!stats[0] || !stats[1]) return false;
    const [a, b] = stats;
    // Ranges don't overlap at all → clearly different scales.
    const disjoint = a.max < b.min || b.max < a.min;
    // Magnitudes differ by a large factor (guards divide-by-~0).
    const mids = [Math.abs(a.mid), Math.abs(b.mid)].sort((x, y) => x - y);
    const ratio = mids[0] < 1e-6 ? Infinity : mids[1] / mids[0];
    return disjoint || ratio >= 2.5;
  }, [series]);

  const leftUnit = series[0] ? (units[series[0].name] ?? '') : '';
  const rightUnit = useDualAxis && series[1] ? (units[series[1].name] ?? '') : '';
  // When series share one axis but also share a unit, label the axis with it.
  const sharedUnit = useMemo(() => {
    if (useDualAxis) return leftUnit;
    const us = Array.from(new Set(series.map((s) => units[s.name] ?? '')));
    return us.length === 1 ? us[0] : leftUnit;
  }, [useDualAxis, leftUnit, series, units]);

  // Last (latest) value per series → drives the "where it ended" pin label.
  const lastValues = useMemo(
    () =>
      series.map((s) => {
        const v = s.data[s.data.length - 1];
        return Number.isFinite(v) ? v : undefined;
      }),
    [series],
  );

  const xCaption = 'Match';

  // Axis titles. Dual-axis → each axis names its own series; shared axis →
  // the common unit (or a neutral "Value" when units differ).
  const leftAxisTitle = useDualAxis
    ? axisTitle(series[0]?.name ?? 'Value', leftUnit)
    : sharedUnit
      ? `Value (${sharedUnit})`
      : 'Value';
  const rightAxisTitle = axisTitle(series[1]?.name ?? 'Value', rightUnit);

  const tick = { fill: theme.muted, fontSize: 11, fontFamily: 'var(--font-mono)' } as const;
  const axisLabelStyle = {
    fill: theme.muted,
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.08em',
  } as const;

  return (
    <section
      className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
      aria-label={label}
    >
      {/* Title + one-line subtitle: WHAT this chart measures. */}
      <header className="mb-3">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-text">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5 font-mono text-[0.7rem] text-muted">{subtitle}</p>
            )}
          </div>

          {/* Visible legend: WHICH line is which, with its latest value. */}
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {series.map((s, i) => (
              <li key={s.name} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: colors[i] }}
                />
                <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                  {s.name}
                </span>
                {lastValues[i] !== undefined && (
                  <span
                    className="font-mono text-[0.65rem] font-semibold tabular-nums text-text"
                    style={{ color: colors[i] }}
                  >
                    {fmtUnit(lastValues[i] as number, units[s.name] ?? '')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </header>

      {/* Accessible text fallback for screen readers */}
      <p className="sr-only">
        {title}
        {subtitle ? `. ${subtitle}` : ''}. {xCaption} axis: {xLabels.join(', ')}.{' '}
        {series
          .map((s) => {
            const last = s.data[s.data.length - 1];
            return `${s.name} latest ${fmtUnit(last, units[s.name] ?? '')}`;
          })
          .join('; ')}
        .
      </p>

      <div className="h-60 w-full sm:h-72" aria-hidden="true" ref={containerRef}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 16, right: useDualAxis ? 16 : 28, bottom: 24, left: 8 }}
          >
            <defs>
              {series.map((s, i) => (
                <linearGradient
                  key={s.name}
                  id={`${gradientPrefix}-${i}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  {/* Richer vertical fall-off than a single stop: a bright band
                      hugging the line, easing to fully transparent at the floor
                      so the area reads as depth, not a flat slab. */}
                  <stop offset="0%" stopColor={colors[i]} stopOpacity={0.32} />
                  <stop offset="45%" stopColor={colors[i]} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={colors[i]} stopOpacity={0} />
                </linearGradient>
              ))}
              {/* Soft glow so the stroke reads as a lit broadcast line, not a
                  flat vector. Kept subtle (small blur) to stay crisp. */}
              <filter
                id={`${gradientPrefix}-glow`}
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feGaussianBlur stdDeviation="2.4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid
              vertical={false}
              stroke={theme.border}
              strokeOpacity={0.5}
              strokeDasharray="2 5"
            />

            {/* X axis: the match labels, captioned so it reads as "Match …". */}
            <XAxis
              dataKey="x"
              tick={tick}
              tickLine={false}
              axisLine={{ stroke: theme.border }}
              dy={6}
              interval="preserveStartEnd"
              minTickGap={8}
            >
              <Label
                value={`${xCaption} (most recent →)`}
                position="bottom"
                offset={8}
                style={axisLabelStyle}
              />
            </XAxis>

            {/* Left Y axis: labelled with the (primary) unit. */}
            <YAxis
              yAxisId="left"
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v: number) => fmt(v)}
              tickCount={5}
              domain={['auto', 'auto']}
            >
              <Label
                value={leftAxisTitle}
                angle={-90}
                position="insideLeft"
                style={{ ...axisLabelStyle, textAnchor: 'middle' }}
              />
            </YAxis>

            {/* Right Y axis only when the two series live on different scales. */}
            {useDualAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={tick}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(v: number) => fmt(v)}
                tickCount={5}
                domain={['auto', 'auto']}
              >
                <Label
                  value={rightAxisTitle}
                  angle={90}
                  position="insideRight"
                  style={{ ...axisLabelStyle, textAnchor: 'middle' }}
                />
              </YAxis>
            )}

            <Tooltip
              cursor={{ stroke: theme.muted, strokeOpacity: 0.45, strokeDasharray: '3 3' }}
              content={
                <ChartTooltip theme={theme} units={units} xCaption={xCaption} />
              }
            />

            {series.map((s, i) => {
              const c = colors[i];
              const axisId = useDualAxis && i === 1 ? 'right' : 'left';
              const isLast = i === series.length - 1;
              // Stagger the draw so a two-series chart traces in sequence, and
              // mark the draw complete on the LAST series' onAnimationEnd (it
              // begins latest, so it finishes the overall reveal).
              const begin = shouldAnimate ? i * 220 : 0;
              return (
                <Area
                  key={s.name}
                  yAxisId={axisId}
                  type="monotone"
                  dataKey={s.name}
                  name={s.name}
                  stroke={c}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  fill={`url(#${gradientPrefix}-${i})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface, fill: c }}
                  style={{ filter: `url(#${gradientPrefix}-glow)` }}
                  isAnimationActive={shouldAnimate}
                  animationBegin={begin}
                  animationDuration={1100}
                  animationEasing="ease-out"
                  onAnimationEnd={isLast ? () => setDrawComplete(true) : undefined}
                >
                  {/* Pin the latest value on the final point of each series so
                      the reader sees "where it ended up" without hovering. The
                      pin fades in only after the line has finished drawing, so
                      it doesn't float ahead of an unfinished stroke. */}
                  <LabelList
                    dataKey={s.name}
                    content={(props) => (
                      <LastValueLabel
                        {...props}
                        unit={units[s.name] ?? ''}
                        color={c}
                        surface={theme.surface}
                        lastIndex={xLabels.length - 1}
                        nudgeUp={isLast}
                        revealed={drawComplete}
                      />
                    )}
                  />
                </Area>
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

/**
 * Renders a small pill with the latest value, but ONLY on the final data point
 * of the series (Recharts calls the content renderer once per point; we no-op
 * everything except `index === lastIndex`). This is the "highlighted last-value
 * label" the chart needs to be self-explanatory.
 */
function LastValueLabel(props: {
  x?: number | string;
  y?: number | string;
  value?: number | string;
  index?: number;
  unit: string;
  color: string;
  surface: string;
  lastIndex: number;
  nudgeUp: boolean;
  revealed: boolean;
}) {
  const { x, y, value, index, unit, color, surface, lastIndex, nudgeUp, revealed } = props;
  if (index !== lastIndex) return null;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return null;

  const cx = typeof x === 'number' ? x : Number(x);
  const cy = typeof y === 'number' ? y : Number(y);
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

  const text = fmtUnit(num, unit);
  const padX = 6;
  const charW = 6.6;
  const w = text.length * charW + padX * 2;
  const h = 17;
  // Offset the pill above/below the point to reduce overlap when two series
  // end near each other.
  const dy = nudgeUp ? -(h + 8) : 8;
  const rectX = cx - w - 8 < 0 ? cx + 8 : cx - w - 8;
  const rectY = cy + dy;

  // The pin appears only once the line has finished drawing. Opacity is driven
  // by a CSS transition rather than framer-motion because this node lives inside
  // Recharts' own SVG tree; `revealed` flips to true on the draw's onAnimationEnd
  // (or immediately under reduced motion), giving a clean fade-in either way.
  return (
    <g
      aria-hidden="true"
      style={{
        opacity: revealed ? 1 : 0,
        transition: 'opacity 360ms ease-out',
      }}
    >
      {/* Outer halo ring so the terminal node reads as the chart's focal point. */}
      <circle cx={cx} cy={cy} r={6} fill={color} opacity={0.16} />
      <circle cx={cx} cy={cy} r={3.5} fill={color} stroke={surface} strokeWidth={1.5} />
      <rect
        x={rectX}
        y={rectY}
        width={w}
        height={h}
        rx={5}
        fill={surface}
        stroke={color}
        strokeWidth={1}
        opacity={0.97}
      />
      <text
        x={rectX + w / 2}
        y={rectY + h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={10.5}
        fontFamily="var(--font-mono)"
        fontWeight={700}
      >
        {text}
      </text>
    </g>
  );
}

export default TrendChart;
