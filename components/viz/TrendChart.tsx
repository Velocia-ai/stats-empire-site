'use client';

// =============================================================================
// RECHARTS INTEGRATION POINT
// -----------------------------------------------------------------------------
// This is the single, explicit Recharts integration for Stats Empire. All other
// viz primitives are hand-rolled SVG; trend/momentum charts go through Recharts
// (ResponsiveContainer + ComposedChart) here.
//
// GOAL: the chart must tell a STORY at a glance. A coach who has never seen the
// data should be able to read, without hovering, WHAT is measured, OVER WHAT
// (the match axis), in WHAT UNITS, WHICH line is which, WHICH WAY each series is
// trending, WHERE it ended up, and WHICH match was the standout.
//
// LAYOUT CONTRACT (the part that previously broke at larger font sizes): the
// end-of-series value labels are NOT drawn per-series by Recharts' LabelList
// (which only ever sees one series at a time and so cannot keep two pills from
// colliding). Instead a single `Customized` layer (EndLabelLayer) receives the
// computed pixel coordinates of EVERY series' final point at once, parks the
// pills in a reserved right-hand gutter, and DE-COLLIDES them vertically with a
// guaranteed minimum gap, drawing a thin leader from each pill back to its data
// point. That makes the labels collision-free regardless of font size, and
// keeps them clear of the axes and of each other. The "PEAK" flag is folded
// into its pill (or drawn as a clean interior pennant when the best match is not
// the latest), so nothing floats into the top margin.
//
// COLOR / FILL: two visually distinct series, lime (accent1) + the warm theme
// accent (accent2). Light, single-direction gradient fills at low opacity and a
// crisp stroke, deliberately NOT a heavy multi-stop glow-merged blob (that was
// what read as a muddy orange/green band where the two fills overlapped).
//
// Theming: Recharts renders raw SVG that does NOT pick up Tailwind utility
// classes for stroke/fill, so we resolve the theme's CSS custom properties
// (--color-accent1, --color-muted, …) at runtime and feed concrete colors into
// the chart. A MutationObserver re-reads them whenever [data-theme] changes.
// Per-series `TrendSeries.color` overrides the theme accent; a `var(--color-*)`
// override is resolved to a concrete color too (raw SVG can't consume `var()`).
// =============================================================================

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Customized,
  Label,
  ReferenceDot,
  ReferenceLine,
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
  /**
   * Caption for the X axis / tooltip, e.g. "Match" (default), "Game", "Week".
   * Additive: existing callers omit it and get the neutral "Match".
   */
  xCaption?: string;
  /**
   * Which series' peak is flagged with the "Peak" annotation. Defaults to the
   * first (primary) series. Pass `null` to suppress the peak callout entirely.
   * Additive: existing callers get the primary-series peak.
   */
  peakSeriesIndex?: number | null;
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

/** A series' display name with any trailing unit parenthetical stripped, for prose. */
function plainName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

