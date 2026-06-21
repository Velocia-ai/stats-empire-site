'use client';

// Stats Empire, Court Vision chalk-line primitives.
//
// Shared, reduced-motion-safe SVG flourishes. They give a surface its signature
// "coach drawing the winning play in chalk" feel:
//
//   • <ChalkUnderline>, a hand-drawn-looking stroke that draws itself on once
//                          the element scrolls into view (framer-motion pathLength).
//   • <PlayTrajectory>, a glowing curved play-arc with an animated arrowhead,
//                          used as the backdrop tying a token-ladder together.
//
// Refined for restraint: the draws are subtler (lower stroke opacity, gentler
// timing) so the flourish reads as quiet chalk dust rather than a loud line,
// and the supporting run reads neutral rather than orange so it doesn't
// introduce a competing accent in marketing chrome.
//
// Colours come ONLY from the theme tokens (var(--color-*)), so the whole thing
// re-skins with the active [data-theme]. Public prop APIs are unchanged.

import { motion, useReducedMotion } from 'framer-motion';

// ---------------------------------------------------------------------------
// ChalkUnderline, a short, slightly irregular underline that "draws on".
// ---------------------------------------------------------------------------

export interface ChalkUnderlineProps {
  /** Stroke colour token. Default accent1 (lime). */
  color?: string;
  /** Extra classes for the wrapping <svg>. */
  className?: string;
  /** Animation start delay in seconds. */
  delay?: number;
}

export function ChalkUnderline({
  color = 'var(--color-accent1)',
  className = '',
  delay = 0,
}: ChalkUnderlineProps) {
  const prefersReduced = useReducedMotion();
  // A path with two gentle waves so it reads as a chalk swipe, not a ruler line.
  const d = 'M2 9 C 40 3, 80 13, 130 7 S 230 4, 298 8';

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 300 14"
      preserveAspectRatio="none"
      className={className}
      style={{ display: 'block', width: '100%', height: '0.7rem', overflow: 'visible' }}
    >
      {prefersReduced ? (
        <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" opacity={0.75} />
      ) : (
        <motion.path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.3 }}
          whileInView={{ pathLength: 1, opacity: 0.75 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ pathLength: { duration: 0.9, ease: 'easeOut', delay }, opacity: { duration: 0.3, delay } }}
        />
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// PlayTrajectory, a big glowing play-arc that animates across a container.
// Sits behind the token ladder to evoke a tactics-board play being drawn.
// ---------------------------------------------------------------------------

export interface PlayTrajectoryProps {
  /** Extra classes for the absolutely-positioned wrapper. */
  className?: string;
}

export function PlayTrajectory({ className = '' }: PlayTrajectoryProps) {
  const prefersReduced = useReducedMotion();

  // A swooping arc from lower-left to upper-right, the "winning play".
  const arc = 'M40 360 C 220 320, 360 260, 520 180 S 860 60, 1160 40';
  const tail = 'M40 360 C 200 380, 420 360, 640 300';

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 400"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <defs>
        <filter id="chalk-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker
          id="play-arrow"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L10 5 L0 10 z" fill="var(--color-accent1)" />
        </marker>
      </defs>

      {/* Dashed secondary run, supporting movement on the tactics board.
          Neutral (border token) so it doesn't introduce a competing accent. */}
      {prefersReduced ? (
        <path
          d={tail}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={2}
          strokeDasharray="2 10"
          strokeLinecap="round"
          opacity={0.6}
        />
      ) : (
        <motion.path
          d={tail}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={2}
          strokeDasharray="2 10"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.6 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 1.3, ease: 'easeInOut', delay: 0.2 }}
        />
      )}

      {/* Primary play-arc, the headline trajectory with arrowhead. */}
      {prefersReduced ? (
        <path
          d={arc}
          fill="none"
          stroke="var(--color-accent1)"
          strokeWidth={2.5}
          strokeLinecap="round"
          markerEnd="url(#play-arrow)"
          filter="url(#chalk-glow)"
          opacity={0.55}
        />
      ) : (
        <motion.path
          d={arc}
          fill="none"
          stroke="var(--color-accent1)"
          strokeWidth={2.5}
          strokeLinecap="round"
          markerEnd="url(#play-arrow)"
          filter="url(#chalk-glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.55 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 1.6, ease: 'easeInOut' }}
        />
      )}
    </svg>
  );
}
