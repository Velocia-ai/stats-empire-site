'use client';

// Stats Empire, TrajectoryLines
//
// Draws smooth, curved, *directional* paths between sequences of points:
// baseball hit arcs, American football pass/run lines, basketball drives, tennis
// rallies, soccer pass-network edges. Each play reads on its own:
//   - colour buckets the play by sentiment (positive/winner = lime,
//     shot/goal = orange, error/turnover/neutral = muted), while the in-SVG
//     LEGEND lists the SPORT-SPECIFIC play names actually present (tennis
//     "Forehand / Backhand / Winner", soccer "Pass / Through ball / Cross",
//     etc.) via each path's `kind`, falling back to its outcome bucket,
//   - a hollow ORIGIN dot marks where the play starts,
//     a triangular ARROWHEAD marks where it ends, so direction is unambiguous,
//   - `intensity` drives stroke weight + opacity, so volume/quality read at a
//     glance, and the single most important play is LABELLED in place.
//
// d3 generates the path `d` strings (line + curve); React renders them. When
// `animate` is on, framer-motion runs a stroke draw-on, but it's reduced-
// motion-safe: if the user prefers reduced motion, paths render fully drawn
// with no animation.

import { useId, useMemo } from 'react';
import { line, curveCatmullRom } from 'd3-shape';
import { motion, useReducedMotion } from 'framer-motion';
import type { Outcome, PitchType, TrajectoryPath } from '@/lib/types';
import { makeProjector, projectPoints, viewBoxAttr } from './geometry';

export interface TrajectoryLinesProps {
  /** Paths as ordered point lists in normalized 0..1 space. */
  paths: TrajectoryPath[];
  /** Pitch whose coordinate space the paths live in. */
  pitch: PitchType;
  /** Run a draw-on stroke animation (reduced-motion safe). Default false. */
  animate?: boolean;
  /** Optional extra classes for the <svg>. */
  className?: string;
}

// The three colour buckets a play can carry. Colour stays sentiment-driven so
// it is *categorical and legible*, not a gradient: positive/winner reads lime,
// shot/goal reads orange, error/turnover/neutral reads muted.
type Sentiment = 'positive' | 'shot' | 'muted';

const COLOR_BY_SENTIMENT: Record<Sentiment, string> = {
  positive: 'var(--color-accent1)',
  shot: 'var(--color-accent2)',
  muted: 'var(--color-muted)',
};

// Outcome → colour sentiment. `winner` is a scored shot/goal, `make` a
// completed/positive build-up action, everything else (miss / error / neutral /
// undefined) reads as muted. This matches SprayChart's accent palette.
function sentimentFor(outcome: Outcome | undefined): Sentiment {
  switch (outcome) {
    case 'winner':
      return 'shot';
    case 'make':
      return 'positive';
    default:
      // 'miss' | 'error' | 'neutral' | undefined
      return 'muted';
  }
}

// A legend row: one distinct sport-specific `kind` (e.g. tennis "Forehand",
// soccer "Through ball"), coloured by the sentiment of the paths carrying it.
interface LegendEntry {
  /** Stable key for React + marker ids. */
  key: string;
  /** Sport-specific play name shown in the legend and on arrowheads. */
  label: string;
  sentiment: Sentiment;
  color: string;
}

// Fallback labels when a path has no `kind`, so the legend still reads in plain
// language rather than blanks. Keyed by sentiment bucket.
const FALLBACK_LABEL: Record<Sentiment, string> = {
  positive: 'Completed',
  shot: 'Shot / Goal',
  muted: 'Incomplete',
};

// Sanitize a kind label into an id-safe token for marker/def ids.
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'kind';
}