/** Format a numeric value with up to one decimal, trimming trailing ".0". */
function fmt(v: number): string {
  if (!Number.isFinite(v)) return '-';
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/**
 * Format a value at a precision appropriate to its magnitude, so sub-1 metrics
 * (wOBA 0.394, xG 0.71) keep their meaningful decimals while large counts
 * (yards) stay clean. `ref` is the series' typical magnitude.
 */
function fmtScaled(v: number, ref: number): string {
  if (!Number.isFinite(v)) return '-';
  const mag = Math.abs(ref);
  const decimals = mag < 1 ? 3 : mag < 10 ? 2 : mag < 100 ? 1 : 0;
  if (decimals === 0) return String(Math.round(v));
  // Trim trailing zeros AFTER the decimal point only (never integer-part zeros),
  // so "0.390" → "0.39" but "90" stays "90".
  return v.toFixed(decimals).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

/**
 * Format value + unit for a headline (legend / pin / peak / tooltip), with a
 * thin space before non-symbol units. When `ref` (the series' magnitude) is
 * given, precision adapts to it so sub-1 metrics keep their decimals
 * (wOBA 0.394, xG 0.71) instead of collapsing to "0.4"; without it, falls back
 * to the coarse single-decimal format used by axis ticks.
 */
function fmtUnit(v: number, unit: string, ref?: number): string {
  const num = ref === undefined ? fmt(v) : fmtScaled(v, ref);
  if (!unit) return num;
  return unit === '%' || unit === '°' ? `${num}${unit}` : `${num} ${unit}`;
}

/** Format a SIGNED change for the legend trend chip (e.g. "+6", "-2.3"). */
function fmtDelta(v: number, ref: number): string {
  const s = fmtScaled(Math.abs(v), ref);
  return v >= 0 ? `+${s}` : `-${s}`;
}

interface SeriesStat {
  first: number;
  last: number;
  peakValue: number;
  peakIndex: number;
  delta: number; // last - first
  dir: 'up' | 'down' | 'flat';
  ref: number; // typical magnitude, for precision decisions
}

/** First / last / peak / net-change summary for a single series' data. */
function computeSeriesStat(data: number[]): SeriesStat | null {
  const finite = data
    .map((v, i) => ({ v, i }))
    .filter((d) => Number.isFinite(d.v));
  if (finite.length === 0) return null;
  const first = finite[0].v;
  const last = finite[finite.length - 1].v;
  let peak = finite[0];
  for (const d of finite) if (d.v > peak.v) peak = d;
  const delta = last - first;
  const span = Math.max(...finite.map((d) => Math.abs(d.v)));
  // Treat tiny moves relative to the series' own magnitude as flat.
  const eps = Math.max(span * 0.005, 1e-9);
  const dir: SeriesStat['dir'] = delta > eps ? 'up' : delta < -eps ? 'down' : 'flat';
  return { first, last, peakValue: peak.v, peakIndex: peak.i, delta, dir, ref: span };
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
                {Number.isFinite(num)
                  ? fmtUnit(num, units[key] ?? '', num)
                  : String(entry.value)}
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

/**
 * Build a plain-English "what this shows" subtitle when the label doesn't carry
 * one. Names the series and the match span so the chart never relies on the
 * reader to infer what they are looking at, e.g.
 *   "wOBA vs Exit Velo across the last 6 games."
 */
function pluralize(noun: string, n: number): string {
  if (n === 1) return noun;
  // "match" → "matches", "box" → "boxes"; otherwise add a plain "s".
  return /(ch|sh|s|x|z)$/i.test(noun) ? `${noun}es` : `${noun}s`;
}

function synthSubtitle(series: TrendSeries[], xLabels: string[], xCaption: string): string {
  const names = series.map((s) => plainName(s.name));
  const span = xLabels.length;
  const noun = xCaption.toLowerCase();
  const plural = pluralize(noun, span);
  const joined =
    names.length <= 1
      ? names[0] ?? 'Form'
      : names.length === 2
        ? `${names[0]} vs ${names[1]}`
        : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
  return `${joined} across the last ${span} ${plural}.`;
}

const DIR_GLYPH: Record<SeriesStat['dir'], string> = { up: '▲', down: '▼', flat: '▬' };
const DIR_WORD: Record<SeriesStat['dir'], string> = {
  up: 'trending up',
  down: 'trending down',
  flat: 'holding steady',
};

// Plot geometry constants. The right margin reserves room for the de-collided
// end-of-series value pills so they sit just inside the SVG's right edge, clear
// of the axes and of each other. Kept MODEST (not a wide fixed gutter) so the
// chart still has a real plot area inside narrow grid columns; the pill layer
// adapts its own size to the measured plot width at render time.
const RIGHT_MARGIN = 48; // px reserved on the right for the value-pill stack
const PILL_H = 26; // px height of one value pill
const PILL_GAP = 10; // minimum px gap between stacked pills
const PEAK_TAG_W = 40; // px width of the inline "PEAK" tag appended to a pill

export function TrendChart({
  label,
  xLabels,
  series,
  xCaption: xCaptionProp,
  peakSeriesIndex,
}: TrendChartProps) {
  const theme = useThemeColors();
  const gradientPrefix = useId().replace(/[:]/g, '');

  // Draw-on gating. The line + area fill trace in via Recharts' native clip-rect
  // reveal the first time the chart scrolls into view, then the end-of-series
  // pins and the peak callout fade in once the draw completes. Reduced motion
  // (and pre-hydration) skips the animation entirely: everything renders drawn.
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  // Track visibility for the lifetime of the chart (not `once`), so we can both
  // play the one-time draw-on AND guarantee the annotations reveal whenever the
  // chart is on-screen, even on re-mounts or HMR where a `once` latch is stale.
  const inView = useInView(containerRef, { margin: '0px 0px -12% 0px' });
  // `hasAnimated` latches AFTER the draw-on plays once, so the animation runs on
  // first view but never replays.
  const [hasAnimated, setHasAnimated] = useState(false);
  const shouldAnimate = !reduce && inView && !hasAnimated;
  // `drawComplete` reveals the pins + peak callout. It must become true on every
  // path that ends with the line fully drawn: reduced motion immediately; after
  // the draw-on finishes; or when visible-but-not-animating (already drawn).
  const [drawComplete, setDrawComplete] = useState(false);
  const markDrawn = () => {
    setHasAnimated(true);
    setDrawComplete(true);
  };

  // Fail-safe: never let the headline annotations stay permanently hidden. If
  // the IntersectionObserver behind `useInView` never reports (broken polyfill,
  // zero-height ancestor, headless capture), reveal them after a grace period.
  useEffect(() => {
    if (reduce || drawComplete) return;
    const t = window.setTimeout(() => setDrawComplete(true), 2600);
    return () => window.clearTimeout(t);
  }, [reduce, drawComplete]);

  useEffect(() => {
    if (reduce) {
      setDrawComplete(true);
      return;
    }
    if (!inView) return; // off-screen: keep annotations hidden until shown
    if (shouldAnimate) {
      // First reveal: hold the annotations until the staggered draw finishes.
      setDrawComplete(false);
      const longest = 1100 + (series.length - 1) * 220 + 200;
      const t = window.setTimeout(markDrawn, longest);
      return () => window.clearTimeout(t);
    }
    // Visible but not animating (already drawn this session, or re-mounted in
    // view): reveal promptly on the next frame.
    const t = window.setTimeout(markDrawn, 60);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, inView, shouldAnimate, series.length]);

  const xCaption = xCaptionProp?.trim() || 'Match';

  const split = useMemo(() => splitLabel(label), [label]);
  const title = split.title;
  // Prefer the label's own descriptor; otherwise synthesize a "what this shows"
  // line so the chart is self-explanatory even for comma-less labels.
  const subtitle = useMemo(
    () => split.subtitle || synthSubtitle(series, xLabels, xCaption),
    [split.subtitle, series, xLabels, xCaption],
  );

  // Per-series inferred units + resolved colors + first/last/peak stats.
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

  const stats = useMemo(() => series.map((s) => computeSeriesStat(s.data)), [series]);

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
  // very different scales a single shared axis would flatten one of them, so
  // each gets its own native scale. Matching scales share the left axis.
  const useDualAxis = useMemo(() => {
    if (series.length !== 2) return false;
    const ranges = series.map((s) => {
      const vals = s.data.filter((v) => Number.isFinite(v));
      if (vals.length === 0) return null;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      return { min, max, mid: (min + max) / 2 };
    });
    if (!ranges[0] || !ranges[1]) return false;
    const [a, b] = ranges;
    const disjoint = a.max < b.min || b.max < a.min;
    const mids = [Math.abs(a.mid), Math.abs(b.mid)].sort((x, y) => x - y);
    const ratio = mids[0] < 1e-6 ? Infinity : mids[1] / mids[0];
    return disjoint || ratio >= 2.5;
  }, [series]);

  const leftUnit = series[0] ? (units[series[0].name] ?? '') : '';
  // When series share one axis but also share a unit, label the axis with it.
  const sharedUnit = useMemo(() => {
    if (useDualAxis) return leftUnit;
    const us = Array.from(new Set(series.map((s) => units[s.name] ?? '')));
    return us.length === 1 ? us[0] : leftUnit;
  }, [useDualAxis, leftUnit, series, units]);

  // Which series gets the "Peak" annotation, and where its peak sits.
  const peakIdx =
    peakSeriesIndex === null
      ? -1
      : peakSeriesIndex !== undefined && series[peakSeriesIndex]
        ? peakSeriesIndex
        : 0;
  const peak = useMemo(() => {
    if (peakIdx < 0 || !series[peakIdx]) return null;
    const stat = stats[peakIdx];
    if (!stat) return null;
    // Only worth flagging when the peak is a genuine high point, not a flat line
    // where every point ties.
    const s = series[peakIdx];
    const finite = s.data.filter((v) => Number.isFinite(v));
    const distinct = new Set(finite.map((v) => Math.round(v * 1e6))).size > 1;
    if (!distinct) return null;
    const isLastPoint = stat.peakIndex === xLabels.length - 1;
    return {
      x: xLabels[stat.peakIndex],
      value: stat.peakValue,
      index: stat.peakIndex,
      color: colors[peakIdx],
      unit: units[s.name] ?? '',
      axisId: useDualAxis && peakIdx === 1 ? 'right' : 'left',
      name: plainName(s.name),
      isLastPoint,
      ref: stat.ref,
    };
  }, [peakIdx, series, stats, xLabels, colors, units, useDualAxis]);

  const xCaptionWord = xCaption.toLowerCase();

  // Left axis title. Dual-axis → it names the primary series (the right series'
  // hidden scale is read from its legend value + end pill, not an axis title);
  // shared axis → the common unit (or a neutral "Value" when units differ).
  const leftAxisTitle = useDualAxis
    ? axisTitle(series[0]?.name ?? 'Value', leftUnit)
    : sharedUnit
      ? `Value (${sharedUnit})`
      : 'Value';

  // In-SVG (Recharts) fonts are fixed px, not viewBox-relative, so they do NOT
  // scale up with the container; size them generously so the axis ticks +
  // titles stay readable on desktop at the larger type scale.
  const tick = { fill: theme.muted, fontSize: 15, fontFamily: 'var(--font-mono)' } as const;
  const axisLabelStyle = {
    fill: theme.muted,
    fontSize: 14,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.08em',
  } as const;

  // Pre-build the per-series end-label payloads the gutter layer needs: latest
  // value text, color, unit, and whether this series' latest == its window peak
  // (so the gutter pill can carry the inline "PEAK" tag).
  const endLabels = useMemo(
    () =>
      series.map((s, i) => {
        const stat = stats[i];
        const dataKey = s.name;
        if (!stat) {
          return { seriesIndex: i, dataKey, text: '', color: colors[i], isLatestPeak: false };
        }
        const latestIsPeak =
          peak !== null && peakIdx === i && peak.isLastPoint;
        return {
          seriesIndex: i,
          dataKey,
          text: fmtUnit(stat.last, units[s.name] ?? '', stat.ref),
          color: colors[i],
          isLatestPeak: latestIsPeak,
        };
      }),
    [series, stats, colors, units, peak, peakIdx],
  );

  return (
    <section
      className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
      aria-label={label}
    >
      {/* Title + one-line subtitle: WHAT this chart measures. */}
      <header className="mb-3">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-text sm:text-base lg:text-lg">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5 font-mono text-[0.7rem] text-muted sm:text-xs lg:text-sm">{subtitle}</p>
            )}
          </div>

          {/* Visible legend: WHICH line is which, WHERE it ended, and WHICH WAY
              it is trending (glyph + net change) so the legend states the story. */}
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {series.map((s, i) => {
              const stat = stats[i];
              const unit = units[s.name] ?? '';
              return (
                <li key={s.name} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    {/* Swatch + value colours come from the live theme resolved
                        on the client; the SSR fallback colour differs by design,
                        so suppress the expected hydration mismatch on these. */}
                    <span
                      aria-hidden="true"
                      suppressHydrationWarning
                      className="inline-block h-0.5 w-4 rounded-full"
                      style={{ backgroundColor: colors[i] }}
                    />
                    <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted sm:text-xs lg:text-sm">
                      {s.name}
                    </span>
                    {stat && (
                      <span
                        suppressHydrationWarning
                        className="font-mono text-[0.72rem] font-semibold tabular-nums sm:text-[0.8rem] lg:text-[0.9375rem]"
                        style={{ color: colors[i] }}
                      >
                        {fmtUnit(stat.last, unit, stat.ref)}
                      </span>
                    )}
                  </div>
                  {stat && (
                    <span
                      suppressHydrationWarning
                      className="ml-[1.375rem] flex items-center gap-1 font-mono text-[0.6rem] tabular-nums sm:text-[0.7rem] lg:text-[0.8125rem]"
                      style={{
                        color: stat.dir === 'up' ? colors[i] : theme.muted,
                      }}
                    >
                      <span aria-hidden="true">{DIR_GLYPH[stat.dir]}</span>
                      <span>
                        {stat.dir === 'flat'
                          ? 'flat'
                          : `${fmtDelta(stat.delta, stat.ref)}${unit === '%' ? '%' : ''} vs ${xLabels[0]}`}
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </header>

      {/* Accessible text fallback for screen readers: full story in prose. */}
      <p className="sr-only">
        {title}
        {subtitle ? `. ${subtitle}` : ''}. {xCaption} axis: {xLabels.join(', ')}.{' '}
        {series
          .map((s, i) => {
            const stat = stats[i];
            const unit = units[s.name] ?? '';
            if (!stat) return `${s.name}: no data`;
            return `${s.name} ${DIR_WORD[stat.dir]}, latest ${fmtUnit(stat.last, unit, stat.ref)} (${fmtDelta(
              stat.delta,
              stat.ref,
            )} since ${xLabels[0]})`;
          })
          .join('; ')}
        {peak
          ? `. Peak ${peak.name} of ${fmtUnit(peak.value, peak.unit, peak.ref)} in ${xCaptionWord} ${peak.x}.`
          : '.'}
      </p>

      <div className="h-64 w-full sm:h-80" aria-hidden="true" ref={containerRef}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 18, right: RIGHT_MARGIN, bottom: 26, left: 8 }}
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
                  {/* Light, single fall-off fill: a thin tint hugging the line
                      easing to transparent. Deliberately low-opacity so two
                      overlapping series read as two clean tinted bands, not the
                      muddy multi-colour slab the heavy glow-merge produced. */}
                  <stop offset="0%" stopColor={colors[i]} stopOpacity={0.2} />
                  <stop offset="70%" stopColor={colors[i]} stopOpacity={0.05} />
                  <stop offset="100%" stopColor={colors[i]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid
              vertical={false}
              stroke={theme.border}
              strokeOpacity={0.45}
              strokeDasharray="2 6"
            />

            {/* X axis: the match labels, captioned so it reads as "Match …". */}
            <XAxis
              dataKey="x"
              tick={tick}
              tickLine={false}
              axisLine={{ stroke: theme.border }}
              dy={8}
              interval="preserveStartEnd"
              minTickGap={8}
            >
              <Label
                value={`${xCaption} (most recent →)`}
                position="bottom"
                offset={10}
                style={axisLabelStyle}
              />
            </XAxis>

            {/* Left Y axis: labelled with the (primary) series + unit. */}
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

            {/* Right Y scale: present so the second series keeps its own native
                scale (so a 4..20 differential is not flattened against a 60..68
                serve %), but rendered HIDDEN so it claims no layout width. In the
                narrow grid columns this chart lives in, a visible second axis +
                its ticks would starve the plot; the right series' scale is read
                instead from its coloured legend value and its end-of-line pill.
                `hide` keeps the scale active while reclaiming the width. */}
            {useDualAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                hide
                tickCount={5}
                domain={['auto', 'auto']}
              />
            )}

            <Tooltip
              cursor={{ stroke: theme.muted, strokeOpacity: 0.45, strokeDasharray: '3 3' }}
              content={
                <ChartTooltip theme={theme} units={units} xCaption={xCaption} />
              }
            />

            {/* PEAK drop-line + halo at the standout match (drawn behind the
                lines). Revealed only after the draw completes so it never floats
                ahead of an unfinished stroke. The flag text itself lives in the
                gutter pill (latest-is-peak) or the interior pennant (below). */}
            {peak && drawComplete && (
              <ReferenceLine
                yAxisId={peak.axisId}
                x={peak.x}
                stroke={peak.color}
                strokeOpacity={0.3}
                strokeDasharray="3 4"
                ifOverflow="extendDomain"
              />
            )}
            {peak && drawComplete && (
              <ReferenceDot
                yAxisId={peak.axisId}
                x={peak.x}
                y={peak.value}
                r={5}
                fill={peak.color}
                fillOpacity={0.18}
                stroke="none"
                ifOverflow="extendDomain"
              />
            )}

            {series.map((s, i) => {
              const c = colors[i];
              const axisId = useDualAxis && i === 1 ? 'right' : 'left';
              const isLast = i === series.length - 1;
              // Stagger the draw so a two-series chart traces in sequence, and
              // mark the draw complete on the LAST series' onAnimationEnd.
              const begin = shouldAnimate ? i * 220 : 0;
              return (
                <Area
                  key={s.name}
                  yAxisId={axisId}
                  type="monotone"
                  dataKey={s.name}
                  name={s.name}
                  stroke={c}
                  strokeWidth={2.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill={`url(#${gradientPrefix}-${i})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface, fill: c }}
                  isAnimationActive={shouldAnimate}
                  animationBegin={begin}
                  animationDuration={1100}
                  animationEasing="ease-out"
                  onAnimationEnd={isLast ? markDrawn : undefined}
                />
              );
            })}

            {/* Interior PEAK pennant: only when the standout match is NOT the
                latest (otherwise the gutter pill carries the PEAK tag). Drawn as
                a Customized layer so it reads the peak point's pixel position. */}
            {peak && !peak.isLastPoint && (
              <Customized
                component={(props: CustomizedChartProps) => (
                  <PeakPennantLayer
                    {...props}
                    peakSeriesIndex={peakIdx}
                    peakDataKey={series[peakIdx]?.name ?? ''}
                    peakIndex={peak.index}
                    color={peak.color}
                    surface={theme.surface}
                    text={fmtUnit(peak.value, peak.unit, peak.ref)}
                    revealed={drawComplete}
                  />
                )}
              />
            )}

            {/* End-of-series value pills, de-collided in the right gutter. A
                single layer that sees EVERY series' final pixel point at once,
                so it can guarantee no pill overlaps another, the axis, or the
                plot. This replaces the per-series LabelList that could not see
                its sibling and so collided at larger font sizes. */}
            <Customized
              component={(props: CustomizedChartProps) => (
                <EndLabelLayer
                  {...props}
                  labels={endLabels}
                  surface={theme.surface}
                  rightMargin={RIGHT_MARGIN}
                  revealed={drawComplete}
                />
              )}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

// --- Customized layer plumbing ----------------------------------------------

interface FormattedPoint {
  x?: number;
  y?: number;
  value?: number;
}
interface FormattedItem {
  props?: { dataKey?: string | number; points?: FormattedPoint[] };
}
interface ChartOffset {
  top?: number;
  left?: number;
  width?: number;
  height?: number;
}
interface CustomizedChartProps {
  formattedGraphicalItems?: FormattedItem[];
  offset?: ChartOffset;
}

/**
 * Pull the final finite pixel point for a series. Recharts' formatted items do
 * NOT reliably expose `dataKey` on `props`, so we resolve by the item's INDEX
 * (the formatted items are in the same order as the <Area> declarations, which
 * are in series order), falling back to a dataKey match when an index miss
 * happens. Either way we read the last finite {x,y} of that item's points.
 */
function pointFromItem(item: FormattedItem | undefined): { x: number; y: number } | null {
  const pts = item?.props?.points;
  if (!pts || pts.length === 0) return null;
  for (let i = pts.length - 1; i >= 0; i -= 1) {
    const p = pts[i];
    if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
      return { x: p.x as number, y: p.y as number };
    }
  }
  return null;
}

function lastPointFor(
  items: FormattedItem[] | undefined,
  index: number,
  dataKey: string,
): { x: number; y: number } | null {
  if (!items || items.length === 0) return null;
  // Primary: positional match (formatted items follow series/Area order).
  const byIndex = pointFromItem(items[index]);
  if (byIndex) return byIndex;
  // Fallback: explicit dataKey match if present on this build of recharts.
  const byKey = items.find((it) => String(it.props?.dataKey ?? '') === dataKey);
  return pointFromItem(byKey);
}

interface EndLabel {
  seriesIndex: number;
  dataKey: string;
  text: string;
  color: string;
  isLatestPeak: boolean;
}

/**
 * Draws the end-of-series value pills, vertically DE-COLLIDED, right-aligned to
 * the SVG's right edge so they grow leftward into the reserved right margin.
 * Receives EVERY series' computed final point from Recharts in one pass, so it
 * can guarantee no pill overlaps another (the per-series LabelList it replaces
 * could only see one series at a time, which is what collided at larger fonts).
 *
 * Width-adaptive: each pill is sized to its text but capped to a fraction of the
 * measured plot width, and the whole stack right-aligns to the SVG boundary, so
 * the layer works both in a NARROW grid column (small plot, pills hug the edge)
 * and full width (pills sit cleanly in the margin) without a fixed wide gutter
 * that would collapse the plot in narrow columns.
 */
function EndLabelLayer({
  formattedGraphicalItems,
  offset,
  labels,
  surface,
  rightMargin,
  revealed,
}: CustomizedChartProps & {
  labels: EndLabel[];
  surface: string;
  rightMargin: number;
  revealed: boolean;
}) {
  const plotTop = offset?.top ?? 0;
  const plotHeight = offset?.height ?? 0;
  const plotLeft = offset?.left ?? 0;
  const plotWidth = offset?.width ?? 0;
  const plotRight = plotLeft + plotWidth;
  const plotBottom = plotTop + plotHeight;
  if (plotWidth <= 0 || plotHeight <= 0) return null;

  // Resolve each label's anchor (its series' final data point in pixels).
  const resolved = labels
    .map((l) => {
      const pt = lastPointFor(formattedGraphicalItems, l.seriesIndex, l.dataKey);
      if (!pt || !l.text) return null;
      return { ...l, px: pt.x, py: pt.y };
    })
    .filter((v): v is EndLabel & { px: number; py: number } => v !== null);
  if (resolved.length === 0) return null;

  // De-collide vertical centres. Sort by natural Y, then walk down enforcing a
  // minimum centre-to-centre distance, then clamp the whole stack into the plot.
  const minStep = PILL_H + PILL_GAP;
  const sorted = [...resolved].sort((a, b) => a.py - b.py);
  const centres = sorted.map((s) => s.py);
  for (let i = 1; i < centres.length; i += 1) {
    if (centres[i] - centres[i - 1] < minStep) centres[i] = centres[i - 1] + minStep;
  }
  // If the stack overflows the bottom, shift it up so it ends at the plot floor.
  const halfPill = PILL_H / 2;
  const overflow = centres[centres.length - 1] + halfPill - plotBottom;
  if (overflow > 0) for (let i = 0; i < centres.length; i += 1) centres[i] -= overflow;
  // Then clamp the top so it never rises above the plot ceiling.
  const underflow = plotTop + halfPill - centres[0];
  if (underflow > 0) for (let i = 0; i < centres.length; i += 1) centres[i] += underflow;

  // Pills right-align to the SVG's right boundary (plot edge + the reserved
  // margin), growing leftward. A pill may never be wider than ~62% of the plot
  // so the data line stays visible behind it in narrow columns.
  const charW = 8.6;
  const padX = 9;
  const edgePad = 4; // px from the SVG right boundary to the pill's right edge
  const rightEdge = plotRight + rightMargin - edgePad;
  const maxW = Math.max(44, plotWidth * 0.62);

  return (
    <g
      aria-hidden="true"
      style={{ opacity: revealed ? 1 : 0, transition: 'opacity 380ms ease-out' }}
    >
      {sorted.map((l, i) => {
        const cy = centres[i];
        const tagW = l.isLatestPeak ? PEAK_TAG_W : 0;
        const textW = l.text.length * charW + padX * 2;
        const w = Math.min(textW + tagW, maxW);
        const rectX = rightEdge - w; // right-aligned, grows leftward
        const rectY = cy - halfPill;
        // Text sits in the pill's value zone (left of any PEAK tag).
        const valueZoneW = w - tagW;

        // Leader: from the data point, horizontally to a short elbow, then down/up
        // to the pill's vertical centre, then to the pill's left edge. Reads as a
        // tidy right-angled connector, never a diagonal across the plot. Only draw
        // it when the point is clearly left of the pill (avoids a stub when the
        // terminal point already sits under the pill in a narrow column).
        const showLeader = rectX - l.px > 6;
        const elbowX = showLeader ? Math.min(l.px + 16, rectX - 6) : rectX;
        const leader = `M ${l.px} ${l.py} L ${elbowX} ${l.py} L ${elbowX} ${cy} L ${rectX} ${cy}`;

        return (
          <g key={l.dataKey}>
            {showLeader && (
              <path
                d={leader}
                fill="none"
                stroke={l.color}
                strokeWidth={1.25}
                strokeOpacity={0.55}
              />
            )}
            {/* Node dot on the actual terminal data point. */}
            <circle cx={l.px} cy={l.py} r={6} fill={l.color} opacity={0.16} />
            <circle
              cx={l.px}
              cy={l.py}
              r={3.5}
              fill={l.color}
              stroke={surface}
              strokeWidth={1.5}
            />
            {/* Value pill. A near-opaque surface fill keeps the value legible
                even where it sits over the line/fill in a narrow column. */}
            <rect
              x={rectX}
              y={rectY}
              width={w}
              height={PILL_H}
              rx={6}
              fill={surface}
              fillOpacity={0.96}
              stroke={l.color}
              strokeWidth={1.25}
            />
            <text
              x={rectX + valueZoneW / 2}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fill={l.color}
              fontSize={14}
              fontFamily="var(--font-mono)"
              fontWeight={700}
            >
              {l.text}
            </text>
            {/* Inline PEAK tag: a solid chip on the pill's right edge when this
                series' latest match is also its window best. Folded into the
                pill so it never floats free into the top margin. */}
            {l.isLatestPeak && (
              <>
                <rect
                  x={rectX + w - tagW}
                  y={rectY + 4}
                  width={tagW - 4}
                  height={PILL_H - 8}
                  rx={4}
                  fill={l.color}
                />
                <text
                  x={rectX + w - tagW + (tagW - 4) / 2}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={surface}
                  fontSize={9}
                  fontFamily="var(--font-mono)"
                  fontWeight={700}
                  letterSpacing="0.08em"
                >
                  PEAK
                </text>
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

/**
 * Interior PEAK pennant for when the standout match is NOT the latest. Reads
 * the peak point's pixel position from the chart's formatted items and draws a
 * small "PEAK <value>" flag above it with a connector down to the point. Drawn
 * as a Customized layer (not a per-series LabelList) so it composes cleanly with
 * the gutter labels and shares the same draw-complete reveal.
 */
function PeakPennantLayer({
  formattedGraphicalItems,
  offset,
  peakSeriesIndex,
  peakDataKey,
  peakIndex,
  color,
  surface,
  text,
  revealed,
}: CustomizedChartProps & {
  peakSeriesIndex: number;
  peakDataKey: string;
  peakIndex: number;
  color: string;
  surface: string;
  text: string;
  revealed: boolean;
}) {
  // Resolve the peak series' item positionally (formatted items follow series
  // order), with a dataKey fallback, mirroring lastPointFor's strategy.
  const item =
    formattedGraphicalItems?.[peakSeriesIndex] ??
    formattedGraphicalItems?.find(
      (it) => String(it.props?.dataKey ?? '') === peakDataKey,
    );
  const pt = item?.props?.points?.[peakIndex];
  if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return null;
  const cx = pt.x as number;
  const cy = pt.y as number;

  const plotLeft = offset?.left ?? 0;
  const plotWidth = offset?.width ?? 0;
  const plotTop = offset?.top ?? 0;
  const plotRight = plotLeft + plotWidth;

  const labelText = `PEAK ${text}`;
  const padX = 9;
  const charW = 8;
  const w = labelText.length * charW + padX * 2;
  const h = 24;
  const gap = 14; // clearance above the point for the pennant
  let rectY = cy - gap - h;
  if (rectY < plotTop + 2) rectY = plotTop + 2; // keep inside the plot ceiling
  // Centre over the point, clamped within the plot box horizontally.
  let rectX = cx - w / 2;
  if (rectX < plotLeft + 2) rectX = plotLeft + 2;
  if (rectX + w > plotRight - 2) rectX = plotRight - 2 - w;

  return (
    <g
      aria-hidden="true"
      style={{
        opacity: revealed ? 1 : 0,
        transition: 'opacity 420ms ease-out 120ms',
      }}
    >
      {/* Connector from the pill down toward the peak point. */}
      <line
        x1={cx}
        y1={cy - 7}
        x2={cx}
        y2={rectY + h}
        stroke={color}
        strokeWidth={1}
        strokeOpacity={0.6}
      />
      <circle cx={cx} cy={cy} r={3.5} fill={color} stroke={surface} strokeWidth={1.5} />
      <rect
        x={rectX}
        y={rectY}
        width={w}
        height={h}
        rx={5}
        fill={color}
        stroke={surface}
        strokeWidth={1}
      />
      <text
        x={rectX + w / 2}
        y={rectY + h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={surface}
        fontSize={13.5}
        fontFamily="var(--font-mono)"
        fontWeight={700}
        letterSpacing="0.04em"
      >
        {labelText}
      </text>
    </g>
  );
}

export default TrendChart;
