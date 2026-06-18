'use client';

// Stats Empire, CourtBackdrop
//
// The signature "Court Vision" animated background: an abstract, night
// tactics-board surface. Chalk-style pitch geometry draws itself on
// (framer-motion pathLength) while glowing play-trajectory arcs sweep across
// the surface like a coach drawing the winning play in real time.
//
// It is intentionally sport-AGNOSTIC and abstract, not a literal field, so it
// reads as premium texture behind a hero or section divider rather than a
// diagram. All color comes from the theme tokens (var(--color-*)); under
// data-theme="court" the accents resolve to lime #E6FF3A + orange #FF5A3C and
// the chalk lines to the muted court-blue border. Decorative + aria-hidden.
//
// Reduced-motion safe: when the user prefers reduced motion the whole scene
// renders fully drawn and static (no draw-on, no looping arcs).
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
   * Visual density of the play arcs. 'divider' is calmer (fewer, slower arcs)
   * for use behind section breaks; 'hero' is the fuller, signature version.
   * Default 'hero'.
   */
  intensity?: 'hero' | 'divider';
  /**
   * When true, arcs loop softly forever (signature hero feel). When false they
   * draw on once and rest. Forced off under reduced motion. Default true.
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

// Glowing play-trajectory arcs, the kinetic signature. Cubic beziers that
// sweep across the surface. `accent` selects the lime/orange token; arcs draw
// on, then (when looping) restart on a long, staggered cycle.
const PLAY_ARCS: { d: string; accent: 1 | 2; delay: number; dur: number }[] = [
  // Long diagonal switch of play (lime)
  { d: `M 250 660 C 380 360, 720 520, 880 220`, accent: 1, delay: 0.6, dur: 2.2 },
  // Counter-attack curl (orange)
  { d: `M 1000 640 C 760 540, 700 300, 460 200`, accent: 2, delay: 1.0, dur: 2.4 },
  // Through-ball / serve arc (lime)
  { d: `M 600 700 C 560 520, 660 360, 600 180`, accent: 1, delay: 1.4, dur: 2.0 },
  // Wide overlap (orange)
  { d: `M 200 480 C 420 440, 520 300, 740 280`, accent: 2, delay: 1.8, dur: 2.3 },
];

export default function CourtBackdrop({
  className,
  intensity = 'hero',
  loop = true,
}: CourtBackdropProps) {
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

  // Divider variant is calmer: drop half the arcs, no looping.
  const arcs = intensity === 'divider' ? PLAY_ARCS.slice(0, 2) : PLAY_ARCS;
  const shouldLoop = loop && !reduce && mounted && intensity !== 'divider';

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
          {/* Accent glow for the play arcs, the kinetic, neon-chalk look. */}
          <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="g" />
            <feMerge>
              <feMergeNode in="g" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Depth wash */}
        <rect x="0" y="0" width={VW} height={VH} fill={`url(#${uid}-wash)`} />

        {/* Chalk pitch geometry, draws itself on, then rests. */}
        <g
          fill="none"
          stroke={chalk}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.5}
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

        {/* Glowing play-trajectory arcs, the signature kinetic layer. */}
        <g fill="none" strokeLinecap="round" filter={`url(#${uid}-glow)`}>
          {arcs.map((a, i) => {
            const stroke = a.accent === 1 ? 'var(--color-accent1)' : 'var(--color-accent2)';
            if (still) {
              return <path key={i} d={a.d} stroke={stroke} strokeWidth={2.5} strokeOpacity={0.7} />;
            }
            return (
              <motion.path
                key={i}
                d={a.d}
                stroke={stroke}
                strokeWidth={2.5}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={
                  shouldLoop
                    ? { pathLength: [0, 1, 1, 0], opacity: [0, 0.9, 0.9, 0] }
                    : { pathLength: 1, opacity: 0.8 }
                }
                transition={
                  shouldLoop
                    ? {
                        duration: a.dur + 3.5,
                        delay: a.delay,
                        ease: 'easeInOut',
                        repeat: Infinity,
                        repeatDelay: 1.2,
                        times: [0, a.dur / (a.dur + 3.5), 0.82, 1],
                      }
                    : {
                        pathLength: { duration: a.dur, ease: 'easeOut', delay: a.delay },
                        opacity: { duration: 0.5, delay: a.delay },
                      }
                }
              />
            );
          })}

          {/* Travelling spark at the head of the first arc, only when looping.
              A small dot that rides the path via offsetDistance for a "live"
              tactics-pointer feel. CSS-driven so it respects the global
              reduced-motion safety net too. */}
          {shouldLoop && (
            <motion.circle
              r={4}
              fill="var(--color-accent1)"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{
                duration: PLAY_ARCS[0].dur + 3.5,
                delay: PLAY_ARCS[0].delay,
                repeat: Infinity,
                repeatDelay: 1.2,
                times: [0, 0.1, 0.82, 1],
              }}
              style={{
                offsetPath: `path('${PLAY_ARCS[0].d}')`,
                // Fallback for browsers reading the non-prefixed prop name.
                ['--court-arc' as string]: PLAY_ARCS[0].d,
              }}
            >
              <animateMotion
                dur={`${PLAY_ARCS[0].dur + 3.5}s`}
                repeatCount="indefinite"
                keyPoints="0;1;1"
                keyTimes="0;0.46;1"
                calcMode="spline"
                keySplines="0.4 0 0.2 1;0 0 1 1"
                path={PLAY_ARCS[0].d}
              />
            </motion.circle>
          )}
        </g>
      </svg>
    </div>
  );
}
