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
// trending, WHERE it ended up, and WHICH match was the standout. So the shell
// renders an explicit title + one-line "what this shows" subtitle, the axes are
// labelled with units, every series has a swatch in a visible legend annotated
// with its trend direction and net change, gridlines anchor the values, the
// latest value of each series is pinned with a label dot, and the PEAK match of
// the primary series is flagged with a tasteful drop-line + "Peak" callout so
// the best performance reads as the focal point of the story.
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
  // reveal the first time the chart scrolls into view, then the last-value pin
  // and the peak callout fade in once the draw completes. Reduced motion (and
  // pre-hydration) skips the animation entirely: everything renders fully drawn.
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  // Track visibility for the lifetime of the chart (not `once`), so we can both
  // play the one-time draw-on AND guarantee the annotations reveal whenever the
  // chart is on-screen, even on re-mounts or HMR where a `once` latch is stale.
  const inView = useInView(containerRef, { margin: '0px 0px -12% 0px' });
  // `hasAnimated` latches AFTER the draw-on plays once, so the animation runs on
  // first view but never replays. It is NOT set on first view (which would race
  // `shouldAnimate` to false before the Area can animate).
  const [hasAnimated, setHasAnimated] = useState(false);
  const shouldAnimate = !reduce && inView && !hasAnimated;
  // `drawComplete` reveals the pins + peak callout. It must become true on every
  // path that ends with the line fully drawn:
  //   - reduced motion (no animation), immediately;
  //   - after the draw-on finishes (onAnimationEnd / safety timeout);
  //   - when the chart is visible but won't animate (already drawn / re-mounted).
  const [drawComplete, setDrawComplete] = useState(false);
  const markDrawn = () => {
    setHasAnimated(true);
    setDrawComplete(true);
  };

  // Fail-safe: never let the headline annotations stay permanently hidden. If
  // the IntersectionObserver behind `useInView` never reports (broken polyfill,
  // zero-height ancestor, headless capture), reveal them after a grace period
  // anyway. A genuine in-view reveal will fire well before this.
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
      // The safety timeout guarantees the reveal even if onAnimationEnd is
      // skipped by Recharts for any reason.
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
  // very different scales (their ranges barely overlap, or their magnitudes
  // differ by a large factor) a single shared axis would flatten one of them, so
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
    // Only worth flagging when the peak is a genuine high point, not the last
    // (already pinned) point and not a flat line where every point ties.
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

  // Axis titles. Dual-axis → each axis names its own series; shared axis →
  // the common unit (or a neutral "Value" when units differ).
  const leftAxisTitle = useDualAxis
    ? axisTitle(series[0]?.name ?? 'Value', leftUnit)
    : sharedUnit
      ? `Value (${sharedUnit})`
      : 'Value';
  const rightAxisTitle = axisTitle(series[1]?.name ?? 'Value', rightUnit);

  // In-SVG (Recharts) fonts are fixed px, not viewBox-relative, so they do NOT
  // scale up with the container on a large screen; the axis ticks + titles read
  // too small on desktop. Lifted a couple of px so they sit comfortably. The
  // chart renders at the same size on mobile and desktop, so this is a small,
  // safe flat bump (it was simply undersized before, most visible on desktop).
  const tick = { fill: theme.muted, fontSize: 13, fontFamily: 'var(--font-mono)' } as const;
  const axisLabelStyle = {
    fill: theme.muted,
    fontSize: 12,
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
            <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-text lg:text-base">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5 font-mono text-[0.7rem] text-muted lg:text-xs">{subtitle}</p>
            )}
          </div>

          {/* Visible legend: WHICH line is which, WHERE it ended, and WHICH WAY
              it is trending (glyph + net change) so the legend states the story. */}
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {series.map((s, i) => {
              const stat = stats[i];
              const unit = units[s.name] ?? '';
              return (
                <li key={s.name} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: colors[i] }}
                    />
                    <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted lg:text-xs">
                      {s.name}
                    </span>
                    {stat && (
                      <span
                        className="font-mono text-[0.72rem] font-semibold tabular-nums lg:text-[0.8rem]"
                        style={{ color: colors[i] }}
                      >
                        {fmtUnit(stat.last, unit, stat.ref)}
                      </span>
                    )}
                  </div>
                  {stat && (
                    <span
                      className="ml-4 flex items-center gap-1 font-mono text-[0.6rem] tabular-nums"
                      style={{
                        color:
                          stat.dir === 'up'
                            ? colors[i]
                            : stat.dir === 'down'
                              ? theme.muted
                              : theme.muted,
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

      <div className="h-60 w-full sm:h-72" aria-hidden="true" ref={containerRef}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 22, right: useDualAxis ? 16 : 28, bottom: 24, left: 8 }}
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

            {/* PEAK annotation: a faint dotted drop-line at the standout match
                plus a halo dot, so the best performance is visually anchored to
                its match on the X axis. Revealed only after the draw completes
                (or immediately under reduced motion) so it never floats ahead of
                an unfinished stroke. The flag pill itself is drawn by the
                series' LabelList renderer below to stay inside the plot box. */}
            {peak && drawComplete && (
              <ReferenceLine
                yAxisId={peak.axisId}
                x={peak.x}
                stroke={peak.color}
                strokeOpacity={0.35}
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
              // mark the draw complete on the LAST series' onAnimationEnd (it
              // begins latest, so it finishes the overall reveal).
              const begin = shouldAnimate ? i * 220 : 0;
              const showPeakFlag = peak !== null && peakIdx === i;
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
                  onAnimationEnd={isLast ? markDrawn : undefined}
                >
                  {/* Pin the latest value on the final point of each series so
                      the reader sees "where it ended up" without hovering. */}
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
                        isPeak={showPeakFlag && peak !== null && peak.isLastPoint}
                        valueRef={stats[i]?.ref}
                      />
                    )}
                  />
                  {/* Standalone "Peak" flag for an INTERIOR standout point (best
                      match was not the most recent). A separate LabelList placed
                      independently of the pin, drawn only on the peak index. */}
                  {showPeakFlag && peak && !peak.isLastPoint && (
                    <LabelList
                      dataKey={s.name}
                      content={(props) => (
                        <PeakLabel
                          {...props}
                          peakIndex={peak.index}
                          color={c}
                          surface={theme.surface}
                          text={fmtUnit(peak.value, peak.unit, peak.ref)}
                          revealed={drawComplete}
                        />
                      )}
                    />
                  )}
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
  isPeak?: boolean;
  valueRef?: number;
}) {
  const {
    x,
    y,
    value,
    index,
    unit,
    color,
    surface,
    lastIndex,
    nudgeUp,
    revealed,
    isPeak,
    valueRef,
  } = props;
  if (index !== lastIndex) return null;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return null;

  const cx = typeof x === 'number' ? x : Number(x);
  const cy = typeof y === 'number' ? y : Number(y);
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

  const text = fmtUnit(num, unit, valueRef);
  const padX = 6;
  // charW + h track the pin's fontSize (bumped below) so the pill stays sized
  // to its text. The in-SVG pin is fixed px, so this lifts it on every screen;
  // it simply read too small before, most noticeably on a large desktop.
  const charW = 7.4;
  const w = text.length * charW + padX * 2;
  const h = 19;
  // Offset the pill above/below the point to reduce overlap when two series
  // end near each other.
  const dy = nudgeUp ? -(h + 8) : 8;
  const rectX = cx - w - 8 < 0 ? cx + 8 : cx - w - 8;
  const rectY = cy + dy;
  // PEAK badge always clears the topmost of {point, value-pill}, so it never
  // collides with the data point or the pill regardless of nudge direction.
  const badgeH = 14;
  const badgeY = Math.min(rectY, cy) - badgeH - 5;

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
        fontSize={12}
        fontFamily="var(--font-mono)"
        fontWeight={700}
      >
        {text}
      </text>

      {/* "PEAK" badge: shown when this series' latest match is ALSO its best in
          the window (the common upward-trend case), so latest-is-best reads in
          one glance without a separate interior flag. A solid accent chip sits
          clear above the point + value pill, centred on the data point. */}
      {isPeak &&
        (() => {
          const badgeW = 42;
          // Keep the chip inside the plot box horizontally near the right edge.
          let bx = cx - badgeW / 2;
          if (bx < 2) bx = 2;
          return (
            <g>
              <rect x={bx} y={badgeY} width={badgeW} height={badgeH} rx={4} fill={color} />
              <text
                x={bx + badgeW / 2}
                y={badgeY + badgeH / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill={surface}
                fontSize={8.5}
                fontFamily="var(--font-mono)"
                fontWeight={700}
                letterSpacing="0.12em"
              >
                PEAK
              </text>
            </g>
          );
        })()}
    </g>
  );
}

/**
 * Renders the "Peak" flag on the standout (max) point of the primary series.
 * Like LastValueLabel, Recharts invokes this once per point; we draw only on
 * `index === peakIndex`. A small pennant pill sits above the point reading
 * "PEAK <value>" so a coach instantly sees the best match in the window.
 */
function PeakLabel(props: {
  x?: number | string;
  y?: number | string;
  index?: number;
  peakIndex: number;
  color: string;
  surface: string;
  text: string;
  revealed: boolean;
}) {
  const { x, y, index, peakIndex, color, surface, text, revealed } = props;
  if (index !== peakIndex) return null;

  const cx = typeof x === 'number' ? x : Number(x);
  const cy = typeof y === 'number' ? y : Number(y);
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

  const labelText = `PEAK ${text}`;
  const padX = 7;
  // charW + h track the flag's fontSize (bumped below) so the pill stays sized
  // to its text. Fixed-px in-SVG label, lifted a step for desktop legibility.
  const charW = 7;
  const w = labelText.length * charW + padX * 2;
  const h = 20;
  const gap = 12; // clearance above the point for the pennant
  const rectY = cy - gap - h;
  // Keep the pill inside the plot horizontally: clamp around the point.
  let rectX = cx - w / 2;
  if (rectX < 2) rectX = 2;

  return (
    <g
      aria-hidden="true"
      style={{
        opacity: revealed ? 1 : 0,
        transition: 'opacity 420ms ease-out 120ms',
      }}
    >
      {/* Connector tick from the pill down toward the peak point. */}
      <line
        x1={cx}
        y1={cy - 7}
        x2={cx}
        y2={rectY + h}
        stroke={color}
        strokeWidth={1}
        strokeOpacity={0.6}
      />
      {/* Solid peak point marker so the flag has an anchor. */}
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
        fontSize={11.5}
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
