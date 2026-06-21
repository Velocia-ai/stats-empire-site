'use client';

// Stats Empire, shared count-up animation utilities.
//
// StatTiles and MetricTable both present headline numbers that should COUNT UP
// smoothly the first time they scroll into view, then settle on the exact value
// the fixture provided. This module factors that behaviour out so both surfaces
// animate identically and stay reduced-motion safe.
//
// A MetricRow.value is `string | number` (e.g. 63.4, "63.4%", "112 mph",
// "1.27", "+4"). `parseNumericValue` splits it into the numeric target we
// animate plus the prefix/suffix glyphs that frame it and the decimal precision
// to preserve, so the count-up never invents or drops digits. Non-numeric
// values (e.g. "DNP") are passed through verbatim.

import { useEffect, useState } from 'react';
import { animate, useMotionValue, useReducedMotion } from 'framer-motion';

/** Shared easing for every count-up: a calm, decelerating settle. */
const COUNT_EASE = [0.16, 1, 0.3, 1] as const;
const COUNT_DURATION = 1.1; // seconds

export interface ParsedValue {
  /** Glyphs before the number, e.g. "$" or a leading sign we keep verbatim. */
  prefix: string;
  /** The numeric magnitude we animate toward. */
  target: number;
  /** Glyphs after the number, e.g. "%", " mph". */
  suffix: string;
  /** Decimal places to render so 63.40 → "63.4" (not "63"). */
  decimals: boolean | number;
  /** True when the source carried a real number we can animate. */
  numeric: boolean;
  /** Whether the original carried an explicit leading "+" we should keep. */
  signed: boolean;
}

/**
 * Split a display value into an animatable target plus framing glyphs.
 * Mirrors the proven ProofStats parser but tolerates `number` inputs and
 * signed deltas, and reports whether anything numeric was found.
 */
export function parseNumericValue(value: string | number): ParsedValue {
  if (typeof value === 'number') {
    const decimals = countDecimals(value);
    return {
      prefix: '',
      target: value,
      suffix: '',
      decimals,
      numeric: Number.isFinite(value),
      signed: false,
    };
  }

  const match = value.match(/^(\D*)([\d.,]+)(.*)$/);
  if (!match) {
    return { prefix: '', target: 0, suffix: value, decimals: 0, numeric: false, signed: false };
  }
  const [, prefix, rawNum, suffix] = match;
  const cleaned = rawNum.replace(/,/g, '');
  const decimals = cleaned.includes('.') ? cleaned.split('.')[1].length : 0;
  const signed = prefix.trim().endsWith('+') || prefix.trim().endsWith('-');
  return {
    prefix,
    target: Number(cleaned),
    suffix,
    decimals,
    numeric: Number.isFinite(Number(cleaned)),
    signed,
  };
}

function countDecimals(v: number): number {
  if (!Number.isFinite(v) || Number.isInteger(v)) return 0;
  const s = String(v);
  const i = s.indexOf('.');
  return i < 0 ? 0 : Math.min(s.length - i - 1, 2);
}

/** Format an animating number to the precision the source value carried. */
export function formatCount(n: number, decimals: number): string {
  return decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
}

/**
 * Animate a single numeric target from 0 → target the first time `active`
 * becomes true, returning the current display number. Reduced motion (and the
 * pre-hydration default) settles to the final value instantly with no ramp.
 *
 * Callers pass `active` (typically `useInView(ref, { once: true })`) so the
 * count fires exactly once, in view, and never re-runs on theme switches.
 */
export function useCountUp(target: number, active: boolean): number {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(reduce ? target : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(target);
      return;
    }
    if (!active) return;
    const controls = animate(mv, target, {
      duration: COUNT_DURATION,
      ease: COUNT_EASE,
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [active, reduce, target, mv]);

  return display;
}
