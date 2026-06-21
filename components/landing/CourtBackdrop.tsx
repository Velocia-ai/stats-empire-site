'use client';

// Stats Empire, CourtBackdrop
//
// The signature "Court Vision" atmospheric background: an abstract, night
// tactics-board surface. Chalk-style pitch geometry draws itself on ONCE
// (framer-motion pathLength) and then rests, with a couple of soft accent
// arcs as the single quiet focal glow behind the hero.
//
// Calmed for restraint: this is the one atmospheric spot on the page, so it
// stays deliberately quiet. There is no perpetual/looping motion and no
// travelling spark, the geometry draws on once and settles, and the accent
// glow is lime-only (orange is reserved for the data viz, never marketing
// chrome). Glows are softened (lower opacity + tighter spread).
//
// It is intentionally sport-AGNOSTIC and abstract, not a literal field, so it
// reads as premium texture behind a hero rather than a diagram. All color
// comes from the theme tokens (var(--color-*)). Decorative + aria-hidden.
//
// Reduced-motion safe: when the user prefers reduced motion the whole scene
// renders fully drawn and static (no draw-on).
//
// Usage:
//   <div className="relative">
//     <CourtBackdrop className="absolute inset-0" />   // fills the parent
//     …content…
//   </div>

import { useEffect, useId, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface CourtBackdropProps {
  /** Extra classes for the wrapping element (usually `absolute inset-0`). */
  className?: string;
  /**
   * Visual density of the play arcs. 'divider' is calmer (a single arc) for
   * use behind section breaks; 'hero' is the fuller (still quiet) version.
   * Default 'hero'.
   */
  intensity?: 'hero' | 'divider';
  /**
   * Retained for API stability. Looping background motion has been removed in
   * favour of a calmer draw-on-once treatment, so this prop no longer enables
   * perpetual animation; arcs always draw on once and rest.
   */
  loop?: boolean;
}

// The backdrop draws into a fixed 1200×800 design space and scales to fill its
// container via preserveAspectRatio="xMidYMid slice" (cover behavior).
const VW = 1200;
const VH = 800;

// Abstract "chalk" geometry, a stylised half-court / pitch read at an angle.
// These are not a real field; they evoke tactics-board lines. Pixel coords in
// the 1200×800 space. Each gets its own draw-on timing.
const CHALK_LINES: { d: string; w: number; delay: number }[] = [
  // Outer touchline frame (perspective trapezoid)
  { d: `M 120 700 L 360 140 L 840 140 L 1080 700 Z`, w: 2, delay: 0 },
  // Halfway line
  { d: `M 235 420 L 965 420`, w: 1.5, delay: 0.35 },
  // Centre-third lines
  { d: `M 300 280 L 900 280`, w: 1.5, delay: 0.5 },
  { d: `M 178 560 L 1022 560`, w: 1.5, delay: 0.65 },
  // Top penalty box
  { d: `M 480 140 L 480 250 L 720 250 L 720 140`, w: 1.5, delay: 0.8 },
  // Bottom (near) penalty box
  { d: `M 300 700 L 300 600 L 900 600 L 900 700`, w: 1.5, delay: 0.9 },
];

// Soft play-trajectory arcs, the single quiet focal glow. Cubic beziers that
// sweep across the surface. Lime-only (accent1) so the hero chrome never mixes
// lime and orange; orange is reserved for the data viz. Arcs draw on once and
// rest, no looping.
const PLAY_ARCS: { d: string; delay: number; dur: number }[] = [
  // Long diagonal switch of play.
  { d: `M 250 660 C 380 360, 720 520, 880 220`, delay: 0.6, dur: 2.2 },
  // Through-ball / serve arc.
  { d: `M 600 700 C 560 520, 660 360, 600 180`, delay: 1.1, dur: 2.0 },
];

export default function CourtBackdrop({
  className,
  intensity = 'hero',
  loop: _loop,
}: CourtBackdropProps) {
  // `loop` is intentionally ignored, see prop doc: perpetual background motion
  // was removed for restraint. Referencing it keeps the prop API stable.
  void _loop;
  const reduce = useReducedMotion();
  const reactId = useId();
  const uid = `cb-${reactId.replace(/[:]/g, '')}`;

  // SSR-safe motion gate. framer-motion's `initial` on motion.path emits
  // pathLength / stroke-dashoffset / stroke-dasharray attributes that would
  // differ between the server HTML and the client's first paint → hydration
  // mismatch. So the server AND the first client render both produce the STATIC
  // (fully-drawn) markup; the draw-on only begins after mount. This also means
  // reduced-motion users (who never flip `mounted` into animated paths) see a
  // calm, fully-drawn board, exactly the intended fallback.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Treat "pre-mount" identically to reduced-motion: render static geometry.
  const still = reduce || !mounted;

  // Divider variant is calmer: a single arc.
  const arcs = intensity === 'divider' ? PLAY_ARCS.slice(0, 1) : PLAY_ARCS;

  const chalk = 'var(--color-border)';

  return (
    <div className={className} aria-hidden="true">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Court-blue depth wash: lifts the field off the page bg. */}
          <radialGradient id={`${uid}-wash`} cx="50%" cy="38%" r="80%">
            <stop offset="0%" stopColor="var(--color-surface-alt)" stopOpacity="0.55" />
            <stop offset="55%" stopColor="var(--color-surface)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-bg)" stopOpacity="0" />
          </radialGradient>
          {/* Chalk glow, soft blur so lines read as drawn-on chalk dust. */}
          <filter id={`${uid}-chalk`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.1" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Accent glow for the play arcs. Softer spread than before so the
              focal glow stays quiet rather than neon. */}
          <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="g" />
            <feMerge>
              <feMergeNode in="g" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Depth wash */}
        <rect x="0" y="0" width={VW} height={VH} fill={`url(#${uid}-wash)`} />

        {/* Chalk pitch geometry, draws itself on once, then rests. */}
        <g
          fill="none"
          stroke={chalk}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.4}
          filter={`url(#${uid}-chalk)`}
        >
          {CHALK_LINES.map((l, i) =>
            still ? (
              <path key={i} d={l.d} strokeWidth={l.w} />
            ) : (
              <motion.path
                key={i}
                d={l.d}
                strokeWidth={l.w}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  pathLength: { duration: 1.4, ease: 'easeInOut', delay: l.delay },
                  opacity: { duration: 0.4, delay: l.delay },
                }}
              />
            ),
          )}
          {/* Centre circle, abstract court mark. */}
          {still ? (
            <circle cx={600} cy={420} r={72} strokeWidth={1.5} />
          ) : (
            <motion.circle
              cx={600}
              cy={420}
              r={72}
              strokeWidth={1.5}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: { duration: 1.6, ease: 'easeInOut', delay: 0.4 },
                opacity: { duration: 0.4, delay: 0.4 },
              }}
            />
          )}
        </g>

        {/* Soft lime play-arcs, the single quiet focal glow. Draw on once
            and rest, no looping, no travelling spark. Lime-only so the hero
            chrome never mixes lime and orange. */}
        <g fill="none" strokeLinecap="round" filter={`url(#${uid}-glow)`}>
          {arcs.map((a, i) =>
            still ? (
              <path
                key={i}
                d={a.d}
                stroke="var(--color-accent1)"
                strokeWidth={2}
                strokeOpacity={0.42}
              />
            ) : (
              <motion.path
                key={i}
                d={a.d}
                stroke="var(--color-accent1)"
                strokeWidth={2}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.42 }}
                transition={{
                  pathLength: { duration: a.dur, ease: 'easeOut', delay: a.delay },
                  opacity: { duration: 0.6, delay: a.delay },
                }}
              />
            ),
          )}
        </g>
      </svg>
    </div>
  );
}
