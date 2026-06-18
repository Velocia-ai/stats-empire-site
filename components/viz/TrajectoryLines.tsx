'use client';

// Stats Empire, TrajectoryLines
//
// Draws smooth, curved paths between sequences of points: baseball hit arcs,
// AFL kick/disposal lines, basketball drives, tennis rallies, soccer
// pass-network edges. Each path's `outcome` tints it and `intensity` drives
// stroke weight + opacity, so volume and quality read at a glance.
//
// d3 generates the path `d` strings (line + curve); React renders them. When
// `animate` is on, framer-motion runs a stroke draw-on, but it's reduced-
// motion-safe: if the user prefers reduced motion, paths render fully drawn
// with no animation.

import { useMemo } from 'react';
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

// Outcome → stroke color token. Matches SprayChart's palette for consistency.
function colorFor(outcome: Outcome | undefined): string {
  switch (outcome) {
    case 'winner':
    case 'make':
      return 'var(--color-accent1)';
    case 'error':
    case 'miss':
      return 'var(--color-accent2)';
    default:
      return 'var(--color-muted)';
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

  const lines = useMemo(() => {
    if (paths.length === 0) return [];
    // Catmull-Rom passes through every point with gentle curvature → reads as a
    // natural flight/run path rather than straight segments.
    const gen = line<[number, number]>()
      .x((d) => d[0])
      .y((d) => d[1])
      .curve(curveCatmullRom.alpha(0.6));

    return paths.map((p, i) => {
      const pts = projectPoints(proj, p.points);
      const d = gen(pts) ?? '';
      const intensity = clampUnit(p.intensity ?? 0.6);
      const last = pts[pts.length - 1];
      const first = pts[0];
      return {
        id: p.id ?? `traj-${i}`,
        d,
        color: colorFor(p.outcome),
        // Map intensity → stroke weight (1.2..4) and opacity (0.35..0.95).
        width: 1.2 + intensity * 2.8,
        opacity: 0.35 + intensity * 0.6,
        start: first,
        end: last,
        outcome: p.outcome,
      };
    });
  }, [paths, proj]);

  // Stagger animation start so paths trace in sequence, not all at once.
  const stagger = 0.06;

  return (
    <svg
      viewBox={viewBoxAttr(pitch)}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Trajectory lines: ${paths.length} paths`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <g aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {lines.map((l, i) =>
          shouldAnimate ? (
            <motion.path
              key={l.id}
              d={l.d}
              stroke={l.color}
              strokeWidth={l.width}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: l.opacity }}
              transition={{
                pathLength: { duration: 0.9, ease: 'easeOut', delay: i * stagger },
                opacity: { duration: 0.3, delay: i * stagger },
              }}
            />
          ) : (
            <path key={l.id} d={l.d} stroke={l.color} strokeWidth={l.width} strokeOpacity={l.opacity} />
          ),
        )}
        {/* Endpoint dots mark where each path terminates (e.g. pass receiver,
            shot location). Origin gets a hollow node, terminus a filled one. */}
        {lines.map((l) => (
          <g key={`${l.id}-nodes`}>
            {l.start && (
              <circle cx={l.start[0]} cy={l.start[1]} r={proj.view.width * 0.006} fill="var(--color-bg)" stroke={l.color} strokeWidth={1.5} />
            )}
            {l.end && <circle cx={l.end[0]} cy={l.end[1]} r={proj.view.width * 0.008} fill={l.color} />}
          </g>
        ))}
      </g>
    </svg>
  );
}

function clampUnit(v: number): number {
  if (Number.isNaN(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
