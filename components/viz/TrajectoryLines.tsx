'use client';

// Stats Empire, TrajectoryLines
//
// Draws smooth, curved, *directional* paths between sequences of points:
// baseball hit arcs, AFL kick/disposal lines, basketball drives, tennis
// rallies, soccer pass-network edges. Each play reads on its own:
//   - colour buckets the play by kind/outcome (Completed = lime,
//     Shot / Goal = orange, Incomplete = muted) and an in-SVG LEGEND spells
//     that mapping out,
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

// The three meanings a play can carry, in legend order. We bucket every path
// into one of these so colour is *categorical and legible*, not a gradient.
type PlayKind = 'completed' | 'shot' | 'incomplete';

interface LegendEntry {
  kind: PlayKind;
  label: string;
  color: string;
}

// Legend, the single source of truth for colour ↔ meaning. Drawn in-SVG below
// and reused to colour every path, so they can never drift apart.
const LEGEND: readonly LegendEntry[] = [
  { kind: 'completed', label: 'Completed', color: 'var(--color-accent1)' },
  { kind: 'shot', label: 'Shot / Goal', color: 'var(--color-accent2)' },
  { kind: 'incomplete', label: 'Incomplete', color: 'var(--color-muted)' },
];

const COLOR_BY_KIND: Record<PlayKind, string> = {
  completed: 'var(--color-accent1)',
  shot: 'var(--color-accent2)',
  incomplete: 'var(--color-muted)',
};

// Outcome → play kind. `winner` is a scored shot/goal, `make` a completed
// build-up action, everything else (miss / error / neutral / undefined) is an
// incomplete or unsuccessful attempt. This matches SprayChart's accent palette.
function kindFor(outcome: Outcome | undefined): PlayKind {
  switch (outcome) {
    case 'winner':
      return 'shot';
    case 'make':
      return 'completed';
    default:
      // 'miss' | 'error' | 'neutral' | undefined
      return 'incomplete';
  }
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
      const kind = kindFor(p.outcome);
      // The tip of the final segment, used to orient/seat the arrowhead and to
      // anchor the key-play label just past the destination.
      const prev = pts[pts.length - 2] ?? first;
      const angle = last && prev ? Math.atan2(last[1] - prev[1], last[0] - prev[0]) : 0;
      return {
        id: p.id ?? `traj-${i}`,
        label: p.label,
        d,
        kind,
        color: COLOR_BY_KIND[kind],
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
  }, [paths, proj]);

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
  // Width sized to the longest label so text never clips.
  const lgTextW = 130 * unit;
  const lgW = lgPad * 2 + lgSwatch + lgGap + lgTextW;
  // Rows are spaced by lgRow but the last row needs only its swatch height, so
  // height = top/bottom padding + (n-1) gaps + one swatch.
  const lgH = lgPad * 2 + (LEGEND.length - 1) * lgRow + lgSwatch;
  const lgX = 14 * unit;
  const lgY = 14 * unit;

  // Accessible summary: counts per bucket so screen readers get the gist.
  const counts = useMemo(() => {
    const c = { completed: 0, shot: 0, incomplete: 0 } as Record<PlayKind, number>;
    for (const l of lines) c[l.kind] += 1;
    return c;
  }, [lines]);

  const ariaLabel =
    `Trajectory lines: ${paths.length} plays, ` +
    `${counts.completed} completed, ${counts.shot} shots or goals, ` +
    `${counts.incomplete} incomplete.` +
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
        {/* One arrowhead marker per colour bucket. `context-stroke` would be
            ideal but isn't universal, so we bake the colour into each marker
            and reference the matching one per path. */}
        {LEGEND.map((e) => (
          <marker
            key={e.kind}
            id={`${uid}-arrow-${e.kind}`}
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
              markerEnd={`url(#${uid}-arrow-${l.kind})`}
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
              markerEnd={`url(#${uid}-arrow-${l.kind})`}
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

      {/* In-SVG legend, colour ↔ meaning. aria-hidden because the <svg> label
          already conveys the same mapping + counts to assistive tech. */}
      {lines.length > 0 && (
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
          {LEGEND.map((e, i) => {
            const cy = lgPad + i * lgRow + lgSwatch / 2;
            return (
              <g key={e.kind}>
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