// Build the legend from the distinct `kind` values actually present, in first-
// seen order. A path with no `kind` falls back to its sentiment-bucket label so
// the legend always reads in sport-specific terms when available and plain terms
// otherwise. Each distinct label is coloured by the sentiment of the first path
// that carries it, so colour ↔ sentiment never drifts.
function buildLegend(paths: TrajectoryPath[]): LegendEntry[] {
  const out: LegendEntry[] = [];
  const seen = new Set<string>();
  for (const p of paths) {
    const sentiment = sentimentFor(p.outcome);
    const label = p.kind?.trim() || FALLBACK_LABEL[sentiment];
    if (seen.has(label)) continue;
    seen.add(label);
    out.push({
      key: `${slug(label)}-${out.length}`,
      label,
      sentiment,
      color: COLOR_BY_SENTIMENT[sentiment],
    });
  }
  return out;
}

export default function TrajectoryLines({
  paths,
  pitch,
  animate = false,
  className,
}: TrajectoryLinesProps) {
  const proj = useMemo(() => makeProjector(pitch), [pitch]);
  const prefersReduced = useReducedMotion();
  const shouldAnimate = animate && !prefersReduced;
  // Unique per-instance prefix so marker / def ids never collide when several
  // TrajectoryLines render on one page (Hero + ReportBento + Freemium).
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  // Legend derived from the distinct sport-specific `kind` values present
  // (fallback to sentiment-bucket labels). Drawn in-SVG and used to key the
  // per-label arrowhead markers, so colour ↔ label never drift.
  const legend = useMemo(() => buildLegend(paths), [paths]);
  // label → legend entry, so each path can resolve its colour + arrowhead.
  const legendByLabel = useMemo(() => {
    const m = new Map<string, LegendEntry>();
    for (const e of legend) m.set(e.label, e);
    return m;
  }, [legend]);

  const { lines, keyLine } = useMemo(() => {
    if (paths.length === 0) return { lines: [], keyLine: null };
    // Catmull-Rom passes through every point with gentle curvature → reads as a
    // natural flight/run path rather than straight segments.
    const gen = line<[number, number]>()
      .x((d) => d[0])
      .y((d) => d[1])
      .curve(curveCatmullRom.alpha(0.6));

    const built = paths.map((p, i) => {
      const pts = projectPoints(proj, p.points);
      const d = gen(pts) ?? '';
      const intensity = clampUnit(p.intensity ?? 0.6);
      const first = pts[0];
      const last = pts[pts.length - 1];
      const sentiment = sentimentFor(p.outcome);
      // Resolve this path to its legend row by its sport-specific label (fallback
      // to the sentiment-bucket label), so colour + arrowhead match the legend.
      const legendLabel = p.kind?.trim() || FALLBACK_LABEL[sentiment];
      const entry = legendByLabel.get(legendLabel);
      const markerKey = entry?.key ?? slug(legendLabel);
      const color = entry?.color ?? COLOR_BY_SENTIMENT[sentiment];
      // The tip of the final segment, used to orient/seat the arrowhead and to
      // anchor the key-play label just past the destination.
      const prev = pts[pts.length - 2] ?? first;
      const angle = last && prev ? Math.atan2(last[1] - prev[1], last[0] - prev[0]) : 0;
      return {
        id: p.id ?? `traj-${i}`,
        label: p.label,
        d,
        sentiment,
        markerKey,
        color,
        // Map intensity → stroke weight (1.4..4.6) and opacity (0.4..0.96).
        width: 1.4 + intensity * 3.2,
        opacity: 0.4 + intensity * 0.56,
        intensity,
        start: first,
        end: last,
        angle,
      };
    });

    // The single most important play (highest intensity) gets a label so the
    // viewer's eye has an anchor. Ties resolve to the first path.
    let keyIdx = 0;
    for (let i = 1; i < built.length; i += 1) {
      if (built[i].intensity > built[keyIdx].intensity) keyIdx = i;
    }
    const key = built[keyIdx]?.label ? built[keyIdx] : null;

    return { lines: built, keyLine: key };
  }, [paths, proj, legendByLabel]);

  // Stagger animation start so paths trace in sequence, not all at once.
  const stagger = 0.06;

  const { width: vw, height: vh } = proj.view;
  // Geometry scale: most viewBoxes are ~1000 wide; tennis is 540. Derive sizes
  // from the smaller axis so dots/markers/legend stay proportional per pitch.
  const unit = Math.min(vw, vh) / 1000;
  const originR = 7 * unit;

  // --- Legend box, laid out in viewBox units, pinned to the top-left -----------
  const lgPad = 18 * unit;
  const lgFont = 22 * unit;
  const lgRow = 30 * unit;
  const lgSwatch = 16 * unit;
  const lgGap = 12 * unit;
  // Width sized to the longest sport-specific label present so text never clips
  // (monospace ≈ 0.6em per char), with a sensible minimum.
  const longest = legend.reduce((m, e) => Math.max(m, e.label.length), 0);
  const lgTextW = Math.max(110 * unit, longest * lgFont * 0.6);
  const lgW = lgPad * 2 + lgSwatch + lgGap + lgTextW;
  // Rows are spaced by lgRow but the last row needs only its swatch height, so
  // height = top/bottom padding + (n-1) gaps + one swatch.
  const lgH = lgPad * 2 + Math.max(0, legend.length - 1) * lgRow + lgSwatch;
  const lgX = 14 * unit;
  const lgY = 14 * unit;

  // Accessible summary: counts per sentiment bucket so screen readers get the
  // gist regardless of the sport-specific labels shown in the legend.
  const counts = useMemo(() => {
    const c = { positive: 0, shot: 0, muted: 0 } as Record<Sentiment, number>;
    for (const l of lines) c[l.sentiment] += 1;
    return c;
  }, [lines]);

  const ariaLabel =
    `Trajectory lines: ${paths.length} plays, ` +
    `${counts.positive} completed, ${counts.shot} shots or goals, ` +
    `${counts.muted} incomplete.` +
    (keyLine?.label ? ` Key play: ${keyLine.label}.` : '');

  return (
    <svg
      viewBox={viewBoxAttr(pitch)}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        {/* One arrowhead marker per legend row (sport-specific label →
            sentiment colour). `context-stroke` would be ideal but isn't
            universal, so we bake the colour into each marker and reference the
            matching one per path by its legend key. */}
        {legend.map((e) => (
          <marker
            key={e.key}
            id={`${uid}-arrow-${e.key}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6.5"
            markerHeight="6.5"
            orient="auto-start-reverse"
            markerUnits="strokeWidth"
          >
            <path d="M0.5,0.5 L9,5 L0.5,9.5 L3,5 Z" fill={e.color} />
          </marker>
        ))}
      </defs>

      <g aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Paths, each with a directional arrowhead matching its colour. */}
        {lines.map((l, i) =>
          shouldAnimate ? (
            <motion.path
              key={l.id}
              d={l.d}
              stroke={l.color}
              strokeWidth={l.width}
              markerEnd={`url(#${uid}-arrow-${l.markerKey})`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: l.opacity }}
              transition={{
                pathLength: { duration: 0.9, ease: 'easeOut', delay: i * stagger },
                opacity: { duration: 0.3, delay: i * stagger },
              }}
            />
          ) : (
            <path
              key={l.id}
              d={l.d}
              stroke={l.color}
              strokeWidth={l.width}
              strokeOpacity={l.opacity}
              markerEnd={`url(#${uid}-arrow-${l.markerKey})`}
            />
          ),
        )}

        {/* Origin dots, a hollow node where each play begins so the start of
            every arrow is unambiguous even when paths overlap. */}
        {lines.map((l) =>
          l.start ? (
            <circle
              key={`${l.id}-origin`}
              cx={l.start[0]}
              cy={l.start[1]}
              r={originR}
              fill="var(--color-bg)"
              stroke={l.color}
              strokeWidth={2 * unit}
              strokeOpacity={Math.max(l.opacity, 0.7)}
            />
          ) : null,
        )}

        {/* Key-play label, placed just past the destination of the most
            intense play, with a readable backing chip. */}
        {keyLine && keyLine.end && (
          <KeyPlayLabel
            x={keyLine.end[0]}
            y={keyLine.end[1]}
            angle={keyLine.angle}
            text={keyLine.label as string}
            color={keyLine.color}
            unit={unit}
            view={proj.view}
          />
        )}
      </g>

      {/* In-SVG legend, sport-specific play name ↔ sentiment colour.
          aria-hidden because the <svg> label already conveys per-bucket counts
          to assistive tech. */}
      {legend.length > 0 && (
        <g aria-hidden="true" transform={`translate(${lgX} ${lgY})`}>
          <rect
            x={0}
            y={0}
            width={lgW}
            height={lgH}
            rx={10 * unit}
            fill="var(--color-surface)"
            fillOpacity={0.82}
            stroke="var(--color-border)"
            strokeWidth={1.5 * unit}
          />
          {legend.map((e, i) => {
            const cy = lgPad + i * lgRow + lgSwatch / 2;
            return (
              <g key={e.key}>
                <line
                  x1={lgPad}
                  y1={cy}
                  x2={lgPad + lgSwatch}
                  y2={cy}
                  stroke={e.color}
                  strokeWidth={4 * unit}
                  strokeLinecap="round"
                />
                <circle
                  cx={lgPad + lgSwatch / 2}
                  cy={cy}
                  r={2.6 * unit}
                  fill="var(--color-bg)"
                  stroke={e.color}
                  strokeWidth={1.5 * unit}
                />
                <text
                  x={lgPad + lgSwatch + lgGap}
                  y={cy}
                  fontSize={lgFont}
                  fontFamily="var(--font-mono, ui-monospace, monospace)"
                  fill="var(--color-text)"
                  dominantBaseline="central"
                >
                  {e.label}
                </text>
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}

// Renders the key-play callout: a small connector + a rounded chip with the
// play name, nudged to stay inside the viewBox.
function KeyPlayLabel({
  x,
  y,
  angle,
  text,
  color,
  unit,
  view,
}: {
  x: number;
  y: number;
  angle: number;
  text: string;
  color: string;
  unit: number;
  view: { width: number; height: number };
}) {
  const fontSize = 22 * unit;
  const padX = 12 * unit;
  const padY = 8 * unit;
  // Rough text width estimate (monospace ≈ 0.6em per char) for the chip width.
  const chipW = text.length * fontSize * 0.6 + padX * 2;
  const chipH = fontSize + padY * 2;
  // Offset the chip a bit beyond the arrow tip, continuing its direction.
  const off = 18 * unit;
  let cx = x + Math.cos(angle) * off;
  let cy = y + Math.sin(angle) * off;
  // Clamp the chip so it never spills outside the field frame.
  const margin = 6 * unit;
  let chipX = cx - chipW / 2;
  let chipY = cy - chipH / 2;
  chipX = Math.max(margin, Math.min(chipX, view.width - chipW - margin));
  chipY = Math.max(margin, Math.min(chipY, view.height - chipH - margin));
  cx = chipX + chipW / 2;
  cy = chipY + chipH / 2;

  return (
    <g>
      {/* Connector from the arrow tip to the chip. */}
      <line
        x1={x}
        y1={y}
        x2={cx}
        y2={cy}
        stroke={color}
        strokeWidth={1.5 * unit}
        strokeOpacity={0.7}
        strokeDasharray={`${3 * unit} ${3 * unit}`}
      />
      <rect
        x={chipX}
        y={chipY}
        width={chipW}
        height={chipH}
        rx={chipH / 2}
        fill="var(--color-surface)"
        fillOpacity={0.92}
        stroke={color}
        strokeWidth={1.5 * unit}
      />
      <text
        x={chipX + chipW / 2}
        y={chipY + chipH / 2}
        fontSize={fontSize}
        fontFamily="var(--font-mono, ui-monospace, monospace)"
        fill="var(--color-text)"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {text}
      </text>
    </g>
  );
}

function clampUnit(v: number): number {
  if (Number.isNaN(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
